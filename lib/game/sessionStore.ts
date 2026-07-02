import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createDemoSession,
  findStudent as findMemoryStudent,
  getDemoSession,
  incrementStudentSignal as incrementMemoryStudentSignal,
  joinDemoSession as joinMemorySession,
  listDemoSessions,
  overrideStudent as overrideMemoryStudent,
  saveDemoSession,
  submitChoice as submitMemoryChoice,
  updateSessionStatus as updateMemorySessionStatus,
} from "./demoStore";
import type { ClassSession, Language } from "./types";

function normalizeCode(code: string | null | undefined) {
  return String(code || "").toUpperCase();
}

async function persistSession(session: ClassSession) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("session_snapshots").upsert(
    {
      session_code: session.session_code,
      payload: session,
      created_at: session.created_at,
      updated_at: session.updated_at,
    },
    { onConflict: "session_code" },
  );

  if (error) console.error("Failed to persist TimeCity session", error.message);
}

async function loadSessionFromSupabase(code: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("session_snapshots")
    .select("payload")
    .eq("session_code", code)
    .maybeSingle();

  if (error) {
    console.error("Failed to load TimeCity session", error.message);
    return null;
  }

  const session = data?.payload as ClassSession | undefined;
  return session ? saveDemoSession(session) : null;
}

async function loadLatestSessionFromSupabase() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("session_snapshots")
    .select("payload")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load latest TimeCity session", error.message);
    return null;
  }

  const session = data?.payload as ClassSession | undefined;
  return session ? saveDemoSession(session) : null;
}

export async function createSession(language: Language = "en") {
  const session = createDemoSession(language);
  await persistSession(session);
  return session;
}

export async function loadSession(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  return getDemoSession(normalized) ?? (await loadSessionFromSupabase(normalized));
}

export async function ensureSession(code?: string | null) {
  const normalized = normalizeCode(code);
  if (normalized) {
    const existing = await loadSession(normalized);
    if (existing) return existing;
  }

  const latestLocal = listDemoSessions()[0];
  if (latestLocal) return latestLocal;

  const latestRemote = await loadLatestSessionFromSupabase();
  if (latestRemote) return latestRemote;

  return createSession();
}

export async function findStudent(sessionCode: string, studentId: string) {
  await loadSession(sessionCode);
  return findMemoryStudent(normalizeCode(sessionCode), studentId);
}

export async function joinSession(code: string, displayName: string, avatarColor: string, language: Language) {
  await loadSession(code);
  const result = joinMemorySession(normalizeCode(code), displayName, avatarColor, language);
  await persistSession(result.session);
  return result;
}

export async function updateSessionStatus(code: string, status: ClassSession["status"]) {
  await loadSession(code);
  const session = updateMemorySessionStatus(normalizeCode(code), status);
  if (session) await persistSession(session);
  return session;
}

export async function submitChoice(sessionCode: string, studentId: string, choiceId: string, responseMs = 2500) {
  await loadSession(sessionCode);
  const result = submitMemoryChoice(normalizeCode(sessionCode), studentId, choiceId, responseMs);
  if (result) await persistSession(result.session);
  return result;
}

export async function incrementStudentSignal(
  sessionCode: string,
  studentId: string,
  signal: "clue_count" | "read_again_count",
) {
  await loadSession(sessionCode);
  const result = incrementMemoryStudentSignal(normalizeCode(sessionCode), studentId, signal);
  if (result) await persistSession(result.session);
  return result;
}

export async function overrideStudent(sessionCode: string, studentId: string, action: "skip" | "reset" | "assist") {
  await loadSession(sessionCode);
  const result = overrideMemoryStudent(normalizeCode(sessionCode), studentId, action);
  if (result) await persistSession(result.session);
  return result;
}
