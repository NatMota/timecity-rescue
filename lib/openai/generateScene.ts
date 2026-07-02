import { getOpenAIClient, getOpenAIModel } from "./client";
import { buildScenePrompt } from "./scenePrompt";
import { validateScenePayload } from "./validateScene";
import { getFallbackScene } from "@/lib/game/fallbackScenes";
import type { Language, ScenePayload, StudentRecord } from "@/lib/game/types";

export async function generateScene(nodeKey: string, language: Language, student: StudentRecord | null): Promise<ScenePayload> {
  const client = getOpenAIClient();
  if (!client) return getFallbackScene(nodeKey, language);

  const prompt = buildScenePrompt(nodeKey, student, language);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: getOpenAIModel(),
        input: prompt,
        text: {
          format: {
            type: "json_object",
          },
        },
      });
      const text = response.output_text;
      const parsed = JSON.parse(text);
      const validated = validateScenePayload(parsed);
      if (validated.scene) return validated.scene;
    } catch {
      // Fall through to retry once, then deterministic fallback.
    }
  }
  return getFallbackScene(nodeKey, language);
}
