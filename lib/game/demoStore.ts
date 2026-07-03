import { badgeProgressForNode } from "./nextNode";
import { evaluateChoice } from "./evaluateChoice";
import { NODE_BY_KEY, FIRST_NODE_KEY } from "./fixedGraph";
import { difficultyForStudent, riskFlagsForStudent } from "./adaptDifficulty";
import { runtimeSessionCode } from "@/lib/runtime/environment";
import type { ClassSession, Language, MissionGoalCard, StudentRecord } from "./types";

const BACKPACK_ITEM_LABELS: Record<string, string> = {
  logic_lens: "Logic Lens",
  data_slate: "Data Slate",
  debug_wrench: "Debug Wrench",
  prompt_card: "Prompt Card",
  agent_blueprint: "Agent Blueprint",
  safety_seal: "Safety Seal",
};

const SIDE_QUEST_LABELS: Record<string, string> = {
  "cargo-cleanup": "Cargo Clean-up",
  "loop-trace": "Loop Trace",
  "telegraph-tidy": "Telegraph Tidy",
};

declare global {
  var __timecityDemoStore: Map<string, ClassSession> | undefined;
}

const store = globalThis.__timecityDemoStore ?? new Map<string, ClassSession>();
globalThis.__timecityDemoStore = store;

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function sessionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function normalizeSessionCode(code: string | null | undefined) {
  return runtimeSessionCode(code);
}

function makeStudent(display_name: string, avatar_color: string, language: Language, node = FIRST_NODE_KEY): StudentRecord {
  const stamp = now();
  return {
    id: id("student"),
    display_name,
    avatar_color,
    language,
    current_node_key: node,
    current_room_slug: NODE_BY_KEY[node].room_slug,
    badge_progress: badgeProgressForNode(node),
    backpack_items: ["logic_lens", "data_slate", "debug_wrench", "prompt_card", "agent_blueprint", "safety_seal"],
    used_backpack_items: [],
    visited_room_slugs: [NODE_BY_KEY[node].room_slug],
    completed_side_quest_ids: [],
    clue_count: display_name === "Mina" ? 1 : 0,
    read_again_count: display_name === "Jay" ? 1 : 0,
    correct_count: display_name === "Leo" ? 2 : 0,
    wrong_count: display_name === "Jay" ? 1 : 0,
    fast_correct_count: display_name === "Leo" ? 2 : 0,
    difficulty_level: 2,
    retry_count: display_name === "Jay" ? 1 : 0,
    last_choice: display_name === "Ava" ? "B" : undefined,
    last_classification: display_name === "Ava" ? "misconception" : undefined,
    last_misconception: display_name === "Ava" ? "speed_over_safety" : undefined,
    last_response_ms: display_name === "Leo" ? 900 : undefined,
    risk_flags: {},
    joined_at: stamp,
    updated_at: stamp,
  };
}

function recompute(student: StudentRecord): StudentRecord {
  return {
    ...student,
    used_backpack_items: student.used_backpack_items ?? [],
    visited_room_slugs: student.visited_room_slugs ?? [student.current_room_slug],
    completed_side_quest_ids: student.completed_side_quest_ids ?? [],
    risk_flags: riskFlagsForStudent(student),
    difficulty_level: difficultyForStudent(student),
    updated_at: now(),
  };
}

export function createDemoSession(language: Language = "en", requestedCode?: string): ClassSession {
  let code = normalizeSessionCode(requestedCode || sessionCode());
  while (store.has(code)) code = normalizeSessionCode(sessionCode());
  const stamp = now();
  const session: ClassSession = {
    id: id("session"),
    session_code: code,
    mission: "TimeCity Rescue",
    episode: "The Missing Minute",
    age_band: "9-10",
    language_default: language,
    status: "draft",
    students: [
      recompute(makeStudent("Ava", "teal", language, "H1_N03")),
      recompute(makeStudent("Leo", "blue", language, "H1_N06")),
      recompute(makeStudent("Mina", "purple", language, "H1_N04")),
      recompute(makeStudent("Jay", "amber", language, "H1_N04")),
    ],
    created_at: stamp,
    updated_at: stamp,
  };
  store.set(code, session);
  return session;
}

export function getDemoSession(code: string) {
  return store.get(normalizeSessionCode(code));
}

export function saveDemoSession(session: ClassSession) {
  const normalized = { ...session, session_code: normalizeSessionCode(session.session_code) };
  store.set(normalized.session_code, normalized);
  return normalized;
}

export function listDemoSessions() {
  return Array.from(store.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function ensureDemoSession(code?: string | null) {
  if (code) {
    const existing = getDemoSession(code);
    if (existing) return existing;
  }
  const latest = listDemoSessions()[0];
  return latest ?? createDemoSession();
}

export function updateSessionStatus(code: string, status: ClassSession["status"]) {
  const session = getDemoSession(code);
  if (!session) return null;
  session.status = status;
  session.updated_at = now();
  store.set(session.session_code, session);
  return session;
}

export function joinDemoSession(code: string, display_name: string, avatar_color: string, language: Language) {
  const session = getDemoSession(code) ?? createDemoSession(language, code);
  const student = recompute(makeStudent(display_name || "Blue Cadet", avatar_color || "blue", language));
  session.students = [student, ...session.students.filter((item) => item.display_name !== student.display_name)];
  session.updated_at = now();
  store.set(session.session_code, session);
  return { session, student };
}

export function findStudent(sessionCodeValue: string, studentId: string) {
  const session = getDemoSession(sessionCodeValue);
  const student = session?.students.find((item) => item.id === studentId);
  return { session, student };
}

export function submitChoice(sessionCodeValue: string, studentId: string, choiceId: string, responseMs = 2500) {
  const { session, student } = findStudent(sessionCodeValue, studentId);
  if (!session || !student) return null;
  const evaluation = evaluateChoice(student.current_node_key, choiceId, student.language);
  const correctish = evaluation.classification === "best" || evaluation.classification === "partial";
  const nextNodeKey = evaluation.nextNodeKey;
  const completed = nextNodeKey === "COMPLETE";
  const currentNode = NODE_BY_KEY[student.current_node_key];
  const usedBackpackItems = appendUnique(
    student.used_backpack_items ?? [],
    correctish && currentNode?.required_backpack_item ? currentNode.required_backpack_item : undefined,
  );
  const nextRoomSlug = completed ? "future_agent_lab" : NODE_BY_KEY[nextNodeKey]?.room_slug ?? student.current_room_slug;
  const updated: StudentRecord = recompute({
    ...student,
    current_node_key: completed ? "H1_N24" : nextNodeKey,
    current_room_slug: nextRoomSlug,
    badge_progress: completed ? 100 : badgeProgressForNode(nextNodeKey),
    used_backpack_items: usedBackpackItems,
    visited_room_slugs: appendUnique(student.visited_room_slugs ?? [student.current_room_slug], nextRoomSlug),
    correct_count: student.correct_count + (correctish ? 1 : 0),
    wrong_count: student.wrong_count + (correctish ? 0 : 1),
    retry_count: correctish ? 0 : student.retry_count + 1,
    fast_correct_count: correctish && responseMs < 1500 ? student.fast_correct_count + 1 : student.fast_correct_count,
    last_choice: choiceId,
    last_classification: evaluation.classification,
    last_misconception: evaluation.misconception,
    last_response_ms: responseMs,
    memento: completed
      ? createMissionGoalCard({
          ...student,
          current_node_key: "H1_N24",
          current_room_slug: nextRoomSlug,
          badge_progress: 100,
          used_backpack_items: usedBackpackItems,
          visited_room_slugs: appendUnique(student.visited_room_slugs ?? [student.current_room_slug], nextRoomSlug),
        })
      : student.memento,
  });
  session.students = session.students.map((item) => (item.id === studentId ? updated : item));
  session.updated_at = now();
  store.set(session.session_code, session);
  return { session, student: updated, evaluation, completed };
}

export function updateStudentLanguage(sessionCodeValue: string, studentId: string, language: Language) {
  const { session, student } = findStudent(sessionCodeValue, studentId);
  if (!session || !student) return null;
  const updated = recompute({ ...student, language });
  session.students = session.students.map((item) => (item.id === studentId ? updated : item));
  session.updated_at = now();
  store.set(session.session_code, session);
  return { session, student: updated };
}

export function incrementStudentSignal(
  sessionCodeValue: string,
  studentId: string,
  signal: "clue_count" | "read_again_count",
) {
  const { session, student } = findStudent(sessionCodeValue, studentId);
  if (!session || !student) return null;
  const updated = recompute({ ...student, [signal]: student[signal] + 1 });
  session.students = session.students.map((item) => (item.id === studentId ? updated : item));
  store.set(session.session_code, session);
  return { session, student: updated };
}

export function recordStudentEvent(
  sessionCodeValue: string,
  studentId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  const { session, student } = findStudent(sessionCodeValue, studentId);
  if (!session || !student) return null;
  let updated = student;
  if (eventType === "side_quest_choice" && metadata.correct === true && typeof metadata.side_quest_id === "string") {
    updated = recompute({
      ...student,
      completed_side_quest_ids: appendUnique(student.completed_side_quest_ids ?? [], metadata.side_quest_id),
    });
  }
  session.students = session.students.map((item) => (item.id === studentId ? updated : item));
  session.updated_at = now();
  store.set(session.session_code, session);
  return { session, student: updated };
}

export function overrideStudent(sessionCodeValue: string, studentId: string, action: "skip" | "reset" | "assist") {
  const { session, student } = findStudent(sessionCodeValue, studentId);
  if (!session || !student) return null;
  let nextNode = student.current_node_key;
  if (action === "skip") {
    nextNode = NODE_BY_KEY[student.current_node_key]?.evaluation_key.next_node_if_best ?? "H1_N02";
    if (nextNode === "COMPLETE") nextNode = "H1_N24";
  }
  if (action === "reset") nextNode = FIRST_NODE_KEY;
  const updated = recompute({
    ...student,
    current_node_key: nextNode,
    current_room_slug: NODE_BY_KEY[nextNode].room_slug,
    badge_progress: badgeProgressForNode(nextNode),
    last_classification: action === "assist" ? "partial" : student.last_classification,
    last_misconception: action === "assist" ? "teacher_assisted" : student.last_misconception,
  });
  session.students = session.students.map((item) => (item.id === studentId ? updated : item));
  store.set(session.session_code, session);
  return { session, student: updated };
}

export function createMissionGoalCard(studentOrName: StudentRecord | string): MissionGoalCard {
  const student = typeof studentOrName === "string" ? null : studentOrName;
  const name = typeof studentOrName === "string" ? studentOrName : studentOrName.display_name;
  const visitedRooms = (student?.visited_room_slugs?.length ? student.visited_room_slugs : ["future_trainstation", "future_market", "future_reactorcore", "1800_trainstation", "1800_signal_telegraph_office", "future_mayorhall", "future_agent_lab"]);
  const usedItems = student?.used_backpack_items?.length ? student.used_backpack_items : ["data_slate", "debug_wrench", "prompt_card", "safety_seal", "agent_blueprint"];
  const completedSideQuests = student?.completed_side_quest_ids ?? [];
  return {
    chronoCadetName: name,
    mission: "TimeCity Rescue",
    avatarColor: student?.avatar_color ?? "blue",
    routeTaken: visitedRooms.map(roomTitle),
    cityLocationsVisited: Array.from(new Set(visitedRooms.map(roomTitle))),
    backpackItemsUsed: usedItems.map(itemTitle),
    sideQuestsCompleted: completedSideQuests.map(sideQuestTitle),
    fixedStatement: "I restored TimeCity's missing minute by building a Station Helper Agent that chooses safe train routes.",
    learnedStatement: "I learned that an agent needs a goal, useful inputs, rules, safety checks, and feedback.",
    cog9Goal: "Help trains choose safe routes across TimeCity.",
    importantInput: "Power level, cargo type, and passenger count.",
    safeRule: "If power is low and cargo is fragile, send the train to the safe backup track.",
    expectedOutput: "Trains arrive safely and on time, and TimeCity keeps its restored minute.",
    shouldNotDo: "Choose the fastest route before checking the constraints.",
    checkedBeforeActing: "Goal, inputs, tools, rules, safety check, and feedback.",
    nextMissionTeaser: "Next signal: the 1888 Telegraph Office is sending messages out of order.",
    badgeEarned: "Agent Badge",
  };
}

function appendUnique<T>(items: T[], item: T | undefined) {
  if (item === undefined || items.includes(item)) return items;
  return [...items, item];
}

function roomTitle(slug: string) {
  return NODE_ROOM_TITLES[slug] ?? slug;
}

const NODE_ROOM_TITLES: Record<string, string> = {
  future_trainstation: "Future Train Station",
  future_market: "Future Market",
  future_reactorcore: "Future Reactor Core",
  "1800_trainstation": "1888 Train Station",
  "1800_signal_telegraph_office": "1888 Telegraph Office",
  future_mayorhall: "Future Town Hall",
  future_agent_lab: "Future Agent Lab",
};

function itemTitle(slug: string) {
  return BACKPACK_ITEM_LABELS[slug] ?? slug;
}

function sideQuestTitle(id: string) {
  return SIDE_QUEST_LABELS[id] ?? id;
}
