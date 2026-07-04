import { NextResponse } from "next/server";
import { findStudent } from "@/lib/game/sessionStore";
import { generateSceneCached, preGenerateLikelyNextScene } from "@/lib/openai/sceneCache";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionCode = String(body.session_code || "").toUpperCase();
  const studentId = String(body.student_id || "");
  const { student } = await findStudent(sessionCode, studentId);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  const scene = await generateSceneCached(sessionCode, student.current_node_key, student.language, student);
  preGenerateLikelyNextScene(sessionCode, student);
  return NextResponse.json({ scene });
}
