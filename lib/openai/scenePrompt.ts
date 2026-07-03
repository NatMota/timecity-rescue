import { difficultyForStudent, teacherRecommendedPrompt } from "@/lib/game/adaptDifficulty";
import { NODE_BY_KEY, BACKPACK_ITEMS, CHARACTERS, CHARACTER_PROFILES, ROOM_SEQUENCE } from "@/lib/game/fixedGraph";
import type { Language, StudentRecord } from "@/lib/game/types";

export function buildScenePrompt(nodeKey: string, student: StudentRecord | null, language: Language) {
  const node = NODE_BY_KEY[nodeKey] ?? NODE_BY_KEY.H1_N01;
  const difficulty = student ? difficultyForStudent(student) : 2;
  const coachPrompt = student ? teacherRecommendedPrompt(student) : "Ask the pupil to explain the evidence before acting.";
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
- Preserve story tension: TimeCity has a missing minute, a station is making unsafe train decisions, and each room should feel like solving a city problem.
- Do not give away the correct answer in dialogue, read-again text, clue text, or exploration-style scaffolding.
- Avoid generic phrases such as "useful inputs", "safe action", or "explore the problem" unless the scene ties them to a concrete train, clock, cargo, power, or timetable issue.
- Keep the current character's voice consistent with the character profile below.
- Use exactly the canonical choice IDs below, in the same order, with no extra choices.
- Use the canonical speaker name below exactly.
- If language is "en", use the canonical choice text exactly.
- If language is "zh", translate the canonical choice text, but keep the same IDs and order.
- If language is "en", every user-visible string must be in English.
- If language is "zh", every user-visible string must be in Simplified Chinese, including dialogue, read-again text, clue text, and choices.

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
        difficulty_level: difficulty,
        risk_flags: student.risk_flags,
      }
    : { language },
  null,
  2,
)}

Difficulty and coaching:
${JSON.stringify(
  {
    difficulty_level: difficulty,
    coaching_instruction: coachPrompt,
    if_stuck: "Use Socratic scaffolding: ask which evidence matters; do not reveal the answer.",
    if_fast_clicking: "Ask for evidence before speed; make tempting shortcuts plausible but unsafe.",
    if_doing_well: "Use less hand-holding and ask for a clearer why/explanation through the closed choices.",
  },
  null,
  2,
)}

Character profiles:
${JSON.stringify(CHARACTER_PROFILES, null, 2)}

Allowed rooms:
${JSON.stringify(ROOM_SEQUENCE)}

Allowed characters:
${JSON.stringify(CHARACTERS)}

Allowed backpack items:
${JSON.stringify(BACKPACK_ITEMS)}

Allowed choice types:
${JSON.stringify(node.allowed_choice_types)}

Canonical choices:
${JSON.stringify(node.fallback.choices, null, 2)}

Canonical speaker name:
${JSON.stringify(node.fallback.dialogue.speaker_name)}

Return only valid JSON matching the schema. Use language "${language}".`;
}
