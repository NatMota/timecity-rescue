import { NextResponse } from "next/server";
import { overrideStudent } from "@/lib/game/sessionStore";
import { logClickstreamEvent } from "@/lib/telemetry/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionCode = String(body.session_code || "").toUpperCase();
  const studentId = String(body.student_id || "");
  const action = body.action === "reset" ? "reset" : body.action === "assist" ? "assist" : "skip";
  const result = await overrideStudent(
    sessionCode,
    studentId,
    action,
  );
  if (!result) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  await logClickstreamEvent({
    sessionCode,
    studentId,
    actor: "teacher",
    eventType: "teacher_override",
    route: "/api/session/unlock",
    nodeKey: result.student.current_node_key,
    roomSlug: result.student.current_room_slug,
    metadata: {
      action,
      risk_flags: result.student.risk_flags,
    },
  });
  return NextResponse.json(result);
}
