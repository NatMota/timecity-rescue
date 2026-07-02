import { NODE_BY_KEY } from "./fixedGraph";
import type { ChoiceClassification } from "./types";

export type ChoiceEvaluation = {
  classification: ChoiceClassification;
  misconception?: string;
  nextNodeKey: string;
  consequence: string;
};

const CONSEQUENCES: Record<ChoiceClassification, string> = {
  best: "That choice gives COG-9 a safer way to think. TimeCity steadies for a moment.",
  partial: "That caused a useful debug clue. Ada helps you connect it to the safer rule.",
  misconception: "Nix found a shortcut, but shortcuts need checking. Try the clue another way.",
  wrong: "That caused a useful debug clue. Let's test the idea with a smaller step.",
};

export function evaluateChoice(nodeKey: string, choiceId: string): ChoiceEvaluation {
  const node = NODE_BY_KEY[nodeKey] ?? NODE_BY_KEY.H1_N01;
  const key = node.evaluation_key;

  if (key.best_choice_ids.includes(choiceId)) {
    return {
      classification: "best",
      nextNodeKey: key.next_node_if_best,
      consequence: CONSEQUENCES.best,
    };
  }

  if (key.partial_choice_ids.includes(choiceId)) {
    return {
      classification: "partial",
      misconception: key.misconception_map[choiceId],
      nextNodeKey: key.next_node_if_partial,
      consequence: CONSEQUENCES.partial,
    };
  }

  if (key.misconception_map[choiceId]) {
    return {
      classification: "misconception",
      misconception: key.misconception_map[choiceId],
      nextNodeKey: key.next_node_if_retry,
      consequence: CONSEQUENCES.misconception,
    };
  }

  return {
    classification: "wrong",
    nextNodeKey: key.next_node_if_retry,
    consequence: CONSEQUENCES.wrong,
  };
}
