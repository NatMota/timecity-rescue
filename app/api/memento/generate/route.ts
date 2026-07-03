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
  const card = createMissionGoalCard(student ?? String(body.display_name || "ChronoCadet"));
  await logClickstreamEvent({
    sessionCode,
    studentId,
    eventType: "memento_generate",
    route: "/api/memento/generate",
    nodeKey: student?.current_node_key,
    roomSlug: student?.current_room_slug,
    metadata: {
      badge_progress: student?.badge_progress,
      visited_room_slugs: student?.visited_room_slugs,
      used_backpack_items: student?.used_backpack_items,
      completed_side_quest_ids: student?.completed_side_quest_ids,
    },
  });
  return NextResponse.json({ card, html: missionGoalCardHtml(card) });
}
