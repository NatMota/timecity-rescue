import { choiceSemanticMapForNode, NODE_BY_KEY } from "./fixedGraph";
import { difficultyForStudent } from "./adaptDifficulty";
import { worldStateSummary } from "./worldState";
import type { Choice, Language, ScenePayload, StudentRecord } from "./types";

const RETRY_DIALOGUE: Partial<Record<string, Record<string, string>>> = {
  H1_N01: {
    unreliable_evidence:
      "COG-9's hand hovers over the dispatch switch. The green sign is tempting, but the main clock and log still disagree. Which evidence check should stop him?",
    unsafe_shortcut:
      "The next train lurches forward in the simulator, then the clock splits again. COG-9 freezes. What should we check before moving anything real?",
  },
  H1_N02: {
    mixed_context_inputs:
      "Ada shakes her head. Cargo and passengers matter later, but the missing minute started in the station time evidence. Which input set explains that mismatch?",
    partial_time_evidence:
      "COG-9 tries the extra detail and his screen fills with noise. Which three time clues actually belong in this first check?",
  },
  H1_N03: {
    irrelevant_feature:
      "Nix grins as the DISPATCH button flashes faster. Speed is the trap. What question would reveal the risk before anyone presses it?",
    unsafe_shortcut:
      "Nix almost gets the button. Ada blocks it with the Safety Seal. What should we ask before trusting a glowing shortcut?",
  },
  H1_N05: {
    input_as_output:
      "COG-9 reads the manifest again. The manifest is evidence he reads, not the decision he creates. Which thing comes out of his route check?",
    display_as_output:
      "The warning panel blinks, but it is not the final route decision. Which result does COG-9 produce after reading the cargo evidence?",
  },
  H1_N10: {
    ambiguous_condition:
      "The 1888 worker reads the message twice and still hesitates. It has a track, but the timing and condition are fuzzy. Which wording removes the guesswork?",
    missing_specifics:
      "The telegraph clicks out a short order, but short is not the same as clear. Which message tells the worker exactly when and where?",
  },
  H1_N13: {
    missing_guardrail:
      "The blueprint flickers. A goal and a rule are not enough if the agent can act with no tools, feedback, or safety check. Which full build is safer?",
    surface_agent:
      "COG-9 tries to build from the output backward and the blueprint collapses. Which parts does a working helper need before it recommends routes?",
  },
  H1_N19: {
    loudest_signal_bias:
      "The loudest passenger gets a route, but the fragile cargo alarm starts screaming. What should the agent balance instead of volume?",
    delay_only_priority:
      "A delayed train gets priority, then a heavy cargo train rolls onto a weak track. What else belongs in the decision?",
  },
  H1_N21: {
    driver_only_debugging:
      "The driver followed the instruction exactly. That means the bug is probably in the rule or output check. What comparison will find it?",
    ignore_edge_case:
      "The average result looks fine until the glass cargo rattles again. Edge cases are where bugs hide. What should we inspect?",
  },
};

const GENERIC_RETRY_DIALOGUE: Record<string, string> = {
  misconception:
    "The city gives a warning pulse. That idea has a hidden risk. Look at the evidence again and choose the rule that prevents the same mistake.",
  wrong:
    "The simulator flashes amber. That move does not explain the broken signal yet. Try again by matching the evidence to the action.",
};

export function getFallbackScene(nodeKey: string, language: Language, student?: StudentRecord | null): ScenePayload {
  const node = NODE_BY_KEY[nodeKey] ?? NODE_BY_KEY.H1_N01;
  void language;
  const baseScene = node.fallback;
  return withAdaptiveSurface(withRetryDialogue(baseScene, student), student);
}

function withRetryDialogue(scene: ScenePayload, student?: StudentRecord | null): ScenePayload {
  if (
    !student ||
    student.current_node_key !== scene.node_key ||
    (student.last_classification !== "misconception" && student.last_classification !== "wrong")
  ) {
    return scene;
  }
  const retryText =
    (student.last_misconception && RETRY_DIALOGUE[scene.node_key]?.[student.last_misconception]) ||
    GENERIC_RETRY_DIALOGUE[student.last_classification];
  return {
    ...scene,
    scene_id: `${scene.scene_id}-retry-${student.last_misconception || student.last_classification}`,
    dialogue: {
      ...scene.dialogue,
      text: retryText,
      read_again_text: retryText,
    },
    clue: scene.clue
      ? {
          ...scene.clue,
          text: "Look for the hidden risk in the last choice, then match the evidence to the safest next action.",
        }
      : scene.clue,
  };
}

function withAdaptiveSurface(scene: ScenePayload, student?: StudentRecord | null): ScenePayload {
  const difficulty = student ? difficultyForStudent(student) : 2;
  const retryAttempt =
    student &&
    student.current_node_key === scene.node_key &&
    (student.last_classification === "misconception" || student.last_classification === "wrong")
      ? student.node_attempts?.[scene.node_key] ?? 1
      : 0;
  const fastGuessRetry = isFastGuessRetry(student, retryAttempt);
  const adaptedChoices = adaptChoices(scene, difficulty, student, retryAttempt);
  const hintLadder = hintLadderForScene(scene, student);
  return {
    ...scene,
    scene_id: `${scene.scene_id}-d${difficulty}${retryAttempt ? `-r${retryAttempt}` : ""}`,
    choices: adaptedChoices,
    hint_ladder: hintLadder,
    clue: {
      available: true,
      text: hintLadder.current_hint,
    },
    remediation: retryAttempt
      ? {
          active: true,
          attempt: retryAttempt,
          scaffold_text: remediationText(retryAttempt, fastGuessRetry),
          consequence_text: student?.last_world_event,
        }
      : undefined,
    difficulty_level: difficulty,
    choice_semantic_map: choiceSemanticMapForNode(
      scene.node_key,
      adaptedChoices.map((choice) => choice.id),
    ),
    world_state: student?.world_state,
    state_summary: student?.world_state ? worldStateSummary(student.world_state, student.last_world_event) : undefined,
  };
}

function adaptChoices(
  scene: ScenePayload,
  difficulty: 1 | 2 | 3,
  student: StudentRecord | null | undefined,
  retryAttempt: number,
) {
  const node = NODE_BY_KEY[scene.node_key] ?? NODE_BY_KEY.H1_N01;
  const bestChoice = scene.choices.find((choice) => node.evaluation_key.best_choice_ids.includes(choice.id));
  if (!bestChoice) return scene.choices;

  if (retryAttempt > 0) {
    const fastGuessRetry = isFastGuessRetry(student, retryAttempt);
    if (fastGuessRetry) {
      return rotateChoices(scene.choices, retryAttempt).map((choice) => focusRetryChoice(choice, retryAttempt));
    }
    const lastChoice = student?.last_choice
      ? scene.choices.find((choice) => choice.id === student.last_choice && choice.id !== bestChoice.id)
      : undefined;
    const distractor =
      lastChoice ?? scene.choices.find((choice) => !node.evaluation_key.best_choice_ids.includes(choice.id));
    return [bestChoice, distractor].filter(Boolean).map((choice) => softenRetryChoice(choice as Choice, retryAttempt));
  }

  if (difficulty === 1) {
    const distractor = scene.choices.find((choice) => !node.evaluation_key.best_choice_ids.includes(choice.id));
    return [bestChoice, distractor].filter(Boolean).map((choice) => simplifyChoice(choice as Choice));
  }

  if (difficulty === 3 && scene.choices.length < 4) {
    return [...scene.choices, advancedDistractor(scene)];
  }

  return scene.choices;
}

function isFastGuessRetry(student: StudentRecord | null | undefined, retryAttempt: number) {
  if (!student || retryAttempt <= 0) return false;
  return Boolean(
    student.risk_flags?.possible_guessing ||
      (student.last_response_ms && student.last_response_ms < 1300 && student.last_classification !== "best"),
  );
}

function remediationText(retryAttempt: number, fastGuessRetry: boolean) {
  if (fastGuessRetry) {
    return "COG-9 locks the quick-tap panel. Pick the evidence that would stop the same warning from happening again.";
  }
  if (retryAttempt >= 2) {
    return "Ada narrows the scene after the clue. Compare the visible warning with the route that prevents it.";
  }
  return "Ada rewinds the warning. The choices are still plausible, so use the clue before you pick.";
}

function rotateChoices(choices: Choice[], retryAttempt: number) {
  if (choices.length <= 1) return choices;
  const offset = choices.length === 2 ? 1 : (retryAttempt % (choices.length - 1)) + 1;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}

function simplifyChoice(choice: Choice): Choice {
  return {
    ...choice,
    text: choice.text.replace(/\s+/g, " ").replace(/ before /g, " first, then "),
  };
}

function softenRetryChoice(choice: Choice, retryAttempt: number): Choice {
  const prefix = retryAttempt >= 2 ? "After checking the warning: " : "Use the clue: ";
  return {
    ...choice,
    text: `${prefix}${choice.text.charAt(0).toLowerCase()}${choice.text.slice(1)}`,
  };
}

function focusRetryChoice(choice: Choice, retryAttempt: number): Choice {
  const prefix = retryAttempt >= 2 ? "Slow check: " : "Evidence check: ";
  return {
    ...choice,
    text: `${prefix}${choice.text.charAt(0).toLowerCase()}${choice.text.slice(1)}`,
  };
}

function advancedDistractor(scene: ScenePayload): Choice {
  const choiceType = scene.choices[0]?.choice_type ?? "action";
  const nodeSpecific = ADVANCED_DISTRACTORS_BY_NODE[scene.node_key];
  if (nodeSpecific) return { id: "D", text: nodeSpecific, choice_type: choiceType };
  const room = scene.room_slug;
  const text =
    room === "future_reactorcore"
      ? "Trust the dashboard if it looks stable for one quick test."
      : room === "future_market"
        ? "Use the cleanest-looking record and check the risky cargo later."
        : room === "future_agent_lab"
          ? "Let the agent act automatically, but only while the dashboard is green."
          : "Take the quickest safe-looking action, then inspect the evidence after.";
  return { id: "D", text, choice_type: choiceType };
}

const ADVANCED_DISTRACTORS_BY_NODE: Record<string, string> = {
  H1_N01: "Trust the two newest-looking displays and check the old clock after dispatch.",
  H1_N02: "Use the platform sign, passenger queue, and mayor's delay alarm as the first inputs.",
  H1_N03: "Ask whether the warning horn is loud enough to cover a risky dispatch.",
  H1_N04: "Use the cracked-glass scan first and ask loaders about frozen medicine later.",
  H1_N05: "Treat the warning note as the output because it appears after the cargo facts.",
  H1_N06: "Use the Prompt Card to rewrite the scans into one cleaner-looking note.",
  H1_N07: "Stop charging when the sparks look smaller, then check the battery afterwards.",
  H1_N08: "Inspect the timetable first because the loop happened while trains were moving.",
  H1_N09: "Choose the track first, then have the worker check cargo before the bell rings.",
  H1_N10: "Send the cargo train soon if the clerk thinks Track B is probably clear.",
  H1_N11: "Let speed win unless cargo warnings are already flashing red.",
  H1_N12: "Allow small automatic timetable changes if the agent writes them in the log.",
  H1_N13: "Build goal, inputs, rules, feedback, and live timetable access before safety review.",
  H1_N14: "Send fragile cargo to the fast track if the delay board is already red.",
  H1_N15: "Check whether the dashboard predicted success before looking at the cargo door.",
  H1_N16: "Count low-risk automatic changes as safe because they are easy to undo.",
  H1_N17: "Let the agent change only quiet timetable rows without asking anyone.",
  H1_N18: "Remember the route that looked fastest before the complaint arrived.",
  H1_N19: "Balance passengers and power now; add quiet cargo alarms after the crowd calms down.",
  H1_N20: "Run the first test on three routes so mistakes are easier to spot quickly.",
  H1_N21: "Compare only successful routes first so the broken glass case does not distort the test.",
  H1_N22: "Use the backup track only when both fragile cargo and passenger complaints are high.",
  H1_N23: "Because the rule lets COG-9 choose speed whenever the dashboard sounds confident.",
  H1_N24: "A routing assistant that can change quiet trains automatically and report later.",
};

function hintLadderForScene(scene: ScenePayload, student?: StudentRecord | null) {
  const count = Math.min(3, Math.max(1, (student?.hint_counts?.[scene.node_key] ?? 0) + 1));
  const baseHint = scene.clue?.text || "Look for the clue that changes the system.";
  const hints = [
    baseHint,
    "Name the clue that would change what the character does next.",
    "Ask what could break if that clue is ignored.",
  ];
  return {
    step: count,
    hints,
    current_hint: hints[count - 1],
    speaker_name: "COG-9",
  };
}
