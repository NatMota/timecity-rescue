import { NextResponse } from "next/server";
import { submitChoice } from "@/lib/game/sessionStore";
import { getFallbackScene } from "@/lib/game/fallbackScenes";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await submitChoice(
    String(body.session_code || "").toUpperCase(),
    String(body.student_id || ""),
    String(body.choice_id || ""),
    Number(body.response_ms || 2500),
  );
  if (!result) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  const scene = getFallbackScene(result.student.current_node_key, result.student.language);
  return NextResponse.json({
    student: result.student,
    classification: result.evaluation.classification,
    misconception: result.evaluation.misconception,
    consequence: result.evaluation.consequence,
    completed: result.completed,
    scene,
  });
}
