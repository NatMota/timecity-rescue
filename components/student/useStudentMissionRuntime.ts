"use client";

import { useRef, useState } from "react";
import { useScenePlayback } from "./useScenePlayback";
import type { Language, ScenePayload, StudentRecord } from "@/lib/game/types";

type RuntimeText = {
  defaultClue: string;
};

type ExplorationQuestion = {
  id: string;
  question: string;
  answer: string;
};

export function useStudentMissionRuntime({
  sessionCode,
  displayName,
  avatarColor,
  language,
  onExit,
  text,
}: {
  sessionCode: string;
  displayName: string;
  avatarColor: string;
  language: Language;
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
  const [explorationAnswer, setExplorationAnswer] = useState("");
  const [explorationQuestionIds, setExplorationQuestionIds] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState(Date.now());
  const firstChoiceAtRef = useRef<number | null>(null);
  const supportCountsRef = useRef({ clue_count: 0, read_again_count: 0 });

  const playback = useScenePlayback(scene ? scene.scene_id : null);
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
    setExplorationAnswer("");
    setExplorationQuestionIds([]);
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
    setStudent(data.student);
    setScene(data.scene);
    setPendingStudent(null);
    setPendingScene(null);
    setChoiceFeedback(null);
    setSupportText("");
    setExplorationAnswer("");
    resetSceneTelemetry();
    if (data.completed || data.student?.memento) {
      playback.setPhase("choices");
    } else {
      playback.replaySpeech();
    }
    setBusy(false);
  }

  function applyPendingScene() {
    if (!pendingStudent || !pendingScene) return;
    setStudent(pendingStudent);
    setScene(pendingScene);
    setPendingStudent(null);
    setPendingScene(null);
    setChoiceFeedback(null);
    setExplorationAnswer("");
    resetSceneTelemetry();
    if (pendingStudent.memento) {
      playback.setPhase("choices");
      return;
    }
    playback.replaySpeech();
  }

  async function askExplorationQuestion(question: ExplorationQuestion) {
    if (!scene) return;
    setExplorationAnswer(question.answer);
    setExplorationQuestionIds((current) => (current.includes(question.id) ? current : [...current, question.id]));
    if (!student) return;
    await fetch("/api/student/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_code: sessionCode,
        student_id: student.id,
        event_type: "exploration_question",
        node_key: scene.node_key,
        room_slug: scene.room_slug,
        scene_elapsed_ms: Date.now() - startedAt,
        metadata: {
          question_id: question.id,
          question: question.question,
        },
      }),
    });
  }

  async function signal(type: "clue_count" | "read_again_count") {
    if (!student || !scene) return;
    supportCountsRef.current = {
      ...supportCountsRef.current,
      [type]: supportCountsRef.current[type] + 1,
    };
    const response = await fetch("/api/student/state", {
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
    const data = await response.json().catch(() => ({}));
    if (data.student) setStudent(data.student);
    if (data.scene) setScene(data.scene);
    const nextScene = data.scene ?? scene;
    setSupportText(
      type === "clue_count"
        ? nextScene.hint_ladder?.current_hint || nextScene.clue?.text || text.defaultClue
        : nextScene.dialogue.read_again_text,
    );
  }

  async function askCharacter() {
    if (!scene) return;
    setSupportText(scene.hint_ladder?.current_hint || scene.clue?.text || text.defaultClue);
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

  function exitMission() {
    setStudent(null);
    setScene(null);
    setPendingStudent(null);
    setPendingScene(null);
    setChoiceFeedback(null);
    setSupportText("");
    setExplorationAnswer("");
    setBackpackOpen(false);
    setMapOpen(false);
    onExit();
  }

  function restartMission() {
    exitMission();
    resetSceneTelemetry();
  }

  function goBackOneStep() {
    setSupportText("");
    if (playback.phase === "choices") {
      playback.setPhase("exploration");
      return;
    }
    if (playback.phase === "exploration") {
      playback.setPhase("speaking");
      return;
    }
    if (playback.phase === "feedback") {
      playback.setPhase("choices");
      return;
    }
    playback.setPhase("speaking");
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
    explorationAnswer,
    explorationQuestionCount: explorationQuestionIds.length,
    backpackOpen,
    mapOpen,
    busy,
    playback,
    setBackpackOpen,
    setMapOpen,
    join,
    submitChoice,
    applyPendingScene,
    signal,
    askCharacter,
    askExplorationQuestion,
    exitMission,
    restartMission,
    goBackOneStep,
    printMemento,
    markFirstChoicePreview,
  };
}

function undefinedToNull<T>(value: T | undefined): T | null {
  return value ?? null;
}
