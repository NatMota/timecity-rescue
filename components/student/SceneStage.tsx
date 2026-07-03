"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Play, Printer, ShieldCheck, XCircle } from "lucide-react";
import { RoomBackground } from "@/components/shared/RoomBackground";
import { SceneCharacterLayer } from "@/components/shared/SceneCharacterLayer";
import { ChoiceButtons } from "./ChoiceButtons";
import { ClueButton } from "./ClueButton";
import { LanguageToggle } from "./LanguageToggle";
import { useStudentGameDirector } from "./useStudentGameDirector";

export function SceneStage({ initialSessionCode }: { initialSessionCode: string }) {
  const game = useStudentGameDirector({ initialSessionCode });
  const { copy, language, mission, sessionCode, setup, start, intro } = game;
  const { student, scene } = mission;

  if (game.screen !== "mission" || !student || !scene) {
    if (game.screen === "loading") {
      return (
        <main className="loading-screen" aria-label="Loading">
          <span className="loading-spinner" aria-hidden="true" />
        </main>
      );
    }

    return (
      <main className="student-splash">
        {start.showIntroRoom ? (
          <>
            <RoomBackground roomSlug="future_trainstation" />
            <div className="scene-scrim" />
          </>
        ) : (
          <Image src="/assets/backgrounds/splash-screen.png" alt="" fill priority sizes="100vw" className="student-splash-art" />
        )}
        {start.showPlay ? (
          <section className="splash-landing" aria-label="Start TimeCity Rescue">
            <button type="button" className="play-action amethyst-action" onClick={start.play} disabled={start.transitionActive}>
              <Play size={28} fill="currentColor" />
              {copy.play}
            </button>
          </section>
        ) : null}
        <div className={`start-fade ${start.transitionActive ? "is-active" : ""}`} />

        {start.showMenu ? (
          <section className="start-panel start-panel-menu" aria-labelledby="config-title">
            <div className="start-panel-heading">
              <div>
                <p className="eyebrow">
                  {copy.mission} {sessionCode}
                </p>
                <h1 id="config-title">{copy.setupTitle}</h1>
                <p className="lead">{copy.setupLead}</p>
              </div>
              <LanguageToggle language={language} onChange={setup.changeLanguage} />
            </div>
            <div className="join-options">
              <div>
                <span className="option-label">{copy.avatar}</span>
                {copy.avatarLead ? <p className="menu-hint">{copy.avatarLead}</p> : null}
              </div>
            </div>
            <div className="avatar-grid">
              {setup.avatarChoices.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  className="avatar-choice"
                  aria-pressed={setup.avatarColor === avatar.id}
                  onClick={() => setup.setAvatarColor(avatar.id)}
                >
                  <span className="avatar-choice-frame">
                    <Image src={avatar.image} alt="" fill sizes="(max-width: 900px) 42vw, 150px" className="avatar-choice-art" />
                  </span>
                  <strong>{avatar[language]}</strong>
                </button>
              ))}
            </div>
            <div className="start-nav">
              <button type="button" className="secondary-action" onClick={start.backToSplash}>
                <ArrowLeft size={18} />
                {copy.back}
              </button>
              <button type="button" className="primary-action" onClick={start.continueToIntro} disabled={start.transitionActive}>
                {copy.continue}
              </button>
            </div>
          </section>
        ) : null}

        {start.showIntro ? (
          <section className="intro-scene" aria-label={copy.introTitle}>
            <SceneCharacterLayer character="ada" state="neutral" phase={intro.characterPhase} />
            {intro.showDialogue ? (
              <div className="intro-scene-dialogue">
                <p className="eyebrow">{copy.introSpeaker}</p>
                <p>{intro.dialogue}</p>
                <button type="button" className="primary-action" onClick={intro.continue}>
                  {copy.begin}
                </button>
              </div>
            ) : null}
            {intro.showActions ? (
              <div className="intro-scene-actions">
                <button type="button" className="secondary-action" onClick={start.backToMenu}>
                  <ArrowLeft size={18} />
                  {copy.back}
                </button>
                <button type="button" className="primary-action" onClick={intro.begin} disabled={mission.busy}>
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

      <SceneCharacterLayer character={scene.character} state={scene.character_state} phase={mission.characterPhase} />

      {mission.showDialogue ? (
        <section className="scene-dialogue-overlay" aria-live="polite">
          <p className="eyebrow">{scene.dialogue.speaker_name}</p>
          <p>{scene.dialogue.text}</p>
          <button type="button" className="primary-action" onClick={mission.continueDialogue}>
            {copy.continue}
          </button>
        </section>
      ) : null}

      {mission.showExploration && mission.explorationSurface ? (
        <section className="exploration-panel" aria-live="polite">
          <p className="eyebrow">{mission.explorationSurface.title}</p>
          <p className="exploration-question">
            <strong>{mission.explorationSurface.speakerName}</strong>
            {mission.explorationSurface.text}
          </p>
          <div className="exploration-question-actions" role="group" aria-label="Ask the character">
            {mission.explorationSurface.questions.map((question) => (
              <button key={question.id} type="button" onClick={() => mission.explorationSurface?.onAsk(question)}>
                {question.question}
              </button>
            ))}
          </div>
          <p className="exploration-answer">{mission.explorationSurface.answer}</p>
          <button type="button" className="progress-action" onClick={mission.explorationSurface.onReady}>
            {mission.explorationSurface.readyLabel}
            <ArrowRight size={22} />
          </button>
        </section>
      ) : null}

      {mission.showChoices && mission.choiceSurface ? (
        <section className="mission-panel mission-panel-overlay">
          {mission.choiceSurface.completion ? (
            <div className="completion-panel">
              <p className="eyebrow">{mission.choiceSurface.completion.badgeLabel}</p>
              <h2>{mission.choiceSurface.completion.title}</h2>
              <p>{mission.choiceSurface.completion.body}</p>
            </div>
          ) : mission.choiceSurface.main ? (
            <>
              {mission.choiceSurface.prompt ? (
                <div className="choice-question-panel">
                  <p className="eyebrow">{mission.choiceSurface.prompt.speakerName}</p>
                  <p>{mission.choiceSurface.prompt.text}</p>
                </div>
              ) : null}
              <ChoiceButtons
                choices={mission.choiceSurface.main.choices}
                disabled={mission.choiceSurface.main.disabled}
                onPreview={mission.choiceSurface.main.onPreview}
                onChoose={mission.choiceSurface.main.onChoose}
              />
            </>
          ) : null}
          {mission.choiceSurface.support ? (
            <div className="mission-tools">
              <ClueButton
                clue={mission.choiceSurface.support.clue}
                readAgain={mission.choiceSurface.support.readAgain}
                readAgainLabel={mission.choiceSurface.support.readAgainLabel}
                clueLabel={mission.choiceSurface.support.clueLabel}
                fallbackText={mission.choiceSurface.support.fallbackText}
                onClue={mission.choiceSurface.support.onClue}
                onReadAgain={mission.choiceSurface.support.onReadAgain}
              />
            </div>
          ) : null}
          {mission.choiceSurface.completion ? (
            <button type="button" className="primary-action" onClick={mission.choiceSurface.completion.onPrint}>
              <Printer size={20} />
              {mission.choiceSurface.completion.actionLabel}
            </button>
          ) : null}
        </section>
      ) : null}

      <footer className="student-footer">
        <div className="student-nav-actions">
          <button type="button" className="quiet-button mission-exit-button" onClick={mission.navigation.exit.onSelect}>
            <XCircle size={18} />
            {mission.navigation.exit.label}
          </button>
          <button type="button" className="quiet-button mission-back-button" onClick={mission.navigation.restart.onSelect}>
            <ArrowLeft size={18} />
            {mission.navigation.restart.label}
          </button>
        </div>
      </footer>
    </main>
  );
}
