import { Copy, Monitor, Pause, Play, Plus } from "lucide-react";
import type { ClassSession } from "@/lib/game/types";

export function SessionControls({
  session,
  busyAction,
  onCreate,
  onStart,
  onPause,
  onProject,
}: {
  session: ClassSession | null;
  busyAction?: string | null;
  onCreate: () => void;
  onStart: () => void;
  onPause: () => void;
  onProject: () => void;
}) {
  const studentLink = session ? `${typeof window === "undefined" ? "" : window.location.origin}/play/${session.session_code}` : "";
  const sessionLocked = !session || Boolean(busyAction);
  return (
    <section className="teacher-card session-controls">
      <div>
        <p className="eyebrow">Class session</p>
        <h2>Mission: TimeCity Rescue</h2>
        <p>Episode 1 - The Missing Minute · Age band 9–10 · English</p>
      </div>
      <div className="teacher-actions">
        <button type="button" className="primary-action" disabled={Boolean(busyAction)} onClick={onCreate}>
          <Plus size={18} />
          {busyAction === "create" ? "Creating..." : "Create session"}
        </button>
        <button type="button" className="tool-button" disabled={sessionLocked} onClick={onStart}>
          <Play size={18} />
          Start
        </button>
        <button type="button" className="tool-button" disabled={sessionLocked} onClick={onPause}>
          <Pause size={18} />
          Pause
        </button>
      </div>
      {!session ? <p className="session-helper">Create a session before starting, pausing or projecting a class code.</p> : null}
      {session ? (
        <div className="join-code-panel">
          <span>Join code</span>
          <strong>{session.session_code}</strong>
          <button type="button" className="primary-action" onClick={onProject}>
            <Monitor size={16} />
            Project
          </button>
          <button type="button" className="tool-button" onClick={() => navigator.clipboard?.writeText(studentLink)}>
            <Copy size={16} />
            Copy student link
          </button>
          <a href={`/play/${session.session_code}`}>{studentLink || `/play/${session.session_code}`}</a>
        </div>
      ) : null}
    </section>
  );
}
