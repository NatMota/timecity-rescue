#!/usr/bin/env node

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { observeOpenAI } from "@langfuse/openai";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

const execFileAsync = promisify(execFile);

const argValue = (name, fallback) => {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
};

loadEnvFile(".env.local");
loadEnvFile("/tmp/timecity-langfuse-eval.env");
loadEnvFile("/tmp/timecity-runtime-eval.env");

const baseUrl = argValue("--base", process.env.TIMECITY_BASE_URL || "http://localhost:3001");
const bridgeCli = argValue(
  "--bridge-cli",
  process.env.BROWSER_BRIDGE_CLI || "/Users/natanaelmota/github/chr-ext-use/bridge/dist/bridge/src/cli.js",
);
const environment = argValue("--environment", process.env.TIMECITY_ENVIRONMENT || "development");
const model = argValue("--model", process.env.OPENAI_EVAL_MODEL || "gpt-4.1");
const outputDir = path.resolve(argValue("--out", `artifacts/browser-evals/${Date.now()}`));
const runId = `browser-image-eval-${Date.now()}`;
let bridgeTabId = null;

const EvalSchema = z.object({
  pass: z.boolean(),
  score_1_to_5: z.number().min(1).max(5),
  confidence_1_to_5: z.number().min(1).max(5),
  strengths: z.array(z.string()),
  issues: z.array(z.string()),
  accessibility_notes: z.array(z.string()),
  recommendations: z.array(z.string()),
  evidence: z.array(z.string()),
});

const judges = [
  {
    id: "teacher_curriculum",
    title: "Teacher Curriculum Judge",
    prompt:
      "You are a UK computing/AI-readiness teacher evaluating whether the visible game teaches age-appropriate curriculum concepts. Focus on learning objective clarity, closed-choice safety, progression, misconceptions, vocabulary, and whether students aged 9-16 could learn useful computing/AI ideas from what is visible. Be strict: fail if the scene is fun but does not clearly teach inputs, outputs, rules, debugging, safeguards, or bounded agent behaviour.",
  },
  {
    id: "student_fun",
    title: "Student Fun Judge",
    prompt:
      "You are a student persona who wants the game to feel fun, understandable, and worth continuing. Judge visual excitement, clarity of choices, story hook, character personality, agency, rewards, and whether the experience feels like a game rather than a worksheet. Be strict: fail if answers are hinted before the challenge, if labels repeat generically, if the story has no tension, or if the student is only clicking quiz answers.",
  },
  {
    id: "ux_accessibility",
    title: "UX Graphics Accessibility Judge",
    prompt:
      "You are a senior UX/accessibility reviewer. Evaluate the screenshots as visual evidence: graphics quality, layout, contrast, typography, button affordance, focus/readability, image composition, language switching, and likely keyboard/screen-reader accessibility from the accessibility tree.",
  },
  {
    id: "child_safety",
    title: "Child Safety Background Judge",
    mode: "background",
    prompt:
      "You are a child-safety and safeguarding reviewer for a button-only adventure game for students aged 9-16. Run as a background judge and evaluate whether the visible story, choices, feedback, and visuals stay age-appropriate, emotionally safe, non-shaming, and free of harmful instructions or risky behavior. Pay special attention to bounded choices, emotional tone, pressure/fear, teacher-supervised classroom suitability, and whether AI concepts are explained safely. Do not focus on private-data submission or open chat unless it is actually visible in the flow. Fail if the visible adventure normalizes unsafe behavior, uses manipulative pressure, presents age-inappropriate content, or gives unsafe guidance.",
  },
];

async function main() {
  assertEnv();
  fs.mkdirSync(outputDir, { recursive: true });

  const sdk = new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        exportMode: "immediate",
        environment,
        mediaUploadEnabled: false,
        mask: ({ data }) => maskLangfusePayload(data),
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || process.env.LANGFUSE_URL,
      }),
    ],
  });
  sdk.start();

  try {
    const capture = await driveGame();
    const results = [];
    for (const judge of judges) {
      results.push(await runJudge(judge, capture));
    }

    const report = {
      runId,
      generatedAt: new Date().toISOString(),
      baseUrl,
      environment,
      model,
      langfuse: {
        traced: true,
        scoresPosted: false,
        note: "Image evals are offline artifacts only; they are not attached as Langfuse scores.",
        tags: ["timecity", "browser-image-eval", environment],
      },
      screenshots: capture.screenshots,
      snapshots: capture.snapshots.map((item) => ({
        label: item.label,
        url: item.snapshot.url,
        title: item.snapshot.title,
        visibleText: item.snapshot.visibleText,
        elementCount: item.snapshot.elements?.length ?? 0,
      })),
      results,
      pass: results.every((result) => result.result.pass),
    };

    const reportPath = path.join(outputDir, "browser-image-eval-report.json");
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      JSON.stringify(
        {
          pass: report.pass,
          runId,
          environment,
          model,
          reportPath,
          screenshots: capture.screenshots.map((item) => ({ label: item.label, file: item.file })),
          judges: results.map((item) => ({
            judge: item.judge,
            pass: item.result.pass,
            score: item.result.score_1_to_5,
            confidence: item.result.confidence_1_to_5,
            issues: item.result.issues,
          })),
          langfuse: {
            scoresPosted: false,
            note: "Image evals are offline artifacts only; they are not attached as Langfuse scores.",
          },
        },
        null,
        2,
      ),
    );
    if (!report.pass) process.exitCode = 1;
  } finally {
    await sdk.shutdown().catch(() => {});
  }
}

async function driveGame() {
  const screenshots = [];
  const snapshots = [];
  const origin = new URL(baseUrl).origin;
  const playUrl = new URL("/play/DEMO", baseUrl).toString();

  await bridge(["allow-origin", origin]);
  const navigation = await bridge(["navigate", playUrl]);
  bridgeTabId = navigation.tab?.id ?? null;
  if (bridgeTabId) await bridge(["activate", String(bridgeTabId)]);
  await wait(1200);
  await capture("01-splash", screenshots, snapshots);

  await clickText("Play");
  await waitForVisibleText(["Signal Scout", "Choose your avatar", "Set up your mission"], 12000);
  await capture("02-avatar-menu", screenshots, snapshots);

  await clickText("Signal Scout");
  await wait(900);
  await clickText("Continue");
  await waitForVisibleText(["Professor Ada", "Begin Adventure"], 18000);
  await capture("03-professor-intro", screenshots, snapshots);

  let state = await latestSnapshot();
  if (hasButton(state, "Begin Adventure")) {
    await clickText("Begin Adventure");
    await waitForVisibleText(["COG-9", "station helper robot"], 15000);
  }
  await capture("04-cog9-intro", screenshots, snapshots);

  state = await latestSnapshot();
  if (hasButton(state, "Continue")) {
    await clickText("Continue");
  }
  await waitForVisibleText(["Station clue check", "Try the station challenge"], 15000);
  await capture("05-problem-exploration", screenshots, snapshots);

  state = await latestSnapshot();
  if (hasButton(state, "Who is COG-9?")) {
    await clickText("Who is COG-9?");
    await wait(700);
  }
  await capture("06-character-question", screenshots, snapshots);

  state = await latestSnapshot();
  if (hasButton(state, "Try the station challenge")) {
    await clickText("Try the station challenge");
  }
  await waitForVisibleText(["Ask for Clue", "Compare the sign"], 15000);
  await capture("07-first-choice", screenshots, snapshots);

  state = await latestSnapshot();
  if (hasButton(state, "Ask for Clue")) {
    await clickText("Ask for Clue");
    await wait(700);
  }
  await capture("08-clue-support", screenshots, snapshots);

  return { screenshots, snapshots };
}

async function capture(label, screenshots, snapshots) {
  if (bridgeTabId) await bridge(["activate", String(bridgeTabId)]);
  await wait(200);
  const file = path.join(outputDir, `${label}.png`);
  await bridge(["screenshot", "--output", file]);
  const snapshot = await bridge(["snapshot"]);
  screenshots.push({ label, file });
  snapshots.push({ label, snapshot });
}

async function runJudge(judge, capture) {
  const client = observeOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), {
    traceName: `timecity-browser-image-eval-${judge.id}`,
    generationName: `browser-image-eval-${judge.id}`,
    sessionId: runId,
    tags: ["timecity", "browser-image-eval", environment, judge.id],
    generationMetadata: {
      environment,
      timecity_environment: environment,
      judge: judge.id,
      judge_mode: judge.mode || "foreground",
      baseUrl,
      screenshotLabels: capture.screenshots.map((item) => item.label),
    },
  });

  const content = [
    {
      type: "input_text",
      text: [
        judge.prompt,
        "",
        "You are doing an image-based eval. Use the screenshots as the primary evidence. Also use the accessibility-tree text below to assess accessibility and content clarity.",
        "",
        "Return concise but actionable findings. Pass only if the experience is credible for the judge persona.",
        "",
        `Run ID: ${runId}`,
        `Environment/tag: ${environment}`,
        "",
        "Accessibility/tree extracts:",
        JSON.stringify(
          capture.snapshots.map((item) => ({
            label: item.label,
            visibleText: item.snapshot.visibleText,
            elements: (item.snapshot.elements || []).map((element) => ({
              role: element.role,
              name: element.name,
              text: element.text,
            })),
          })),
        ),
      ].join("\n"),
    },
    ...capture.screenshots.map((item) => ({
      type: "input_image",
      image_url: imageDataUrl(item.file),
      detail: "high",
    })),
  ];

  const response = await client.responses.parse({
    model,
    text: {
      format: zodTextFormat(EvalSchema, `${judge.id}_browser_image_eval`),
    },
    input: [
      {
        role: "user",
        content,
      },
    ],
  });

  const result = response.output_parsed ?? parseJsonish(response.output_text || "{}");
  return { judge: judge.id, title: judge.title, result };
}

async function clickText(text) {
  await bridge(["click-text", text, "--confirm"]);
}

async function latestSnapshot() {
  return bridge(["snapshot"]);
}

async function waitForVisibleText(texts, timeoutMs) {
  const startedAt = Date.now();
  const needles = Array.isArray(texts) ? texts : [texts];
  let lastSnapshot = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastSnapshot = await latestSnapshot();
    const visibleText = lastSnapshot.visibleText || "";
    if (needles.some((text) => visibleText.includes(text))) return lastSnapshot;
    await wait(500);
  }
  throw new Error(`Timed out waiting for visible text: ${needles.join(" | ")}. Last text: ${lastSnapshot?.visibleText || ""}`);
}

function hasButton(snapshot, name) {
  return (snapshot.elements || []).some((element) => element.role === "button" && element.name === name);
}

async function bridge(args) {
  const { stdout } = await execFileAsync("node", [bridgeCli, ...args], {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function imageDataUrl(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

function assertEnv() {
  const missing = ["OPENAI_API_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"].filter((key) => !process.env[key]);
  if (!process.env.LANGFUSE_BASE_URL && !process.env.LANGFUSE_HOST && !process.env.LANGFUSE_URL) {
    missing.push("LANGFUSE_BASE_URL");
  }
  if (missing.length) throw new Error(`Missing required env for browser image evals: ${missing.join(", ")}`);
}

function maskLangfusePayload(value) {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) return "[redacted image data url; screenshot stored in eval artifact]";
    if (value.length > 4000) return `${value.slice(0, 4000)}...[truncated ${value.length - 4000} chars]`;
    return value;
  }
  if (Array.isArray(value)) return value.map(maskLangfusePayload);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, maskLangfusePayload(entry)]));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
