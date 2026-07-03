"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScenePlayback, type ScenePlaybackPhase } from "./useScenePlayback";
import { useStudentMissionRuntime } from "./useStudentMissionRuntime";
import type { CharacterPlaybackPhase } from "@/components/shared/SceneCharacterLayer";
import { ROOM_SEQUENCE, ROOM_TITLES } from "@/lib/game/fixedGraph";
import type { Language } from "@/lib/game/types";

const codenames = ["ChronoCadet Blue", "ChronoCadet Spark", "ChronoCadet Gear", "ChronoCadet Nova"];

export const avatarChoices = [
  { id: "blue", image: "/assets/avatars/avatar-1.png", en: "Blue Cadet", zh: "蓝色学员" },
  { id: "teal", image: "/assets/avatars/avatar-2.png", en: "Signal Scout", zh: "信号侦察员" },
  { id: "purple", image: "/assets/avatars/avatar-3.png", en: "Portal Pilot", zh: "传送门飞行员" },
  { id: "amber", image: "/assets/avatars/avatar-4.png", en: "Gear Runner", zh: "齿轮奔跑者" },
  { id: "rose", image: "/assets/avatars/avatar-5.png", en: "Spark Solver", zh: "火花解谜者" },
  { id: "green", image: "/assets/avatars/avatar-6.png", en: "Code Keeper", zh: "代码守护者" },
];

type BackpackCopy = {
  button: string;
  items: Array<{ slug: string; item: string; description: string }>;
};

type StudentCopy = {
  mission: string;
  splashTitle: string;
  splashLead: string;
  play: string;
  setupTitle: string;
  setupLead: string;
  codename: string;
  avatar: string;
  avatarLead: string;
  continue: string;
  back: string;
  introTitle: string;
  introLead: string;
  introSpeaker: string;
  begin: string;
  loading: string;
  episode: string;
  print: string;
  exit: string;
  restart: string;
  map: string;
  askCharacter: string;
  footer: string;
  clueFallback: string;
  readAgain: string;
  clue: string;
  defaultClue: string;
  backpack: BackpackCopy;
};

const uiText = {
  en: {
    mission: "Join mission",
    splashTitle: "TimeCity Rescue",
    splashLead: "A story mission about AI, choices and debugging the city clock.",
    play: "Play",
    setupTitle: "Set up your mission",
    setupLead: "Choose a codename, language and ChronoCadet before entering TimeCity.",
    codename: "Codename",
    avatar: "Choose your avatar",
    avatarLead: "Pick the ChronoCadet who will appear on your mission card.",
    continue: "Continue",
    back: "Back",
    introTitle: "Episode 1: The Missing Minute",
    introLead: "Ada has found a broken time signal. Your choices will teach COG-9 how to follow a goal safely.",
    introSpeaker: "Professor Ada",
    begin: "Begin Episode 1",
    loading: "Preparing your TimeCity scene...",
    episode: "Episode 1 - The Missing Minute",
    print: "Generate Agent Builder Passport",
    exit: "Exit",
    restart: "Restart",
    map: "Map",
    askCharacter: "Ask character",
    footer: "The child never chats freely with AI. The AI adapts inside a teacher-controlled sandbox.",
    clueFallback: "Use a support button if you want a safer next step.",
    readAgain: "Read Again",
    clue: "Ask for Clue",
    defaultClue: "Check the clue that changes the system.",
    backpack: {
      button: "Backpack",
      items: [
        { slug: "logic_lens", item: "Logic Lens", description: "Reveals hidden rules." },
        { slug: "data_slate", item: "Data Slate", description: "Stores clean inputs and outputs." },
        { slug: "debug_wrench", item: "Debug Wrench", description: "Inspects loops and broken rules." },
        { slug: "prompt_card", item: "Prompt Card", description: "Makes instructions clearer." },
        { slug: "agent_blueprint", item: "Agent Blueprint", description: "Assembles the final helper agent." },
        { slug: "safety_seal", item: "Safety Seal", description: "Adds a human-check guardrail." },
      ],
    },
  },
  zh: {
    mission: "加入任务",
    splashTitle: "TimeCity Rescue",
    splashLead: "一个关于 AI、选择和修复城市时钟的故事任务。",
    play: "开始",
    setupTitle: "设置你的任务",
    setupLead: "进入 TimeCity 之前，先选择代号、语言和时空学员。",
    codename: "代号",
    avatar: "选择你的头像",
    avatarLead: "选择会出现在任务卡上的时空学员。",
    continue: "继续",
    back: "返回",
    introTitle: "第一集：消失的一分钟",
    introLead: "Ada 发现了损坏的时间信号。你的选择会教 COG-9 如何安全地跟随目标。",
    introSpeaker: "Ada 教授",
    begin: "进入第一集",
    loading: "正在准备你的 TimeCity 场景...",
    episode: "第一集 - 消失的一分钟",
    print: "生成智能体建造者护照",
    exit: "退出",
    restart: "重新开始",
    map: "地图",
    askCharacter: "询问角色",
    footer: "孩子不会与 AI 自由聊天。AI 只会在教师控制的沙盒中调整内容。",
    clueFallback: "如果你想要更安全的下一步，可以使用帮助按钮。",
    readAgain: "再读一遍",
    clue: "请求线索",
    defaultClue: "检查会改变系统的线索。",
    backpack: {
      button: "背包",
      items: [
        { slug: "logic_lens", item: "逻辑镜片", description: "显示隐藏规则。" },
        { slug: "data_slate", item: "数据板", description: "保存干净的输入和输出。" },
        { slug: "debug_wrench", item: "调试扳手", description: "检查循环和错误规则。" },
        { slug: "prompt_card", item: "提示卡", description: "让指令更清楚。" },
        { slug: "agent_blueprint", item: "智能体蓝图", description: "组装最终的助手智能体。" },
        { slug: "safety_seal", item: "安全印章", description: "加入人工检查护栏。" },
      ],
    },
  },
} satisfies Record<Language, StudentCopy>;

export type StartStep = "splash" | "menu" | "intro";

const START_FADE_MS = 680;

export function useStudentGameDirector({ initialSessionCode }: { initialSessionCode: string }) {
  const [language, setLanguage] = useState<Language>("en");
  const [startStep, setStartStep] = useState<StartStep>("splash");
  const [startTransition, setStartTransition] = useState<"idle" | "fading">("idle");
  const [displayName] = useState(codenames[0]);
  const [avatarColor, setAvatarColor] = useState(avatarChoices[0].id);
  const transitionTimerRef = useRef<number | null>(null);
  const sessionCode = useMemo(() => initialSessionCode.toUpperCase(), [initialSessionCode]);
  const copy = uiText[language];

  const runtime = useStudentMissionRuntime({
    sessionCode,
    displayName,
    avatarColor,
    language,
    setLanguage,
    onExit: () => setStartStep("splash"),
    text: { defaultClue: copy.defaultClue },
  });

  const selectedAvatar = avatarChoices.find((avatar) => avatar.id === avatarColor) ?? avatarChoices[0];
  const selectedAvatarLabel = selectedAvatar[language];
  const introDialogue =
    language === "zh"
      ? `欢迎来到 TimeCity 火车站，${displayName}。我是 Ada 教授。你的 ${selectedAvatarLabel} 头像已准备好。COG-9 正在站台等你，我们要找回消失的一分钟。`
      : `Welcome to TimeCity Station, ${displayName}. I'm Professor Ada. Your ${selectedAvatarLabel} avatar is ready. COG-9 is waiting on the platform, and we need to find the missing minute.`;
  const introPlayback = useScenePlayback(startStep === "intro" ? `intro-${language}-${avatarColor}` : null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const fadeToStep = useCallback((nextStep: StartStep) => {
    setStartTransition("fading");
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      setStartStep(nextStep);
      setStartTransition("idle");
    }, START_FADE_MS);
  }, []);

  const missionPhase = runtime.playback.phase;
  const completionSurface =
    runtime.student && runtime.student.badge_progress >= 100
      ? {
          title: language === "zh" ? "任务完成" : "Mission Complete",
          body: language === "zh" ? "你已经准备好生成 Agent Builder Passport。" : "You are ready to generate your Agent Builder Passport.",
          badgeLabel: "Agent Badge",
          actionLabel: copy.print,
          onPrint: runtime.printMemento,
        }
      : null;
  const supportSurface = runtime.scene
    ? {
        clue: runtime.supportText,
        readAgain: runtime.scene.dialogue.read_again_text,
        readAgainLabel: copy.readAgain,
        clueLabel: copy.clue,
        fallbackText: copy.clueFallback,
        onClue: () => runtime.signal("clue_count"),
        onReadAgain: () => runtime.signal("read_again_count"),
      }
    : null;
  const mainChoiceSurface =
    runtime.scene && missionPhase === "choices" && !completionSurface
      ? {
          choices: runtime.scene.choices,
          disabled: runtime.busy,
          onPreview: runtime.markFirstChoicePreview,
          onChoose: runtime.submitChoice,
        }
      : null;
  const sideQuestSurface =
    runtime.sideQuest && missionPhase === "choices"
      ? {
          sideQuest: runtime.sideQuest,
          complete: runtime.sideQuestComplete,
          result: runtime.sideQuestResult,
          disabled: runtime.busy,
          onChoose: runtime.chooseSideQuest,
        }
      : null;
  const choiceSurface =
    runtime.student && runtime.scene && missionPhase === "choices"
      ? {
          complete: Boolean(completionSurface),
          main: mainChoiceSurface,
          sideQuest: sideQuestSurface,
          support: supportSurface,
          completion: completionSurface,
        }
      : null;
  const mapSurface = runtime.scene
    ? {
        open: runtime.mapOpen,
        label: copy.map,
        closeLabel: copy.exit,
        close: () => runtime.setMapOpen(false),
        stops: ROOM_SEQUENCE.map((room) => ({
          room,
          title: ROOM_TITLES[room],
          current: room === runtime.scene?.room_slug,
        })),
      }
    : null;
  const navigation = {
    exit: { label: copy.exit, onSelect: runtime.exitMission },
    restart: { label: copy.restart, onSelect: runtime.restartMission },
    map: {
      label: copy.map,
      active: runtime.mapOpen,
      onSelect: () => runtime.setMapOpen((value) => !value),
    },
    backpack: {
      open: runtime.backpackOpen,
      labels: copy.backpack,
      onToggle: () => runtime.setBackpackOpen((value) => !value),
    },
    askCharacter: { label: copy.askCharacter, onSelect: runtime.askCharacter },
    footer: copy.footer,
  };

  return {
    screen: runtime.student && runtime.scene ? "mission" : runtime.student ? "loading" : "start",
    sessionCode,
    language,
    copy,
    start: {
      step: startStep,
      transition: startTransition,
      transitionActive: startTransition === "fading",
      showSplash: startStep !== "intro",
      showIntroRoom: startStep === "intro",
      showPlay: startStep === "splash",
      showMenu: startStep === "menu",
      showIntro: startStep === "intro",
      play: () => fadeToStep("menu"),
      continueToIntro: () => fadeToStep("intro"),
      backToSplash: () => setStartStep("splash"),
      backToMenu: () => setStartStep("menu"),
    },
    setup: {
      avatarChoices,
      avatarColor,
      setAvatarColor,
      changeLanguage: runtime.changeLanguage,
    },
    intro: {
      dialogue: introDialogue,
      phase: introPlayback.phase,
      characterPhase: characterPhaseFor(introPlayback.phase),
      showDialogue: introPlayback.phase === "speaking",
      showActions: introPlayback.phase === "choices",
      continue: introPlayback.advanceToChoices,
      begin: runtime.join,
    },
    mission: {
      student: runtime.student,
      scene: runtime.scene,
      phase: missionPhase,
      characterPhase: characterPhaseFor(missionPhase),
      showDialogue: missionPhase === "speaking",
      showFeedback: missionPhase === "feedback" && Boolean(runtime.choiceFeedback),
      showChoices: missionPhase === "choices",
      choiceSurface,
      supportSurface,
      mapSurface,
      navigation,
      choiceFeedback: runtime.choiceFeedback,
      busy: runtime.busy,
      changeLanguage: runtime.changeLanguage,
      continueDialogue: runtime.playback.advanceToChoices,
      applyPendingScene: runtime.applyPendingScene,
    },
  };
}

function characterPhaseFor(phase: ScenePlaybackPhase): CharacterPlaybackPhase {
  if (phase === "speaker-entering") return "entering";
  if (phase === "speaking") return "speaking";
  if (phase === "speaker-exiting") return "exiting";
  return "hidden";
}
