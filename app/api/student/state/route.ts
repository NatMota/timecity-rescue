import { NextResponse } from "next/server";
import { ensureSession, findStudent, incrementStudentSignal } from "@/lib/game/sessionStore";
import { getFallbackScene } from "@/lib/game/fallbackScenes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionCode = String(searchParams.get("session_code") || "").toUpperCase();
  const studentId = searchParams.get("student_id") || "";
  const session = await ensureSession(sessionCode);
  const student = studentId ? (await findStudent(session.session_code, studentId)).student : undefined;
  const scene = student ? getFallbackScene(student.current_node_key, student.language) : undefined;
  return NextResponse.json({ session, student, scene });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const signal = body.signal === "read_again_count" ? "read_again_count" : "clue_count";
  const result = await incrementStudentSignal(String(body.session_code || "").toUpperCase(), String(body.student_id || ""), signal);
  if (!result) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json(result);
}
