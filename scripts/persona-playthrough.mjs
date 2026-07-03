#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const args = new Set(process.argv.slice(2));
const argValue = (name, fallback) => {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
};

loadEnvFile(".env.local");

const baseUrl = argValue("--base", process.env.TIMECITY_BASE_URL || "http://localhost:3001");
const maxSteps = Number(argValue("--max-steps", "50"));
const useJudge = args.has("--judge");
const model = process.env.OPENAI_EVAL_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";

const personas = [
  {
    id: "cautious_reader",
    displayName: "Cautious Reader",
    avatarColor: "blue",
    language: "en",
    profile:
      "A careful 9-year-old who reads slowly, uses support buttons, and wants reassurance before changing a system.",
    responseMs: 9200,
    firstChoiceMs: 6100,
    clueNodes: ["H1_N07", "H1_N21"],
    readAgainEvery: 4,
    wrongFirstNodes: [],
  },
  {
    id: "fast_clicker",
    displayName: "Fast Clicker",
    avatarColor: "amber",
    language: "en",
    profile:
      "A confident 10-year-old who clicks quickly, likes obvious wins, and sometimes chooses speed before checking constraints.",
    responseMs: 900,
    firstChoiceMs: 380,
    clueNodes: ["H1_N03", "H1_N19"],
    readAgainEvery: 0,
    wrongFirstNodes: ["H1_N03", "H1_N19"],
  },
  {
    id: "bilingual_builder",
    displayName: "Bilingual Builder",
    avatarColor: "teal",
    language: "zh",
    profile:
      "A bilingual 10-year-old who can read Simplified Chinese, likes building things, and needs computing terms to stay concrete.",
    responseMs: 6800,
    firstChoiceMs: 4200,
    clueNodes: ["H1_N10", "H1_N22"],
    readAgainEvery: 5,
    wrongFirstNodes: [],
  },
];

async function main() {
  const results = [];
  for (const persona of personas) {
    results.push(await runPersona(persona));
  }

  if (useJudge) {
    for (const result of results) {
      result.llmJudge = await judgePlaythrough(result);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    judge: useJudge ? { model } : null,
    results,
    pass: results.every((result) => result.pass),
  };
  fs.mkdirSync("artifacts", { recursive: true });
  const file = path.join("artifacts", `persona-playthrough-${Date.now()}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(summarizeReport(report, file), null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function runPersona(persona) {
  const sessionCode = `P${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const attemptsByNode = new Map();
  const transcript = [];
  let supportUses = { clue: 0, readAgain: 0 };
  let sideQuests = 0;

  const join = await post("/api/student/join", {
    session_code: sessionCode,
    display_name: persona.displayName,
    avatar_color: persona.avatarColor,
    language: persona.language,
  });
  let student = join.student;
  let state = await get(`/api/student/state?session_code=${sessionCode}&student_id=${student.id}`);
  let scene = state.scene;

  for (let step = 0; step < maxSteps; step += 1) {
    if (!scene) throw new Error(`${persona.id}: missing scene at step ${step}`);
    const attempts = attemptsByNode.get(scene.node_key) || 0;
    attemptsByNode.set(scene.node_key, attempts + 1);

    if (persona.readAgainEvery && step > 0 && step % persona.readAgainEvery === 0) {
      await supportSignal(sessionCode, student.id, scene, "read_again_count", persona.responseMs);
      supportUses.readAgain += 1;
    }
    if (persona.clueNodes.includes(scene.node_key) && attempts === 0) {
      await supportSignal(sessionCode, student.id, scene, "clue_count", persona.responseMs);
      supportUses.clue += 1;
    }
    if (["H1_N04", "H1_N07", "H1_N10"].includes(scene.node_key) && attempts === 0) {
      await post("/api/student/event", {
        session_code: sessionCode,
        student_id: student.id,
        event_type: "side_quest_choice",
        node_key: scene.node_key,
        room_slug: scene.room_slug,
        choice_id: "A",
        scene_elapsed_ms: persona.responseMs,
        metadata: { side_quest_id: `persona-${scene.node_key}`, correct: true },
      });
      sideQuests += 1;
    }

    const choiceId = chooseDeterministicChoice(scene, persona, attempts);
    const chosen = scene.choices.find((choice) => choice.id === choiceId) || scene.choices[0];
    const submitted = await post("/api/choice/submit", {
      session_code: sessionCode,
      student_id: student.id,
      node_key: scene.node_key,
      room_slug: scene.room_slug,
      choice_id: chosen.id,
      response_ms: persona.responseMs,
      scene_elapsed_ms: persona.responseMs,
      first_choice_ms: persona.firstChoiceMs,
      clue_count: supportUses.clue,
      read_again_count: supportUses.readAgain,
    });

    transcript.push({
      node: scene.node_key,
      room: scene.room_slug,
      speaker: scene.dialogue.speaker_name,
      dialogue: scene.dialogue.text,
      choice: { id: chosen.id, text: chosen.text },
      classification: submitted.classification,
      consequence: submitted.consequence,
      completed: Boolean(submitted.completed),
    });

    student = submitted.student;
    scene = submitted.scene;
    if (submitted.completed) break;
  }

  const memento = await post("/api/memento/generate", {
    session_code: sessionCode,
    student_id: student.id,
  });
  const pass =
    student.badge_progress === 100 &&
    student.current_node_key === "H1_N24" &&
    /Agent Builder Passport/.test(memento.html) &&
    transcript.some((entry) => entry.completed);

  return {
    persona: persona.id,
    profile: persona.profile,
    language: persona.language,
    sessionCode,
    pass,
    finalNode: student.current_node_key,
    progress: student.badge_progress,
    correct: student.correct_count,
    wrong: student.wrong_count,
    retries: student.retry_count,
    supportUses,
    sideQuests,
    transcript,
    memento: {
      badgeEarned: memento.card?.badgeEarned,
      hasPassportHtml: /Agent Builder Passport/.test(memento.html),
    },
  };
}

function chooseDeterministicChoice(scene, persona, attempts) {
  if (attempts === 0 && persona.wrongFirstNodes.includes(scene.node_key)) return "B";
  return "A";
}

async function judgePlaythrough(result) {
  if (!process.env.OPENAI_API_KEY) {
    return { skipped: true, reason: "OPENAI_API_KEY unavailable" };
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const compactTranscript = result.transcript.map((entry) => ({
    node: entry.node,
    dialogue: entry.dialogue,
    choice: entry.choice.text,
    classification: entry.classification,
  }));
  const response = await client.responses.create({
    model,
    input: [
      "You are evaluating a classroom-safe AI/coding adventure for 9-10-year-olds.",
      "Judge whether this persona could finish without bugs, whether the content supports agent-building objectives, and whether anything looks too confusing or too easy.",
      "Return strict JSON with keys: age_fit_score_1_to_5, objective_score_1_to_5, bug_risk, confusion_risk, recommendations.",
      JSON.stringify({
        persona: result.persona,
        profile: result.profile,
        language: result.language,
        finalNode: result.finalNode,
        progress: result.progress,
        wrong: result.wrong,
        supportUses: result.supportUses,
        sideQuests: result.sideQuests,
        transcript: compactTranscript,
      }),
    ].join("\n\n"),
  });
  return parseJsonish(response.output_text || "{}");
}

async function supportSignal(sessionCode, studentId, scene, signal, elapsedMs) {
  await post("/api/student/state", {
    session_code: sessionCode,
    student_id: studentId,
    signal,
    node_key: scene.node_key,
    room_slug: scene.room_slug,
    scene_elapsed_ms: elapsedMs,
  });
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

function summarizeReport(report, file) {
  return {
    pass: report.pass,
    file,
    baseUrl: report.baseUrl,
    judge: report.judge,
    personas: report.results.map((result) => ({
      persona: result.persona,
      pass: result.pass,
      finalNode: result.finalNode,
      progress: result.progress,
      correct: result.correct,
      wrong: result.wrong,
      sideQuests: result.sideQuests,
      judge: result.llmJudge
        ? result.llmJudge.skipped
          ? {
              skipped: true,
              reason: result.llmJudge.reason,
            }
          : {
            ageFit: result.llmJudge.age_fit_score_1_to_5,
            objective: result.llmJudge.objective_score_1_to_5,
            bugRisk: result.llmJudge.bug_risk,
            confusionRisk: result.llmJudge.confusion_risk,
          }
        : undefined,
    })),
  };
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    process.env[key] ||= value;
  }
}

function parseJsonish(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { raw: text };
    try {
      return JSON.parse(match[0]);
    } catch {
      return { raw: text };
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
