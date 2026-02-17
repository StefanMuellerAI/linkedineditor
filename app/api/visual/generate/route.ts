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

const TYPE_PROMPTS: Record<string, string> = {
  infographic:
    "Create a professional infographic that visually summarizes the following LinkedIn post content. Use clear sections, icons, key statistics or bullet points rendered as visual elements. The infographic should be easy to read at a glance and suitable for a LinkedIn feed.",
  comic:
    "Create a comic strip or illustrated visual story that captures the essence of the following LinkedIn post content. Use 2-4 panels with characters, speech bubbles or captions. Make it engaging, memorable and suitable for a professional LinkedIn audience.",
};

const STYLE_PROMPTS: Record<string, string> = {
  flat: "Use a flat, modern design style with clean shapes, bold colors and sans-serif typography. Minimal gradients, strong contrast.",
  sketchnote: "Use a hand-drawn sketchnote style with doodles, handwriting-like fonts, arrows and simple icons. Black and white with one or two accent colors.",
  corporate: "Use a polished corporate style with professional color palette (navy, teal, white), clean grid layout, subtle gradients, business-appropriate imagery.",
  retro: "Use a retro/vintage style with muted earth tones, halftone textures, bold serif fonts and a 70s/80s poster aesthetic.",
  minimal: "Use a minimalist style with maximum white space, one accent color, thin lines, small elegant typography. Less is more.",
  playful: "Use a colorful, playful style with bright saturated colors, rounded shapes, fun illustrations, dynamic composition. Energetic and eye-catching.",
  blueprint: "Use a technical blueprint style with dark blue background, white/cyan line drawings, monospace fonts, technical diagrams and grid patterns.",
  watercolor: "Use a soft watercolor illustration style with gentle color washes, organic shapes, hand-painted feel. Elegant and artistic.",
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

  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
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

    const typePrompt = TYPE_PROMPTS[type || "infographic"] || TYPE_PROMPTS.infographic;
    const stylePrompt = STYLE_PROMPTS[style || "flat"] || STYLE_PROMPTS.flat;
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

    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: ["image", "text"],
      },
    });

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
    const errMsg = err instanceof Error ? err.message : String(err);

    if (errMsg.includes("authentication") || errMsg.includes("API_KEY") || errMsg.includes("401")) {
      return NextResponse.json({ error: "GEMINI_API_KEY ist ungueltig." }, { status: 401 });
    }
    if (errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("RATE_LIMIT")) {
      return NextResponse.json({ error: "Gemini Rate-Limit erreicht. Bitte warte und versuche es erneut." }, { status: 429 });
    }
    if (errMsg.includes("safety") || errMsg.includes("BLOCKED")) {
      return NextResponse.json({ error: "Das Bild konnte aus Sicherheitsgruenden nicht generiert werden. Passe den Post-Text an." }, { status: 400 });
    }
    if (errMsg.includes("model") || errMsg.includes("not_found") || errMsg.includes("404")) {
      return NextResponse.json({ error: `Modell nicht gefunden: ${process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview"}. Bitte GEMINI_IMAGE_MODEL pruefen.` }, { status: 400 });
    }
    return NextResponse.json(
      { error: `Fehler bei der Bildgenerierung: ${errMsg}` },
      { status: 500 }
    );
  }
}
