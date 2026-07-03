"use client";

import Image from "next/image";
import { ArrowLeft, HelpCircle, Map, Play, Printer, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { RoomBackground } from "@/components/shared/RoomBackground";
import { SceneCharacterLayer } from "@/components/shared/SceneCharacterLayer";
import { BadgeRibbon } from "./BadgeRibbon";
import { BackpackDrawer } from "./BackpackDrawer";
import { ChoiceButtons } from "./ChoiceButtons";
import { ClueButton } from "./ClueButton";
import { LanguageToggle } from "./LanguageToggle";
import { SideQuestPanel } from "./SideQuestPanel";
import { useStudentGameDirector } from "./useStudentGameDirector";

export function SceneStage({ initialSessionCode }: { initialSessionCode: string }) {
  const game = useStudentGameDirector({ initialSessionCode });
  const { copy, language, mission, sessionCode, setup, start, intro } = game;
  const { student, scene } = mission;

  if (game.screen !== "mission" || !student || !scene) {
    if (game.screen === "loading") {
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
                <p className="menu-hint">{copy.avatarLead}</p>
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
                  {copy.continue}
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
      <header className="student-topbar">
        <div>
          <p className="eyebrow">{copy.episode}</p>
          <h1>TimeCity Rescue</h1>
        </div>
        <BadgeRibbon progress={student.badge_progress} />
        <LanguageToggle language={language} onChange={mission.changeLanguage} />
      </header>

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

      {mission.showFeedback && mission.choiceFeedback ? (
        <section className="choice-feedback-overlay" aria-live="polite">
          <p>{mission.choiceFeedback.text}</p>
          <button type="button" className="primary-action" onClick={mission.applyPendingScene}>
            {copy.continue}
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
            <ChoiceButtons
              choices={mission.choiceSurface.main.choices}
              disabled={mission.choiceSurface.main.disabled}
              onPreview={mission.choiceSurface.main.onPreview}
              onChoose={mission.choiceSurface.main.onChoose}
            />
          ) : null}
          {mission.choiceSurface.sideQuest ? (
            <SideQuestPanel
              sideQuest={mission.choiceSurface.sideQuest.sideQuest}
              complete={mission.choiceSurface.sideQuest.complete}
              result={mission.choiceSurface.sideQuest.result}
              disabled={mission.choiceSurface.sideQuest.disabled}
              onChoose={mission.choiceSurface.sideQuest.onChoose}
            />
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

      {mission.mapSurface?.open ? (
        <aside className="map-overlay" aria-label={mission.mapSurface.label}>
          <div className="map-panel">
            <div className="map-panel-heading">
              <p className="eyebrow">{mission.mapSurface.label}</p>
              <button type="button" className="quiet-button" onClick={mission.mapSurface.close}>
                <XCircle size={18} />
                {mission.mapSurface.closeLabel}
              </button>
            </div>
            <ol>
              {mission.mapSurface.stops.map((stop) => (
                <li key={stop.room} className={stop.current ? "is-current" : ""}>
                  <span>{stop.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      ) : null}

      <footer className="student-footer">
        <div className="student-nav-actions">
          <button type="button" className="quiet-button" onClick={mission.navigation.exit.onSelect}>
            <XCircle size={18} />
            {mission.navigation.exit.label}
          </button>
          <button type="button" className="quiet-button" onClick={mission.navigation.restart.onSelect}>
            <RotateCcw size={18} />
            {mission.navigation.restart.label}
          </button>
          <button type="button" className="quiet-button" onClick={mission.navigation.map.onSelect}>
            <Map size={18} />
            {mission.navigation.map.label}
          </button>
          <BackpackDrawer
            open={mission.navigation.backpack.open}
            labels={mission.navigation.backpack.labels}
            onToggle={mission.navigation.backpack.onToggle}
          />
          <button type="button" className="quiet-button" onClick={mission.navigation.askCharacter.onSelect}>
            <HelpCircle size={18} />
            {mission.navigation.askCharacter.label}
          </button>
        </div>
        <p>{mission.navigation.footer}</p>
      </footer>
    </main>
  );
}
