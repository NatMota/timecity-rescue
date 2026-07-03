import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, getOpenAIModel } from "./client";
import { buildScenePrompt } from "./scenePrompt";
import { ScenePayloadSchema } from "./sceneSchema";
import { validateScenePayload } from "./validateScene";
import { getFallbackScene } from "@/lib/game/fallbackScenes";
import { NODE_BY_KEY } from "@/lib/game/fixedGraph";
import {
  errorMessage,
  logLlmGenerationEvent,
  promptHash,
  summarizeOpenAIUsage,
} from "@/lib/telemetry/server";
import type { Language, ScenePayload, StudentRecord } from "@/lib/game/types";

export async function generateScene(
  sessionCode: string,
  nodeKey: string,
  language: Language,
  student: StudentRecord | null,
): Promise<ScenePayload> {
  const client = getOpenAIClient();
  const prompt = buildScenePrompt(nodeKey, student, language);
  const model = getOpenAIModel();
  const hash = promptHash(prompt);
  const roomSlug = NODE_BY_KEY[nodeKey]?.room_slug;

  if (!client) {
    const scene = getFallbackScene(nodeKey, language);
    await logLlmGenerationEvent({
      sessionCode,
      studentId: student?.id,
      nodeKey,
      roomSlug,
      language,
      model,
      promptHash: hash,
      promptChars: prompt.length,
      success: false,
      usedFallback: true,
      errorMessage: "OpenAI client unavailable",
      scenePayload: scene,
    });
    return scene;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await client.responses.parse({
        model,
        input: prompt,
        text: {
          format: zodTextFormat(ScenePayloadSchema, "timecity_scene"),
        },
      });
      const latencyMs = Date.now() - startedAt;
      const parsed = response.output_parsed ?? JSON.parse(response.output_text);
      const validated = validateScenePayload(parsed);
      await logLlmGenerationEvent({
        sessionCode,
        studentId: student?.id,
        nodeKey,
        roomSlug,
        language,
        model,
        resolvedModel: response.model,
        promptHash: hash,
        promptChars: prompt.length,
        latencyMs,
        success: Boolean(validated.scene),
        usedFallback: false,
        validationErrors: validated.errors,
        usageDetails: summarizeOpenAIUsage(response),
        scenePayload: validated.scene,
      });
      if (validated.scene) return validated.scene;
    } catch (error) {
      await logLlmGenerationEvent({
        sessionCode,
        studentId: student?.id,
        nodeKey,
        roomSlug,
        language,
        model,
        promptHash: hash,
        promptChars: prompt.length,
        latencyMs: Date.now() - startedAt,
        success: false,
        usedFallback: false,
        errorMessage: errorMessage(error),
      });
      // Fall through to retry once, then deterministic fallback.
    }
  }
  const scene = getFallbackScene(nodeKey, language);
  await logLlmGenerationEvent({
    sessionCode,
    studentId: student?.id,
    nodeKey,
    roomSlug,
    language,
    model,
    promptHash: hash,
    promptChars: prompt.length,
    success: false,
    usedFallback: true,
    errorMessage: "Using deterministic fallback after failed generation attempts",
    scenePayload: scene,
  });
  return scene;
}
