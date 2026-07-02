import { NODE_BY_KEY } from "./fixedGraph";
import type { Language, ScenePayload } from "./types";

const ZH_LINES: Record<string, string> = {
  H1_N01: "欢迎，时空学员。TimeCity 每小时会丢失一分钟。一个有用的智能体首先需要知道什么？",
  H1_N02: "目标已检测！我会快速修好所有东西。这个目标够清楚、够安全吗？",
  H1_N03: "按下自动修复吧。按钮又大又亮，大概没问题。你应该先做什么？",
  H1_N04: "未来市场正在循环。苹果无人机一次又一次送来同一个箱子。最好的第一个线索是什么？",
  H1_N05: "我看到送货记录进入系统，价格变化从系统出来。哪一个是输入？",
  H1_N06: "使用你的任务指南针。COG-9 行动前应该识别什么？",
  H1_N07: "完成我的第一条安全规则：“当城市出现故障时，首先……”",
  H1_N08: "完成你的解释：我选择这个是因为……",
  H1_N09: "你教会了我第一条规则。我学到了什么？",
  H1_N10: "任务指南针指向 1888 年。下一步应该预览什么？",
};

const ZH_CHOICES: Record<string, string[]> = {
  H1_N01: ["它的目标。", "它最喜欢的颜色。", "最快的按钮。"],
  H1_N02: ["是的，速度永远最好。", "还不够，“所有东西”太模糊。", "让 Nix 决定。"],
  H1_N03: ["马上按下。", "先问这个按钮会改变什么。", "把按钮藏在盒子下面。"],
  H1_N04: ["重复的送货记录。", "苹果摊的颜色。", "Nix 的帽子。"],
  H1_N05: ["送货记录。", "价格变化。", "目标徽章。"],
  H1_N06: ["目标、输入、规则和输出。", "帽子、苹果、火车和蒸汽。", "只找最快路径。"],
  H1_N07: ["定义目标并检查线索。", "按最大的按钮。", "让 Nix 猜。"],
  H1_N08: ["智能体行动前需要清楚目标。", "快速按钮很刺激。", "市场很有颜色。"],
  H1_N09: ["我可以帮忙，但需要目标和证据。", "我应该永远最快。", "我永远不该问人类。"],
  H1_N10: ["跟随信号去电报办公室。", "再次按自动修复。", "永远收起指南针。"],
};

export function getFallbackScene(nodeKey: string, language: Language): ScenePayload {
  const node = NODE_BY_KEY[nodeKey] ?? NODE_BY_KEY.H1_N01;
  if (language === "en") return node.fallback;
  return {
    ...node.fallback,
    language,
    dialogue: {
      ...node.fallback.dialogue,
      text: ZH_LINES[node.node_key] ?? node.fallback.dialogue.text,
      read_again_text: ZH_LINES[node.node_key] ?? node.fallback.dialogue.read_again_text,
    },
    choices: node.fallback.choices.map((choice, index) => ({
      ...choice,
      text: ZH_CHOICES[node.node_key]?.[index] ?? choice.text,
    })),
  };
}
