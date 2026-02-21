import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

interface OptimizePayload {
  hook?: string;
  content?: string;
  cta?: string;
  suggestion?: string;
}

function parseOptimizeResponse(text: string): { hook: string; content: string; cta: string } | null {
  const normalized = text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const candidates: string[] = [normalized];
  const objectMatch = normalized.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    candidates.push(objectMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as { hook?: string; content?: string; cta?: string };
      if (typeof parsed.hook !== "string" || typeof parsed.content !== "string" || typeof parsed.cta !== "string") {
        continue;
      }

      return {
        hook: parsed.hook.trim(),
        content: parsed.content.trim(),
        cta: parsed.cta.trim(),
      };
    } catch {
      continue;
    }
  }

  return null;
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
      temperature: 0,
      system:
        "Du bist ein LinkedIn-Redakteur. Wende nur klar anwendbare Empfehlungen an und gib ausschliesslich valides JSON ohne Markdown oder Erklaerungen zurueck.",
      messages: [
        {
          role: "user",
          content: `Pruefe zuerst, ob diese Empfehlung fuer den konkreten Text wirklich passt und sicher anwendbar ist: ${suggestion}\n\nAktueller Post:\nHook: ${hook}\n\nContent: ${content}\n\nCTA: ${cta}\n\nRegeln:\n- Erhalte Sprache, Stil, Ton und Kontext des Posts\n- Nimm nur Aenderungen vor, die direkt aus der Empfehlung ableitbar sind\n- Wenn die Empfehlung nicht sicher passt, gib Hook/Content/CTA unveraendert zurueck\n- Aendere nur die betroffenen Bereiche; unveraenderte Bereiche identisch lassen\n- Maximal 2800 Zeichen fuer den gesamten Post\n\nAntworte NUR so:\n{"hook":"...","content":"...","cta":"..."}`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const parsed = parseOptimizeResponse(text);
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
