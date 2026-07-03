#!/usr/bin/env node

import fs from "node:fs";

const files = {
  graph: "lib/game/fixedGraph.ts",
  types: "lib/game/types.ts",
  sideQuests: "lib/game/sideQuests.ts",
  director: "components/student/useStudentGameDirector.ts",
  stage: "components/student/SceneStage.tsx",
  memento: "lib/memento/missionGoalCard.ts",
  demoStore: "lib/game/demoStore.ts",
  readme: "README.md",
  architecturePlan: "../TimeCity-Rescue-Hackathon-Scoped-Architecture-Plan.md",
  interactionPlan: "../TimeCity-Rescue-Interaction-Learning-and-Prototype-Plan.md",
  invariantsPlan: "../TimeCity-Rescue-Invariants-Episode-Sandboxes-and-LLM-Operating-Rules.md",
};

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const appText = [
  source.graph,
  source.types,
  source.sideQuests,
  source.director,
  source.stage,
  source.memento,
  source.demoStore,
  source.readme,
].join("\n");

const planText = [source.architecturePlan, source.interactionPlan, source.invariantsPlan].join("\n");
const nodeBlocks = source.graph
  .split(/\n  \{\n/)
  .slice(1)
  .map((block) => `  {\n${block}`)
  .filter((block) => /node_key: "H1_N\d+"/.test(block));
const characters = new Set(compact(nodeBlocks.map((block) => matchOne(block, /character: "([^"]+)"/))));
const bloomLevels = compact(nodeBlocks.map((block) => matchOne(block, /bloom_level: "([^"]+)"/))).map((item) => item.toLowerCase());
const choiceTypes = new Set([...source.graph.matchAll(/allowed_choice_types: \[([^\]]+)\]/g)].flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1])));
const storyText = nodeBlocks.join("\n");

const checks = [
  {
    label: "Planning documents are present and contain the fixed Episode 1 invariants",
    pass:
      /The Missing Minute/.test(planText) &&
      /The game engine controls the story/.test(planText) &&
      /Navigation style[\s\S]{0,80}Room buttons only/.test(planText) &&
      /Input style[\s\S]{0,80}Closed[\\-]?-choice buttons/.test(planText),
    value: Object.values(files).filter((file) => file.startsWith("../")),
    expected: "architecture, interaction, and invariants plan files with fixed story rules",
  },
  {
    label: "Product metadata stays on the first chapter and age band",
    pass:
      /episode: "The Missing Minute"/.test(source.types) &&
      /age_band: "9-10"/.test(source.types) &&
      /9-10 year olds/.test(source.readme),
    value: "The Missing Minute / 9-10",
    expected: "Episode 1 for 9-10 year olds",
  },
  {
    label: "Story premise and outcome are visible in the playable surface and passport",
    pass:
      /missing minute/i.test(appText) &&
      /restored? (?:TimeCity|minute)|TimeCity keeps its restored minute|missing minute back/i.test(appText) &&
      /train COG-9|COG-9/.test(appText) &&
      /evidence/i.test(appText) &&
      /human check|human review|human oversight/i.test(appText),
    value: "missing minute, restoration, COG-9, evidence, and human review found",
    expected: "fixed premise and outcome from the plan are explicit",
  },
  {
    label: "Core characters are fixed to Ada, COG-9, and Nix",
    pass: sameSet(characters, new Set(["ada", "cog9", "nix"])),
    value: Array.from(characters),
    expected: ["ada", "cog9", "nix"],
  },
  {
    label: "Bloom-style rhythm appears across Episode 1",
    pass: ["remember", "understand", "apply", "analyze", "evaluate", "create"].every((level) => bloomLevels.includes(level)),
    value: Array.from(new Set(bloomLevels)),
    expected: ["remember", "understand", "apply", "analyze", "evaluate", "create"],
  },
  {
    label: "Session 1 concept spine covers agent goal, input, rule, output, and human supervision",
    pass:
      /goal/i.test(storyText) &&
      /input/i.test(storyText) &&
      /rule/i.test(storyText) &&
      /output/i.test(storyText) &&
      /human|safety check|safeguard|review/i.test(storyText),
    value: "goal/input/rule/output/human-review language found",
    expected: "Session 1 AI-readiness spine",
  },
  {
    label: "Student input remains bounded to planned closed-choice modes",
    pass:
      ["action", "why", "evidence", "ask_question", "backpack", "autocomplete_finish"].every((type) => choiceTypes.has(type)) &&
      !/<textarea|<input|contentEditable|contenteditable/.test([source.stage, source.director].join("\n")),
    value: Array.from(choiceTypes).sort(),
    expected: "closed buttons, why/evidence/backpack/question/autocomplete choices, no free text",
  },
  {
    label: "Navigation is route-button style, not free map roaming",
    pass:
      /student-nav-actions/.test(source.stage) &&
      /mapSurface\.stops\.map/.test(source.stage) &&
      !/mission\.mapSurface\.stops[\s\S]{0,220}onClick/.test(source.stage) &&
      !/draggable|canvas|pointerlock|useMapMovement/.test(source.stage + source.director),
    value: "fixed route list rendered without clickable room destinations",
    expected: "room/route buttons only; no free-roam map movement",
  },
  {
    label: "Side quests, backpack, and memento evidence match the richer pretotype cut",
    pass:
      new Set([...source.sideQuests.matchAll(/node_key: "(H1_N\d+)"/g)].map((match) => match[1])).size === 3 &&
      /required_backpack_item/.test(source.graph) &&
      /Backpack items used/.test(source.memento) &&
      /Side quests/.test(source.memento) &&
      /Route taken/.test(source.memento),
    value: "3 side quests, backpack-gated nodes, route/item/side-quest passport evidence",
    expected: "side quests, backpack, and printable evidence",
  },
  {
    label: "Tone is debug-oriented and not shaming",
    pass:
      /debug clue|Debugging means|Try one new clue|smaller step/i.test(appText) &&
      !/you failed|bad student|stupid|wrong answer/i.test(appText),
    value: "debug language found; shaming phrases absent",
    expected: "curious, playful, safe, mission-based, never shaming",
  },
];

const report = {
  pass: checks.every((check) => check.pass),
  checks,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function read(file) {
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8");
}

function matchOne(text, matcher) {
  return text.match(matcher)?.[1];
}

function compact(items) {
  return items.filter(Boolean);
}

function sameSet(left, right) {
  return left.size === right.size && Array.from(left).every((item) => right.has(item));
}
