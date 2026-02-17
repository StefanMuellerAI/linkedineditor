import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TEMPLATES } from "@/lib/templates";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const ALLOWED_EXTENSIONS = ["txt", "md", "pdf", "docx"];

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

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const doc = await loadingTask.promise;

  if (doc.numPages > MAX_PDF_PAGES) {
    throw new Error(`PDF hat ${doc.numPages} Seiten. Maximal ${MAX_PDF_PAGES} Seiten erlaubt.`);
  }

  const textParts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => "str" in item && typeof (item as Record<string, unknown>).str === "string")
      .map((item) => (item as Record<string, unknown>).str as string)
      .join(" ");
    textParts.push(pageText);
  }

  return textParts.join("\n\n");
}

async function extractText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf-8");
  }

  if (ext === "pdf") {
    return extractTextFromPdf(buffer);
  }

  if (ext === "docx") {
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
    const addressMode = (formData.get("addressMode") as "du" | "sie" | null) || "du";
    const tone = (formData.get("tone") as string | null) || "professionell";
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

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: "Nicht unterstuetzter Dateityp. Erlaubt: .txt, .md, .pdf, .docx" },
          { status: 400 }
        );
      }

      documentText = await extractText(file);
    }

    const systemPrompt = buildSystemPrompt(addressMode, tone);
    const userPrompt = buildUserPrompt({
      templateName: template.id,
      templateDescription: template.description,
      templateHook: template.hook,
      templateContent: template.content,
      templateCta: template.cta,
      topic: topic.trim(),
      documentText,
      addressMode,
      tone,
    });

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
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
    if (message.includes("Seiten")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: `Fehler bei der Generierung: ${message}` },
      { status: 500 }
    );
  }
}
