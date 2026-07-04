import type { StudentRecord, StudentRiskFlags } from "./types";

export function riskFlagsForStudent(student: StudentRecord): StudentRiskFlags {
  return {
    fast_clicking: student.fast_correct_count >= 2 || Boolean(student.last_response_ms && student.last_response_ms < 1100),
    weak_why: student.last_misconception?.includes("why") || student.last_misconception === "excitement_over_reasoning",
    stuck: student.retry_count >= 2 || student.wrong_count >= 3,
    clue_heavy: student.clue_count >= 2,
    possible_guessing:
      Boolean(student.last_response_ms && student.last_response_ms < 1300) &&
      (student.retry_count >= 2 || student.wrong_count >= 2),
  };
}

export function difficultyForStudent(student: StudentRecord): 1 | 2 | 3 {
  const fastAndWrong = Boolean(student.last_response_ms && student.last_response_ms < 1300 && student.wrong_count > 0);
  if (!fastAndWrong && (student.wrong_count >= 2 || student.read_again_count >= 3)) return 1;
  if (student.correct_count >= 4 && student.retry_count === 0) return 3;
  return 2;
}

export function teacherRecommendedPrompt(student: StudentRecord): string {
  if (student.risk_flags.stuck) return "Ask: which clue tells COG-9 what to do next?";
  if (student.risk_flags.weak_why) return "Ask: why is a clear goal safer than acting quickly?";
  if (student.risk_flags.fast_clicking) return "Ask: what evidence proves that choice?";
  if (student.risk_flags.clue_heavy) return "Ask: which part helped most: goal, input, rule, or output?";
  return "Ask the pupil to explain the goal, input, rule and output in their own words.";
}
