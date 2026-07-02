import { NextResponse } from "next/server";
import { createMissionGoalCard } from "@/lib/game/demoStore";
import { findStudent } from "@/lib/game/sessionStore";
import { missionGoalCardHtml } from "@/lib/memento/missionGoalCard";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { student } = await findStudent(String(body.session_code || "").toUpperCase(), String(body.student_id || ""));
  const name = student?.display_name || String(body.display_name || "ChronoCadet");
  return NextResponse.json({ card: createMissionGoalCard(name), html: missionGoalCardHtml(name) });
}
