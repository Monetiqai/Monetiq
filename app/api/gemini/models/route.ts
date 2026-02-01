import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    headers: { "x-goog-api-key": key },
  });

  const text = await res.text();
  if (!res.ok) return NextResponse.json({ error: text }, { status: 500 });

  return NextResponse.json(JSON.parse(text));
}
