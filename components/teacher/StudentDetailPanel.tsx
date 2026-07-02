import { RotateCcw, SkipForward, UserCheck } from "lucide-react";
import { teacherRecommendedPrompt } from "@/lib/game/adaptDifficulty";
import type { StudentRecord } from "@/lib/game/types";

export function StudentDetailPanel({
  student,
  onOverride,
}: {
  student: StudentRecord | null;
  onOverride: (action: "skip" | "reset" | "assist") => void;
}) {
  if (!student) {
    return (
      <section className="teacher-card detail-panel">
        <p className="eyebrow">Selected student</p>
        <h2>Select a student</h2>
        <p>Choose a row to see current node, last choice, misconception and teacher prompts.</p>
      </section>
    );
  }
  return (
    <section className="teacher-card detail-panel">
      <p className="eyebrow">Selected student</p>
      <h2>{student.display_name}</h2>
      <dl>
        <dt>Current node</dt>
        <dd>{student.current_node_key}</dd>
        <dt>Last choice</dt>
        <dd>{student.last_choice || "No choice yet"}</dd>
        <dt>Misconception</dt>
        <dd>{student.last_misconception || "None detected"}</dd>
        <dt>Read again</dt>
        <dd>{student.read_again_count}</dd>
        <dt>Clues</dt>
        <dd>{student.clue_count}</dd>
        <dt>Recommended prompt</dt>
        <dd>{teacherRecommendedPrompt(student)}</dd>
      </dl>
      <div className="teacher-actions">
        <button type="button" className="tool-button" onClick={() => onOverride("skip")}>
          <SkipForward size={18} />
          Skip node
        </button>
        <button type="button" className="tool-button" onClick={() => onOverride("reset")}>
          <RotateCcw size={18} />
          Reset room
        </button>
        <button type="button" className="tool-button" onClick={() => onOverride("assist")}>
          <UserCheck size={18} />
          Mark assisted
        </button>
      </div>
    </section>
  );
}
