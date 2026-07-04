import { generateScene } from "./generateScene";
import { bestChoiceIdForNode, predictStudentAfterChoice } from "@/lib/game/predictChoice";
import { NODE_BY_KEY } from "@/lib/game/fixedGraph";
import { normalizeWorldState } from "@/lib/game/worldState";
import type { Language, ScenePayload, StudentRecord } from "@/lib/game/types";

type CacheEntry = {
  scene: ScenePayload;
  createdAt: number;
};

declare global {
  var __timecitySceneCache: Map<string, CacheEntry> | undefined;
}

const cache = globalThis.__timecitySceneCache ?? new Map<string, CacheEntry>();
globalThis.__timecitySceneCache = cache;

const CACHE_TTL_MS = 1000 * 60 * 10;

export async function generateSceneCached(
  sessionCode: string,
  nodeKey: string,
  language: Language,
  student: StudentRecord | null,
): Promise<ScenePayload> {
  const key = sceneCacheKey(sessionCode, nodeKey, language, student);
  const existing = cache.get(key);
  if (existing && Date.now() - existing.createdAt < CACHE_TTL_MS) {
    return cloneScene(existing.scene);
  }
  const scene = await generateScene(sessionCode, nodeKey, language, student);
  cache.set(key, { scene: cloneScene(scene), createdAt: Date.now() });
  pruneCache();
  return scene;
}

export function preGenerateLikelyNextScene(sessionCode: string, student: StudentRecord | null | undefined) {
  if (!student || student.memento) return;
  const predictions = likelyNextPredictions(student);
  for (const prediction of uniquePredictions(predictions)) {
    if (prediction.completed || !NODE_BY_KEY[prediction.student.current_node_key]) continue;
    void generateSceneCached(
      sessionCode,
      prediction.student.current_node_key,
      prediction.student.language,
      prediction.student,
    ).catch((error) => {
      console.error("Failed to pre-generate TimeCity scene", error);
    });
  }
}

export function sceneCacheStats() {
  pruneCache();
  return { entries: cache.size };
}

function sceneCacheKey(sessionCode: string, nodeKey: string, language: Language, student: StudentRecord | null) {
  return stableStringify({
    sessionCode,
    studentId: student?.id ?? "anonymous",
    nodeKey,
    language,
    state: student
      ? {
          current_node_key: student.current_node_key,
          correct_count: student.correct_count,
          wrong_count: student.wrong_count,
          fast_correct_count: student.fast_correct_count,
          retry_count: student.retry_count,
          clue_count: student.clue_count,
          read_again_count: student.read_again_count,
          difficulty_level: student.difficulty_level,
          risk_flags: student.risk_flags,
          last_choice: student.last_choice,
          last_classification: student.last_classification,
          last_misconception: student.last_misconception,
          world_state: student.world_state,
          node_attempts: student.node_attempts,
          hint_counts: student.hint_counts,
          character_memory: student.character_memory,
        }
      : null,
  });
}

function pruneCache() {
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const [key, entry] of cache.entries()) {
    if (entry.createdAt < cutoff) cache.delete(key);
  }
}

function cloneScene(scene: ScenePayload): ScenePayload {
  return JSON.parse(JSON.stringify(scene)) as ScenePayload;
}

function likelyNextPredictions(student: StudentRecord) {
  const node = NODE_BY_KEY[student.current_node_key];
  const bestChoiceId = bestChoiceIdForNode(student.current_node_key);
  if (!node || !bestChoiceId) return [];
  const predictions = [predictStudentAfterChoice(student, bestChoiceId, 2500)];
  const retryChoiceId = node.fallback.choices.find((choice) => choice.id !== bestChoiceId)?.id;
  if (retryChoiceId) {
    predictions.push(predictStudentAfterChoice(student, retryChoiceId, 2500));
    predictions.push(predictStudentAfterChoice(student, retryChoiceId, 900));
  }
  return predictions;
}

function uniquePredictions(predictions: ReturnType<typeof predictStudentAfterChoice>[]) {
  const seen = new Set<string>();
  return predictions.filter((prediction) => {
    const key = stableStringify({
      completed: prediction.completed,
      node: prediction.student.current_node_key,
      language: prediction.student.language,
      retry_count: prediction.student.retry_count,
      difficulty_level: prediction.student.difficulty_level,
      risk_flags: prediction.student.risk_flags,
      last_choice: prediction.student.last_choice,
      last_classification: prediction.student.last_classification,
      last_response_ms: prediction.student.last_response_ms,
      node_attempts: prediction.student.node_attempts,
      world_state: normalizeWorldState(prediction.student.world_state),
    });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortValue(entry)]),
  );
}
