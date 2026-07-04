import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureSession, findStudent, incrementStudentSignal } from "@/lib/game/sessionStore";
import { generateSceneCached, preGenerateLikelyNextScene } from "@/lib/openai/sceneCache";
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
  const scene = student
    ? await generateSceneCached(session.session_code, student.current_node_key, student.language, student)
    : undefined;
  if (student) preGenerateLikelyNextScene(session.session_code, student);
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
    sessionCode: result.session.session_code,
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
      hint_counts: result.student.hint_counts,
      world_state: result.student.world_state,
    },
  });
  const scene = await generateSceneCached(
    result.session.session_code,
    result.student.current_node_key,
    result.student.language,
    result.student,
  );
  preGenerateLikelyNextScene(result.session.session_code, result.student);
  return NextResponse.json({ ...result, scene });
}
