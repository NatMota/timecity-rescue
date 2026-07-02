import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureSession, findStudent, incrementStudentSignal } from "@/lib/game/sessionStore";
import { getFallbackScene } from "@/lib/game/fallbackScenes";
import { logClickstreamEvent } from "@/lib/telemetry/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionCode = String(searchParams.get("session_code") || "").toUpperCase();
  const studentId = searchParams.get("student_id") || "";
  if (!studentId) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await ensureSession(sessionCode);
  const student = studentId ? (await findStudent(session.session_code, studentId)).student : undefined;
  const scene = student ? getFallbackScene(student.current_node_key, student.language) : undefined;
  return NextResponse.json({ session, student, scene });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const signal = body.signal === "read_again_count" ? "read_again_count" : "clue_count";
  const sessionCode = String(body.session_code || "").toUpperCase();
  const studentId = String(body.student_id || "");
  const result = await incrementStudentSignal(sessionCode, studentId, signal);
  if (!result) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  await logClickstreamEvent({
    sessionCode,
    studentId,
    eventType: signal === "clue_count" ? "support_clue" : "support_read_again",
    route: "/api/student/state",
    nodeKey: String(body.node_key || result.student.current_node_key || ""),
    roomSlug: String(body.room_slug || result.student.current_room_slug || ""),
    sceneElapsedMs: Number(body.scene_elapsed_ms),
    clueCount: result.student.clue_count,
    readAgainCount: result.student.read_again_count,
    metadata: {
      risk_flags: result.student.risk_flags,
    },
  });
  return NextResponse.json(result);
}
