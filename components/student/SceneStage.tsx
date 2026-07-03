"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { PauseCircle, Printer, ShieldCheck } from "lucide-react";
import { CharacterSprite } from "@/components/shared/CharacterSprite";
import { RoomBackground } from "@/components/shared/RoomBackground";
import { BadgeRibbon } from "./BadgeRibbon";
import { BackpackDrawer } from "./BackpackDrawer";
import { ChoiceButtons } from "./ChoiceButtons";
import { ClueButton } from "./ClueButton";
import { DialoguePanel } from "./DialoguePanel";
import { LanguageToggle } from "./LanguageToggle";
import type { Language, ScenePayload, StudentRecord } from "@/lib/game/types";

const codenames = ["ChronoCadet Blue", "ChronoCadet Spark", "ChronoCadet Gear", "ChronoCadet Nova"];
const colors = ["blue", "teal", "purple", "amber"];

const uiText = {
  en: {
    mission: "Join mission",
    lead: "Choose a ChronoCadet codename, avatar colour and language. No chat box is used in the mission.",
    codename: "Codename",
    avatar: "Avatar colour",
    enter: "Enter Episode 1",
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
    lead: "选择你的时空学员代号、头像颜色和语言。任务中不会使用自由聊天框。",
    codename: "代号",
    avatar: "头像颜色",
    enter: "进入第一集",
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
  const [displayName, setDisplayName] = useState(codenames[0]);
  const [avatarColor, setAvatarColor] = useState(colors[0]);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [scene, setScene] = useState<ScenePayload | null>(null);
  const [consequence, setConsequence] = useState("");
  const [supportText, setSupportText] = useState("");
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const firstChoiceAtRef = useRef<number | null>(null);
  const supportCountsRef = useRef({ clue_count: 0, read_again_count: 0 });

  const sessionCode = useMemo(() => initialSessionCode.toUpperCase(), [initialSessionCode]);
  const copy = uiText[language] as typeof uiText.en;

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
    setStudent(data.student);
    setScene(data.scene);
    setConsequence(data.consequence);
    setSupportText("");
    resetSceneTelemetry();
    setBusy(false);
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
          <div className="student-splash-scrim" />
          <section className="loading-panel" aria-live="polite">
            <p className="eyebrow">TimeCity Rescue</p>
            <h1>{copy.loading}</h1>
          </section>
        </main>
      );
    }

    return (
      <main className="student-splash">
        <Image src="/assets/backgrounds/splash-screen.png" alt="" fill priority sizes="100vw" className="student-splash-art" />
        <div className="student-splash-scrim" />
        <section className="join-card splash-card">
          <p className="eyebrow">TimeCity Rescue</p>
          <h1>
            {copy.mission} {sessionCode}
          </h1>
          <p className="lead">{copy.lead}</p>
          <div className="join-options">
            <div>
              <span className="option-label">{copy.codename}</span>
              <div className="pill-row">
                {codenames.map((name) => (
                  <button key={name} type="button" aria-pressed={displayName === name} onClick={() => setDisplayName(name)}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="option-label">{copy.avatar}</span>
              <div className="pill-row">
                {colors.map((color) => (
                  <button key={color} type="button" className={`swatch swatch-${color}`} aria-pressed={avatarColor === color} onClick={() => setAvatarColor(color)}>
                    {color}
                  </button>
                ))}
              </div>
            </div>
            <LanguageToggle language={language} onChange={changeLanguage} />
          </div>
          <button type="button" className="primary-action" onClick={join} disabled={busy}>
            <ShieldCheck size={20} />
            {copy.enter}
          </button>
        </section>
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

      <CharacterSprite character={scene.character} state={scene.character_state} />

      <section className="mission-panel mission-panel-overlay">
        <DialoguePanel scene={scene} />
        {consequence ? <p className="consequence">{consequence}</p> : null}
        <ChoiceButtons choices={scene.choices} disabled={busy} onPreview={markFirstChoicePreview} onChoose={submit} />
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

function undefinedToNull<T>(value: T | undefined): T | null {
  return value ?? null;
}
