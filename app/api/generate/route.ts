import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TEMPLATES } from "@/lib/templates";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";

export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const MAX_DOCUMENT_CHARS = 20_000;
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

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorDetails(err: unknown): { status?: number; message: string } {
  if (typeof err === "object" && err !== null) {
    const maybeStatus = (err as { status?: number }).status;
    const maybeMessage = (err as { message?: string }).message;
    return {
      status: typeof maybeStatus === "number" ? maybeStatus : undefined,
      message: typeof maybeMessage === "string" ? maybeMessage : String(err),
    };
  }

  return { message: String(err) };
}

async function createAnthropicMessageWithRetry(
  anthropic: Anthropic,
  input: Anthropic.MessageCreateParamsNonStreaming,
  maxAttempts = 3
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await anthropic.messages.create(input);
    } catch (err) {
      const { status, message } = getErrorDetails(err);
      const isRetriable = status === 429 || status === 503 || status === 529;
      if (!isRetriable || attempt === maxAttempts) {
        throw err;
      }

      const backoffMs = 1200 * Math.pow(2, attempt - 1);
      console.warn(`Anthropic retry ${attempt}/${maxAttempts} due to ${status || "unknown"}: ${message}`);
      await sleep(backoffMs);
    }
  }

  throw new Error("Anthropic request failed after retries.");
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Import the internal lib directly to avoid the broken test-file
  // loading in pdf-parse/index.js (module.parent bug)
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (buf: Buffer) => Promise<{ numpages: number; text: string }>;
  const data = await pdfParse(buffer);

  if (data.numpages > MAX_PDF_PAGES) {
    throw new Error(`PDF hat ${data.numpages} Seiten. Maximal ${MAX_PDF_PAGES} Seiten erlaubt.`);
  }

  return data.text;
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

  const ip = getClientIp(request);
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
    const perspective = (formData.get("perspective") as "ich" | "leser" | null) || "ich";
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
      if (documentText.length > MAX_DOCUMENT_CHARS) {
        documentText = documentText.slice(0, MAX_DOCUMENT_CHARS);
      }
    }

    const systemPrompt = buildSystemPrompt(addressMode, tone, perspective);
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

    const message = await createAnthropicMessageWithRetry(anthropic, {
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
      .filter((block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === "text")
      .map((block: Anthropic.TextBlock) => block.text)
      .join("");

    let parsed: { hook: string; content: string; cta: string };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Kein JSON gefunden in: " + responseText.slice(0, 200));
      parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.hook || !parsed.content || !parsed.cta) {
        throw new Error("Felder fehlen in: " + JSON.stringify(Object.keys(parsed)));
      }
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw response:", responseText.slice(0, 500));
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
    const errMsg = err instanceof Error ? err.message : String(err);

    if (errMsg.includes("authentication") || errMsg.includes("api_key") || errMsg.includes("401")) {
      return NextResponse.json({ error: "API-Key ist ungueltig oder fehlt. Bitte ANTHROPIC_API_KEY in Vercel pruefen." }, { status: 401 });
    }
    if (errMsg.includes("Seiten")) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    if (errMsg.includes("Could not process") || errMsg.includes("overloaded") || errMsg.includes("529") || errMsg.includes("503")) {
      return NextResponse.json({ error: "Die KI ist gerade ueberlastet. Bitte in 30 Sekunden erneut versuchen." }, { status: 503 });
    }
    if (errMsg.includes("429") || errMsg.includes("rate limit") || errMsg.includes("Rate limit")) {
      return NextResponse.json({ error: "Rate-Limit erreicht. Bitte kurz warten und erneut versuchen." }, { status: 429 });
    }
    if (errMsg.includes("credit") || errMsg.includes("billing") || errMsg.includes("402")) {
      return NextResponse.json({ error: "Anthropic-Konto hat kein Guthaben. Bitte Billing pruefen." }, { status: 402 });
    }
    if (errMsg.includes("model") || errMsg.includes("not_found")) {
      return NextResponse.json({ error: `Modell nicht gefunden: ${process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"}. Bitte ANTHROPIC_MODEL in Vercel pruefen.` }, { status: 400 });
    }
    return NextResponse.json(
      { error: `Fehler bei der Generierung: ${errMsg}` },
      { status: 500 }
    );
  }
}
