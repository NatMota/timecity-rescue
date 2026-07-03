import type { Language } from "./types";

export type SideQuest = {
  id: string;
  node_key: string;
  title: string;
  prompt: string;
  choices: Array<{ id: "A" | "B" | "C"; text: string; correct: boolean }>;
  success: string;
  retry: string;
};

const SIDE_QUESTS: Record<string, Record<Language, SideQuest>> = {
  H1_N04: {
    en: {
      id: "cargo-cleanup",
      node_key: "H1_N04",
      title: "Side Quest: Cargo Clean-up",
      prompt: "One market record is noisy. Which one should stay out of the route data?",
      choices: [
        { id: "A", text: "Snack stall queue length", correct: true },
        { id: "B", text: "Fragile cargo label", correct: false },
        { id: "C", text: "Cold cargo label", correct: false },
      ],
      success: "Clean data added to the Data Slate.",
      retry: "Look for the record that does not affect train routing.",
    },
    zh: {
      id: "cargo-cleanup",
      node_key: "H1_N04",
      title: "支线任务：清理货物数据",
      prompt: "有一条市场记录是噪音。哪一条不应该放进路线数据？",
      choices: [
        { id: "A", text: "零食摊排队长度", correct: true },
        { id: "B", text: "易碎货物标签", correct: false },
        { id: "C", text: "冷藏货物标签", correct: false },
      ],
      success: "干净数据已加入数据板。",
      retry: "寻找不会影响火车路线的记录。",
    },
  },
  H1_N07: {
    en: {
      id: "loop-trace",
      node_key: "H1_N07",
      title: "Side Quest: Loop Trace",
      prompt: "Trace the charger loop. Which signal proves the loop can stop?",
      choices: [
        { id: "A", text: "The battery-full reading", correct: true },
        { id: "B", text: "How loud the charger sounds", correct: false },
        { id: "C", text: "A fixed repeat count without checking power", correct: false },
      ],
      success: "Debug Wrench found the stopping condition.",
      retry: "A loop stops because of a condition, not a feeling or decoration.",
    },
    zh: {
      id: "loop-trace",
      node_key: "H1_N07",
      title: "支线任务：追踪循环",
      prompt: "追踪充电器循环。哪个信号证明循环可以停止？",
      choices: [
        { id: "A", text: "电池已足够满的读数", correct: true },
        { id: "B", text: "充电器声音有多大", correct: false },
        { id: "C", text: "不检查电力的固定重复次数", correct: false },
      ],
      success: "调试扳手找到了停止条件。",
      retry: "循环因为条件而停止，不是因为感觉或装饰。",
    },
  },
  H1_N10: {
    en: {
      id: "telegraph-tidy",
      node_key: "H1_N10",
      title: "Side Quest: Telegraph Tidy",
      prompt: "Which word makes the message easier for COG-9 to follow?",
      choices: [
        { id: "A", text: "Before noon", correct: true },
        { id: "B", text: "Soon-ish", correct: false },
        { id: "C", text: "Maybe", correct: false },
      ],
      success: "Prompt Card upgraded the telegraph instruction.",
      retry: "Clear instructions reduce guessing.",
    },
    zh: {
      id: "telegraph-tidy",
      node_key: "H1_N10",
      title: "支线任务：整理电报",
      prompt: "哪个词能让 COG-9 更容易执行消息？",
      choices: [
        { id: "A", text: "中午前", correct: true },
        { id: "B", text: "差不多快点", correct: false },
        { id: "C", text: "也许", correct: false },
      ],
      success: "提示卡升级了电报指令。",
      retry: "清楚的指令会减少猜测。",
    },
  },
};

export function getSideQuestForNode(nodeKey: string, language: Language) {
  return SIDE_QUESTS[nodeKey]?.[language] ?? null;
}
