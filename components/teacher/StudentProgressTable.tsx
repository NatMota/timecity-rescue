import clsx from "clsx";
import Image from "next/image";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { StudentRecord } from "@/lib/game/types";

function status(student: StudentRecord) {
  if (student.risk_flags.stuck) return "Stuck";
  if (student.risk_flags.weak_why) return "Needs why check";
  if (student.risk_flags.clue_heavy) return "Asked clue";
  if (student.risk_flags.fast_clicking) return "Fast correct";
  return "On track";
}

function needsAttention(student: StudentRecord) {
  return (
    student.risk_flags.stuck ||
    student.risk_flags.weak_why ||
    student.risk_flags.clue_heavy ||
    student.risk_flags.fast_clicking ||
    student.risk_flags.possible_guessing
  );
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
      {!students.length ? (
        <div className="teacher-first-run">
          <Image
            src="/assets/characters/cutouts/cog9-future-worried.png"
            alt=""
            width={150}
            height={260}
            className="teacher-empty-mascot"
          />
          <div>
            <h3>Run the first mission in three steps</h3>
            <ol>
              <li>Create a session.</li>
              <li>Project the join code for your class.</li>
              <li>Watch who needs attention as pupils play.</li>
            </ol>
          </div>
        </div>
      ) : null}
      {students.length ? (
        <div className="progress-table">
          <div className="progress-head">
            <span>Student</span>
            <span>Room</span>
            <span>Badge</span>
            <span>Needs attention</span>
            <span>Status</span>
          </div>
          {students.map((student) => {
            const attention = needsAttention(student);
            return (
              <button
                key={student.id}
                type="button"
                className={clsx("progress-row", selectedId === student.id && "selected")}
                onClick={() => onSelect(student)}
              >
                <span>{student.display_name}</span>
                <span>{student.current_room_slug.replaceAll("_", " ")}</span>
                <span>{student.badge_progress}%</span>
                <span className={clsx("attention-signal", attention && "attention-risk")}>
                  {attention ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  {attention ? "Check in" : "Clear"}
                </span>
                <span>{status(student)}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
