"use client";

import { useMemo, useRef, useState } from "react";
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

  async function join() {
    setBusy(true);
    const response = await fetch("/api/student/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: sessionCode, display_name: displayName, avatar_color: avatarColor, language }),
    });
    const data = await response.json();
    setStudent(data.student);
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
    setSupportText(type === "clue_count" ? scene.clue?.text || "Check the clue that changes the system." : scene.dialogue.read_again_text);
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
    return (
      <main className="student-shell join-shell">
        <section className="join-card">
          <p className="eyebrow">TimeCity Rescue</p>
          <h1>Join mission {sessionCode}</h1>
          <p className="lead">Choose a ChronoCadet codename, avatar colour and language. No chat box is used in the mission.</p>
          <div className="join-options">
            <div>
              <span className="option-label">Codename</span>
              <div className="pill-row">
                {codenames.map((name) => (
                  <button key={name} type="button" aria-pressed={displayName === name} onClick={() => setDisplayName(name)}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="option-label">Avatar colour</span>
              <div className="pill-row">
                {colors.map((color) => (
                  <button key={color} type="button" className={`swatch swatch-${color}`} aria-pressed={avatarColor === color} onClick={() => setAvatarColor(color)}>
                    {color}
                  </button>
                ))}
              </div>
            </div>
            <LanguageToggle language={language} onChange={setLanguage} />
          </div>
          <button type="button" className="primary-action" onClick={join} disabled={busy}>
            <ShieldCheck size={20} />
            Enter Episode 1
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="student-shell">
      <header className="student-topbar">
        <div>
          <p className="eyebrow">Episode 1 - The Missing Minute</p>
          <h1>TimeCity Rescue</h1>
        </div>
        <BadgeRibbon progress={student.badge_progress} />
        <LanguageToggle language={language} onChange={setLanguage} />
      </header>

      <section className="scene-layout">
        <div className="stage-card">
          <RoomBackground roomSlug={scene.room_slug} />
          <CharacterSprite character={scene.character} state={scene.character_state} />
        </div>
        <div className="mission-panel">
          <DialoguePanel scene={scene} />
          {consequence ? <p className="consequence">{consequence}</p> : null}
          <ChoiceButtons choices={scene.choices} disabled={busy} onPreview={markFirstChoicePreview} onChoose={submit} />
          <div className="mission-tools">
            <BackpackDrawer open={backpackOpen} onToggle={() => setBackpackOpen((value) => !value)} />
            <ClueButton
              clue={supportText}
              readAgain={scene.dialogue.read_again_text}
              onClue={() => signal("clue_count")}
              onReadAgain={() => signal("read_again_count")}
            />
          </div>
          {student.badge_progress >= 100 ? (
            <button type="button" className="primary-action" onClick={printMemento}>
              <Printer size={20} />
              Generate Mission Goal Card
            </button>
          ) : null}
        </div>
      </section>

      <footer className="student-footer">
        <button type="button" className="quiet-button">
          <PauseCircle size={18} />
          Pause / Exit
        </button>
        <p>The child never chats freely with AI. The AI adapts inside a teacher-controlled sandbox.</p>
      </footer>
    </main>
  );
}

function undefinedToNull<T>(value: T | undefined): T | null {
  return value ?? null;
}
