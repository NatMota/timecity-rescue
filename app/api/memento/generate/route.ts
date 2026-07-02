import { NextResponse } from "next/server";
import { createMissionGoalCard } from "@/lib/game/demoStore";
import { findStudent } from "@/lib/game/sessionStore";
import { missionGoalCardHtml } from "@/lib/memento/missionGoalCard";
import { logClickstreamEvent } from "@/lib/telemetry/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionCode = String(body.session_code || "").toUpperCase();
  const studentId = String(body.student_id || "");
  const { student } = await findStudent(sessionCode, studentId);
  const name = student?.display_name || String(body.display_name || "ChronoCadet");
  await logClickstreamEvent({
    sessionCode,
    studentId,
    eventType: "memento_generate",
    route: "/api/memento/generate",
    nodeKey: student?.current_node_key,
    roomSlug: student?.current_room_slug,
    metadata: {
      badge_progress: student?.badge_progress,
    },
  });
  return NextResponse.json({ card: createMissionGoalCard(name), html: missionGoalCardHtml(name) });
}
