import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, getOpenAIModel } from "./client";
import { buildScenePrompt } from "./scenePrompt";
import { OpenAIScenePayloadSchema } from "./sceneSchema";
import { validateScenePayload } from "./validateScene";
import { getFallbackScene } from "@/lib/game/fallbackScenes";
import { choiceSemanticForNode, choiceSemanticMapForNode, NODE_BY_KEY } from "@/lib/game/fixedGraph";
import { difficultyForStudent } from "@/lib/game/adaptDifficulty";
import { worldStateSummary } from "@/lib/game/worldState";
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
  hint_ladder?: ScenePayload["hint_ladder"] | null;
  remediation?: ScenePayload["remediation"] | null;
  difficulty_level?: ScenePayload["difficulty_level"] | null;
  world_state?: ScenePayload["world_state"] | null;
  state_summary?: ScenePayload["state_summary"] | null;
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
  if (!scene.hint_ladder) delete scene.hint_ladder;
  if (!scene.remediation) {
    delete scene.remediation;
  } else if (!scene.remediation.consequence_text) {
    delete scene.remediation.consequence_text;
  }
  if (!scene.difficulty_level) delete scene.difficulty_level;
  if (!scene.world_state) delete scene.world_state;
  if (!scene.state_summary) {
    delete scene.state_summary;
  } else if (!scene.state_summary.event) {
    delete scene.state_summary.event;
  }
  if (!scene.consequence_preview) delete scene.consequence_preview;
  if (scene.choice_semantic_map) {
    scene.choice_semantic_map = Object.fromEntries(
      Object.entries(scene.choice_semantic_map).filter(([, value]) => typeof value === "string" && value.length > 0),
    ) as ScenePayload["choice_semantic_map"];
  }
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
  const generationEnabled = isGenerationEnabledForNode(nodeKey);
  debugGeneration("scene request", {
    nodeKey,
    generationEnabled,
    scripted: node?.scripted,
    flags: process.env.GENERATIVE_NODES || process.env.TIMECITY_GENERATIVE_NODES || "",
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
  });

  if (!generationEnabled) {
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
      usageDetails: { scripted: node?.scripted !== false, generativeReady: node?.scripted === false, generationEnabled },
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
      }, {
        timeout: 45000,
      });
      const latencyMs = Date.now() - startedAt;
      const parsed = normalizeGeneratedScene(response.output_parsed ?? JSON.parse(response.output_text));
      const semanticErrors = semanticMapErrors(nodeKey, parsed as ScenePayload);
      const enriched = withServerSceneFields(parsed as ScenePayload, student);
      const validated: { scene?: ScenePayload; errors: string[] } = semanticErrors.length
        ? { errors: semanticErrors }
        : validateScenePayload(enriched);
      if (!validated.scene) {
        debugGeneration("validation failed", { nodeKey, errors: validated.errors });
      }
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
      debugGeneration("openai generation failed", { nodeKey, error: errorMessage(error) });
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
  debugGeneration("using deterministic fallback", { nodeKey });
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

function debugGeneration(message: string, metadata: Record<string, unknown>) {
  if (process.env.TIMECITY_GENERATION_DEBUG !== "1") return;
  console.error(`[timecity:generation] ${message}`, metadata);
}

export function isGenerationEnabledForNode(nodeKey: string) {
  const node = NODE_BY_KEY[nodeKey];
  if (node?.scripted !== false) return false;
  const raw = process.env.GENERATIVE_NODES || process.env.TIMECITY_GENERATIVE_NODES || "";
  if (!raw) return false;
  if (raw.trim().toLowerCase() === "all") return true;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(nodeKey);
}

function withServerSceneFields(scene: ScenePayload, student: StudentRecord | null): ScenePayload {
  const difficulty = student ? difficultyForStudent(student) : scene.difficulty_level ?? 2;
  const retryAttempt = student?.node_attempts?.[scene.node_key] ?? 0;
  const fastGuessRetry = Boolean(
    retryAttempt > 0 && (student?.risk_flags?.fast_clicking || student?.risk_flags?.possible_guessing),
  );
  const choices =
    retryAttempt > 0
      ? scene.choices.map((choice) => ({
          ...choice,
          text: retryChoiceText(choice.text, retryAttempt, fastGuessRetry),
        }))
      : scene.choices;
  const safeSceneId = scene.scene_id.startsWith("fallback-")
    ? `generated-${scene.node_key}-${Date.now()}`
    : scene.scene_id;
  return {
    ...scene,
    scene_id: safeSceneId,
    choices,
    difficulty_level: difficulty,
    choice_semantic_map:
      scene.choice_semantic_map ??
      choiceSemanticMapForNode(
        scene.node_key,
        choices.map((choice) => choice.id),
      ),
    remediation:
      retryAttempt > 0
        ? {
            active: true,
            attempt: retryAttempt,
            scaffold_text:
              scene.remediation?.scaffold_text ||
              (fastGuessRetry
                ? "Slow down and compare the evidence before choosing."
                : "Use the clue to compare the two strongest pieces of evidence."),
            consequence_text: scene.remediation?.consequence_text || student?.last_world_event,
        }
        : scene.remediation,
    transition: scene.transition ?? NODE_BY_KEY[scene.node_key]?.fallback.transition,
    world_state: student?.world_state,
    state_summary: student?.world_state ? worldStateSummary(student.world_state, student.last_world_event) : undefined,
  };
}

function retryChoiceText(text: string, retryAttempt: number, fastGuessRetry: boolean) {
  if (/^(Evidence check|Slow check|Use the clue|Second check): /i.test(text)) return text;
  if (retryAttempt >= 2) return `Second check: ${text}`;
  return `${fastGuessRetry ? "Evidence check" : "Use the clue"}: ${text}`;
}

function semanticMapErrors(nodeKey: string, scene: ScenePayload) {
  const errors: string[] = [];
  if (!scene.choice_semantic_map) {
    return ["Generated scene must return choice_semantic_map."];
  }
  for (const choice of scene.choices ?? []) {
    if (scene.choice_semantic_map[choice.id] !== choiceSemanticForNode(nodeKey, choice.id)) {
      errors.push(`Generated choice ${choice.id} semantic map mismatched the evaluation key.`);
    }
  }
  return errors;
}
