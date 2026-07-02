import { NODE_BY_KEY, BACKPACK_ITEMS, CHARACTERS, ROOM_SEQUENCE } from "@/lib/game/fixedGraph";
import type { Language, StudentRecord } from "@/lib/game/types";

export function buildScenePrompt(nodeKey: string, student: StudentRecord | null, language: Language) {
  const node = NODE_BY_KEY[nodeKey] ?? NODE_BY_KEY.H1_N01;
  return `You are the TimeCity scene generator.

You must generate one safe closed-choice scene for a 9-10-year-old student.

Rigid invariants:
- Do not create new rooms.
- Do not create new characters.
- Do not change the story outcome.
- Do not ask for personal information.
- Do not use open text input.
- Do not produce free chat.
- Do not use harsh failure language.
- Do not use joke distractors in serious learning moments.
- Wrong answers must map to plausible misconceptions.
- Correct answers often require a why or evidence follow-up.
- Keep text short and age-appropriate.
- Preserve the fixed learning objective: an AI agent needs a goal, inputs, rules and outputs before safe action.

Current fixed node:
${JSON.stringify(
  {
    node_key: node.node_key,
    room_slug: node.room_slug,
    character: node.character,
    bloom_level: node.bloom_level,
    curriculum_concept: node.curriculum_concept,
    fixed_story_beat: node.fixed_story_beat,
    canonical_prompt_intent: node.canonical_prompt_intent,
    allowed_choice_types: node.allowed_choice_types,
  },
  null,
  2,
)}

Student state:
${JSON.stringify(
  student
    ? {
        language: student.language,
        current_node_key: student.current_node_key,
        correct_count: student.correct_count,
        wrong_count: student.wrong_count,
        clue_count: student.clue_count,
        read_again_count: student.read_again_count,
        risk_flags: student.risk_flags,
      }
    : { language },
  null,
  2,
)}

Allowed rooms:
${JSON.stringify(ROOM_SEQUENCE)}

Allowed characters:
${JSON.stringify(CHARACTERS)}

Allowed backpack items:
${JSON.stringify(BACKPACK_ITEMS)}

Allowed choice types:
${JSON.stringify(node.allowed_choice_types)}

Return only valid JSON matching the schema. Use language "${language}".`;
}
