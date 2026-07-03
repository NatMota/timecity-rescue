import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, getOpenAIModel } from "./client";
import { buildScenePrompt } from "./scenePrompt";
import { OpenAIScenePayloadSchema } from "./sceneSchema";
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

type NullableGeneratedScene = ScenePayload & {
  backpack_prompt?: (NonNullable<ScenePayload["backpack_prompt"]> & { required_item_slug?: string | null }) | null;
  clue?: ScenePayload["clue"] | null;
  consequence_preview?: ScenePayload["consequence_preview"] | null;
};

function normalizeGeneratedScene(value: unknown) {
  const scene = { ...(value as NullableGeneratedScene) };
  if (!scene.backpack_prompt) {
    delete scene.backpack_prompt;
  } else if (!scene.backpack_prompt.required_item_slug) {
    delete scene.backpack_prompt.required_item_slug;
  }
  if (!scene.clue) delete scene.clue;
  if (!scene.consequence_preview) delete scene.consequence_preview;
  return scene;
}

export async function generateScene(
  sessionCode: string,
  nodeKey: string,
  language: Language,
  student: StudentRecord | null,
): Promise<ScenePayload> {
  const prompt = buildScenePrompt(nodeKey, student, language);
  const hash = promptHash(prompt);
  const node = NODE_BY_KEY[nodeKey];
  const roomSlug = node?.room_slug;

  if (node?.scripted) {
    const scene = getFallbackScene(nodeKey, language, student);
    await logLlmGenerationEvent({
      sessionCode,
      studentId: student?.id,
      nodeKey,
      roomSlug,
      language,
      model: "scripted-story",
      resolvedModel: "scripted-story",
      promptHash: hash,
      promptChars: prompt.length,
      success: true,
      usedFallback: false,
      usageDetails: { scripted: true },
      scenePayload: scene,
    });
    return scene;
  }

  const client = getOpenAIClient();
  const model = getOpenAIModel();

  if (!client) {
    const scene = getFallbackScene(nodeKey, language, student);
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
          format: zodTextFormat(OpenAIScenePayloadSchema, "timecity_scene"),
        },
      });
      const latencyMs = Date.now() - startedAt;
      const parsed = normalizeGeneratedScene(response.output_parsed ?? JSON.parse(response.output_text));
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
  const scene = getFallbackScene(nodeKey, language, student);
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
