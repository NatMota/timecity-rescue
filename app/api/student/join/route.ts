import { NextResponse } from "next/server";
import { joinSession } from "@/lib/game/sessionStore";
import { logClickstreamEvent } from "@/lib/telemetry/server";
import { runtimeSessionCode } from "@/lib/runtime/environment";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = runtimeSessionCode(String(body.session_code || ""));
  if (!code) return NextResponse.json({ error: "Session code required" }, { status: 400 });
  const result = await joinSession(
    code,
    String(body.display_name || "Blue Cadet"),
    String(body.avatar_color || "blue"),
    "en",
  );
  await logClickstreamEvent({
    sessionCode: result.session.session_code,
    studentId: result.student.id,
    eventType: "student_join",
    route: "/api/student/join",
    nodeKey: result.student.current_node_key,
    roomSlug: result.student.current_room_slug,
    metadata: {
      language: result.student.language,
      avatar_color: result.student.avatar_color,
    },
  });
  return NextResponse.json(result);
}
