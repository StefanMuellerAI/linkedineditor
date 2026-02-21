import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
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

async function generateVisualWithRetry(
  ai: GoogleGenAI,
  model: string,
  prompt: string,
  maxAttempts = 3
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: ["image", "text"],
        },
      });
    } catch (err) {
      const { status, message } = getErrorDetails(err);
      const lowerMessage = message.toLowerCase();
      const isRetriable =
        status === 429 ||
        status === 500 ||
        status === 503 ||
        lowerMessage.includes("rate limit") ||
        lowerMessage.includes("overloaded") ||
        lowerMessage.includes("temporar") ||
        isStatusMentioned(lowerMessage, [429, 500, 503]);
      if (!isRetriable || attempt === maxAttempts) {
        throw err;
      }

      const backoffMs = 1200 * Math.pow(2, attempt - 1);
      console.warn(`Gemini retry ${attempt}/${maxAttempts} due to ${status || "unknown"}: ${message}`);
      await sleep(backoffMs);
    }
  }

  throw new Error("Gemini request failed after retries.");
}

function isModelNotFoundError(err: unknown): boolean {
  const { status, message } = getErrorDetails(err);
  const msg = message.toLowerCase();
  return status === 404 || (msg.includes("model") && (msg.includes("not found") || msg.includes("not_found") || msg.includes("unsupported")));
}

function getImageModelCandidates(): string[] {
  const envModel = process.env.GEMINI_IMAGE_MODEL?.trim();
  const fallbackModels = [
    "gemini-2.5-flash-image-preview",
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
  ];

  return [...new Set([envModel, ...fallbackModels].filter((model): model is string => Boolean(model)))];
}

async function generateVisualWithModelFallback(ai: GoogleGenAI, prompt: string) {
  const models = getImageModelCandidates();
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await generateVisualWithRetry(ai, model, prompt);
      return { response, model };
    } catch (err) {
      lastError = err;
      if (!isModelNotFoundError(err)) {
        throw err;
      }
      console.warn(`Gemini image model '${model}' not found, trying next fallback model.`);
    }
  }

  throw lastError ?? new Error("Kein gueltiges Gemini-Bildmodell verfuegbar.");
}

const TYPE_PROMPTS: Record<string, string> = {
  infographic:
    "Create a professional infographic that visually summarizes the following LinkedIn post content. Use clear sections, icons, key statistics or bullet points rendered as visual elements. The infographic should be easy to read at a glance and suitable for a LinkedIn feed.",
  comic:
    "Create a comic strip or illustrated visual story that captures the essence of the following LinkedIn post content. Use 2-4 panels with characters, speech bubbles or captions. Make it engaging, memorable and suitable for a professional LinkedIn audience.",
  meme:
    "Create a LinkedIn-safe meme visual that captures the core message of the following post. Use a single punchy idea with clear visual hierarchy and short text overlays. Keep the humor smart, professional and relatable for a business audience.",
};

const STYLE_PROMPTS_BY_TYPE: Record<string, Record<string, string>> = {
  infographic: {
    flat: "Use a flat, modern design style with clean shapes, bold colors and sans-serif typography. Minimal gradients, strong contrast.",
    corporate: "Use a polished corporate style with professional color palette (navy, teal, white), clean grid layout, subtle gradients, business-appropriate imagery.",
    minimal: "Use a minimalist style with maximum white space, one accent color, thin lines, small elegant typography. Less is more.",
    blueprint: "Use a technical blueprint style with dark blue background, white/cyan line drawings, monospace fonts, technical diagrams and grid patterns.",
    watercolor: "Use a soft watercolor illustration style with gentle color washes, organic shapes, hand-painted feel. Elegant and artistic.",
  },
  comic: {
    sketchnote: "Use a hand-drawn sketchnote style with doodles, handwriting-like fonts, arrows and simple icons. Black and white with one or two accent colors.",
    playful: "Use a colorful, playful style with bright saturated colors, rounded shapes, fun illustrations, dynamic composition. Energetic and eye-catching.",
    retro: "Use a retro/vintage style with muted earth tones, halftone textures, bold serif fonts and a 70s/80s poster aesthetic.",
    flat: "Use a clean flat-illustration comic style with strong outlines, simple shapes and modern color blocks.",
    watercolor: "Use a soft watercolor comic style with expressive brush textures and gentle color transitions.",
  },
  meme: {
    classic: "Use a classic meme style: high-contrast image, bold uppercase meme text with strong readability and clear joke setup/punchline structure.",
    modern: "Use a modern social meme style with clean typography, contemporary color grading and minimal clutter.",
    office: "Use an office/corporate humor meme style with business context visuals, polished look and subtle satire.",
    reaction: "Use a reaction meme format with expressive character faces/body language and short impactful caption text.",
    minimal: "Use a minimalist meme style with very little text, simple composition and one strong visual metaphor.",
  },
};

const DEFAULT_STYLE_BY_TYPE: Record<string, string> = {
  infographic: "flat",
  comic: "sketchnote",
  meme: "classic",
};

const RATIO_CONFIGS: Record<string, string> = {
  "1:1": "square format (1:1 aspect ratio, 1024x1024 pixels)",
  "4:5": "portrait format (4:5 aspect ratio, 896x1120 pixels, optimized for LinkedIn feed)",
  "16:9": "landscape/widescreen format (16:9 aspect ratio, 1344x768 pixels)",
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Visual-Generierung ist nicht konfiguriert. GEMINI_API_KEY fehlt." },
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
    const body = await request.json();
    const { postText, type, style, aspectRatio } = body as {
      postText?: string;
      type?: string;
      style?: string;
      aspectRatio?: string;
    };

    if (!postText || postText.trim().length === 0) {
      return NextResponse.json({ error: "Kein Post-Text vorhanden. Schreibe zuerst einen Post." }, { status: 400 });
    }

    const normalizedType = TYPE_PROMPTS[type || ""] ? (type as string) : "infographic";
    const styleMap = STYLE_PROMPTS_BY_TYPE[normalizedType] || STYLE_PROMPTS_BY_TYPE.infographic;
    const defaultStyle = DEFAULT_STYLE_BY_TYPE[normalizedType] || DEFAULT_STYLE_BY_TYPE.infographic;
    const normalizedStyle = style && styleMap[style] ? style : defaultStyle;
    const typePrompt = TYPE_PROMPTS[normalizedType];
    const stylePrompt = styleMap[normalizedStyle];
    const ratioPrompt = RATIO_CONFIGS[aspectRatio || "1:1"] || RATIO_CONFIGS["1:1"];

    const truncatedText = postText.length > 2000 ? postText.slice(0, 2000) + "..." : postText;

    const prompt = `${typePrompt}

Style: ${stylePrompt}

Format: ${ratioPrompt}

IMPORTANT RULES:
- Any text, labels, headings or captions in the image MUST be in the SAME LANGUAGE as the post content below. If the post is in German, all text in the image must be in German. If in English, use English. Never mix languages.
- Keep text in the image short: use keywords, short labels and headings only -- no full sentences.
- The image should complement the post, not duplicate it. Represent concepts visually through icons, illustrations, diagrams and visual metaphors.

LinkedIn Post Content:
---
${truncatedText}
---

Generate the image now.`;

    const ai = new GoogleGenAI({ apiKey });
    const { response } = await generateVisualWithModelFallback(ai, prompt);

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return NextResponse.json({ error: "Keine Antwort von Gemini erhalten." }, { status: 502 });
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        return NextResponse.json({ image: dataUrl });
      }
    }

    return NextResponse.json({ error: "Gemini hat kein Bild generiert. Bitte versuche es erneut." }, { status: 502 });
  } catch (err) {
    console.error("Visual generate error:", err);
    const { status, message } = getErrorDetails(err);
    const errMsg = message;
    const lowerMsg = errMsg.toLowerCase();

    if (status === 401 || lowerMsg.includes("authentication") || lowerMsg.includes("api_key") || isStatusMentioned(lowerMsg, [401])) {
      return NextResponse.json({ error: "GEMINI_API_KEY ist ungueltig." }, { status: 401 });
    }
    if (status === 429 || lowerMsg.includes("quota") || lowerMsg.includes("rate_limit") || lowerMsg.includes("rate limit") || isStatusMentioned(lowerMsg, [429])) {
      return NextResponse.json({ error: "Gemini Rate-Limit erreicht. Bitte warte und versuche es erneut." }, { status: 429 });
    }
    if (status === 400 && (lowerMsg.includes("safety") || lowerMsg.includes("blocked"))) {
      return NextResponse.json({ error: "Das Bild konnte aus Sicherheitsgruenden nicht generiert werden. Passe den Post-Text an." }, { status: 400 });
    }
    if (status === 500 || status === 503 || lowerMsg.includes("overloaded") || lowerMsg.includes("temporar") || isStatusMentioned(lowerMsg, [500, 503])) {
      return NextResponse.json({ error: "Gemini ist aktuell ueberlastet. Bitte versuche es in 30 Sekunden erneut." }, { status: 503 });
    }
    if (isModelNotFoundError(err)) {
      return NextResponse.json(
        {
          error: `Kein verfuegbares Bildmodell gefunden. Gepruefte Modelle: ${getImageModelCandidates().join(", ")}. Bitte GEMINI_IMAGE_MODEL pruefen.`,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Fehler bei der Bildgenerierung: ${errMsg}` },
      { status: 500 }
    );
  }
}
