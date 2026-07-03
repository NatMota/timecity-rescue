import { NextResponse } from "next/server";
import { submitChoice } from "@/lib/game/sessionStore";
import { generateScene } from "@/lib/openai/generateScene";
import { logClickstreamEvent } from "@/lib/telemetry/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionCode = String(body.session_code || "").toUpperCase();
  const studentId = String(body.student_id || "");
  const responseMs = Number(body.response_ms || 2500);
  const result = await submitChoice(
    sessionCode,
    studentId,
    String(body.choice_id || ""),
    responseMs,
  );
  if (!result) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  await logClickstreamEvent({
    sessionCode,
    studentId,
    eventType: "choice_submit",
    route: "/api/choice/submit",
    nodeKey: String(body.node_key || ""),
    roomSlug: String(body.room_slug || ""),
    choiceId: String(body.choice_id || ""),
    choiceClassification: result.evaluation.classification,
    misconception: result.evaluation.misconception,
    responseMs,
    sceneElapsedMs: Number(body.scene_elapsed_ms),
    firstChoiceMs: Number(body.first_choice_ms),
    clueCount: Number(body.clue_count),
    readAgainCount: Number(body.read_again_count),
    metadata: {
      completed: result.completed,
      next_node_key: result.student.current_node_key,
      risk_flags: result.student.risk_flags,
    },
  });
  const scene = await generateScene(sessionCode, result.student.current_node_key, result.student.language, result.student);
  return NextResponse.json({
    student: result.student,
    classification: result.evaluation.classification,
    misconception: result.evaluation.misconception,
    consequence: result.evaluation.consequence,
    completed: result.completed,
    scene,
  });
}
