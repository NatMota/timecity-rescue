import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClassSession, StudentRecord } from "@/lib/game/types";

type JsonRecord = Record<string, unknown>;

type SnapshotRow = {
  session_code: string;
  payload: ClassSession;
  created_at: string;
  updated_at: string;
};

type ClickstreamRow = {
  session_code: string;
  student_id: string | null;
  actor: string;
  event_type: string;
  route: string | null;
  node_key: string | null;
  room_slug: string | null;
  choice_classification: string | null;
  response_ms: number | null;
  scene_elapsed_ms: number | null;
  first_choice_ms: number | null;
  clue_count: number | null;
  read_again_count: number | null;
  metadata: JsonRecord | null;
  created_at: string;
};

type LlmGenerationRow = {
  session_code: string | null;
  student_id: string | null;
  node_key: string;
  room_slug: string | null;
  language: string;
  model: string;
  resolved_model: string | null;
  prompt_chars: number | null;
  latency_ms: number | null;
  success: boolean;
  used_fallback: boolean;
  validation_errors: string[] | null;
  error_message: string | null;
  usage_details: JsonRecord | null;
  created_at: string;
};

export type TeamUserSummary = {
  id: string;
  name: string;
  email: string;
  lastSignInAt: string | null;
  lastActiveAt: string | null;
  createdAt: string | null;
};

export type TeamSessionSummary = {
  code: string;
  status: ClassSession["status"] | "unknown";
  students: number;
  averageProgress: number;
  completed: number;
  riskCount: number;
  supportUses: number;
  updatedAt: string;
};

export type TeamModelSummary = {
  model: string;
  generations: number;
  successRate: number;
  fallbackRate: number;
  averageLatencyMs: number | null;
  totalTokens: number | null;
};

export type TeamActivitySummary = {
  type: string;
  actor: string;
  sessionCode: string;
  studentId: string;
  detail: string;
  createdAt: string;
};

export type TeamRiskSummary = {
  label: string;
  count: number;
};

export type TeamDashboardData = {
  hasSupabase: boolean;
  errors: string[];
  generatedAt: string;
  users: TeamUserSummary[];
  sessions: TeamSessionSummary[];
  models: TeamModelSummary[];
  recentGenerations: LlmGenerationRow[];
  recentActivity: TeamActivitySummary[];
  risks: TeamRiskSummary[];
  eventCounts: Array<{ eventType: string; count: number }>;
  totals: {
    teacherAccounts: number;
    activeSessions: number;
    totalSessions: number;
    totalStudents: number;
    averageProgress: number;
    completedStudents: number;
    atRiskStudents: number;
    studentJoins: number;
    choicesSubmitted: number;
    teacherActions: number;
    totalGenerations: number;
    successfulGenerations: number;
    fallbackGenerations: number;
    averageLatencyMs: number | null;
    averageResponseMs: number | null;
    fastFirstChoices: number;
  };
};

type ClerkEmail = {
  id?: string;
  emailAddress?: string;
};

type ClerkUserLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddressId?: string | null;
  emailAddresses?: ClerkEmail[];
  lastSignInAt?: number | null;
  lastActiveAt?: number | null;
  createdAt?: number | null;
};

const emptyDashboard: TeamDashboardData = {
  hasSupabase: false,
  errors: [],
  generatedAt: new Date().toISOString(),
  users: [],
  sessions: [],
  models: [],
  recentGenerations: [],
  recentActivity: [],
  risks: [],
  eventCounts: [],
  totals: {
    teacherAccounts: 0,
    activeSessions: 0,
    totalSessions: 0,
    totalStudents: 0,
    averageProgress: 0,
    completedStudents: 0,
    atRiskStudents: 0,
    studentJoins: 0,
    choicesSubmitted: 0,
    teacherActions: 0,
    totalGenerations: 0,
    successfulGenerations: 0,
    fallbackGenerations: 0,
    averageLatencyMs: null,
    averageResponseMs: null,
    fastFirstChoices: 0,
  },
};

function average(values: Array<number | null | undefined>) {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!finite.length) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return counts;
}

function hasRisk(student: StudentRecord) {
  return Object.values(student.risk_flags || {}).some(Boolean);
}

function readUsageNumber(usage: JsonRecord | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = usage?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function epochToIso(value: number | null | undefined) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function mapClerkUser(user: ClerkUserLike): TeamUserSummary {
  const primaryEmail =
    user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress ||
    "No email";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || primaryEmail;
  return {
    id: user.id,
    name,
    email: primaryEmail,
    lastSignInAt: epochToIso(user.lastSignInAt),
    lastActiveAt: epochToIso(user.lastActiveAt),
    createdAt: epochToIso(user.createdAt),
  };
}

async function getTeamUsers(errors: string[]) {
  try {
    const client = await clerkClient();
    const users = await client.users.getUserList({ limit: 25, orderBy: "-last_sign_in_at" });
    return ((users.data ?? []) as ClerkUserLike[]).map(mapClerkUser);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unable to load Clerk users");
    return [];
  }
}

function summarizeSessions(rows: SnapshotRow[]) {
  return rows.map<TeamSessionSummary>((row) => {
    const students = row.payload?.students ?? [];
    return {
      code: row.session_code || row.payload?.session_code || "UNKNOWN",
      status: row.payload?.status || "unknown",
      students: students.length,
      averageProgress: Math.round(average(students.map((student) => student.badge_progress))),
      completed: students.filter((student) => student.badge_progress >= 100).length,
      riskCount: students.filter(hasRisk).length,
      supportUses: students.reduce((sum, student) => sum + student.clue_count + student.read_again_count, 0),
      updatedAt: row.updated_at || row.payload?.updated_at,
    };
  });
}

function summarizeModels(rows: LlmGenerationRow[]) {
  const grouped = countBy(rows, (row) => row.resolved_model || row.model || "unknown");
  return Array.from(grouped.entries())
    .map<TeamModelSummary>(([model, count]) => {
      const modelRows = rows.filter((row) => (row.resolved_model || row.model || "unknown") === model);
      const totalTokens = modelRows.reduce(
        (sum, row) => sum + readUsageNumber(row.usage_details, ["total_tokens", "totalTokens", "total"]),
        0,
      );
      return {
        model,
        generations: count,
        successRate: Math.round((modelRows.filter((row) => row.success).length / count) * 100),
        fallbackRate: Math.round((modelRows.filter((row) => row.used_fallback).length / count) * 100),
        averageLatencyMs: Math.round(average(modelRows.map((row) => row.latency_ms))) || null,
        totalTokens: totalTokens || null,
      };
    })
    .sort((a, b) => b.generations - a.generations);
}

function summarizeActivity(rows: ClickstreamRow[]) {
  return rows.slice(0, 16).map<TeamActivitySummary>((row) => ({
    type: row.event_type,
    actor: row.actor,
    sessionCode: row.session_code,
    studentId: row.student_id || "-",
    detail: row.choice_classification || row.node_key || row.route || "",
    createdAt: row.created_at,
  }));
}

function summarizeRisks(students: StudentRecord[], clickRows: ClickstreamRow[]) {
  const misconceptionChoices = clickRows.filter(
    (row) => row.choice_classification === "misconception" || row.choice_classification === "wrong",
  ).length;
  return [
    { label: "Fast-clicking pupils", count: students.filter((student) => student.risk_flags?.fast_clicking).length },
    { label: "Clue-heavy pupils", count: students.filter((student) => student.risk_flags?.clue_heavy).length },
    { label: "Stuck pupils", count: students.filter((student) => student.risk_flags?.stuck).length },
    { label: "Possible guessing", count: students.filter((student) => student.risk_flags?.possible_guessing).length },
    { label: "Wrong or misconception choices", count: misconceptionChoices },
  ].sort((a, b) => b.count - a.count);
}

export async function getTeamDashboardData(): Promise<TeamDashboardData> {
  const errors: string[] = [];
  const [users, supabase] = await Promise.all([getTeamUsers(errors), Promise.resolve(getSupabaseAdminClient())]);
  if (!supabase) {
    return {
      ...emptyDashboard,
      hasSupabase: false,
      errors,
      users,
      totals: {
        ...emptyDashboard.totals,
        teacherAccounts: users.length,
      },
    };
  }

  const [snapshotResult, clickResult, generationResult] = await Promise.all([
    supabase
      .from("session_snapshots")
      .select("session_code,payload,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("clickstream_events")
      .select(
        "session_code,student_id,actor,event_type,route,node_key,room_slug,choice_classification,response_ms,scene_elapsed_ms,first_choice_ms,clue_count,read_again_count,metadata,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(800),
    supabase
      .from("llm_generation_events")
      .select(
        "session_code,student_id,node_key,room_slug,language,model,resolved_model,prompt_chars,latency_ms,success,used_fallback,validation_errors,error_message,usage_details,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(800),
  ]);

  [snapshotResult.error, clickResult.error, generationResult.error]
    .filter(Boolean)
    .forEach((error) => errors.push(error?.message || "Supabase query failed"));

  const snapshots = (snapshotResult.data ?? []) as SnapshotRow[];
  const clickRows = (clickResult.data ?? []) as ClickstreamRow[];
  const generationRows = (generationResult.data ?? []) as LlmGenerationRow[];
  const allStudents = snapshots.flatMap((row) => row.payload?.students ?? []);
  const sessions = summarizeSessions(snapshots);
  const models = summarizeModels(generationRows);
  const eventCounts = Array.from(countBy(clickRows, (row) => row.event_type).entries())
    .map(([eventType, count]) => ({ eventType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    hasSupabase: true,
    errors,
    generatedAt: new Date().toISOString(),
    users,
    sessions,
    models,
    recentGenerations: generationRows.slice(0, 12),
    recentActivity: summarizeActivity(clickRows),
    risks: summarizeRisks(allStudents, clickRows),
    eventCounts,
    totals: {
      teacherAccounts: users.length,
      activeSessions: sessions.filter((session) => session.status === "started").length,
      totalSessions: sessions.length,
      totalStudents: allStudents.length,
      averageProgress: Math.round(average(allStudents.map((student) => student.badge_progress))),
      completedStudents: allStudents.filter((student) => student.badge_progress >= 100).length,
      atRiskStudents: allStudents.filter(hasRisk).length,
      studentJoins: clickRows.filter((row) => row.event_type === "student_join").length,
      choicesSubmitted: clickRows.filter((row) => row.event_type === "choice_submit").length,
      teacherActions: clickRows.filter((row) => row.actor === "teacher").length,
      totalGenerations: generationRows.length,
      successfulGenerations: generationRows.filter((row) => row.success).length,
      fallbackGenerations: generationRows.filter((row) => row.used_fallback).length,
      averageLatencyMs: Math.round(average(generationRows.map((row) => row.latency_ms))) || null,
      averageResponseMs: Math.round(average(clickRows.map((row) => row.response_ms))) || null,
      fastFirstChoices: clickRows.filter((row) => typeof row.first_choice_ms === "number" && row.first_choice_ms < 1200)
        .length,
    },
  };
}
