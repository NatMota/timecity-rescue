import clsx from "clsx";
import type { StudentRecord } from "@/lib/game/types";

function status(student: StudentRecord) {
  if (student.risk_flags.stuck) return "Stuck";
  if (student.risk_flags.weak_why) return "Needs why check";
  if (student.risk_flags.clue_heavy) return "Asked clue";
  if (student.risk_flags.fast_clicking) return "Fast correct";
  return "On track";
}

export function StudentProgressTable({
  students,
  selectedId,
  onSelect,
}: {
  students: StudentRecord[];
  selectedId?: string;
  onSelect: (student: StudentRecord) => void;
}) {
  return (
    <section className="teacher-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live classroom view</p>
          <h2>Student progress</h2>
        </div>
        <span>{students.length} students</span>
      </div>
      <div className="progress-table">
        <div className="progress-head">
          <span>Student</span>
          <span>Room</span>
          <span>Badge</span>
          <span>Status</span>
        </div>
        {students.map((student) => (
          <button
            key={student.id}
            type="button"
            className={clsx("progress-row", selectedId === student.id && "selected")}
            onClick={() => onSelect(student)}
          >
            <span>{student.display_name}</span>
            <span>{student.current_room_slug.replaceAll("_", " ")}</span>
            <span>{student.badge_progress}%</span>
            <span>{status(student)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
