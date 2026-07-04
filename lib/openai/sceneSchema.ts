import { z } from "zod";

const WorldStateSchema = z.object({
  clock_offset_minutes: z.number(),
  trains: z.object({
    dispatched_unsafe: z.number(),
    safe_runs: z.number(),
  }),
  battery_pct: z.number(),
  cargo: z.object({
    medicine: z.enum(["at_risk", "safe", "lost"]),
    glass: z.enum(["at_risk", "safe", "lost"]),
    heavy: z.enum(["at_risk", "safe", "lost"]),
  }),
  city_stability: z.number(),
  nix_influence: z.number(),
  flags: z.array(z.string()),
});

const StateSummarySchema = z.object({
  title: z.string(),
  event: z.string().optional(),
  meters: z.array(
    z.object({
      id: z.enum(["clock", "stability", "battery", "nix", "trains"]),
      label: z.string(),
      value: z.number(),
      max: z.number(),
      text: z.string(),
      tone: z.enum(["safe", "warning", "danger", "neutral"]),
    }),
  ),
  flags: z.array(z.string()),
});

const OpenAIStateSummarySchema = z.object({
  title: z.string(),
  event: z.string().nullable(),
  meters: z.array(
    z.object({
      id: z.enum(["clock", "stability", "battery", "nix", "trains"]),
      label: z.string(),
      value: z.number(),
      max: z.number(),
      text: z.string(),
      tone: z.enum(["safe", "warning", "danger", "neutral"]),
    }),
  ),
  flags: z.array(z.string()),
});

const HintLadderSchema = z.object({
  step: z.number(),
  hints: z.array(z.string()).min(1).max(3),
  current_hint: z.string(),
  speaker_name: z.string(),
});

const RemediationSchema = z.object({
  active: z.boolean(),
  attempt: z.number(),
  scaffold_text: z.string(),
  consequence_text: z.string().optional(),
});

const OpenAIRemediationSchema = z.object({
  active: z.boolean(),
  attempt: z.number(),
  scaffold_text: z.string(),
  consequence_text: z.string().nullable(),
});

const ChoiceSemanticMapSchema = z
  .object({
    A: z.string().optional(),
    B: z.string().optional(),
    C: z.string().optional(),
    D: z.string().optional(),
  })
  .optional();

const OpenAIChoiceSemanticMapSchema = z.object({
  A: z.string().nullable(),
  B: z.string().nullable(),
  C: z.string().nullable(),
  D: z.string().nullable(),
});

const DifficultyLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const TransitionSchema = z.object({
  kind: z.literal("time_jump"),
  title: z.string(),
  text: z.string(),
  target_year: z.literal("1888"),
});

export const ScenePayloadSchema = z.object({
  scene_id: z.string(),
  node_key: z.string(),
  room_slug: z.string(),
  language: z.literal("en"),
  character: z.enum(["ada", "cog9", "nix"]),
  character_state: z.enum([
    "neutral",
    "thinking",
    "encouraging",
    "warning",
    "excited",
    "uncertain",
    "mischievous",
    "caught",
  ]),
  dialogue: z.object({
    speaker_name: z.string(),
    text: z.string(),
    read_again_text: z.string(),
  }),
  choices: z
    .array(
      z.object({
        id: z.enum(["A", "B", "C", "D"]),
        text: z.string(),
        choice_type: z.enum([
          "action",
          "why",
          "evidence",
          "ask_question",
          "backpack",
          "autocomplete_start",
          "autocomplete_finish",
        ]),
      }),
    )
    .min(2)
    .max(4),
  backpack_prompt: z
    .object({
      required_item_slug: z.string().optional(),
      allowed_item_slugs: z.array(z.string()),
    })
    .optional(),
  clue: z
    .object({
      available: z.boolean(),
      text: z.string(),
    })
    .optional(),
  hint_ladder: HintLadderSchema.optional(),
  remediation: RemediationSchema.optional(),
  choice_semantic_map: ChoiceSemanticMapSchema,
  difficulty_level: DifficultyLevelSchema.optional(),
  world_state: WorldStateSchema.optional(),
  state_summary: StateSummarySchema.optional(),
  transition: TransitionSchema.optional(),
  consequence_preview: z
    .object({
      show_after_choice: z.boolean(),
      tone: z.enum(["positive", "debug", "warning"]),
    })
    .optional(),
  accessibility: z.object({
    reading_level: z.enum(["standard", "simplified"]),
    max_words_ok: z.boolean(),
  }),
  safety_flags: z.object({
    contains_open_chat: z.boolean(),
    asks_personal_data: z.boolean(),
    out_of_sandbox: z.boolean(),
  }),
});

export type ScenePayloadInput = z.infer<typeof ScenePayloadSchema>;

export const OpenAIScenePayloadSchema = z.object({
  scene_id: z.string(),
  node_key: z.string(),
  room_slug: z.string(),
  language: z.literal("en"),
  character: z.enum(["ada", "cog9", "nix"]),
  character_state: z.enum([
    "neutral",
    "thinking",
    "encouraging",
    "warning",
    "excited",
    "uncertain",
    "mischievous",
    "caught",
  ]),
  dialogue: z.object({
    speaker_name: z.string(),
    text: z.string(),
    read_again_text: z.string(),
  }),
  choices: z
    .array(
      z.object({
        id: z.enum(["A", "B", "C", "D"]),
        text: z.string(),
        choice_type: z.enum([
          "action",
          "why",
          "evidence",
          "ask_question",
          "backpack",
          "autocomplete_start",
          "autocomplete_finish",
        ]),
      }),
    )
    .min(2)
    .max(4),
  backpack_prompt: z
    .object({
      required_item_slug: z.string().nullable(),
      allowed_item_slugs: z.array(z.string()),
    })
    .nullable(),
  clue: z
    .object({
      available: z.boolean(),
      text: z.string(),
    })
    .nullable(),
  hint_ladder: HintLadderSchema.nullable(),
  remediation: OpenAIRemediationSchema.nullable(),
  choice_semantic_map: OpenAIChoiceSemanticMapSchema,
  difficulty_level: DifficultyLevelSchema.nullable(),
  world_state: WorldStateSchema.nullable(),
  state_summary: OpenAIStateSummarySchema.nullable(),
  consequence_preview: z
    .object({
      show_after_choice: z.boolean(),
      tone: z.enum(["positive", "debug", "warning"]),
    })
    .nullable(),
  accessibility: z.object({
    reading_level: z.enum(["standard", "simplified"]),
    max_words_ok: z.boolean(),
  }),
  safety_flags: z.object({
    contains_open_chat: z.boolean(),
    asks_personal_data: z.boolean(),
    out_of_sandbox: z.boolean(),
  }),
});
