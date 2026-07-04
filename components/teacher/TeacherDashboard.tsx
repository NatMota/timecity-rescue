"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { MementoExport } from "./MementoExport";
import { SessionControls } from "./SessionControls";
import { StudentDetailPanel } from "./StudentDetailPanel";
import { StudentProgressTable } from "./StudentProgressTable";
import type { ClassSession, StudentRecord } from "@/lib/game/types";

async function fetchJson(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed: ${response.status}`);
  }
  return data;
}

export function TeacherDashboard() {
  const [session, setSession] = useState<ClassSession | null>(null);
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projecting, setProjecting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function createSession() {
    setBusyAction("create");
    setError(null);
    try {
      const data = await fetchJson("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      setSession(data.session);
      setSelected(data.session.students[0] ?? null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create a session.");
    } finally {
      setBusyAction(null);
    }
  }

  async function setStatus(status: "start" | "pause") {
    if (!session) return;
    setBusyAction(status);
    setError(null);
    try {
      const data = await fetchJson(`/api/session/${status}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_code: session.session_code }),
      });
      setSession(data.session);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to update the session.");
    } finally {
      setBusyAction(null);
    }
  }

  async function refresh() {
    if (!session) return;
    try {
      const data = await fetchJson(`/api/student/state?session_code=${session.session_code}`);
      setSession(data.session);
      setSelected((current) => data.session.students.find((student: StudentRecord) => student.id === current?.id) ?? data.session.students[0] ?? null);
      setError(null);
    } catch (issue) {
      setError(`Reconnecting... ${issue instanceof Error ? issue.message : "Unable to refresh session data."}`);
    }
  }

  async function override(action: "skip" | "reset" | "assist") {
    if (!session || !selected) return;
    setBusyAction(action);
    setError(null);
    try {
      const data = await fetchJson("/api/session/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_code: session.session_code, student_id: selected.id, action }),
      });
      setSession(data.session);
      setSelected(data.student);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to apply teacher support.");
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(refresh, 2500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.session_code]);

  return (
    <main className="teacher-shell">
      <header className="teacher-hero">
        <div>
          <p className="eyebrow">Teacher control room</p>
          <h1>TimeCity Teacher Dashboard</h1>
          <p>
            Launch Episode 1, watch live progress, and keep every pupil inside the fixed story sandbox.
          </p>
        </div>
        <div className="safety-statement">No student chat · No leaderboard · Fixed rooms · Teacher override</div>
      </header>

      {error ? (
        <section className="teacher-alert" role="status">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </section>
      ) : null}

      <SessionControls
        session={session}
        busyAction={busyAction}
        onCreate={createSession}
        onStart={() => setStatus("start")}
        onPause={() => setStatus("pause")}
        onProject={() => setProjecting(true)}
      />

      <div className="teacher-grid">
        <StudentProgressTable students={session?.students ?? []} selectedId={selected?.id} onSelect={setSelected} />
        {selected ? <StudentDetailPanel student={selected} busyAction={busyAction} onOverride={override} /> : null}
      </div>

      <MementoExport session={session} />
      {projecting && session ? <ProjectSession session={session} onClose={() => setProjecting(false)} /> : null}
    </main>
  );
}

function ProjectSession({ session, onClose }: { session: ClassSession; onClose: () => void }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const joinUrl = `${origin}/play/${session.session_code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(joinUrl)}`;
  return (
    <div className="project-overlay" role="dialog" aria-modal="true" aria-label="Project join code">
      <button type="button" className="project-close" onClick={onClose} aria-label="Close projection view">
        <X size={28} />
      </button>
      <div className="project-card">
        <p className="eyebrow">Join TimeCity Rescue</p>
        <strong>{session.session_code}</strong>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt={`QR code for ${joinUrl}`} />
        <span>{joinUrl}</span>
      </div>
    </div>
  );
}
