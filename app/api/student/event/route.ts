import { NextResponse } from "next/server";
import { logClickstreamEvent } from "@/lib/telemetry/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionCode = String(body.session_code || "").toUpperCase();
  const studentId = String(body.student_id || "");
  const eventType = String(body.event_type || "").slice(0, 80);
  if (!sessionCode || !studentId || !eventType) {
    return NextResponse.json({ error: "Missing event fields" }, { status: 400 });
  }

  await logClickstreamEvent({
    sessionCode,
    studentId,
    eventType,
    route: "/api/student/event",
    nodeKey: String(body.node_key || ""),
    roomSlug: String(body.room_slug || ""),
    choiceId: String(body.choice_id || ""),
    sceneElapsedMs: Number(body.scene_elapsed_ms),
    metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {},
  });

  return NextResponse.json({ ok: true });
}
