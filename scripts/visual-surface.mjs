#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const requiredAssets = [
  "public/assets/backgrounds/splash-screen.png",
  "public/assets/avatars/avatar-1.png",
  "public/assets/avatars/avatar-2.png",
  "public/assets/avatars/avatar-3.png",
  "public/assets/avatars/avatar-4.png",
  "public/assets/avatars/avatar-5.png",
  "public/assets/avatars/avatar-6.png",
  "public/assets/rooms/future-trainstation.png",
  "public/assets/rooms/future-market.png",
  "public/assets/rooms/future-reactorcore.png",
  "public/assets/rooms/1800-trainstation.png",
  "public/assets/rooms/1800-signal-telegraph-office.png",
  "public/assets/rooms/future-mayorhall.png",
  "public/assets/rooms/future-agent-lab.png",
  "public/assets/characters/cutouts/ada-future-neutral.png",
  "public/assets/characters/cutouts/ada-future-thinking.png",
  "public/assets/characters/cutouts/cog9-future-neutral.png",
  "public/assets/characters/cutouts/cog9-future-worried.png",
  "public/assets/characters/cutouts/nix-future-caught.png",
  "public/assets/characters/cutouts/nix-future-tempting.png",
  "public/assets/characters/cutouts/ada-1800-neutral.png",
  "public/assets/characters/cutouts/ada-1800-thinking.png",
  "public/assets/characters/cutouts/cog9-1800-neutral.png",
  "public/assets/characters/cutouts/cog9-1800-worried.png",
  "public/assets/characters/cutouts/nix-1800-caught.png",
  "public/assets/characters/cutouts/nix-1800-tempting.png",
];

const requiredSceneStageTokens = [
  "student-splash-art",
  "play-action",
  "start-fade",
  "avatar-grid",
  "intro-scene",
  "IntroIncident",
  "useStudentGameDirector",
  "SceneCharacterLayer",
  "RoomBackground",
  "TimeTravelTransition",
  "ChoiceButtons",
  "ClueButton",
  "XCircle",
  "Printer",
];

const requiredDirectorTokens = [
  "useStudentMissionRuntime",
  "useScenePlayback",
  "StartStep",
  "fadeToStep",
  "mainChoiceSurface",
  "supportSurface",
  "completionSurface",
  "mapSurface",
  "navigation",
  "showDialogue",
  "showChoices",
  "continueDialogue",
  "choiceSurface",
  "avatarChoices",
  "uiText",
];

const requiredCssTokens = [
  ".room-art",
  ".student-splash-art",
  ".amethyst-action",
  ".scene-character",
  ".scene-character-era-1800",
  ".time-travel-transition",
  ".intro-scene-dialogue",
  ".intro-incident",
  ".intro-train-streak",
  ".scene-dialogue-overlay",
  ".choice-grid",
  ".student-nav-actions",
  ".progress-action",
];

const studentFiles = [
  "components/student/SceneStage.tsx",
  "components/student/ChoiceButtons.tsx",
  "components/student/ClueButton.tsx",
  "components/student/useStudentGameDirector.ts",
  "components/student/useStudentMissionRuntime.ts",
  "app/play/[sessionCode]/page.tsx",
];

const sceneStage = read("components/student/SceneStage.tsx");
const gameDirector = read("components/student/useStudentGameDirector.ts");
const css = read("app/globals.css");
const studentSource = studentFiles.map(read).join("\n");

const assetReports = requiredAssets.map((asset) => {
  const dimensions = pngDimensions(asset);
  const alphaRequired = asset.includes("/cutouts/");
  return {
    asset,
    exists: fs.existsSync(asset),
    width: dimensions?.width ?? 0,
    height: dimensions?.height ?? 0,
    hasAlpha: Boolean(dimensions?.hasAlpha),
    pass: Boolean(dimensions && dimensions.width >= 96 && dimensions.height >= 96 && (!alphaRequired || dimensions.hasAlpha)),
  };
});

const checks = [
  {
    label: "Required visual assets exist and are non-trivial PNGs",
    pass: assetReports.every((asset) => asset.pass),
    value: assetReports,
    expected: "all required splash, avatar, room, and character assets >= 96x96",
  },
  {
    label: "Student stage renders required game surfaces",
    pass: requiredSceneStageTokens.every((token) => sceneStage.includes(token)),
    value: missingTokens(requiredSceneStageTokens, sceneStage),
    expected: "no missing SceneStage tokens",
  },
  {
    label: "Student stage delegates game phase orchestration to director",
    pass:
      sceneStage.includes("useStudentGameDirector") &&
      !sceneStage.includes("useState(") &&
      !sceneStage.includes("useScenePlayback") &&
      !sceneStage.includes("useStudentMissionRuntime") &&
      !sceneStage.includes("window.setTimeout") &&
      !sceneStage.includes("ROOM_SEQUENCE") &&
      !sceneStage.includes("ROOM_TITLES") &&
      !sceneStage.includes("runtime."),
    value: {
      usesDirector: sceneStage.includes("useStudentGameDirector"),
      hasUseState: sceneStage.includes("useState("),
      hasScenePlayback: sceneStage.includes("useScenePlayback"),
      hasMissionRuntime: sceneStage.includes("useStudentMissionRuntime"),
      hasTimer: sceneStage.includes("window.setTimeout"),
      hasRouteRules: sceneStage.includes("ROOM_SEQUENCE") || sceneStage.includes("ROOM_TITLES"),
      hasRuntimeAccess: sceneStage.includes("runtime."),
    },
    expected: "SceneStage renders the director model without owning timers, route rules, or runtime hooks",
  },
  {
    label: "Student game director owns scene, intro, choices, support, map, and nav surfaces",
    pass: requiredDirectorTokens.every((token) => gameDirector.includes(token)),
    value: missingTokens(requiredDirectorTokens, gameDirector),
    expected: "no missing director orchestration tokens",
  },
  {
    label: "Professor-Oak intro has four authored beats and an on-screen incident",
    pass:
      /buildIntroBeats/.test(gameDirector) &&
      /Welcome to TimeCity/.test(gameDirector) &&
      /Platform 2 has 18 passengers/.test(gameDirector) &&
      /I am Nix/.test(gameDirector) &&
      /A train just left one minute early/.test(gameDirector) &&
      /showIncident/.test(gameDirector) &&
      /08:04/.test(sceneStage) &&
      /08:05/.test(sceneStage),
    value: "Ada welcome, COG-9 beat, Nix beat, split-clock incident",
    expected: "4 scripted intro beats before H1_N01",
  },
  {
    label: "CSS includes visual layers for game look",
    pass: requiredCssTokens.every((token) => css.includes(token)),
    value: missingTokens(requiredCssTokens, css),
    expected: "no missing CSS tokens",
  },
  {
    label: "Student experience has no free-text input surface",
    pass: !/<textarea|<input|contentEditable|contenteditable/.test(studentSource),
    value: "no input, textarea, or contentEditable found in student surface",
    expected: "closed-choice UI only",
  },
  {
    label: "Six avatar choices are shown",
    pass: [...gameDirector.matchAll(/image: "\/assets\/avatars\/avatar-\d\.png"/g)].length === 6,
    value: [...gameDirector.matchAll(/image: "\/assets\/avatars\/avatar-\d\.png"/g)].length,
    expected: 6,
  },
  {
    label: "Player-facing language UI is descoped to English",
    pass: !new RegExp(`\\b${"z"}${"h"}\\b|LanguageToggle|changeLanguage`).test(studentSource + gameDirector),
    value: "no secondary-language or language-switching UI found",
    expected: "English-only player UI",
  },
];

const report = {
  pass: checks.every((check) => check.pass),
  assetCount: requiredAssets.length,
  checks,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function missingTokens(tokens, text) {
  return tokens.filter((token) => !text.includes(token));
}

function pngDimensions(file) {
  if (!fs.existsSync(file)) return null;
  const buffer = fs.readFileSync(file);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    hasAlpha: [4, 6].includes(buffer.readUInt8(25)),
    name: path.basename(file),
  };
}
