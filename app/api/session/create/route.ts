import { NextResponse } from "next/server";
import { createSession } from "@/lib/game/sessionStore";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const session = await createSession(body.language_default === "zh" ? "zh" : "en");
  return NextResponse.json({ session });
}
