#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const requireJudge = args.has("--require-judge");
const requireObservability = args.has("--require-observability");
const skipBuild = args.has("--skip-build");

const checks = [
  {
    name: "Episode story alignment",
    command: [process.execPath, "scripts/episode-alignment.mjs"],
  },
  {
    name: "Episode pacing",
    command: [process.execPath, "scripts/episode-pacing.mjs"],
  },
  {
    name: "Plan invariants",
    command: [process.execPath, "scripts/plan-invariants.mjs"],
  },
  {
    name: "Visual surface",
    command: [process.execPath, "scripts/visual-surface.mjs"],
  },
  {
    name: "Persona playthroughs",
    command: [
      process.execPath,
      "scripts/persona-playthrough.mjs",
      ...(requireJudge ? ["--judge", "--require-judge"] : []),
    ],
  },
  {
    name: "Runtime observability",
    command: [
      process.execPath,
      "scripts/runtime-observability.mjs",
      ...(requireObservability
        ? ["--require-openai", "--require-langfuse", "--require-supabase-telemetry"]
        : []),
    ],
  },
  {
    name: "Lint",
    command: ["pnpm", "lint"],
  },
  ...(skipBuild
    ? []
    : [
        {
          name: "Production build",
          command: ["pnpm", "build"],
        },
      ]),
];

const results = [];
for (const check of checks) {
  const startedAt = Date.now();
  console.log(`\n=== ${check.name} ===`);
  const result = spawnSync(check.command[0], check.command.slice(1), {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  results.push({
    name: check.name,
    pass: result.status === 0,
    exitCode: result.status,
    seconds: Math.round((Date.now() - startedAt) / 100) / 10,
  });
}

const report = {
  pass: results.every((result) => result.pass),
  required: {
    judge: requireJudge,
    observability: requireObservability,
    build: !skipBuild,
  },
  results,
};

console.log(`\n=== Pretotype Verification Summary ===`);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
