import { z } from "zod";

export const ScenePayloadSchema = z.object({
  scene_id: z.string(),
  node_key: z.string(),
  room_slug: z.string(),
  language: z.enum(["en", "zh"]),
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
    .min(3)
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
  language: z.enum(["en", "zh"]),
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
    .min(3)
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
