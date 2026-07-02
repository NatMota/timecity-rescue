import { badgeProgressForNode } from "./nextNode";
import { evaluateChoice } from "./evaluateChoice";
import { NODE_BY_KEY, FIRST_NODE_KEY } from "./fixedGraph";
import { riskFlagsForStudent } from "./adaptDifficulty";
import type { ClassSession, Language, MissionGoalCard, StudentRecord } from "./types";

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
    backpack_items: ["mission_compass"],
    clue_count: display_name === "Mina" ? 1 : 0,
    read_again_count: display_name === "Jay" ? 1 : 0,
    correct_count: display_name === "Leo" ? 2 : 0,
    wrong_count: display_name === "Jay" ? 1 : 0,
    fast_correct_count: display_name === "Leo" ? 2 : 0,
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
    risk_flags: riskFlagsForStudent(student),
    updated_at: now(),
  };
}

export function createDemoSession(language: Language = "en", requestedCode?: string): ClassSession {
  let code = requestedCode?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || sessionCode();
  while (store.has(code)) code = sessionCode();
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
  return store.get(code.toUpperCase());
}

export function saveDemoSession(session: ClassSession) {
  store.set(session.session_code, session);
  return session;
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
  const student = recompute(makeStudent(display_name || "ChronoCadet Blue", avatar_color || "blue", language));
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
  const evaluation = evaluateChoice(student.current_node_key, choiceId);
  const correctish = evaluation.classification === "best" || evaluation.classification === "partial";
  const nextNodeKey = evaluation.nextNodeKey;
  const completed = nextNodeKey === "COMPLETE";
  const updated: StudentRecord = recompute({
    ...student,
    current_node_key: completed ? "H1_N10" : nextNodeKey,
    current_room_slug: completed ? "future_agent_lab_return" : NODE_BY_KEY[nextNodeKey]?.room_slug ?? student.current_room_slug,
    badge_progress: completed ? 100 : badgeProgressForNode(nextNodeKey),
    correct_count: student.correct_count + (correctish ? 1 : 0),
    wrong_count: student.wrong_count + (correctish ? 0 : 1),
    retry_count: correctish ? 0 : student.retry_count + 1,
    fast_correct_count: correctish && responseMs < 1500 ? student.fast_correct_count + 1 : student.fast_correct_count,
    last_choice: choiceId,
    last_classification: evaluation.classification,
    last_misconception: evaluation.misconception,
    last_response_ms: responseMs,
    memento: completed ? createMissionGoalCard(student.display_name) : student.memento,
  });
  session.students = session.students.map((item) => (item.id === studentId ? updated : item));
  session.updated_at = now();
  store.set(session.session_code, session);
  return { session, student: updated, evaluation, completed };
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

export function overrideStudent(sessionCodeValue: string, studentId: string, action: "skip" | "reset" | "assist") {
  const { session, student } = findStudent(sessionCodeValue, studentId);
  if (!session || !student) return null;
  let nextNode = student.current_node_key;
  if (action === "skip") {
    nextNode = NODE_BY_KEY[student.current_node_key]?.evaluation_key.next_node_if_best ?? "H1_N02";
    if (nextNode === "COMPLETE") nextNode = "H1_N10";
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

export function createMissionGoalCard(name: string): MissionGoalCard {
  return {
    chronoCadetName: name,
    mission: "TimeCity Rescue",
    cog9Goal: "Find why TimeCity is losing one minute every hour.",
    importantInput: "The repeated Future Market delivery record.",
    safeRule: "Define the goal, inspect clues, then choose the safest action.",
    expectedOutput: "COG-9 repairs the system without using unsafe shortcuts.",
    shouldNotDo: "Press AUTO-FIX before checking what it changes.",
    checkedBeforeActing: "Goal, input, rule and output.",
    badgeEarned: "Goal Badge",
  };
}
