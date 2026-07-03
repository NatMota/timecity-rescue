import { NextResponse } from "next/server";
import { updateStudentLanguage } from "@/lib/game/sessionStore";
import { generateScene } from "@/lib/openai/generateScene";
import { logClickstreamEvent } from "@/lib/telemetry/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionCode = String(body.session_code || "").toUpperCase();
  const studentId = String(body.student_id || "");
  const language = body.language === "zh" ? "zh" : "en";
  const result = await updateStudentLanguage(sessionCode, studentId, language);
  if (!result) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  await logClickstreamEvent({
    sessionCode,
    studentId,
    eventType: "language_change",
    route: "/api/student/language",
    nodeKey: result.student.current_node_key,
    roomSlug: result.student.current_room_slug,
    metadata: { language },
  });

  const scene = await generateScene(sessionCode, result.student.current_node_key, result.student.language, result.student);
  return NextResponse.json({ student: result.student, scene });
}
