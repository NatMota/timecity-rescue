export type SideQuest = {
  id: string;
  node_key: string;
  title: string;
  prompt: string;
  choices: Array<{ id: "A" | "B" | "C"; text: string; correct: boolean }>;
  success: string;
  retry: string;
};

const SIDE_QUESTS: Record<string, SideQuest> = {};

export function getSideQuestForNode(nodeKey: string) {
  return SIDE_QUESTS[nodeKey] ?? null;
}
