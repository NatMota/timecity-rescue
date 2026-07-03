"use client";

import { useCallback, useEffect, useState } from "react";

export type ScenePlaybackPhase = "speaker-entering" | "speaking" | "exploration" | "speaker-exiting" | "choices" | "feedback";

const ENTER_MS = 420;
const EXIT_MS = 380;

export function useScenePlayback(sceneKey: string | null) {
  const [phase, setPhase] = useState<ScenePlaybackPhase>("speaker-entering");

  useEffect(() => {
    const enterId = window.setTimeout(() => setPhase("speaker-entering"), 0);
    const speakId = window.setTimeout(() => setPhase("speaking"), ENTER_MS);
    return () => {
      window.clearTimeout(enterId);
      window.clearTimeout(speakId);
    };
  }, [sceneKey]);

  const advanceToExploration = useCallback(() => {
    setPhase("exploration");
  }, []);

  const advanceToChoices = useCallback((options?: { keepSpeaker?: boolean }) => {
    if (options?.keepSpeaker) {
      setPhase("choices");
      return;
    }
    setPhase("speaker-exiting");
    window.setTimeout(() => setPhase("choices"), EXIT_MS);
  }, []);

  const replaySpeech = useCallback(() => {
    setPhase("speaker-entering");
    window.setTimeout(() => setPhase("speaking"), ENTER_MS);
  }, []);

  return { phase, setPhase, advanceToExploration, advanceToChoices, replaySpeech };
}
