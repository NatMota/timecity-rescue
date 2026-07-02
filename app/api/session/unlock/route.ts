import { NextResponse } from "next/server";
import { overrideStudent } from "@/lib/game/sessionStore";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await overrideStudent(
    String(body.session_code || "").toUpperCase(),
    String(body.student_id || ""),
    body.action === "reset" ? "reset" : body.action === "assist" ? "assist" : "skip",
  );
  if (!result) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json(result);
}
