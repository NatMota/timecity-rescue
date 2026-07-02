import { NextResponse } from "next/server";
import { updateSessionStatus } from "@/lib/game/sessionStore";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const session = await updateSessionStatus(String(body.session_code || "").toUpperCase(), "started");
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ session });
}
