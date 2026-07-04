#!/usr/bin/env node

import fs from "node:fs";

const graphText = fs.readFileSync("lib/game/fixedGraph.ts", "utf8");
const sideQuestText = fs.readFileSync("lib/game/sideQuests.ts", "utf8");

const nodeKeys = [...graphText.matchAll(/node_key: "(H1_N\d+)"/g)].map((match) => match[1]);
const roomSlugs = [...graphText.matchAll(/room_slug: "([^"]+)"/g)].map((match) => match[1]);
const sideQuestNodes = [...sideQuestText.matchAll(/node_key: "(H1_N\d+)"/g)].map((match) => match[1]);
const uniqueRooms = Array.from(new Set(roomSlugs));

const pacing = {
  setupMinutes: 5,
  mainDecisionMinutes: round(nodeKeys.length * 1.1),
  roomTransitionMinutes: round(Math.max(0, uniqueRooms.length - 1) * 0.45),
  sideQuestMinutes: 0,
  passportWrapMinutes: 3,
};
const estimatedMinutes = round(Object.values(pacing).reduce((sum, value) => sum + value, 0));

const checks = [
  {
    label: "Main decisions",
    pass: nodeKeys.length >= 20 && nodeKeys.length <= 30,
    value: nodeKeys.length,
    expected: "20-30",
  },
  {
    label: "Side quests are disabled",
    pass: new Set(sideQuestNodes).size === 0,
    value: new Set(sideQuestNodes).size,
    expected: "0",
  },
  {
    label: "Estimated child-paced duration",
    pass: estimatedMinutes >= 28 && estimatedMinutes <= 40,
    value: `${estimatedMinutes} minutes`,
    expected: "28-40 minutes",
  },
];

const report = {
  pass: checks.every((check) => check.pass),
  estimatedMinutes,
  pacing,
  nodeCount: nodeKeys.length,
  sideQuestCount: new Set(sideQuestNodes).size,
  roomCount: uniqueRooms.length,
  checks,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function round(value) {
  return Math.round(value * 10) / 10;
}
