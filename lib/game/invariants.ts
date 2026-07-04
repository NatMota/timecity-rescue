import { BACKPACK_ITEMS, CHARACTERS, choiceSemanticForNode, NODE_BY_KEY, ROOM_SEQUENCE } from "./fixedGraph";
import type { ScenePayload, StoryNode } from "./types";

export function validateInvariants(scene: ScenePayload) {
  const problems: string[] = [];
  if (!NODE_BY_KEY[scene.node_key]) problems.push("Unknown story node.");
  if (!ROOM_SEQUENCE.includes(scene.room_slug as (typeof ROOM_SEQUENCE)[number])) problems.push("Room is outside Episode 1.");
  if (!CHARACTERS.includes(scene.character as (typeof CHARACTERS)[number])) problems.push("Character is outside the sandbox.");
  if (scene.safety_flags.contains_open_chat) problems.push("Scene contains open chat.");
  if (scene.safety_flags.asks_personal_data) problems.push("Scene asks for personal data.");
  if (scene.safety_flags.out_of_sandbox) problems.push("Scene leaves the story sandbox.");
  if (scene.choices.length < 2 || scene.choices.length > 4) problems.push("Scene must have 2-4 choices.");
  if (scene.choices.length < 3 && scene.difficulty_level !== 1 && !scene.remediation?.active) {
    problems.push("Only difficulty-1 or remediation scenes may have 2 choices.");
  }
  if (new Set(scene.choices.map((choice) => choice.id)).size !== scene.choices.length) {
    problems.push("Scene choices must not repeat IDs.");
  }
  const fixedNode = NODE_BY_KEY[scene.node_key];
  const expectedSpeakerName = fixedNode?.fallback.dialogue.speaker_name;
  if (expectedSpeakerName && scene.dialogue.speaker_name !== expectedSpeakerName) {
    problems.push("Scene speaker name must match the fixed graph speaker name.");
  }
  const expectedChoiceIds = fixedNode?.fallback.choices.map((choice) => choice.id) ?? [];
  if (
    expectedChoiceIds.length > 0 &&
    scene.choices.some((choice) => !expectedChoiceIds.includes(choice.id) && choice.id !== "D")
  ) {
    problems.push("Scene choices must use fixed graph choice IDs or the advanced distractor slot.");
  }
  if (fixedNode && !scene.choices.some((choice) => fixedNode.evaluation_key.best_choice_ids.includes(choice.id))) {
    problems.push("Scene must include at least one best-choice ID.");
  }
  if (scene.choice_semantic_map) {
    for (const choice of scene.choices) {
      if (scene.choice_semantic_map[choice.id] !== choiceSemanticForNode(scene.node_key, choice.id)) {
        problems.push(`Choice ${choice.id} semantic map does not match the fixed evaluation key.`);
      }
    }
  }
  const textDriftProblems = fixedNode ? choiceTextDriftProblems(scene, fixedNode) : [];
  problems.push(...textDriftProblems);
  for (const issue of readingLevelProblems(scene)) problems.push(issue);
  for (const item of scene.backpack_prompt?.allowed_item_slugs ?? []) {
    if (!BACKPACK_ITEMS.includes(item as (typeof BACKPACK_ITEMS)[number])) problems.push(`Unknown backpack item: ${item}`);
  }
  return { valid: problems.length === 0, problems };
}

function choiceTextDriftProblems(scene: ScenePayload, fixedNode: StoryNode) {
  const problems: string[] = [];
  const canonical = new Map(fixedNode.fallback.choices.map((choice) => [choice.id, choice.text]));
  for (const choice of scene.choices) {
    if (choice.id === "D") continue;
    const canonicalText = canonical.get(choice.id);
    if (!canonicalText) continue;
    const overlap = tokenOverlap(choice.text, canonicalText);
    if (overlap.shared < 2 && overlap.ratio < 0.28) {
      problems.push(`Choice ${choice.id} wording drifts from its fixed semantic meaning.`);
    }
  }
  return problems;
}

function readingLevelProblems(scene: ScenePayload) {
  const checks = [
    ["Dialogue", scene.dialogue.text, 55],
    ["Read-again text", scene.dialogue.read_again_text, 55],
    ["Clue text", scene.clue?.text, 35],
    ["Hint", scene.hint_ladder?.current_hint, 35],
    ["Remediation scaffold", scene.remediation?.scaffold_text, 35],
    ["Remediation consequence", scene.remediation?.consequence_text, 35],
  ] as const;
  return checks
    .filter(([, text, limit]) => text && wordCount(text) > limit)
    .map(([label, , limit]) => `${label} is too long for the target reading level (${limit} words max).`);
}

function tokenOverlap(left: string, right: string) {
  const leftTokens = contentTokens(left);
  const rightTokens = contentTokens(right);
  const shared = leftTokens.filter((token) => rightTokens.includes(token)).length;
  return { shared, ratio: shared / Math.max(1, Math.min(leftTokens.length, rightTokens.length)) };
}

function contentTokens(text: string) {
  const stop = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "because",
    "before",
    "by",
    "for",
    "from",
    "if",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "then",
    "to",
    "with",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stop.has(token));
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
