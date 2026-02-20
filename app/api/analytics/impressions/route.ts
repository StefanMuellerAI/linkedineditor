import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

function extractJson(text: string): { probability: number; summary: string } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { probability?: number; summary?: string };
    if (typeof parsed.probability !== "number") return null;
    return {
      probability: Math.max(0, Math.min(100, parsed.probability)),
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KI-Einschaetzung ist nicht konfiguriert. ANTHROPIC_API_KEY fehlt." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json() as { postText?: string };
    const postText = body.postText?.trim() || "";

    if (!postText) {
      return NextResponse.json({ error: "Post-Text fehlt." }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 220,
      temperature: 0.2,
      system:
        "Du bist ein LinkedIn-Performance-Analyst. Gib eine nuchterne Schaetzung ab, wie wahrscheinlich es ist, dass ein Post mehr als 1000 Impressionen erreicht. Antworte ausschliesslich als JSON.",
      messages: [
        {
          role: "user",
          content: `Analysiere den folgenden LinkedIn-Post.\n\nPost:\n${postText}\n\nGib NUR dieses JSON-Format zurueck:\n{"probability": <0-100>, "summary": "<maximal 2 kurze Saetze auf Deutsch>"}`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const parsed = extractJson(text);
    if (!parsed) {
      return NextResponse.json(
        { error: "Die KI-Antwort konnte nicht verarbeitet werden." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: `Fehler bei der KI-Einschaetzung: ${message}` },
      { status: 500 }
    );
  }
}
