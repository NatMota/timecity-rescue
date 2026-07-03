"use client";

import { useMemo, useRef, useState } from "react";
import { getSideQuestForNode } from "@/lib/game/sideQuests";
import { useScenePlayback } from "./useScenePlayback";
import type { Language, ScenePayload, StudentRecord } from "@/lib/game/types";

type RuntimeText = {
  defaultClue: string;
};

type SideQuestResult = {
  sideQuestId: string;
  text: string;
  correct: boolean;
};

export function useStudentMissionRuntime({
  sessionCode,
  displayName,
  avatarColor,
  language,
  setLanguage,
  onExit,
  text,
}: {
  sessionCode: string;
  displayName: string;
  avatarColor: string;
  language: Language;
  setLanguage: (language: Language) => void;
  onExit: () => void;
  text: RuntimeText;
}) {
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [scene, setScene] = useState<ScenePayload | null>(null);
  const [pendingStudent, setPendingStudent] = useState<StudentRecord | null>(null);
  const [pendingScene, setPendingScene] = useState<ScenePayload | null>(null);
  const [choiceFeedback, setChoiceFeedback] = useState<{ text: string; completed: boolean } | null>(null);
  const [supportText, setSupportText] = useState("");
  const [backpackOpen, setBackpackOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completedSideQuestIds, setCompletedSideQuestIds] = useState<string[]>([]);
  const [sideQuestResult, setSideQuestResult] = useState<SideQuestResult | null>(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const firstChoiceAtRef = useRef<number | null>(null);
  const supportCountsRef = useRef({ clue_count: 0, read_again_count: 0 });

  const playback = useScenePlayback(scene ? scene.scene_id : null);
  const sideQuest = useMemo(() => (scene ? getSideQuestForNode(scene.node_key, language) : null), [language, scene]);
  const activeSideQuestResult = sideQuestResult?.sideQuestId === sideQuest?.id ? sideQuestResult : null;
  const sideQuestComplete = Boolean(
    sideQuest && (completedSideQuestIds.includes(sideQuest.id) || student?.completed_side_quest_ids?.includes(sideQuest.id)),
  );

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
    setSideQuestResult(null);
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

  async function submitChoice(choiceId: string) {
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
    setSideQuestResult(null);
    playback.setPhase("feedback");
    setBusy(false);
  }

  function applyPendingScene() {
    if (!pendingStudent || !pendingScene) return;
    setStudent(pendingStudent);
    setScene(pendingScene);
    setPendingStudent(null);
    setPendingScene(null);
    setChoiceFeedback(null);
    setSideQuestResult(null);
    resetSceneTelemetry();
    playback.replaySpeech();
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
    setSupportText(type === "clue_count" ? scene.clue?.text || text.defaultClue : scene.dialogue.read_again_text);
    await refreshState(student.id);
  }

  async function askCharacter() {
    if (!scene) return;
    setSupportText(scene.clue?.text || text.defaultClue);
    playback.replaySpeech();
    if (!student) return;
    supportCountsRef.current = {
      ...supportCountsRef.current,
      clue_count: supportCountsRef.current.clue_count + 1,
    };
    await fetch("/api/student/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_code: sessionCode,
        student_id: student.id,
        signal: "clue_count",
        node_key: scene.node_key,
        room_slug: scene.room_slug,
        scene_elapsed_ms: Date.now() - startedAt,
      }),
    });
  }

  async function chooseSideQuest(choiceId: string) {
    if (!student || !scene || !sideQuest || sideQuestComplete) return;
    const choice = sideQuest.choices.find((item) => item.id === choiceId);
    if (!choice) return;
    const correct = choice.correct;
    if (correct) {
      setCompletedSideQuestIds((current) => (current.includes(sideQuest.id) ? current : [...current, sideQuest.id]));
    }
    setSideQuestResult({
      sideQuestId: sideQuest.id,
      correct,
      text: correct ? sideQuest.success : sideQuest.retry,
    });
    const response = await fetch("/api/student/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_code: sessionCode,
        student_id: student.id,
        event_type: "side_quest_choice",
        node_key: scene.node_key,
        room_slug: scene.room_slug,
        choice_id: choiceId,
        scene_elapsed_ms: Date.now() - startedAt,
        metadata: {
          side_quest_id: sideQuest.id,
          correct,
        },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (data.student) setStudent(data.student);
  }

  function exitMission() {
    setStudent(null);
    setScene(null);
    setPendingStudent(null);
    setPendingScene(null);
    setChoiceFeedback(null);
    setSupportText("");
    setBackpackOpen(false);
    setMapOpen(false);
    setCompletedSideQuestIds([]);
    setSideQuestResult(null);
    onExit();
  }

  function restartMission() {
    exitMission();
    resetSceneTelemetry();
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

  return {
    student,
    scene,
    choiceFeedback,
    supportText,
    backpackOpen,
    mapOpen,
    busy,
    playback,
    sideQuest,
    sideQuestComplete,
    sideQuestResult: activeSideQuestResult,
    setBackpackOpen,
    setMapOpen,
    join,
    changeLanguage,
    submitChoice,
    applyPendingScene,
    signal,
    askCharacter,
    chooseSideQuest,
    exitMission,
    restartMission,
    printMemento,
    markFirstChoicePreview,
  };
}

function undefinedToNull<T>(value: T | undefined): T | null {
  return value ?? null;
}
