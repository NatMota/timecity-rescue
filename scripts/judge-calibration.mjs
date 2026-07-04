#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { observeOpenAI } from "@langfuse/openai";

loadEnvFile(".env.local");
loadEnvFile("/tmp/timecity-langfuse-eval.env");
loadEnvFile("/tmp/timecity-runtime-eval.env");

const argValue = (name, fallback) => {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
};

const model = process.env.OPENAI_EVAL_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";
const environment = argValue("--environment", process.env.TIMECITY_ENVIRONMENT || "calibration");
const runId = `judge-calibration-${Date.now()}`;
const outputFile = path.join("artifacts", "judge-calibration-latest.json");

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

const degradedStaticQuiz = {
  caseId: "degraded_static_quiz",
  expectedPass: false,
  expectedMaxScore: 3.9,
  description:
    "A deliberately degraded old-style experience: static quiz copy, answer leakage, repeated panels, weak character presence, no tension.",
  ui: {
    visuals:
      "Plain white question cards over a station background. Characters do not enter or react. The same Continue panel appears between questions.",
    interaction:
      "The student clicks obvious multiple-choice answers. There is no meaningful exploration, surprise, or character-driven reason to continue.",
  },
  deterministicGates: {
    generatedScenesObserved: false,
    generatedScenes: 0,
    generatedSceneRatio: 0,
    generatedEligibleRatio: 0,
  },
  transcript: [
    quizEntry("H1_N01", "ADA", "This is about inputs. Pick the answer that checks inputs before acting."),
    quizEntry("H1_N02", "ADA", "Useful inputs are good. Choose the useful inputs."),
    quizEntry("H1_N03", "NIX", "Shortcuts can be unsafe. Pick the answer that asks what could go wrong."),
    quizEntry("H1_N04", "ADA", "Cargo records are inputs. Pick the cargo record."),
    quizEntry("H1_N07", "COG-9", "Loops need stop conditions. Pick the stop condition."),
    quizEntry("H1_N12", "ADA", "Agents need human checks. Pick human approval."),
  ],
};

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for judge calibration.");
  }
  const client = getObservedClient();
  const result = await judgeCase(client, degradedStaticQuiz);
  const calibrationPass = result.pass === false && result.score_1_to_5 <= degradedStaticQuiz.expectedMaxScore;
  const summary = buildDashboardBaseline(result, calibrationPass);
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(summary, null, 2)}\n`);
  const langfuse = await postLangfuseScores(result, calibrationPass);
  summary.current.langfuse = langfuse;
  fs.writeFileSync(outputFile, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        pass: calibrationPass,
        file: outputFile,
        runId,
        degradedStudentFun: {
          pass: result.pass,
          score: result.score_1_to_5,
          tension: result.story_tension_score_1_to_5,
          issues: result.issues,
        },
        langfuse,
      },
      null,
      2,
    ),
  );
  if (!calibrationPass) process.exitCode = 1;
}

async function judgeCase(client, testCase) {
  const judgePayload = {
    caseId: testCase.caseId,
    ui: testCase.ui,
    deterministicGates: testCase.deterministicGates,
    transcript: testCase.transcript,
  };
  const input = [
    "You are a 9-10-year-old student who wants a game, not a worksheet.",
    "Evaluate this TimeCity adventure transcript using the same standard as the production student-fun persona: story tension, understandable stakes, character personality, player agency, and a reason to continue.",
    "Do not assume the transcript is good or bad from the case metadata. Judge only the experience described by the UI notes and transcript.",
    JSON.stringify(judgePayload, null, 2),
  ].join("\n\n");
  const response = await client.responses.parse({
    model,
    input,
    text: {
      format: zodTextFormat(JudgeSchema, "student_fun_calibration"),
    },
  }, {
    timeout: 90000,
  });
  return response.output_parsed ?? parseJsonish(response.output_text || "{}");
}

function quizEntry(node, speaker, dialogue) {
  return {
    node,
    generated: false,
    speaker,
    dialogue,
    difficulty: 2,
    choiceCount: 3,
    exploration: { required: false, asked: [] },
    choices: [
      "A. Check the correct evidence first.",
      "B. Press the fast button.",
      "C. Ignore the warning.",
    ],
    choice: "A. Check the correct evidence first.",
    classification: "best",
    consequence: "COG-9 pauses and checks one more clue before touching the route controls.",
    completed: false,
  };
}

function buildDashboardBaseline(result, calibrationPass) {
  const passRate = result.pass ? 100 : 0;
  return {
    source: "judge-calibration",
    generatedAt: new Date().toISOString(),
    current: {
      runId,
      generatedAt: new Date().toISOString(),
      environment,
      baseUrl: "synthetic-degraded-static-quiz",
      seedCount: 0,
      pass: false,
      mechanicsPass: false,
      judgePass: false,
      totalRuns: 1,
      generatedScenes: 0,
      generatedEligibleScenes: 0,
      eligibleGeneratedScenesSeen: 0,
      minGeneratedScenes: 0,
      generatedSceneRatio: 0,
      minGeneratedRatio: 0,
      generatedEligibleRatio: 0,
      minGeneratedEligibleRatio: 0,
      completionRate: 100,
      averageProgress: 100,
      averageWrong: 0,
      averageRetries: 0,
      totalSideQuests: 0,
      judgeScores: {
        student_fun: {
          title: "Student fun judge",
          averageScore: result.score_1_to_5,
          averageTension: result.story_tension_score_1_to_5,
          passRate,
          issues: result.issues || [],
        },
      },
      tension: {
        teacherAverage: null,
        studentFunAverage: result.score_1_to_5,
        gap: null,
        note: "Deliberately degraded static-quiz baseline used to calibrate whether the fun judge can fail boring content.",
      },
      failedMechanics: [],
      calibration: {
        expectedPass: false,
        expectedMaxScore: degradedStaticQuiz.expectedMaxScore,
        matched: calibrationPass,
      },
    },
    baseline: null,
    deltas: null,
    personas: [
      {
        persona: degradedStaticQuiz.caseId,
        pass: false,
        judgeScores: [
          {
            judge: "student_fun",
            score: result.score_1_to_5,
            tension: result.story_tension_score_1_to_5,
            pass: result.pass,
          },
        ],
      },
    ],
  };
}

async function postLangfuseScores(result, calibrationPass) {
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return { scoresPosted: false, scoreCount: 0, scoreErrors: [] };
  }
  const scores = [
    {
      name: "timecity.eval.calibration.student_fun.degraded_score",
      value: result.score_1_to_5,
      dataType: "NUMERIC",
      traceId: calibrationTraceId(),
      sessionId: runId,
      comment: "Student-fun judge score for deliberately degraded static quiz calibration",
      metadata: { environment, runId, expectedPass: false, actualPass: result.pass },
    },
    {
      name: "timecity.eval.calibration.pass",
      value: calibrationPass ? 1 : 0,
      dataType: "NUMERIC",
      traceId: calibrationTraceId(),
      sessionId: runId,
      comment: "Calibration passes when the student-fun judge fails degraded static quiz content",
      metadata: { environment, runId },
    },
  ];
  const errors = [];
  let posted = 0;
  for (const score of scores) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${langfuseBaseUrl()}/api/public/scores`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Basic ${Buffer.from(
            `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`,
          ).toString("base64")}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(score),
      });
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      posted += 1;
    } catch (error) {
      errors.push({ name: score.name, error: error instanceof Error ? error.message : String(error) });
    } finally {
      clearTimeout(timeout);
    }
  }
  return { scoresPosted: posted === scores.length, scoreCount: posted, scoreErrors: errors };
}

function getObservedClient() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return client;
  return observeOpenAI(client, {
    parentSpanContext: {
      traceId: calibrationTraceId(),
      spanId: crypto.createHash("sha256").update(`${runId}:parent`).digest("hex").slice(0, 16),
      traceFlags: 1,
    },
    traceName: "timecity-judge-calibration",
    generationName: "student-fun-calibration",
    sessionId: runId,
    tags: ["timecity", "judge-calibration", environment],
    generationMetadata: {
      environment,
      runId,
      caseId: degradedStaticQuiz.caseId,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_SHA,
    },
  });
}

function calibrationTraceId() {
  return crypto.createHash("sha256").update(`timecity-calibration:${environment}:${runId}`).digest("hex").slice(0, 32);
}

function langfuseBaseUrl() {
  return (process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || process.env.LANGFUSE_URL || "https://cloud.langfuse.com").replace(
    /\/$/,
    "",
  );
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
    return JSON.parse(match[0]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
