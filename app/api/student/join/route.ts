import { NextResponse } from "next/server";
import { joinSession } from "@/lib/game/sessionStore";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = String(body.session_code || "").toUpperCase();
  if (!code) return NextResponse.json({ error: "Session code required" }, { status: 400 });
  const result = await joinSession(
    code,
    String(body.display_name || "ChronoCadet Blue"),
    String(body.avatar_color || "blue"),
    body.language === "zh" ? "zh" : "en",
  );
  return NextResponse.json(result);
}
