#!/usr/bin/env node

import fs from "node:fs";

const graphText = fs.readFileSync("lib/game/fixedGraph.ts", "utf8");
const sideQuestText = fs.readFileSync("lib/game/sideQuests.ts", "utf8");
const mementoText = fs.readFileSync("lib/memento/missionGoalCard.ts", "utf8");

const nodeBlocks = graphText
  .split(/\n  \{\n/)
  .slice(1)
  .map((block) => `  {\n${block}`)
  .filter((block) => /node_key: "H1_N\d+"/.test(block));

const nodeKeys = nodeBlocks.map((block) => matchOne(block, /node_key: "(H1_N\d+)"/));
const generativeReadyNodes = nodeBlocks
  .filter((block) => /scripted:\s*false/.test(block))
  .map((block) => matchOne(block, /node_key: "(H1_N\d+)"/));
const roomSequence = compact(nodeBlocks.map((block) => matchOne(block, /room_slug: "([^"]+)"/)));
const uniqueRooms = Array.from(new Set(roomSequence));
const concepts = compact(nodeBlocks.map((block) => matchOne(block, /curriculum_concept: "([^"]+)"/)));
const requiredBackpackItems = [...graphText.matchAll(/required_backpack_item: "([^"]+)"/g)].map((match) => match[1]);
const sideQuestNodes = [...sideQuestText.matchAll(/node_key: "(H1_N\d+)"/g)].map((match) => match[1]);
const sideQuestIds = [...sideQuestText.matchAll(/id: "([a-z][a-z0-9-]+)"/g)].map((match) => match[1]);

const expectedRoomOrder = [
  "future_trainstation",
  "future_market",
  "future_reactorcore",
  "1800_trainstation",
  "1800_signal_telegraph_office",
  "future_mayorhall",
  "future_agent_lab",
];

const requiredBackpack = ["data_slate", "debug_wrench", "prompt_card", "safety_seal", "agent_blueprint"];
const requiredConceptMatchers = [
  ["evidence before action", /explore before solving|evidence/i],
  ["inputs", /input/i],
  ["input versus output", /output/i],
  ["ask before acting", /ask before acting/i],
  ["clean data", /clean data/i],
  ["loop stopping condition", /loop|stopping condition/i],
  ["debugging", /debug/i],
  ["clear instructions", /instruction/i],
  ["safeguards", /safeguard|safety/i],
  ["agent blueprint", /blueprint/i],
  ["feedback loop", /feedback/i],
  ["mission reflection", /reflection/i],
];
const bannedJokeDistractors = [
  /brighter paint/i,
  /favourite crate sticker/i,
  /gets bored/i,
  /clapped loudly/i,
  /make a louder noise/i,
  /prettier/i,
  /shiny enough/i,
];

const checks = [
  {
    label: "Episode 1 uses the train-network pretotype route",
    pass: sameArray(uniqueRooms, expectedRoomOrder),
    value: uniqueRooms,
    expected: expectedRoomOrder,
  },
  {
    label: "Decision count supports 35-45 minute pretotype",
    pass: nodeKeys.length >= 20 && nodeKeys.length <= 30,
    value: nodeKeys.length,
    expected: "20-30 nodes",
  },
  {
    label: "Final node completes the mission",
    pass: /node_key: "H1_N24"[\s\S]*?next_node_if_best: "COMPLETE"/.test(graphText),
    value: nodeKeys.at(-1),
    expected: "H1_N24 -> COMPLETE",
  },
  {
    label: "Every scene is closed choice",
    pass: nodeBlocks.every((block) => {
      const choiceCount = [...block.matchAll(/\["[A-D]", "[^"]+"/g)].length;
      return choiceCount >= 3 && choiceCount <= 4;
    }),
    value: nodeBlocks.map((block) => [...block.matchAll(/\["[A-D]", "[^"]+"/g)].length),
    expected: "3-4 choices per node",
  },
  {
    label: "No open-chat or unsafe scene flags",
    pass: !/contains_open_chat:\s*true|asks_personal_data:\s*true|out_of_sandbox:\s*true/.test(graphText),
    value: "no true unsafe flags",
    expected: "all false",
  },
  {
    label: "At least 12 nodes are generative-ready behind the env flag",
    pass: generativeReadyNodes.length >= 12,
    value: generativeReadyNodes,
    expected: ">= 12 scripted:false nodes",
  },
  {
    label: "Learning concepts cover the pretotype objectives",
    pass: requiredConceptMatchers.every(([, matcher]) => concepts.some((concept) => matcher.test(concept))),
    value: concepts,
    expected: requiredConceptMatchers.map(([label]) => label),
  },
  {
    label: "Backpack item choices are represented",
    pass: requiredBackpack.every((item) => requiredBackpackItems.includes(item)),
    value: requiredBackpackItems,
    expected: requiredBackpack,
  },
  {
    label: "Side quests are disabled for the current prototype scope",
    pass: new Set(sideQuestNodes).size === 0 && new Set(sideQuestIds).size === 0,
    value: { nodes: Array.from(new Set(sideQuestNodes)), ids: Array.from(new Set(sideQuestIds)) },
    expected: "no side quests",
  },
  {
    label: "Agent Builder Passport contains journey evidence",
    pass:
      /Route taken/.test(mementoText) &&
      /Backpack items used/.test(mementoText) &&
      /I learned/.test(mementoText),
    value: "route/items/learning fields",
    expected: "passport evidence fields",
  },
  {
    label: "No known joke distractors remain",
    pass: bannedJokeDistractors.every((matcher) => !matcher.test(graphText)),
    value: "no banned distractor phrases found",
    expected: "plausible misconception distractors",
  },
];

const report = {
  pass: checks.every((check) => check.pass),
  nodeCount: nodeKeys.length,
  roomOrder: uniqueRooms,
  sideQuestCount: new Set(sideQuestNodes).size,
  requiredBackpackItems,
  checks,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function matchOne(text, matcher) {
  return text.match(matcher)?.[1];
}

function compact(items) {
  return items.filter(Boolean);
}

function sameArray(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
