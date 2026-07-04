import { evaluateChoice, type ChoiceEvaluation } from "./evaluateChoice";
import { NODE_BY_KEY } from "./fixedGraph";
import { badgeProgressForNode } from "./nextNode";
import { difficultyForStudent, riskFlagsForStudent } from "./adaptDifficulty";
import { appendCharacterMemory } from "./worldState";
import type { Choice, StudentRecord } from "./types";

export type PredictedChoiceResult = {
  student: StudentRecord;
  evaluation: ChoiceEvaluation;
  completed: boolean;
};

export function predictStudentAfterChoice(
  student: StudentRecord,
  choiceId: string,
  responseMs = 2500,
): PredictedChoiceResult {
  const evaluation = evaluateChoice(student.current_node_key, choiceId, student.language, student.world_state);
  const correctish = evaluation.classification === "best" || evaluation.classification === "partial";
  const nextNodeKey = compressedNextNodeKey(student, evaluation.nextNodeKey, correctish);
  const completed = nextNodeKey === "COMPLETE";
  const currentNode = NODE_BY_KEY[student.current_node_key];
  const currentNodeAttempts = student.node_attempts?.[student.current_node_key] ?? 0;
  const nextRoomSlug = completed ? "future_agent_lab" : NODE_BY_KEY[nextNodeKey]?.room_slug ?? student.current_room_slug;
  const usedBackpackItems = appendUnique(
    student.used_backpack_items ?? [],
    correctish && currentNode?.required_backpack_item ? currentNode.required_backpack_item : undefined,
  );
  const visitedRoomSlugs = appendUnique(student.visited_room_slugs ?? [student.current_room_slug], nextRoomSlug);
  const predicted: StudentRecord = {
    ...student,
    current_node_key: completed ? "H1_N24" : nextNodeKey,
    current_room_slug: nextRoomSlug,
    badge_progress: completed ? 100 : badgeProgressForNode(nextNodeKey),
    world_state: evaluation.worldState,
    character_memory: appendCharacterMemory(student.character_memory, evaluation.worldStateDelta.memory),
    last_world_event: evaluation.consequence,
    node_attempts: {
      ...(student.node_attempts ?? {}),
      [student.current_node_key]: currentNodeAttempts + 1,
    },
    used_backpack_items: usedBackpackItems,
    visited_room_slugs: visitedRoomSlugs,
    correct_count: student.correct_count + (correctish ? 1 : 0),
    wrong_count: student.wrong_count + (correctish ? 0 : 1),
    retry_count: correctish ? 0 : student.retry_count + 1,
    fast_correct_count: correctish && responseMs < 1500 ? student.fast_correct_count + 1 : student.fast_correct_count,
    last_choice: choiceId,
    last_classification: evaluation.classification,
    last_misconception: evaluation.misconception,
    last_response_ms: responseMs,
  };
  const risk_flags = riskFlagsForStudent(predicted);
  const withDifficulty = {
    ...predicted,
    risk_flags,
    difficulty_level: difficultyForStudent({ ...predicted, risk_flags }),
  };
  return { student: withDifficulty, evaluation, completed };
}

function compressedNextNodeKey(student: StudentRecord, nextNodeKey: string, correctish: boolean) {
  if (!correctish || student.difficulty_level !== 3) return nextNodeKey;
  if (student.current_node_key === "H1_N15" && nextNodeKey === "H1_N16") return "H1_N17";
  if (student.current_node_key === "H1_N17" && nextNodeKey === "H1_N18") return "H1_N19";
  return nextNodeKey;
}

export function bestChoiceIdForNode(nodeKey: string): Choice["id"] | null {
  const best = NODE_BY_KEY[nodeKey]?.evaluation_key.best_choice_ids[0];
  return (best as Choice["id"] | undefined) ?? null;
}

function appendUnique<T>(items: T[], item: T | undefined) {
  if (item === undefined || items.includes(item)) return items;
  return [...items, item];
}
