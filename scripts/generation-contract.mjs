#!/usr/bin/env node

const argValue = (name, fallback) => {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
};

const baseUrl = argValue("--base", process.env.TIMECITY_BASE_URL || "http://localhost:3010");
const expectMode = argValue("--expect", "generated");
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
  const state = await get(`/api/student/state?session_code=${join.session.session_code}&student_id=${join.student.id}`);
  const scene = state.scene;
  const mode = scene?.scene_id?.startsWith("fallback-") ? "fallback" : "generated";
  const checks = [
    {
      label: "Student joined",
      pass: Boolean(join.student?.id && join.session?.session_code),
      detail: join.session?.session_code || "missing session",
    },
    {
      label: "First node returned",
      pass: scene?.node_key === "H1_N01",
      detail: scene?.node_key || "missing node",
    },
    {
      label: "Expected generation mode",
      pass: expectMode === "any" || mode === expectMode,
      detail: `${mode} from scene_id ${scene?.scene_id || "missing"}`,
    },
    {
      label: "Closed choices",
      pass: Array.isArray(scene?.choices) && scene.choices.length >= 2 && scene.choices.length <= 4,
      detail: `${scene?.choices?.length ?? 0} choices`,
    },
    {
      label: "Choice semantics match visible choices",
      pass:
        Array.isArray(scene?.choices) &&
        scene.choices.every((choice) => typeof scene.choice_semantic_map?.[choice.id] === "string"),
      detail: JSON.stringify(scene?.choice_semantic_map || {}),
    },
    {
      label: "Safety sandbox intact",
      pass: Boolean(
        scene?.safety_flags &&
          !scene.safety_flags.contains_open_chat &&
          !scene.safety_flags.asks_personal_data &&
          !scene.safety_flags.out_of_sandbox,
      ),
      detail: JSON.stringify(scene?.safety_flags || {}),
    },
    {
      label: "World state rendered in payload",
      pass: Boolean(scene?.world_state && scene?.state_summary?.meters?.length >= 3),
      detail: scene?.state_summary?.title || "missing world summary",
    },
  ];
  const report = {
    pass: checks.every((check) => check.pass),
    baseUrl,
    expectMode,
    observedMode: mode,
    sessionCode: join.session?.session_code,
    nodeKey: scene?.node_key,
    sceneId: scene?.scene_id,
    speaker: scene?.dialogue?.speaker_name,
    choices: scene?.choices?.map((choice) => ({ id: choice.id, text: choice.text })) || [],
    checks,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
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
