"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, PauseCircle, Play, Printer, ShieldCheck } from "lucide-react";
import { RoomBackground } from "@/components/shared/RoomBackground";
import { SceneCharacterLayer } from "@/components/shared/SceneCharacterLayer";
import { BadgeRibbon } from "./BadgeRibbon";
import { BackpackDrawer } from "./BackpackDrawer";
import { ChoiceButtons } from "./ChoiceButtons";
import { ClueButton } from "./ClueButton";
import { LanguageToggle } from "./LanguageToggle";
import { useScenePlayback, type ScenePlaybackPhase } from "./useScenePlayback";
import type { Language, ScenePayload, StudentRecord } from "@/lib/game/types";

const codenames = ["ChronoCadet Blue", "ChronoCadet Spark", "ChronoCadet Gear", "ChronoCadet Nova"];
const avatarChoices = [
  { id: "blue", image: "/assets/avatars/avatar-1.png", en: "Blue Cadet", zh: "蓝色学员" },
  { id: "teal", image: "/assets/avatars/avatar-2.png", en: "Signal Scout", zh: "信号侦察员" },
  { id: "purple", image: "/assets/avatars/avatar-3.png", en: "Portal Pilot", zh: "传送门飞行员" },
  { id: "amber", image: "/assets/avatars/avatar-4.png", en: "Gear Runner", zh: "齿轮奔跑者" },
  { id: "rose", image: "/assets/avatars/avatar-5.png", en: "Spark Solver", zh: "火花解谜者" },
  { id: "green", image: "/assets/avatars/avatar-6.png", en: "Code Keeper", zh: "代码守护者" },
];

type StartStep = "splash" | "menu" | "intro";

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
    print: "Generate Mission Goal Card",
    pause: "Pause / Exit",
    footer: "The child never chats freely with AI. The AI adapts inside a teacher-controlled sandbox.",
    clueFallback: "Use a support button if you want a safer next step.",
    readAgain: "Read Again",
    clue: "Ask for Clue",
    defaultClue: "Check the clue that changes the system.",
    backpack: {
      button: "Backpack",
      item: "Mission Compass",
      description: "Finds goal, input, rule and output.",
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
    print: "生成任务目标卡",
    pause: "暂停 / 退出",
    footer: "孩子不会与 AI 自由聊天。AI 只会在教师控制的沙盒中调整内容。",
    clueFallback: "如果你想要更安全的下一步，可以使用帮助按钮。",
    readAgain: "再读一遍",
    clue: "请求线索",
    defaultClue: "检查会改变系统的线索。",
    backpack: {
      button: "背包",
      item: "任务指南针",
      description: "寻找目标、输入、规则和输出。",
    },
  },
} satisfies Record<Language, Record<string, unknown>>;

export function SceneStage({ initialSessionCode }: { initialSessionCode: string }) {
  const [language, setLanguage] = useState<Language>("en");
  const [startStep, setStartStep] = useState<StartStep>("splash");
  const [startTransition, setStartTransition] = useState<"idle" | "fading">("idle");
  const [displayName] = useState(codenames[0]);
  const [avatarColor, setAvatarColor] = useState(avatarChoices[0].id);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [scene, setScene] = useState<ScenePayload | null>(null);
  const [pendingStudent, setPendingStudent] = useState<StudentRecord | null>(null);
  const [pendingScene, setPendingScene] = useState<ScenePayload | null>(null);
  const [choiceFeedback, setChoiceFeedback] = useState<{ text: string; completed: boolean } | null>(null);
  const [supportText, setSupportText] = useState("");
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const firstChoiceAtRef = useRef<number | null>(null);
  const supportCountsRef = useRef({ clue_count: 0, read_again_count: 0 });

  const sessionCode = useMemo(() => initialSessionCode.toUpperCase(), [initialSessionCode]);
  const copy = uiText[language] as typeof uiText.en;
  const selectedAvatar = avatarChoices.find((avatar) => avatar.id === avatarColor) ?? avatarChoices[0];
  const selectedAvatarLabel = selectedAvatar[language];
  const introDialogue =
    language === "zh"
      ? `欢迎来到 TimeCity 火车站，${displayName}。我是 Ada 教授。你的 ${selectedAvatarLabel} 头像已准备好。COG-9 正在站台等你，我们要找回消失的一分钟。`
      : `Welcome to TimeCity Station, ${displayName}. I'm Professor Ada. Your ${selectedAvatarLabel} avatar is ready. COG-9 is waiting on the platform, and we need to find the missing minute.`;
  const introPlayback = useScenePlayback(startStep === "intro" ? `intro-${language}-${avatarColor}` : null);
  const gamePlayback = useScenePlayback(scene ? scene.scene_id : null);

  function fadeToStep(nextStep: StartStep) {
    setStartTransition("fading");
    window.setTimeout(() => {
      setStartStep(nextStep);
      setStartTransition("idle");
    }, 680);
  }

  async function join() {
    setBusy(true);
    const response = await fetch("/api/student/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: sessionCode, display_name: displayName, avatar_color: avatarColor, language }),
    });
    const data = await response.json();
    setStudent(data.student);
    setLanguage(data.student.language);
    setScene(undefinedToNull(data.scene));
    await refreshState(data.student.id);
    setBusy(false);
  }

  async function refreshState(studentId = student?.id) {
    if (!studentId) return;
    const response = await fetch(`/api/student/state?session_code=${sessionCode}&student_id=${studentId}`);
    const data = await response.json();
    setStudent(data.student);
    setScene(data.scene);
    resetSceneTelemetry();
  }

  async function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    if (!student) return;
    setBusy(true);
    const response = await fetch("/api/student/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: sessionCode, student_id: student.id, language: nextLanguage }),
    });
    const data = await response.json();
    setStudent(data.student);
    setScene(data.scene);
    setSupportText("");
    resetSceneTelemetry();
    setBusy(false);
  }

  function resetSceneTelemetry() {
    setStartedAt(Date.now());
    firstChoiceAtRef.current = null;
    supportCountsRef.current = { clue_count: 0, read_again_count: 0 };
  }

  function markFirstChoicePreview() {
    firstChoiceAtRef.current = firstChoiceAtRef.current ?? Date.now();
  }

  async function submit(choiceId: string) {
    if (!student || !scene) return;
    setBusy(true);
    const submittedAt = Date.now();
    const sceneElapsedMs = submittedAt - startedAt;
    const response = await fetch("/api/choice/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_code: sessionCode,
        student_id: student.id,
        node_key: scene.node_key,
        room_slug: scene.room_slug,
        choice_id: choiceId,
        response_ms: sceneElapsedMs,
        scene_elapsed_ms: sceneElapsedMs,
        first_choice_ms: (firstChoiceAtRef.current ?? submittedAt) - startedAt,
        clue_count: supportCountsRef.current.clue_count,
        read_again_count: supportCountsRef.current.read_again_count,
      }),
    });
    const data = await response.json();
    setPendingStudent(data.student);
    setPendingScene(data.scene);
    setChoiceFeedback({ text: data.consequence, completed: Boolean(data.completed) });
    setSupportText("");
    gamePlayback.setPhase("feedback");
    setBusy(false);
  }

  function applyPendingScene() {
    if (!pendingStudent || !pendingScene) return;
    setStudent(pendingStudent);
    setScene(pendingScene);
    setPendingStudent(null);
    setPendingScene(null);
    setChoiceFeedback(null);
    resetSceneTelemetry();
    gamePlayback.replaySpeech();
  }

  async function signal(type: "clue_count" | "read_again_count") {
    if (!student || !scene) return;
    supportCountsRef.current = {
      ...supportCountsRef.current,
      [type]: supportCountsRef.current[type] + 1,
    };
    await fetch("/api/student/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_code: sessionCode,
        student_id: student.id,
        signal: type,
        node_key: scene.node_key,
        room_slug: scene.room_slug,
        scene_elapsed_ms: Date.now() - startedAt,
      }),
    });
    setSupportText(type === "clue_count" ? scene.clue?.text || copy.defaultClue : scene.dialogue.read_again_text);
    await refreshState(student.id);
  }

  async function printMemento() {
    if (!student) return;
    const response = await fetch("/api/memento/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: sessionCode, student_id: student.id }),
    });
    const data = await response.json();
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (win) {
      win.document.write(data.html);
      win.document.close();
    }
  }

  if (!student || !scene) {
    if (student) {
      return (
        <main className="student-splash">
          <Image src="/assets/backgrounds/splash-screen.png" alt="" fill priority sizes="100vw" className="student-splash-art" />
          <section className="loading-panel" aria-live="polite">
            <p className="eyebrow">TimeCity Rescue</p>
            <h1>{copy.loading}</h1>
          </section>
        </main>
      );
    }

    return (
      <main className="student-splash">
        {startStep === "intro" ? (
          <>
            <RoomBackground roomSlug="future_trainstation" />
            <div className="scene-scrim" />
          </>
        ) : (
          <Image src="/assets/backgrounds/splash-screen.png" alt="" fill priority sizes="100vw" className="student-splash-art" />
        )}
        {startStep === "splash" ? (
          <section className="splash-landing" aria-label="Start TimeCity Rescue">
            <button type="button" className="play-action amethyst-action" onClick={() => fadeToStep("menu")} disabled={startTransition === "fading"}>
              <Play size={28} fill="currentColor" />
              {copy.play}
            </button>
          </section>
        ) : null}
        <div className={`start-fade ${startTransition === "fading" ? "is-active" : ""}`} />

        {startStep === "menu" ? (
          <section className="start-panel start-panel-menu" aria-labelledby="config-title">
            <div className="start-panel-heading">
              <div>
                <p className="eyebrow">
                  {copy.mission} {sessionCode}
                </p>
                <h1 id="config-title">{copy.setupTitle}</h1>
                <p className="lead">{copy.setupLead}</p>
              </div>
              <LanguageToggle language={language} onChange={changeLanguage} />
            </div>
            <div className="join-options">
              <div>
                <span className="option-label">{copy.avatar}</span>
                <p className="menu-hint">{copy.avatarLead}</p>
              </div>
            </div>
            <div className="avatar-grid">
              {avatarChoices.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  className="avatar-choice"
                  aria-pressed={avatarColor === avatar.id}
                  onClick={() => setAvatarColor(avatar.id)}
                >
                  <span className="avatar-choice-frame">
                    <Image src={avatar.image} alt="" fill sizes="(max-width: 900px) 42vw, 150px" className="avatar-choice-art" />
                  </span>
                  <strong>{avatar[language]}</strong>
                </button>
              ))}
            </div>
            <div className="start-nav">
              <button type="button" className="secondary-action" onClick={() => setStartStep("splash")}>
                <ArrowLeft size={18} />
                {copy.back}
              </button>
              <button type="button" className="primary-action" onClick={() => fadeToStep("intro")} disabled={startTransition === "fading"}>
                {copy.continue}
              </button>
            </div>
          </section>
        ) : null}

        {startStep === "intro" ? (
          <section className="intro-scene" aria-label={copy.introTitle}>
            <SceneCharacterLayer character="ada" state="neutral" phase={characterPhaseFor(introPlayback.phase)} />
            {introPlayback.phase === "speaking" ? (
              <div className="intro-scene-dialogue">
                <p className="eyebrow">{copy.introSpeaker}</p>
                <p>{introDialogue}</p>
                <button type="button" className="primary-action" onClick={introPlayback.advanceToChoices}>
                  {copy.continue}
                </button>
              </div>
            ) : null}
            {introPlayback.phase === "choices" ? (
              <div className="intro-scene-actions">
                <button type="button" className="secondary-action" onClick={() => setStartStep("menu")}>
                  <ArrowLeft size={18} />
                  {copy.back}
                </button>
                <button type="button" className="primary-action" onClick={join} disabled={busy}>
                  <ShieldCheck size={20} />
                  {copy.begin}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    );
  }

  return (
    <main className="student-experience">
      <RoomBackground roomSlug={scene.room_slug} />
      <div className="scene-scrim" />
      <header className="student-topbar">
        <div>
          <p className="eyebrow">{copy.episode}</p>
          <h1>TimeCity Rescue</h1>
        </div>
        <BadgeRibbon progress={student.badge_progress} />
        <LanguageToggle language={language} onChange={changeLanguage} />
      </header>

      <SceneCharacterLayer character={scene.character} state={scene.character_state} phase={characterPhaseFor(gamePlayback.phase)} />

      {gamePlayback.phase === "speaking" ? (
        <section className="scene-dialogue-overlay" aria-live="polite">
          <p className="eyebrow">{scene.dialogue.speaker_name}</p>
          <p>{scene.dialogue.text}</p>
          <button type="button" className="primary-action" onClick={gamePlayback.advanceToChoices}>
            {copy.continue}
          </button>
        </section>
      ) : null}

      {gamePlayback.phase === "feedback" && choiceFeedback ? (
        <section className="choice-feedback-overlay" aria-live="polite">
          <p>{choiceFeedback.text}</p>
          <button type="button" className="primary-action" onClick={applyPendingScene}>
            {copy.continue}
          </button>
        </section>
      ) : null}

      {gamePlayback.phase === "choices" ? (
        <section className="mission-panel mission-panel-overlay">
          {student.badge_progress >= 100 ? (
            <div className="completion-panel">
              <p className="eyebrow">Goal Badge</p>
              <h2>{language === "zh" ? "任务完成" : "Mission Complete"}</h2>
              <p>
                {language === "zh"
                  ? "你已经准备好生成 Agent Builder Passport。"
                  : "You are ready to generate your Agent Builder Passport."}
              </p>
            </div>
          ) : (
            <ChoiceButtons choices={scene.choices} disabled={busy} onPreview={markFirstChoicePreview} onChoose={submit} />
          )}
          <div className="mission-tools">
            <BackpackDrawer
              open={backpackOpen}
              labels={copy.backpack}
              onToggle={() => setBackpackOpen((value) => !value)}
            />
            <ClueButton
              clue={supportText}
              readAgain={scene.dialogue.read_again_text}
              readAgainLabel={copy.readAgain}
              clueLabel={copy.clue}
              fallbackText={copy.clueFallback}
              onClue={() => signal("clue_count")}
              onReadAgain={() => signal("read_again_count")}
            />
          </div>
          {student.badge_progress >= 100 ? (
            <button type="button" className="primary-action" onClick={printMemento}>
              <Printer size={20} />
              {copy.print}
            </button>
          ) : null}
        </section>
      ) : null}

      <footer className="student-footer">
        <button type="button" className="quiet-button">
          <PauseCircle size={18} />
          {copy.pause}
        </button>
        <p>{copy.footer}</p>
      </footer>
    </main>
  );
}

function characterPhaseFor(phase: ScenePlaybackPhase) {
  if (phase === "speaker-entering") return "entering";
  if (phase === "speaking") return "speaking";
  if (phase === "speaker-exiting") return "exiting";
  return "hidden";
}

function undefinedToNull<T>(value: T | undefined): T | null {
  return value ?? null;
}
