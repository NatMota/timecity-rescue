import { NODE_BY_KEY } from "./fixedGraph";
import type { ChoiceClassification, Language } from "./types";

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

const ZH_CONSEQUENCES: Record<ChoiceClassification, string> = {
  best: "这个选择让 COG-9 更安全地思考。TimeCity 暂时稳定了。",
  partial: "这给了一个有用的调试线索。Ada 会帮你把它连接到更安全的规则。",
  misconception: "Nix 找到了捷径，但捷径需要先检查。换一种方式使用线索。",
  wrong: "这给了一个有用的调试线索。让我们用更小的一步测试这个想法。",
};

function consequenceFor(classification: ChoiceClassification, language: Language) {
  return language === "zh" ? ZH_CONSEQUENCES[classification] : CONSEQUENCES[classification];
}

export function evaluateChoice(nodeKey: string, choiceId: string, language: Language = "en"): ChoiceEvaluation {
  const node = NODE_BY_KEY[nodeKey] ?? NODE_BY_KEY.H1_N01;
  const key = node.evaluation_key;

  if (key.best_choice_ids.includes(choiceId)) {
    return {
      classification: "best",
      nextNodeKey: key.next_node_if_best,
      consequence: consequenceFor("best", language),
    };
  }

  if (key.partial_choice_ids.includes(choiceId)) {
    return {
      classification: "partial",
      misconception: key.misconception_map[choiceId],
      nextNodeKey: key.next_node_if_partial,
      consequence: consequenceFor("partial", language),
    };
  }

  if (key.misconception_map[choiceId]) {
    return {
      classification: "misconception",
      misconception: key.misconception_map[choiceId],
      nextNodeKey: key.next_node_if_retry,
      consequence: consequenceFor("misconception", language),
    };
  }

  return {
    classification: "wrong",
    nextNodeKey: key.next_node_if_retry,
    consequence: consequenceFor("wrong", language),
  };
}
