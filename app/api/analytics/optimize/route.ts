import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

interface OptimizePayload {
  hook?: string;
  content?: string;
  cta?: string;
  suggestion?: string;
}

function extractJson(text: string): { hook: string; content: string; cta: string } | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]) as { hook?: string; content?: string; cta?: string };
    if (typeof parsed.hook !== "string" || typeof parsed.content !== "string" || typeof parsed.cta !== "string") {
      return null;
    }

    return {
      hook: parsed.hook.trim(),
      content: parsed.content.trim(),
      cta: parsed.cta.trim(),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KI-Optimierung ist nicht konfiguriert. ANTHROPIC_API_KEY fehlt." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json() as OptimizePayload;
    const hook = body.hook?.trim() || "";
    const content = body.content?.trim() || "";
    const cta = body.cta?.trim() || "";
    const suggestion = body.suggestion?.trim() || "";

    if (!hook && !content && !cta) {
      return NextResponse.json({ error: "Post-Inhalt fehlt." }, { status: 400 });
    }

    if (!suggestion) {
      return NextResponse.json({ error: "Empfehlung fehlt." }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 900,
      temperature: 0.4,
      system:
        "Du bist ein LinkedIn-Redakteur. Optimiere Hook, Content und CTA entsprechend der vorgegebenen Empfehlung. Halte den Stil und das Thema des Originals bei. Gib nur valides JSON zurueck.",
      messages: [
        {
          role: "user",
          content: `Wende diese Empfehlung an: ${suggestion}\n\nAktueller Post:\nHook: ${hook}\n\nContent: ${content}\n\nCTA: ${cta}\n\nRegeln:\n- Erhalte Sprache und Kontext des Posts\n- Nimm nur sinnvolle Aenderungen vor, aber verbessere alle drei Bereiche bei Bedarf\n- Maximal 2800 Zeichen fuer den gesamten Post\n\nAntworte NUR so:\n{"hook":"...","content":"...","cta":"..."}`,
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
      { error: `Fehler bei der KI-Optimierung: ${message}` },
      { status: 500 }
    );
  }
}
