import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { TEMPLATES } from "@/lib/templates";
import { HOOK_TYPE_OPTIONS, buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";

export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const MAX_DOCUMENT_CHARS = 20_000;
const ALLOWED_EXTENSIONS = ["txt", "md", "pdf", "docx"];
const ALLOWED_HOOK_TYPES = new Set(HOOK_TYPE_OPTIONS.map((option) => option.id));

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

function getRetryAfterMs(err: unknown): number | null {
  if (typeof err !== "object" || err === null) return null;

  const maybeErr = err as {
    headers?: unknown;
    response?: { headers?: { get?: (key: string) => string | null } };
  };

  let headerFromGet: string | null | undefined;
  let headerFromMap: string | null | undefined;

  if (maybeErr.headers && typeof maybeErr.headers === "object") {
    const headersWithGet = maybeErr.headers as { get?: (key: string) => string | null };
    if (typeof headersWithGet.get === "function") {
      headerFromGet = headersWithGet.get("retry-after");
    } else {
      const headersAsRecord = maybeErr.headers as Record<string, string | null | undefined>;
      headerFromMap = headersAsRecord["retry-after"];
    }
  }

  const headerFromResponse = maybeErr.response?.headers?.get?.("retry-after");
  const headerValue = headerFromGet ?? headerFromMap ?? headerFromResponse;

  if (!headerValue) return null;

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.round(seconds * 1000);
  }

  const retryDate = Date.parse(headerValue);
  if (!Number.isNaN(retryDate)) {
    return Math.max(0, retryDate - Date.now());
  }

  return null;
}
function getErrorDetails(err: unknown): { status?: number; message: string } {
  if (typeof err === "object" && err !== null) {
    const maybeStatus = (err as { status?: number; statusCode?: number; code?: number }).status
      ?? (err as { statusCode?: number }).statusCode
      ?? (err as { code?: number }).code;
    const maybeMessage = (err as { message?: string; error?: { message?: string } }).message
      ?? (err as { error?: { message?: string } }).error?.message;
    return {
      status: typeof maybeStatus === "number" ? maybeStatus : undefined,
      message: typeof maybeMessage === "string" ? maybeMessage : String(err),
    };
  }

  return { message: String(err) };
}

function isStatusMentioned(message: string, statuses: number[]): boolean {
  return statuses.some((status) => message.includes(String(status)));
}

async function createAnthropicMessageWithRetry(
  anthropic: Anthropic,
  input: Anthropic.MessageCreateParamsNonStreaming,
  maxAttempts = 5
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await anthropic.messages.create(input);
    } catch (err) {
      const { status, message } = getErrorDetails(err);
      const lowerMessage = message.toLowerCase();
      const isRetriable =
        status === 429 ||
        status === 408 ||
        status === 409 ||
        status === 425 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        status === 529 ||
        lowerMessage.includes("rate limit") ||
        lowerMessage.includes("overloaded") ||
        lowerMessage.includes("temporar") ||
        lowerMessage.includes("timeout") ||
        lowerMessage.includes("timed out") ||
        lowerMessage.includes("econnreset") ||
        lowerMessage.includes("socket hang up") ||
        lowerMessage.includes("network") ||
        isStatusMentioned(lowerMessage, [408, 409, 425, 429, 500, 502, 503, 504, 529]);
      if (!isRetriable || attempt === maxAttempts) {
        throw err;
      }

      const baseBackoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 12_000);
      const jitteredBackoffMs = Math.round(baseBackoffMs * (0.7 + Math.random() * 0.6));
      const retryAfterMs = getRetryAfterMs(err);
      const backoffMs = retryAfterMs ? Math.max(jitteredBackoffMs, retryAfterMs) : jitteredBackoffMs;
      console.warn(
        `Anthropic retry ${attempt}/${maxAttempts} in ${backoffMs}ms due to ${status || "unknown"}: ${message}`
      );
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
    const hookType = (formData.get("hookType") as string | null) || "auto";

    if (!ALLOWED_HOOK_TYPES.has(hookType)) {
      return NextResponse.json({ error: "Ungueltiger Hook-Typ." }, { status: 400 });
    }
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
      hookType,
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
    const { status, message } = getErrorDetails(err);
    const errMsg = message;
    const lowerMsg = errMsg.toLowerCase();

    if (status === 401 || lowerMsg.includes("authentication") || lowerMsg.includes("api_key") || isStatusMentioned(lowerMsg, [401])) {
      return NextResponse.json({ error: "API-Key ist ungueltig oder fehlt. Bitte ANTHROPIC_API_KEY in Vercel pruefen." }, { status: 401 });
    }
    if (errMsg.includes("Seiten")) {
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    if (
      status === 503 ||
      status === 529 ||
      lowerMsg.includes("could not process") ||
      lowerMsg.includes("overloaded") ||
      lowerMsg.includes("temporar") ||
      isStatusMentioned(lowerMsg, [503, 529])
    ) {
      return NextResponse.json({ error: "Die KI ist gerade ueberlastet. Bitte in 30 Sekunden erneut versuchen." }, { status: 503 });
    }
    if (status === 429 || lowerMsg.includes("rate limit") || isStatusMentioned(lowerMsg, [429])) {
      return NextResponse.json({ error: "Rate-Limit erreicht. Bitte kurz warten und erneut versuchen." }, { status: 429 });
    }
    if (status === 402 || lowerMsg.includes("credit") || lowerMsg.includes("billing") || isStatusMentioned(lowerMsg, [402])) {
      return NextResponse.json({ error: "Anthropic-Konto hat kein Guthaben. Bitte Billing pruefen." }, { status: 402 });
    }
    if (status === 404 || (lowerMsg.includes("model") && (lowerMsg.includes("not found") || lowerMsg.includes("not_found")))) {
      return NextResponse.json({ error: `Modell nicht gefunden: ${process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"}. Bitte ANTHROPIC_MODEL in Vercel pruefen.` }, { status: 400 });
    }
    return NextResponse.json(
      { error: `Fehler bei der Generierung: ${errMsg}` },
      { status: 500 }
    );
  }
}
