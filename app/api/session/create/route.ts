import { NextResponse } from "next/server";
import { createSession } from "@/lib/game/sessionStore";
import { logClickstreamEvent } from "@/lib/telemetry/server";

export async function POST(request: Request) {
  await request.json().catch(() => ({}));
  const session = await createSession("en");
  await logClickstreamEvent({
    sessionCode: session.session_code,
    actor: "teacher",
    eventType: "teacher_session_create",
    route: "/api/session/create",
    metadata: {
      language_default: session.language_default,
      seeded_student_count: session.students.length,
    },
  });
  return NextResponse.json({ session });
}
