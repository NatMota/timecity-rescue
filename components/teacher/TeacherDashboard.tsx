"use client";

import { useEffect, useState } from "react";
import { MementoExport } from "./MementoExport";
import { SessionControls } from "./SessionControls";
import { StudentDetailPanel } from "./StudentDetailPanel";
import { StudentProgressTable } from "./StudentProgressTable";
import type { ClassSession, StudentRecord } from "@/lib/game/types";

export function TeacherDashboard() {
  const [session, setSession] = useState<ClassSession | null>(null);
  const [selected, setSelected] = useState<StudentRecord | null>(null);

  async function createSession() {
    const response = await fetch("/api/session/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await response.json();
    setSession(data.session);
    setSelected(data.session.students[0]);
  }

  async function setStatus(status: "start" | "pause") {
    if (!session) return;
    const response = await fetch(`/api/session/${status}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: session.session_code }),
    });
    const data = await response.json();
    setSession(data.session);
  }

  async function refresh() {
    if (!session) return;
    const response = await fetch(`/api/student/state?session_code=${session.session_code}`);
    const data = await response.json();
    setSession(data.session);
    setSelected((current) => data.session.students.find((student: StudentRecord) => student.id === current?.id) ?? data.session.students[0]);
  }

  async function override(action: "skip" | "reset" | "assist") {
    if (!session || !selected) return;
    const response = await fetch("/api/session/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_code: session.session_code, student_id: selected.id, action }),
    });
    const data = await response.json();
    setSession(data.session);
    setSelected(data.student);
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
            Launch Episode 1, watch live progress, and keep every pupil inside the fixed story sandbox. Demo mode works
            without Supabase or OpenAI keys.
          </p>
        </div>
        <div className="safety-statement">No student chat · No leaderboard · Fixed rooms · Teacher override</div>
      </header>

      <SessionControls session={session} onCreate={createSession} onStart={() => setStatus("start")} onPause={() => setStatus("pause")} />

      <div className="teacher-grid">
        <StudentProgressTable students={session?.students ?? []} selectedId={selected?.id} onSelect={setSelected} />
        <StudentDetailPanel student={selected} onOverride={override} />
      </div>

      <MementoExport session={session} />
    </main>
  );
}
