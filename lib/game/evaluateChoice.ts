import { NODE_BY_KEY } from "./fixedGraph";
import { applyWorldStateDelta, consequenceForDelta, normalizeWorldState, worldDeltaForChoice } from "./worldState";
import type { Choice, ChoiceClassification, Language, WorldState, WorldStateDelta } from "./types";

export type ChoiceEvaluation = {
  classification: ChoiceClassification;
  misconception?: string;
  nextNodeKey: string;
  consequence: string;
  worldState: WorldState;
  worldStateDelta: WorldStateDelta;
};

export function evaluateChoice(
  nodeKey: string,
  choiceId: string,
  language: Language = "en",
  worldState?: WorldState,
): ChoiceEvaluation {
  void language;
  const node = NODE_BY_KEY[nodeKey] ?? NODE_BY_KEY.H1_N01;
  const key = node.evaluation_key;
  const startingWorldState = normalizeWorldState(worldState);

  if (key.best_choice_ids.includes(choiceId)) {
    return withWorldState(nodeKey, choiceId as Choice["id"], "best", key.next_node_if_best, startingWorldState);
  }

  if (key.partial_choice_ids.includes(choiceId)) {
    const misconception = key.misconception_map[choiceId];
    return withWorldState(
      nodeKey,
      choiceId as Choice["id"],
      "partial",
      key.next_node_if_partial,
      startingWorldState,
      misconception,
    );
  }

  if (key.misconception_map[choiceId]) {
    return withWorldState(
      nodeKey,
      choiceId as Choice["id"],
      "misconception",
      key.next_node_if_retry,
      startingWorldState,
      key.misconception_map[choiceId],
    );
  }

  return withWorldState(nodeKey, choiceId as Choice["id"], "wrong", key.next_node_if_retry, startingWorldState);
}

function withWorldState(
  nodeKey: string,
  choiceId: Choice["id"],
  classification: ChoiceClassification,
  nextNodeKey: string,
  startingWorldState: WorldState,
  misconception?: string,
): ChoiceEvaluation {
  const worldStateDelta = worldDeltaForChoice(nodeKey, choiceId, classification, misconception);
  const nextWorldState = applyWorldStateDelta(startingWorldState, worldStateDelta);
  const consequence = consequenceForDelta(startingWorldState, nextWorldState, worldStateDelta);
  return {
    classification,
    misconception,
    nextNodeKey,
    consequence,
    worldState: nextWorldState,
    worldStateDelta,
  };
}
