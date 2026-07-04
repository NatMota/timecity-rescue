import { Printer } from "lucide-react";
import type { ClassSession } from "@/lib/game/types";

export function MementoExport({ session }: { session: ClassSession | null }) {
  const hasBadgeEarned = Boolean(session?.students.some((student) => student.badge_progress >= 100));

  function printClassSummary() {
    if (!session || !hasBadgeEarned) return;
    const html = `<!doctype html><html><head><title>TimeCity Class Summary</title><style>body{font-family:Arial;padding:32px}li{margin:8px 0}</style></head><body><h1>TimeCity Rescue Class Summary</h1><p>Join code: ${session.session_code}</p><ul>${session.students
      .map((student) => `<li>${student.display_name}: ${student.badge_progress}% Agent Badge progress</li>`)
      .join("")}</ul><button onclick="window.print()">Print</button></body></html>`;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }
  return (
    <section className="teacher-card">
      <p className="eyebrow">End of session</p>
      <h2>Agent Builder Passports</h2>
      <p>Printable passports unlock when a pupil earns the Agent Badge.</p>
      <button type="button" className="primary-action" disabled={!hasBadgeEarned} onClick={printClassSummary}>
        <Printer size={18} />
        Generate Agent Builder Passports
      </button>
      {!hasBadgeEarned ? <p className="passport-help">Unlocks when a pupil earns the Agent Badge.</p> : null}
    </section>
  );
}
