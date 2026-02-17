import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TEMPLATES } from "@/lib/templates";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === "txt" || ext === "md" || file.type === "text/plain" || file.type === "text/markdown") {
    return buffer.toString("utf-8");
  }

  if (ext === "pdf" || file.type === "application/pdf") {
    const pdfModule = await import("pdf-parse");
    const pdfParse = pdfModule.default || pdfModule;
    const data = await (pdfParse as (buf: Buffer) => Promise<{ text: string }>)(buffer);
    return data.text;
  }

  if (ext === "docx" || file.type.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Nicht unterstuetzter Dateityp: ${ext}`);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "KI-Generierung ist nicht konfiguriert. ANTHROPIC_API_KEY fehlt." },
      { status: 503 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte eine Minute." },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const topic = formData.get("topic") as string | null;
    const templateId = formData.get("templateId") as string | null;
    const file = formData.get("file") as File | null;

    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: "Bitte gib ein Thema an." }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: "Bitte waehle eine Vorlage." }, { status: 400 });
    }

    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template || template.id === "empty") {
      return NextResponse.json({ error: "Ungueltige Vorlage." }, { status: 400 });
    }

    let documentText = "";
    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Datei ist zu gross (max 5 MB)." }, { status: 400 });
      }

      const isAllowed = ALLOWED_TYPES.some((t) => file.type.includes(t)) ||
        ["txt", "md", "pdf", "docx"].includes(file.name.split(".").pop()?.toLowerCase() || "");
      if (!isAllowed) {
        return NextResponse.json(
          { error: "Nicht unterstuetzter Dateityp. Erlaubt: .txt, .md, .pdf, .docx" },
          { status: 400 }
        );
      }

      documentText = await extractText(file);
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      templateName: template.id,
      templateDescription: template.description,
      templateHook: template.hook,
      templateContent: template.content,
      templateCta: template.cta,
      topic: topic.trim(),
      documentText,
    });

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    let parsed: { hook: string; content: string; cta: string };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Kein JSON in der Antwort");
      parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.hook || !parsed.content || !parsed.cta) {
        throw new Error("Unvollstaendige Felder");
      }
    } catch {
      return NextResponse.json(
        { error: "Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      hook: parsed.hook,
      content: parsed.content,
      cta: parsed.cta,
    });
  } catch (err) {
    console.error("Generate API error:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    if (message.includes("authentication") || message.includes("api_key")) {
      return NextResponse.json({ error: "API-Key ist ungueltig." }, { status: 401 });
    }
    return NextResponse.json(
      { error: `Fehler bei der Generierung: ${message}` },
      { status: 500 }
    );
  }
}
