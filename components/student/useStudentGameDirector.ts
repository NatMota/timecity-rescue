"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScenePlayback, type ScenePlaybackPhase } from "./useScenePlayback";
import { useStudentMissionRuntime } from "./useStudentMissionRuntime";
import type { CharacterPlaybackPhase } from "@/components/shared/SceneCharacterLayer";
import { ROOM_SEQUENCE, ROOM_TITLES } from "@/lib/game/fixedGraph";
import type { Language } from "@/lib/game/types";

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

type ExplorationCopy = {
  title: string;
  starter: string;
  ready: string;
  questions: {
    problem: string;
    cog9: string;
    cog9Answer: string;
    inspect: string;
    avoid: string;
    avoidAnswer: string;
  };
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
  exploration: ExplorationCopy;
};

const uiText = {
  en: {
    mission: "Join mission",
    splashTitle: "TimeCity Rescue",
    splashLead: "A story mission about AI, choices and debugging the city clock.",
    play: "Play",
    setupTitle: "Set up your mission",
    setupLead: "Choose your avatar before entering TimeCity.",
    codename: "Codename",
    avatar: "Choose your avatar",
    avatarLead: "",
    continue: "Continue",
    back: "Back",
    introTitle: "Episode 1: The Missing Minute",
    introLead: "Ada has found a broken time signal. Your choices will teach COG-9 how to follow a goal safely.",
    introSpeaker: "Professor Ada",
    begin: "Begin Adventure",
    loading: "Loading",
    episode: "Episode 1 - The Missing Minute",
    print: "Generate Agent Builder Passport",
    exit: "Exit",
    restart: "Back",
    map: "Map",
    askCharacter: "Ask character",
    footer: "The child never chats freely with AI. The AI adapts inside a teacher-controlled sandbox.",
    clueFallback: "Use a support button if you want a safer next step.",
    readAgain: "Read Again",
    clue: "Ask for Clue",
    defaultClue: "Check the clue that changes the system.",
    exploration: {
      title: "Explore the problem",
      starter: "Ask a question before trying the challenge.",
      ready: "Ready to try challenge",
      questions: {
        problem: "What is going wrong?",
        cog9: "Who are you?",
        cog9Answer: "COG-9 is the station helper robot on screen. He can read signals and suggest train movements, but he should not act until the evidence is clear.",
        inspect: "What should I inspect first?",
        avoid: "Why not move another train?",
        avoidAnswer: "Because we do not know what is broken yet. If COG-9 moves another train before checking evidence, he could repeat the same mistake faster.",
      },
    },
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
    setupLead: "进入 TimeCity 之前，先选择头像。",
    codename: "代号",
    avatar: "选择你的头像",
    avatarLead: "",
    continue: "继续",
    back: "返回",
    introTitle: "第一集：消失的一分钟",
    introLead: "Ada 发现了损坏的时间信号。你的选择会教 COG-9 如何安全地跟随目标。",
    introSpeaker: "Ada 教授",
    begin: "开始冒险",
    loading: "加载中",
    episode: "第一集 - 消失的一分钟",
    print: "生成智能体建造者护照",
    exit: "退出",
    restart: "返回",
    map: "地图",
    askCharacter: "询问角色",
    footer: "孩子不会与 AI 自由聊天。AI 只会在教师控制的沙盒中调整内容。",
    clueFallback: "如果你想要更安全的下一步，可以使用帮助按钮。",
    readAgain: "再读一遍",
    clue: "请求线索",
    defaultClue: "检查会改变系统的线索。",
    exploration: {
      title: "探索问题",
      starter: "先问一个问题，再尝试挑战。",
      ready: "准备尝试挑战",
      questions: {
        problem: "哪里不对？",
        cog9: "你是谁？",
        cog9Answer: "屏幕上的 COG-9 是车站助手机器人。它可以读取信号并建议火车移动，但必须先弄清楚证据。",
        inspect: "我应该先检查什么？",
        avoid: "为什么现在不能直接修？",
        avoidAnswer: "因为我们还不知道哪里坏了。如果先改控制台，COG-9 可能会更快地重复同一个错误。",
      },
    },
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
  const [avatarColor, setAvatarColor] = useState(avatarChoices[0].id);
  const transitionTimerRef = useRef<number | null>(null);
  const sessionCode = useMemo(() => initialSessionCode.toUpperCase(), [initialSessionCode]);
  const copy = uiText[language];
  const selectedAvatar = avatarChoices.find((avatar) => avatar.id === avatarColor) ?? avatarChoices[0];
  const selectedAvatarLabel = selectedAvatar[language];

  const runtime = useStudentMissionRuntime({
    sessionCode,
    displayName: selectedAvatarLabel,
    avatarColor,
    language: "en",
    setLanguage,
    onExit: () => setStartStep("splash"),
    text: { defaultClue: copy.defaultClue },
  });

  const introDialogue =
    language === "zh"
      ? `欢迎来到 TimeCity 火车站。我是 Ada 教授。你的 ${selectedAvatarLabel} 头像已准备好。两个车站时钟对不上，一列火车刚刚提前离站。我们先找线索，再碰控制台。`
      : `Welcome to TimeCity Station. I'm Professor Ada. Your ${selectedAvatarLabel} avatar is ready. Two station clocks disagree, and a train has just left early. We inspect first, then touch the controls.`;
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
  const showCog9IntroductionQuestion = runtime.scene?.node_key === "H1_N01" && runtime.scene.character === "cog9";
  const explorationQuestions =
    runtime.scene && missionPhase === "exploration"
      ? [
          {
            id: "problem",
            question: copy.exploration.questions.problem,
            answer: runtime.scene.dialogue.read_again_text,
          },
          ...(showCog9IntroductionQuestion
            ? [
                {
                  id: "cog9",
                  question: copy.exploration.questions.cog9,
                  answer: copy.exploration.questions.cog9Answer,
                },
              ]
            : []),
          {
            id: "inspect",
            question: copy.exploration.questions.inspect,
            answer: runtime.scene.clue?.text || copy.defaultClue,
          },
          {
            id: "avoid",
            question: copy.exploration.questions.avoid,
            answer: copy.exploration.questions.avoidAnswer,
          },
        ]
      : [];
  const explorationSurface =
    runtime.student && runtime.scene && missionPhase === "exploration"
      ? {
          title: copy.exploration.title,
          speakerName: runtime.scene.dialogue.speaker_name,
          text: runtime.scene.dialogue.text,
          questions: explorationQuestions,
          answer: runtime.explorationAnswer || copy.exploration.starter,
          readyLabel: copy.exploration.ready,
          onAsk: runtime.askExplorationQuestion,
          onReady: () => runtime.playback.advanceToChoices({ keepSpeaker: true }),
        }
      : null;
  const completionSurface =
    runtime.student?.memento
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
          prompt: completionSurface
            ? null
            : {
                speakerName: runtime.scene.dialogue.speaker_name,
                text: runtime.scene.dialogue.text,
              },
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
    restart: { label: copy.restart, onSelect: runtime.goBackOneStep },
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
      showDialogue: introPlayback.phase === "speaker-entering" || introPlayback.phase === "speaking",
      showActions: false,
      continue: runtime.join,
      begin: runtime.join,
    },
    mission: {
      student: runtime.student,
      scene: runtime.scene,
      phase: missionPhase,
      characterPhase: characterPhaseFor(missionPhase, { keepSpeakerInChoices: true, keepSpeakerInExploration: true }),
      showDialogue: missionPhase === "speaker-entering" || missionPhase === "speaking",
      showExploration: missionPhase === "exploration",
      showFeedback: missionPhase === "feedback" && Boolean(runtime.choiceFeedback),
      showChoices: missionPhase === "choices",
      explorationSurface,
      choiceSurface,
      supportSurface,
      mapSurface,
      navigation,
      choiceFeedback: runtime.choiceFeedback,
      busy: runtime.busy,
      changeLanguage: runtime.changeLanguage,
      continueDialogue: runtime.playback.advanceToExploration,
      applyPendingScene: runtime.applyPendingScene,
    },
  };
}

function characterPhaseFor(
  phase: ScenePlaybackPhase,
  options?: { keepSpeakerInChoices?: boolean; keepSpeakerInExploration?: boolean },
): CharacterPlaybackPhase {
  if (phase === "speaker-entering") return "entering";
  if (phase === "speaking") return "speaking";
  if (phase === "exploration" && options?.keepSpeakerInExploration) return "speaking";
  if (phase === "choices" && options?.keepSpeakerInChoices) return "speaking";
  if (phase === "speaker-exiting") return "exiting";
  return "hidden";
}
