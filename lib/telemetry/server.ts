import { createHash } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Language, ScenePayload } from "@/lib/game/types";

type JsonRecord = Record<string, unknown>;

export type ClickstreamEventInput = {
  sessionCode: string;
  studentId?: string;
  actor?: "student" | "teacher" | "system";
  eventType: string;
  route?: string;
  nodeKey?: string;
  roomSlug?: string;
  choiceId?: string;
  choiceClassification?: string;
  misconception?: string;
  responseMs?: number;
  sceneElapsedMs?: number;
  firstChoiceMs?: number;
  clueCount?: number;
  readAgainCount?: number;
  metadata?: JsonRecord;
};

export type LlmGenerationEventInput = {
  sessionCode?: string;
  studentId?: string;
  nodeKey: string;
  roomSlug?: string;
  language: Language;
  model: string;
  resolvedModel?: string;
  promptHash: string;
  promptChars: number;
  latencyMs?: number;
  success: boolean;
  usedFallback: boolean;
  validationErrors?: string[];
  errorMessage?: string;
  usageDetails?: JsonRecord;
  scenePayload?: ScenePayload;
};

function compactRecord(record: JsonRecord = {}) {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, compactValue(value)]),
  );
}

function compactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactValue);
  if (!value || typeof value !== "object") return value;
  return compactRecord(value as JsonRecord);
}

function finiteNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}

function normalizeSessionCode(value: string | undefined) {
  const normalized = String(value || "").toUpperCase();
  return normalized || null;
}

export function promptHash(prompt: string) {
  return createHash("sha256").update(prompt).digest("hex");
}

export function summarizeOpenAIUsage(response: unknown): JsonRecord {
  const usage = (response as { usage?: unknown })?.usage;
  if (!usage || typeof usage !== "object") return {};
  return compactRecord(usage as JsonRecord);
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function logClickstreamEvent(input: ClickstreamEventInput) {
  const supabase = getSupabaseAdminClient();
  const sessionCode = normalizeSessionCode(input.sessionCode);
  if (!supabase || !sessionCode) return;

  const { error } = await supabase.from("clickstream_events").insert({
    session_code: sessionCode,
    student_id: input.studentId || null,
    actor: input.actor || "student",
    event_type: input.eventType,
    route: input.route || null,
    node_key: input.nodeKey || null,
    room_slug: input.roomSlug || null,
    choice_id: input.choiceId || null,
    choice_classification: input.choiceClassification || null,
    misconception: input.misconception || null,
    response_ms: finiteNumber(input.responseMs),
    scene_elapsed_ms: finiteNumber(input.sceneElapsedMs),
    first_choice_ms: finiteNumber(input.firstChoiceMs),
    clue_count: finiteNumber(input.clueCount),
    read_again_count: finiteNumber(input.readAgainCount),
    metadata: compactRecord(input.metadata),
  });

  if (error) console.error("Failed to log TimeCity clickstream event", error.message);
}

export async function logLlmGenerationEvent(input: LlmGenerationEventInput) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("llm_generation_events").insert({
    session_code: normalizeSessionCode(input.sessionCode),
    student_id: input.studentId || null,
    node_key: input.nodeKey,
    room_slug: input.roomSlug || null,
    language: input.language,
    model: input.model,
    resolved_model: input.resolvedModel || null,
    prompt_hash: input.promptHash,
    prompt_chars: input.promptChars,
    latency_ms: finiteNumber(input.latencyMs),
    success: input.success,
    used_fallback: input.usedFallback,
    validation_errors: input.validationErrors || [],
    error_message: input.errorMessage || null,
    usage_details: compactRecord(input.usageDetails),
    scene_payload: input.scenePayload || null,
  });

  if (error) console.error("Failed to log TimeCity LLM generation event", error.message);
}
