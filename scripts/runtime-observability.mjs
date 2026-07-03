#!/usr/bin/env node

import fs from "node:fs";

const args = new Set(process.argv.slice(2));
const argValue = (name, fallback) => {
  const match = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
};

loadEnvFile(".env.local");

const baseUrl = argValue("--base", process.env.TIMECITY_BASE_URL || "http://localhost:3001");
const requireOpenAI = args.has("--require-openai");
const requireLangfuse = args.has("--require-langfuse");
const requireSupabaseTelemetry = args.has("--require-supabase-telemetry");

const env = {
  openai: has("OPENAI_API_KEY"),
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  openaiEvalModel: process.env.OPENAI_EVAL_MODEL || process.env.OPENAI_MODEL || "gpt-4.1",
  langfusePublic: has("LANGFUSE_PUBLIC_KEY"),
  langfuseSecret: has("LANGFUSE_SECRET_KEY"),
  langfuseBaseUrl: has("LANGFUSE_BASE_URL"),
  supabaseUrl: has("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRole: has("SUPABASE_SERVICE_ROLE_KEY") || has("SUPABASE_SECRET_KEY"),
  clerkPublic: has("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSecret: has("CLERK_SECRET_KEY"),
  timecityEnvironment: process.env.TIMECITY_ENVIRONMENT || "unset",
  timecitySandbox: truthy(process.env.TIMECITY_SANDBOX_MODE),
  timecitySandboxPrefix: process.env.TIMECITY_SANDBOX_SESSION_PREFIX || "SBX",
};

async function main() {
  const api = await probeStudentApi();
  const checks = [
    {
      label: "Student API responds",
      pass: api.joinOk && api.stateOk,
      detail: api.error || `${api.nodeKey} / ${api.roomSlug}`,
    },
    {
      label: "Scene stays in sandbox",
      pass: Boolean(api.sceneSafetyOk),
      detail: api.sceneSafetyOk ? "no open chat, no personal data, not out of sandbox" : "unsafe scene flags",
    },
    {
      label: "Closed choices available",
      pass: api.choiceCount >= 3 && api.choiceCount <= 4,
      detail: `${api.choiceCount} choices`,
    },
    {
      label: "OpenAI configured when required",
      pass: !requireOpenAI || env.openai,
      detail: env.openai ? `configured; model ${env.openaiModel}` : "not configured; deterministic fallback expected",
    },
    {
      label: "Langfuse configured when required",
      pass: !requireLangfuse || (env.langfusePublic && env.langfuseSecret),
      detail:
        env.langfusePublic && env.langfuseSecret
          ? `configured${env.langfuseBaseUrl ? " with base URL" : ""}`
          : "not configured; spans disabled",
    },
    {
      label: "Supabase telemetry configured when required",
      pass: !requireSupabaseTelemetry || (env.supabaseUrl && env.supabaseServiceRole),
      detail:
        env.supabaseUrl && env.supabaseServiceRole
          ? "configured for clickstream and LLM generation events"
          : "not configured; local in-memory mode",
    },
    {
      label: "Sandbox flag prefixes runtime sessions when enabled",
      pass: !env.timecitySandbox || api.sessionCode?.startsWith(`${env.timecitySandboxPrefix}_`),
      detail: env.timecitySandbox ? api.sessionCode || "no session code returned" : "sandbox mode disabled",
    },
  ];

  const report = {
    pass: checks.every((check) => check.pass),
    baseUrl,
    runtimeMode: runtimeMode(),
    env,
    api,
    checks,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}

async function probeStudentApi() {
  const sessionCode = `OBS${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  try {
    const join = await post("/api/student/join", {
      session_code: sessionCode,
      display_name: "Observability Probe",
      avatar_color: "blue",
      language: "en",
    });
    const state = await get(`/api/student/state?session_code=${sessionCode}&student_id=${join.student.id}`);
    const scene = state.scene;
    return {
      joinOk: Boolean(join.student?.id),
      sessionCode: join.session?.session_code,
      stateOk: Boolean(scene?.node_key),
      nodeKey: scene?.node_key,
      roomSlug: scene?.room_slug,
      choiceCount: scene?.choices?.length ?? 0,
      sceneSafetyOk: Boolean(
        scene &&
          scene.safety_flags &&
          !scene.safety_flags.contains_open_chat &&
          !scene.safety_flags.asks_personal_data &&
          !scene.safety_flags.out_of_sandbox,
      ),
      sceneId: scene?.scene_id,
      generatedOrFallback: scene?.scene_id?.startsWith("fallback-") ? "fallback" : "generated",
    };
  } catch (error) {
    return {
      joinOk: false,
      stateOk: false,
      choiceCount: 0,
      sceneSafetyOk: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function runtimeMode() {
  if (env.openai && env.langfusePublic && env.langfuseSecret && env.supabaseUrl && env.supabaseServiceRole) {
    return env.timecitySandbox ? "openai_langfuse_supabase_sandbox" : "openai_langfuse_supabase";
  }
  if (env.openai && env.supabaseUrl && env.supabaseServiceRole) return env.timecitySandbox ? "openai_supabase_sandbox" : "openai_supabase";
  if (env.openai) return env.timecitySandbox ? "openai_memory_sandbox" : "openai_memory";
  return env.timecitySandbox ? "deterministic_fallback_memory_sandbox" : "deterministic_fallback_memory";
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

function has(name) {
  return Boolean(process.env[name]);
}

function truthy(value) {
  return ["1", "true", "yes", "on", "sandbox"].includes(String(value || "").trim().toLowerCase());
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
