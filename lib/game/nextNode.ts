import { EPISODE_ONE_NODES, FIRST_NODE_KEY, NODE_BY_KEY } from "./fixedGraph";

export function getSafeNodeKey(nodeKey?: string | null) {
  if (!nodeKey || nodeKey === "COMPLETE" || !NODE_BY_KEY[nodeKey]) return FIRST_NODE_KEY;
  return nodeKey;
}

export function badgeProgressForNode(nodeKey: string) {
  if (nodeKey === "COMPLETE") return 100;
  const order = NODE_BY_KEY[nodeKey]?.sort_order ?? 1;
  const denominator = Math.max(1, EPISODE_ONE_NODES.length - 1);
  return Math.min(100, Math.round(((order - 1) / denominator) * 100));
}
