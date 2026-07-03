import { BACKPACK_ITEMS, CHARACTERS, NODE_BY_KEY, ROOM_SEQUENCE } from "./fixedGraph";
import type { ScenePayload } from "./types";

export function validateInvariants(scene: ScenePayload) {
  const problems: string[] = [];
  if (!NODE_BY_KEY[scene.node_key]) problems.push("Unknown story node.");
  if (!ROOM_SEQUENCE.includes(scene.room_slug as (typeof ROOM_SEQUENCE)[number])) problems.push("Room is outside Episode 1.");
  if (!CHARACTERS.includes(scene.character as (typeof CHARACTERS)[number])) problems.push("Character is outside the sandbox.");
  if (scene.safety_flags.contains_open_chat) problems.push("Scene contains open chat.");
  if (scene.safety_flags.asks_personal_data) problems.push("Scene asks for personal data.");
  if (scene.safety_flags.out_of_sandbox) problems.push("Scene leaves the story sandbox.");
  if (scene.choices.length < 3 || scene.choices.length > 4) problems.push("Scene must have 3-4 choices.");
  const fixedNode = NODE_BY_KEY[scene.node_key];
  const expectedSpeakerName = fixedNode?.fallback.dialogue.speaker_name;
  if (expectedSpeakerName && scene.dialogue.speaker_name !== expectedSpeakerName) {
    problems.push("Scene speaker name must match the fixed graph speaker name.");
  }
  const expectedChoiceIds = fixedNode?.fallback.choices.map((choice) => choice.id) ?? [];
  if (
    expectedChoiceIds.length > 0 &&
    (scene.choices.length !== expectedChoiceIds.length || scene.choices.some((choice, index) => choice.id !== expectedChoiceIds[index]))
  ) {
    problems.push("Scene choices must match the fixed graph choice IDs and order.");
  }
  if (scene.dialogue.text.split(/\s+/).length > 55) problems.push("Dialogue is too long for the target reading level.");
  for (const item of scene.backpack_prompt?.allowed_item_slugs ?? []) {
    if (!BACKPACK_ITEMS.includes(item as (typeof BACKPACK_ITEMS)[number])) problems.push(`Unknown backpack item: ${item}`);
  }
  return { valid: problems.length === 0, problems };
}
