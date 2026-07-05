#!/usr/bin/env node

const args = new Set(process.argv.slice(2));
const argValue = (name, fallback) => {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
};

const baseUrl = argValue("--base", process.env.TIMECITY_BASE_URL || "http://localhost:3010");
const expectMode = argValue("--expect", "generated");
const fullEpisodeNodes = Array.from({ length: 24 }, (_, index) => `H1_N${String(index + 1).padStart(2, "0")}`).join(",");
const targetNodes = argValue(
  "--nodes",
  process.env.TIMECITY_GENERATION_CONTRACT_NODES || fullEpisodeNodes,
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const maxSteps = Number(argValue("--max-steps", String(Math.max(24, targetNodes.length + 6))));
const scaffolded = args.has("--scaffolded");
const sessionCode = `GEN${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

async function main() {
  if (!["generated", "fallback", "any"].includes(expectMode)) {
    throw new Error(`Unsupported --expect=${expectMode}`);
  }

  const join = await post("/api/student/join", {
    session_code: sessionCode,
    display_name: "Generation Probe",
    avatar_color: "teal",
    language: "en",
  });

  let student = join.student;
  let state = await get(`/api/student/state?session_code=${join.session.session_code}&student_id=${join.student.id}`);
  let scene = state.scene;
  const observed = [];
  let scaffoldWrongChoices = scaffolded ? 2 : 0;

  for (let step = 0; step < maxSteps && scene; step += 1) {
    observed.push(sceneSummary(scene));
    if (targetNodes.every((node) => observed.some((entry) => entry.nodeKey === node))) break;

    const bestChoice = bestChoiceForScene(scene);
    if (!bestChoice) break;
    const scaffoldChoice =
      scaffoldWrongChoices > 0 ? scene.choices.find((choice) => choice.id !== bestChoice.id) ?? bestChoice : bestChoice;
    if (scaffoldWrongChoices > 0 && scaffoldChoice.id !== bestChoice.id) scaffoldWrongChoices -= 1;
    const submitted = await post("/api/choice/submit", {
      session_code: join.session.session_code,
      student_id: student.id,
      node_key: scene.node_key,
      room_slug: scene.room_slug,
      choice_id: scaffoldChoice.id,
      response_ms: 2400,
      scene_elapsed_ms: 2400,
      first_choice_ms: 2400,
      clue_count: 0,
      read_again_count: 0,
    });
    student = submitted.student;
    scene = submitted.scene;
    if (submitted.completed) break;
  }

  const targetEntries = targetNodes.map((node) => observed.find((entry) => entry.nodeKey === node) ?? missingNode(node));
  const checks = [
    {
      label: "Student joined",
      pass: Boolean(join.student?.id && join.session?.session_code),
      detail: join.session?.session_code || "missing session",
    },
    {
      label: "Target nodes observed",
      pass: targetEntries.every((entry) => entry.observed),
      detail: targetEntries.filter((entry) => !entry.observed).map((entry) => entry.nodeKey).join(", ") || "all target nodes observed",
    },
    {
      label: "Expected generation mode for target nodes",
      pass: expectMode === "any" || targetEntries.every((entry) => entry.mode === expectMode),
      detail: targetEntries.map((entry) => `${entry.nodeKey}:${entry.mode}`).join(", "),
    },
    {
      label: "Closed choices on target nodes",
      pass: targetEntries.every((entry) => entry.choiceCount >= 2 && entry.choiceCount <= 4),
      detail: targetEntries.map((entry) => `${entry.nodeKey}:${entry.choiceCount}`).join(", "),
    },
    {
      label: "Best choice visible on target nodes",
      pass: targetEntries.every((entry) => entry.bestChoiceVisible),
      detail: targetEntries.filter((entry) => !entry.bestChoiceVisible).map((entry) => entry.nodeKey).join(", ") || "all target nodes have a best choice",
    },
    {
      label: "Choice semantics match visible choices",
      pass: targetEntries.every((entry) => entry.choiceSemanticsPresent),
      detail: targetEntries.filter((entry) => !entry.choiceSemanticsPresent).map((entry) => entry.nodeKey).join(", ") || "all visible choices mapped",
    },
    {
      label: "Safety sandbox intact",
      pass: targetEntries.every((entry) => entry.safetySandbox),
      detail: targetEntries.filter((entry) => !entry.safetySandbox).map((entry) => entry.nodeKey).join(", ") || "all target nodes safe",
    },
    {
      label: "World state rendered in payload",
      pass: targetEntries.every((entry) => entry.worldStateVisible),
      detail: targetEntries.filter((entry) => !entry.worldStateVisible).map((entry) => entry.nodeKey).join(", ") || "all target nodes include world state",
    },
  ];

  const report = {
    pass: checks.every((check) => check.pass),
    baseUrl,
    expectMode,
    scaffolded,
    sessionCode: join.session?.session_code,
    targetNodes,
    observedNodeCount: observed.length,
    targetEntries,
    checks,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}

function sceneSummary(scene) {
  const choices = Array.isArray(scene?.choices) ? scene.choices : [];
  const mode = scene?.scene_id?.startsWith("fallback-") ? "fallback" : "generated";
  return {
    observed: true,
    nodeKey: scene?.node_key || "missing",
    roomSlug: scene?.room_slug || "missing",
    sceneId: scene?.scene_id || "missing",
    mode,
    speaker: scene?.dialogue?.speaker_name,
    difficulty: scene?.difficulty_level,
    choiceCount: choices.length,
    bestChoiceVisible: Boolean(bestChoiceForScene(scene)),
    choiceSemanticsPresent: choices.every((choice) => typeof scene.choice_semantic_map?.[choice.id] === "string"),
    safetySandbox: Boolean(
      scene?.safety_flags &&
        !scene.safety_flags.contains_open_chat &&
        !scene.safety_flags.asks_personal_data &&
        !scene.safety_flags.out_of_sandbox,
    ),
    worldStateVisible: Boolean(scene?.world_state && scene?.state_summary?.meters?.length >= 3),
    transitionTarget: scene?.transition?.target_year,
    choices: choices.map((choice) => ({ id: choice.id, text: choice.text })),
  };
}

function missingNode(nodeKey) {
  return {
    observed: false,
    nodeKey,
    roomSlug: "missing",
    sceneId: "missing",
    mode: "missing",
    choiceCount: 0,
    bestChoiceVisible: false,
    choiceSemanticsPresent: false,
    safetySandbox: false,
    worldStateVisible: false,
    choices: [],
  };
}

function bestChoiceForScene(scene) {
  return (scene?.choices || []).find((choice) => String(scene.choice_semantic_map?.[choice.id] || "").startsWith("best:"));
}

async function post(pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(response, pathname);
}

async function get(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  return parseResponse(response, pathname);
}

async function parseResponse(response, pathname) {
  const text = await response.text();
  if (!response.ok) throw new Error(`${pathname} ${response.status}: ${text}`);
  return JSON.parse(text);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
