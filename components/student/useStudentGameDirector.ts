"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useScenePlayback, type ScenePlaybackPhase } from "./useScenePlayback";
import { useStudentMissionRuntime } from "./useStudentMissionRuntime";
import type { CharacterPlaybackPhase } from "@/components/shared/SceneCharacterLayer";
import { ROOM_SEQUENCE, ROOM_TITLES } from "@/lib/game/fixedGraph";
import { getRoomExploration, isRoomIntroNode } from "@/lib/game/roomExploration";
import type { CharacterSlug, CharacterState } from "@/lib/game/types";

export const avatarChoices = [
  { id: "blue", image: "/assets/avatars/avatar-1.png", label: "Blue Cadet" },
  { id: "teal", image: "/assets/avatars/avatar-2.png", label: "Signal Scout" },
  { id: "purple", image: "/assets/avatars/avatar-3.png", label: "Portal Pilot" },
  { id: "amber", image: "/assets/avatars/avatar-4.png", label: "Gear Runner" },
  { id: "rose", image: "/assets/avatars/avatar-5.png", label: "Spark Solver" },
  { id: "green", image: "/assets/avatars/avatar-6.png", label: "Code Keeper" },
];

type BackpackCopy = {
  button: string;
  items: Array<{ slug: string; item: string; description: string }>;
};

type ExplorationCopy = {
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

const uiText: StudentCopy = {
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
};

export type StartStep = "splash" | "menu" | "intro";

const START_FADE_MS = 680;

type IntroBeat = {
  speaker: string;
  character: CharacterSlug;
  state: CharacterState;
  text: string;
  incident?: boolean;
};

export function useStudentGameDirector({ initialSessionCode }: { initialSessionCode: string }) {
  const [startStep, setStartStep] = useState<StartStep>("splash");
  const [startTransition, setStartTransition] = useState<"idle" | "fading">("idle");
  const [avatarColor, setAvatarColor] = useState(avatarChoices[0].id);
  const [introBeatIndex, setIntroBeatIndex] = useState(0);
  const transitionTimerRef = useRef<number | null>(null);
  const sessionCode = useMemo(() => initialSessionCode.toUpperCase(), [initialSessionCode]);
  const copy = uiText;
  const selectedAvatar = avatarChoices.find((avatar) => avatar.id === avatarColor) ?? avatarChoices[0];
  const selectedAvatarLabel = selectedAvatar.label;

  const runtime = useStudentMissionRuntime({
    sessionCode,
    displayName: selectedAvatarLabel,
    avatarColor,
    language: "en",
    onExit: () => setStartStep("splash"),
    text: { defaultClue: copy.defaultClue },
  });

  const introBeats = useMemo(
    () => buildIntroBeats(selectedAvatarLabel),
    [selectedAvatarLabel],
  );
  const introBeat = introBeats[Math.min(introBeatIndex, introBeats.length - 1)];
  const introPlayback = useScenePlayback(startStep === "intro" ? `intro-${avatarColor}-${introBeatIndex}` : null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const fadeToStep = useCallback((nextStep: StartStep) => {
    setStartTransition("fading");
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      if (nextStep === "intro") setIntroBeatIndex(0);
      setStartStep(nextStep);
      setStartTransition("idle");
    }, START_FADE_MS);
  }, []);

  const continueIntro = useCallback(() => {
    if (introBeatIndex < introBeats.length - 1) {
      setIntroBeatIndex((index) => index + 1);
      return;
    }
    runtime.join();
  }, [introBeatIndex, introBeats.length, runtime]);

  const missionPhase = runtime.playback.phase;
  const roomExploration = runtime.scene ? getRoomExploration(runtime.scene.node_key) : null;
  const shouldExploreRoom = Boolean(runtime.scene && roomExploration && isRoomIntroNode(runtime.scene.node_key));
  const explorationSurface =
    runtime.student && runtime.scene && roomExploration && missionPhase === "exploration"
      ? {
          title: roomExploration.title,
          speakerName: runtime.scene.dialogue.speaker_name,
          text: runtime.scene.dialogue.text,
          questions: roomExploration.questions,
          answer: runtime.explorationAnswer || roomExploration.starter,
          readyLabel: roomExploration.readyLabel,
          readyDisabled: runtime.explorationQuestionCount < (roomExploration.minQuestionsBeforeChallenge ?? 0),
          onAsk: runtime.askExplorationQuestion,
          onReady: () => runtime.playback.advanceToChoices({ keepSpeaker: true }),
        }
      : null;
  const completionSurface =
    runtime.student?.memento
      ? {
          title: "Mission Complete",
          body: "You are ready to generate your Agent Builder Passport.",
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
      backToMenu: () => {
        setIntroBeatIndex(0);
        setStartStep("menu");
      },
    },
    setup: {
      avatarChoices,
      avatarColor,
      setAvatarColor,
    },
    intro: {
      dialogue: introBeat.text,
      speaker: introBeat.speaker,
      character: introBeat.character,
      characterState: introBeat.state,
      showIncident: Boolean(introBeat.incident),
      isLastBeat: introBeatIndex === introBeats.length - 1,
      phase: introPlayback.phase,
      characterPhase: characterPhaseFor(introPlayback.phase),
      showDialogue: introPlayback.phase === "speaker-entering" || introPlayback.phase === "speaking",
      showActions: false,
      continue: continueIntro,
      begin: runtime.join,
    },
    mission: {
      student: runtime.student,
      scene: runtime.scene,
      phase: missionPhase,
      characterPhase: characterPhaseFor(missionPhase, { keepSpeakerInChoices: true, keepSpeakerInExploration: true }),
      showDialogue: missionPhase === "speaker-entering" || missionPhase === "speaking",
      showExploration: missionPhase === "exploration" && Boolean(explorationSurface),
      showChoices: missionPhase === "choices",
      explorationSurface,
      choiceSurface,
      supportSurface,
      mapSurface,
      navigation,
      busy: runtime.busy,
      continueDialogue: () => {
        if (shouldExploreRoom) {
          runtime.playback.advanceToExploration();
          return;
        }
        runtime.playback.advanceToChoices({ keepSpeaker: true });
      },
    },
  };
}

function buildIntroBeats(selectedAvatarLabel: string): IntroBeat[] {
  return [
    {
      speaker: "Professor Ada",
      character: "ada",
      state: "neutral",
      text: `Welcome to TimeCity. Trains cross the sky, markets ride the rails, and every clock must agree. Your ${selectedAvatarLabel} avatar is ready.`,
    },
    {
      speaker: "COG-9",
      character: "cog9",
      state: "uncertain",
      text: "Hello. I am COG-9. Platform 2 has 18 passengers, 3 parcels, and one nervous robot. I will count clues with you.",
    },
    {
      speaker: "Nix",
      character: "nix",
      state: "mischievous",
      text: "Numbers are slow. I am Nix. I can make signs blink faster. Watch this.",
    },
    {
      speaker: "Professor Ada",
      character: "ada",
      state: "warning",
      text: "A train just left one minute early. The station clocks split. TimeCity needs a systems detective. That is you.",
      incident: true,
    },
  ];
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
