import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

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
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
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
        status === 408 ||
        status === 409 ||
        status === 425 ||
        status === 429 ||
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
      console.warn(`Anthropic retry ${attempt}/${maxAttempts} in ${backoffMs}ms due to ${status || "unknown"}: ${message}`);
      await sleep(backoffMs);
    }
  }

  throw new Error("Anthropic request failed after retries.");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Teleprompter ist nicht konfiguriert. ANTHROPIC_API_KEY fehlt." },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Zu viele Anfragen. Bitte warte eine Minute." }, { status: 429 });
  }

  try {
    const body = await request.json() as { postText?: string };
    const postText = body.postText?.trim() || "";

    if (!postText) {
      return NextResponse.json({ error: "Der LinkedIn-Post ist leer." }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });
    const message = await createAnthropicMessageWithRetry(anthropic, {
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 1600,
      system:
        "Du bist ein deutscher Scriptwriter fuer YouTube Shorts. Antworte NUR mit einem Markdown-Skript. Kein JSON, keine Erklaerungen.",
      messages: [
        {
          role: "user",
          content: `Erstelle aus diesem LinkedIn-Post ein sprechfertiges Teleprompter-Skript fuer ein YouTube Short.

Anforderungen:
- Sprache: Deutsch
- Dauer: 45-60 Sekunden
- Direkt und laut vorlesbar, kurze Saetze
- Starte mit einem starken Hook in der ersten Zeile
- Nutze sinnvolle Pausen-Hinweise in Klammern, z. B. (kurze Pause)
- Schließe mit einem klaren Call-to-Action
- Gib das Ergebnis als Markdown mit diesen Ueberschriften aus:
  # Titel
  # Hook
  # Teleprompter-Skript
  # CTA

LinkedIn-Post:
${postText}`,
        },
      ],
    });

    const script = message.content
      .filter((block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === "text")
      .map((block: Anthropic.TextBlock) => block.text)
      .join("")
      .trim();

    if (!script) {
      return NextResponse.json(
        { error: "Die Teleprompter-Antwort der KI war leer. Bitte erneut versuchen." },
        { status: 502 }
      );
    }

    return NextResponse.json({ script });
  } catch (err) {
    console.error("Teleprompter API error:", err);
    const { status, message } = getErrorDetails(err);
    const lowerMsg = message.toLowerCase();

    if (status === 401 || lowerMsg.includes("authentication") || lowerMsg.includes("api_key")) {
      return NextResponse.json({ error: "API-Key ist ungueltig oder fehlt." }, { status: 401 });
    }
    if (status === 429 || lowerMsg.includes("rate limit") || isStatusMentioned(lowerMsg, [429])) {
      return NextResponse.json({ error: "Rate-Limit erreicht. Bitte kurz warten und erneut versuchen." }, { status: 429 });
    }
    if (
      status === 503 ||
      status === 529 ||
      lowerMsg.includes("overloaded") ||
      lowerMsg.includes("temporar") ||
      isStatusMentioned(lowerMsg, [503, 529])
    ) {
      return NextResponse.json({ error: "Die KI ist gerade ueberlastet. Bitte erneut versuchen." }, { status: 503 });
    }

    return NextResponse.json({ error: `Fehler bei der Teleprompter-Erstellung: ${message}` }, { status: 500 });
  }
}
