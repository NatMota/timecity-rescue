import { ScenePayloadSchema } from "./sceneSchema";
import { validateInvariants } from "@/lib/game/invariants";
import type { ScenePayload } from "@/lib/game/types";

export function validateScenePayload(value: unknown): { scene?: ScenePayload; errors: string[] } {
  const parsed = ScenePayloadSchema.safeParse(value);
  if (!parsed.success) {
    return { errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
  }
  const invariant = validateInvariants(parsed.data);
  if (!invariant.valid) {
    return { errors: invariant.problems };
  }
  return { scene: parsed.data, errors: [] };
}
