export type Language = "en";

export type CharacterSlug = "ada" | "cog9" | "nix";

export type CharacterState =
  | "neutral"
  | "thinking"
  | "encouraging"
  | "warning"
  | "excited"
  | "uncertain"
  | "mischievous"
  | "caught";

export type ChoiceType =
  | "action"
  | "why"
  | "evidence"
  | "ask_question"
  | "backpack"
  | "autocomplete_start"
  | "autocomplete_finish";

export type ChoiceClassification = "best" | "partial" | "misconception" | "wrong";

export type Choice = {
  id: "A" | "B" | "C" | "D";
  text: string;
  choice_type: ChoiceType;
};

export type CargoStatus = "at_risk" | "safe" | "lost";

export type WorldState = {
  clock_offset_minutes: number;
  trains: {
    dispatched_unsafe: number;
    safe_runs: number;
  };
  battery_pct: number;
  cargo: {
    medicine: CargoStatus;
    glass: CargoStatus;
    heavy: CargoStatus;
  };
  city_stability: number;
  nix_influence: number;
  flags: string[];
};

export type WorldStateDelta = {
  clock_offset_minutes?: number;
  trains?: Partial<WorldState["trains"]>;
  battery_pct?: number;
  cargo?: Partial<WorldState["cargo"]>;
  city_stability?: number;
  nix_influence?: number;
  add_flags?: string[];
  remove_flags?: string[];
  event: string;
  memory?: string;
};

export type StateSummaryMeter = {
  id: "clock" | "stability" | "battery" | "nix" | "trains";
  label: string;
  value: number;
  max: number;
  text: string;
  tone: "safe" | "warning" | "danger" | "neutral";
};

export type StateSummary = {
  title: string;
  event?: string;
  meters: StateSummaryMeter[];
  flags: string[];
};

export type ScenePayload = {
  scene_id: string;
  node_key: string;
  room_slug: string;
  language: Language;
  character: CharacterSlug;
  character_state: CharacterState;
  dialogue: {
    speaker_name: string;
    text: string;
    read_again_text: string;
  };
  choices: Choice[];
  backpack_prompt?: {
    required_item_slug?: string;
    allowed_item_slugs: string[];
  };
  clue?: {
    available: boolean;
    text: string;
  };
  hint_ladder?: {
    step: number;
    hints: string[];
    current_hint: string;
    speaker_name: string;
  };
  remediation?: {
    active: boolean;
    attempt: number;
    scaffold_text: string;
    consequence_text?: string;
  };
  choice_semantic_map?: Partial<Record<Choice["id"], string>>;
  difficulty_level?: 1 | 2 | 3;
  world_state?: WorldState;
  state_summary?: StateSummary;
  consequence_preview?: {
    show_after_choice: boolean;
    tone: "positive" | "debug" | "warning";
  };
  accessibility: {
    reading_level: "standard" | "simplified";
    max_words_ok: boolean;
  };
  safety_flags: {
    contains_open_chat: boolean;
    asks_personal_data: boolean;
    out_of_sandbox: boolean;
  };
};

export type EvaluationKey = {
  best_choice_ids: string[];
  partial_choice_ids: string[];
  misconception_map: Record<string, string>;
  requires_followup: boolean;
  next_node_if_best: string;
  next_node_if_partial: string;
  next_node_if_retry: string;
};

export type StoryNode = {
  node_key: string;
  room_slug: string;
  room_title: string;
  character: CharacterSlug;
  bloom_level: string;
  curriculum_concept: string;
  fixed_story_beat: string;
  canonical_prompt_intent: string;
  allowed_choice_types: ChoiceType[];
  scripted?: boolean;
  required_backpack_item?: string;
  sort_order: number;
  fallback: ScenePayload;
  evaluation_key: EvaluationKey;
};

export type StudentRiskFlags = {
  fast_clicking?: boolean;
  weak_why?: boolean;
  stuck?: boolean;
  clue_heavy?: boolean;
  possible_guessing?: boolean;
};

export type StudentRecord = {
  id: string;
  display_name: string;
  avatar_color: string;
  language: Language;
  current_node_key: string;
  current_room_slug: string;
  badge_progress: number;
  backpack_items: string[];
  used_backpack_items: string[];
  visited_room_slugs: string[];
  completed_side_quest_ids: string[];
  clue_count: number;
  read_again_count: number;
  correct_count: number;
  wrong_count: number;
  fast_correct_count: number;
  difficulty_level: 1 | 2 | 3;
  retry_count: number;
  node_attempts: Record<string, number>;
  hint_counts: Record<string, number>;
  world_state: WorldState;
  character_memory: string[];
  last_world_event?: string;
  last_choice?: string;
  last_classification?: ChoiceClassification;
  last_misconception?: string;
  last_response_ms?: number;
  risk_flags: StudentRiskFlags;
  memento?: MissionGoalCard;
  joined_at: string;
  updated_at: string;
};

export type ClassSession = {
  id: string;
  session_code: string;
  mission: "TimeCity Rescue";
  episode: "The Missing Minute";
  age_band: "9-10";
  language_default: Language;
  status: "draft" | "started" | "paused";
  students: StudentRecord[];
  created_at: string;
  updated_at: string;
};

export type MissionGoalCard = {
  chronoCadetName: string;
  mission: "TimeCity Rescue";
  avatarColor: string;
  routeTaken: string[];
  cityLocationsVisited: string[];
  backpackItemsUsed: string[];
  sideQuestsCompleted: string[];
  fixedStatement: string;
  learnedStatement: string;
  cog9Goal: string;
  importantInput: string;
  safeRule: string;
  expectedOutput: string;
  shouldNotDo: string;
  checkedBeforeActing: string;
  nextMissionTeaser: string;
  badgeEarned: "Goal Badge" | "Route Badge" | "Data Badge" | "Debug Badge" | "Agent Badge";
};
