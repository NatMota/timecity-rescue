import { NextResponse } from "next/server";
import { updateSessionStatus } from "@/lib/game/sessionStore";
import { logClickstreamEvent } from "@/lib/telemetry/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionCode = String(body.session_code || "").toUpperCase();
  const session = await updateSessionStatus(sessionCode, "started");
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  await logClickstreamEvent({
    sessionCode,
    actor: "teacher",
    eventType: "teacher_session_start",
    route: "/api/session/start",
    metadata: { status: session.status },
  });
  return NextResponse.json({ session });
}
