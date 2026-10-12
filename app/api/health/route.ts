import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const hasKey = Boolean(process.env.FEATHERLESS_API_KEY);
  const forced = process.env.GAVEL_FORCE_SCRIPTED === "1";
  return NextResponse.json({
    ok: true,
    mode: hasKey && !forced ? "live" : "scripted",
    model: hasKey && !forced ? (process.env.FEATHERLESS_MODEL ?? "unsloth/Llama-3.3-70B-Instruct") : null,
  });
}
