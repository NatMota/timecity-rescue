#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const args = new Set(process.argv.slice(2));
const argValue = (name, fallback) => {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
};

loadEnvFile(".env.local");

const baseUrl = argValue("--base", process.env.TIMECITY_BASE_URL || "http://localhost:3001");
const maxSteps = Number(argValue("--max-steps", "50"));
const useJudge = args.has("--judge");
const requireJudge = args.has("--require-judge");
const model = process.env.OPENAI_EVAL_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";
const roomExplorationSource = fs.existsSync("lib/game/roomExploration.ts")
  ? fs.readFileSync("lib/game/roomExploration.ts", "utf8")
  : "";

const JudgeSchema = z.object({
  pass: z.boolean(),
  score_1_to_5: z.number().min(1).max(5),
  story_tension_score_1_to_5: z.number().min(1).max(5),
  answer_leakage_risk: z.enum(["low", "medium", "high"]),
  bug_risk: z.enum(["low", "medium", "high"]),
  confusion_risk: z.enum(["low", "medium", "high"]),
  too_easy_nodes: z.array(z.string()),
  too_confusing_nodes: z.array(z.string()),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const evalJudges = [
  {
    id: "teacher_syllabus",
    title: "Teacher syllabus judge",
    prompt:
      "You are a UK computing teacher. Judge whether the playthrough teaches age-appropriate AI/computing ideas for class use: inputs, outputs, sequences, loops, debugging, rules, safeguards, feedback, and bounded agent behaviour. Be strict about curriculum clarity. Do not pass if the story is fun but the learning objective is vague.",
  },
  {
    id: "student_fun",
    title: "Student fun judge",
    prompt:
      "You are a 9-10-year-old student who wants a game, not a worksheet. Judge whether the story has tension, understandable stakes, character personality, agency, and a reason to continue. Be strict. Do not pass if it feels like clicking obvious quiz answers, if the answer is leaked before the challenge, or if character dialogue is dry.",
  },
];

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
    id: "story_seeker",
    displayName: "Story Seeker",
    avatarColor: "teal",
    language: "en",
    profile:
      "A 10-year-old who likes characters and mystery, but loses interest if every screen feels like a school quiz.",
    responseMs: 5400,
    firstChoiceMs: 3600,
    clueNodes: ["H1_N01", "H1_N11"],
    readAgainEvery: 6,
    wrongFirstNodes: ["H1_N05"],
  },
];

const bestChoiceByNode = {
  H1_N01: "B",
  H1_N02: "C",
  H1_N04: "B",
  H1_N05: "C",
  H1_N06: "B",
  H1_N13: "B",
  H1_N15: "B",
  H1_N16: "C",
  H1_N20: "C",
  H1_N24: "B",
};

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
    judge: useJudge ? { model, required: requireJudge } : null,
    results,
  };
  report.mechanicsPass = results.every((result) => result.pass);
  report.judgePass =
    !useJudge ||
    results.every((result) =>
      result.llmJudge?.skipped ? !requireJudge : result.llmJudge?.pass === true,
    );
  report.pass = report.mechanicsPass && report.judgePass;
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
      choices: scene.choices.map((choice) => ({ id: choice.id, text: choice.text })),
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
    memento.card?.routeTaken?.length >= 7 &&
    memento.card?.backpackItemsUsed?.length >= 5 &&
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
      routeTaken: memento.card?.routeTaken,
      backpackItemsUsed: memento.card?.backpackItemsUsed,
      sideQuestsCompleted: memento.card?.sideQuestsCompleted,
    },
  };
}

function chooseDeterministicChoice(scene, persona, attempts) {
  if (attempts === 0 && persona.wrongFirstNodes.includes(scene.node_key)) return "B";
  return bestChoiceByNode[scene.node_key] || "A";
}

async function judgePlaythrough(result) {
  if (!process.env.OPENAI_API_KEY) {
    return { skipped: true, reason: "OPENAI_API_KEY unavailable" };
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const compactTranscript = result.transcript.map((entry) => ({
    node: entry.node,
    room: entry.room,
    speaker: entry.speaker,
    dialogue: entry.dialogue,
    choices: entry.choices,
    choice: entry.choice.text,
    classification: entry.classification,
  }));
  const results = [];
  for (const judge of evalJudges) {
    const response = await client.responses.parse({
      model,
      text: {
        format: zodTextFormat(JudgeSchema, `persona_${judge.id}_judge`),
      },
      input: [
        judge.prompt,
        "Evaluate a classroom-safe button-only AI/coding adventure for 9-10-year-olds.",
        "The UI has full-screen illustrated rooms, character cutouts, room-specific exploration panels, dialogue overlays, fixed nav buttons, no open text input, and side quests are currently descoped. You are judging from the transcript, room exploration data, and stated UI, not a screenshot.",
        "Fail if the route completes but feels dry, leaks answers before the challenge, repeats generic labels, lacks story tension, or does not teach the promised concepts for your perspective.",
        JSON.stringify({
          judge: judge.id,
          persona: result.persona,
          profile: result.profile,
          language: result.language,
          finalNode: result.finalNode,
          progress: result.progress,
          wrong: result.wrong,
          supportUses: result.supportUses,
          roomExplorationSource,
          transcript: compactTranscript,
        }),
      ].join("\n\n"),
    });
    const parsed = response.output_parsed ?? parseJsonish(response.output_text || "{}");
    results.push({
      judge: judge.id,
      title: judge.title,
      result: parsed,
    });
  }
  const teacher = results.find((item) => item.judge === "teacher_syllabus")?.result;
  const student = results.find((item) => item.judge === "student_fun")?.result;
  return {
    judges: results,
    tension: {
      teacherScore: teacher?.score_1_to_5,
      studentFunScore: student?.score_1_to_5,
      scoreGap: teacher && student ? Math.abs(teacher.score_1_to_5 - student.score_1_to_5) : null,
      note: "Teacher syllabus and student fun are intentionally judged separately so a curriculum pass cannot hide a boring experience.",
    },
    pass: results.every((item) => judgeResultPasses(item.result, true)),
  };
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
    mechanicsPass: report.mechanicsPass,
    judgePass: report.judgePass,
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
      passport: {
        routeStops: result.memento.routeTaken?.length ?? 0,
        backpackItems: result.memento.backpackItemsUsed?.length ?? 0,
        sideQuests: result.memento.sideQuestsCompleted?.length ?? 0,
      },
      judge: result.llmJudge
        ? result.llmJudge.skipped
          ? {
              skipped: true,
              reason: result.llmJudge.reason,
            }
          : {
              judges: result.llmJudge.judges?.map((item) => ({
                judge: item.judge,
                score: item.result.score_1_to_5,
                tension: item.result.story_tension_score_1_to_5,
                answerLeakage: item.result.answer_leakage_risk,
                bugRisk: item.result.bug_risk,
                confusionRisk: item.result.confusion_risk,
                pass: item.result.pass,
              })),
              tension: result.llmJudge.tension,
              pass: result.llmJudge.pass,
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

function judgeResultPasses(judge, required) {
  if (!judge) return !required;
  if (judge.skipped) return !required;
  if (Array.isArray(judge.judges)) return judge.pass === true;
  return (
    judge.pass === true &&
    judge.score_1_to_5 >= 4 &&
    judge.story_tension_score_1_to_5 >= 3 &&
    judge.answer_leakage_risk !== "high" &&
    judge.bug_risk !== "high" &&
    judge.confusion_risk !== "high"
  );
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
