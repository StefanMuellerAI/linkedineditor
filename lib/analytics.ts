export interface HookScore {
  score: number;
  hasQuestion: boolean;
  hasNumber: boolean;
  hasPowerWord: boolean;
  isShort: boolean;
}

export interface PostAnalytics {
  wordCount: number;
  readingTimeSec: number;
  avgSentenceLength: number;
  emojiCount: number;
  paragraphCount: number;
  avgParagraphLines: number;
  hookScore: HookScore;
  overallScore: number;
  suggestions: string[];
}

const POWER_WORDS = [
  "geheim", "fehler", "warum", "wie", "trick", "strategie", "wichtig",
  "nie", "immer", "sofort", "einfach", "überraschend", "unglaublich",
  "erstaunlich", "verändern", "transformieren", "entdecken", "lernen",
  "wachstum", "erfolg", "scheitern", "lektion", "erkenntnis",
  "unpopulär", "kontrovers", "wahrheit", "mythos", "stop", "achtung",
  "secret", "mistake", "why", "how", "trick", "strategy", "important",
  "never", "always", "instantly", "simple", "surprising", "incredible",
  "change", "transform", "discover", "learn", "growth", "success",
  "fail", "lesson", "truth", "myth", "stop", "warning",
];

function countEmojis(text: string): number {
  const chars = [...text];
  let count = 0;
  for (const char of chars) {
    const cp = char.codePointAt(0);
    if (cp === undefined) continue;
    if (
      (cp >= 0x1F600 && cp <= 0x1F64F) ||
      (cp >= 0x1F300 && cp <= 0x1F5FF) ||
      (cp >= 0x1F680 && cp <= 0x1F6FF) ||
      (cp >= 0x1F1E0 && cp <= 0x1F1FF) ||
      (cp >= 0x2600 && cp <= 0x26FF) ||
      (cp >= 0x2700 && cp <= 0x27BF) ||
      (cp >= 0x1F900 && cp <= 0x1F9FF) ||
      (cp >= 0x1FA00 && cp <= 0x1FA6F) ||
      (cp >= 0x1FA70 && cp <= 0x1FAFF)
    ) {
      count++;
    }
  }
  return count;
}

function analyzeHook(hook: string): HookScore {
  const lower = hook.toLowerCase();
  const hasQuestion = /\?/.test(hook);
  const hasNumber = /\d/.test(hook);
  const hasPowerWord = POWER_WORDS.some((w) => lower.includes(w));
  const lines = hook.split("\n").filter((l) => l.trim().length > 0);
  const isShort = lines.length <= 3 && hook.length <= 200;

  let score = 0;
  if (hasQuestion) score += 25;
  if (hasNumber) score += 25;
  if (hasPowerWord) score += 25;
  if (isShort) score += 25;

  return { score, hasQuestion, hasNumber, hasPowerWord, isShort };
}

function buildSuggestions(
  wordCount: number,
  avgSentenceLength: number,
  avgParagraphLines: number,
  emojiCount: number,
  hookScore: HookScore,
  cta: string,
): string[] {
  const suggestions: string[] = [];

  if (hookScore.score < 75) {
    if (!hookScore.hasQuestion) {
      suggestions.push("Starte mit einer klaren Frage im Hook, um mehr Kommentare auszulösen.");
    }
    if (!hookScore.hasNumber) {
      suggestions.push("Füge eine konkrete Zahl in den Hook ein (z. B. \"3 Learnings\"), damit der Mehrwert sofort sichtbar ist.");
    }
    if (!hookScore.hasPowerWord) {
      suggestions.push("Nutze ein starkes Power-Word wie \"Fehler\", \"Strategie\" oder \"Wahrheit\", um Neugier zu erzeugen.");
    }
  }

  if (wordCount < 100) {
    suggestions.push("Erweitere den Post um ein kurzes Beispiel oder eine Mini-Story, um näher an 100-250 Wörter zu kommen.");
  } else if (wordCount > 250) {
    suggestions.push("Kürze den Text auf die stärksten Kernaussagen, damit Leser bis zum CTA dranbleiben.");
  }

  if (avgSentenceLength > 15) {
    suggestions.push("Teile lange Sätze in kürzere Aussagen (8-15 Wörter), damit der Post leichter scanbar wird.");
  }

  if (avgParagraphLines > 3) {
    suggestions.push("Baue mehr Absätze mit maximal 1-3 Zeilen ein, um die mobile Lesbarkeit zu erhöhen.");
  }

  if (emojiCount === 0) {
    suggestions.push("Setze 1-3 passende Emojis als visuelle Anker ein, um wichtige Punkte hervorzuheben.");
  } else if (emojiCount > 8) {
    suggestions.push("Reduziere die Anzahl der Emojis auf maximal 8, damit der Post professionell und klar wirkt.");
  }

  if (cta.trim().length === 0) {
    suggestions.push("Ergänze am Ende eine konkrete Handlungsaufforderung, z. B. \"Wie siehst du das?\".");
  } else if (!/\?/.test(cta)) {
    suggestions.push("Formuliere den CTA als Frage, um die Wahrscheinlichkeit für Antworten zu steigern.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Starker Post: Teste als Nächstes zwei Hook-Varianten und vergleiche Reichweite sowie Kommentarquote.");
  }

  return suggestions.slice(0, 4);
}

export function analyzePost(hook: string, content: string, cta: string): PostAnalytics {
  const fullText = [hook, content, cta].filter((p) => p.trim().length > 0).join("\n\n");

  if (fullText.trim().length === 0) {
    return {
      wordCount: 0,
      readingTimeSec: 0,
      avgSentenceLength: 0,
      emojiCount: 0,
      paragraphCount: 0,
      avgParagraphLines: 0,
      hookScore: { score: 0, hasQuestion: false, hasNumber: false, hasPowerWord: false, isShort: true },
      overallScore: 0,
      suggestions: [],
    };
  }

  const words = fullText.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const readingTimeSec = Math.ceil((wordCount / 200) * 60);

  const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? Math.round(wordCount / sentences.length) : 0;

  const emojiCount = countEmojis(fullText);

  const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = paragraphs.length;
  const totalLines = paragraphs.reduce((sum, p) => sum + p.split("\n").filter((l) => l.trim()).length, 0);
  const avgParagraphLines = paragraphCount > 0 ? Math.round((totalLines / paragraphCount) * 10) / 10 : 0;

  const hookScoreResult = analyzeHook(hook);

  // Overall score calculation
  let overall = 0;

  // Hook quality (30% weight)
  overall += hookScoreResult.score * 0.3;

  // Sentence length score (20% weight) - ideal is 8-15 words
  if (avgSentenceLength > 0) {
    if (avgSentenceLength >= 8 && avgSentenceLength <= 15) {
      overall += 100 * 0.2;
    } else if (avgSentenceLength < 8) {
      overall += 70 * 0.2;
    } else if (avgSentenceLength <= 20) {
      overall += 60 * 0.2;
    } else {
      overall += 30 * 0.2;
    }
  }

  // Paragraph structure (20% weight) - ideal is 1-3 lines per paragraph
  if (avgParagraphLines > 0) {
    if (avgParagraphLines <= 3) {
      overall += 100 * 0.2;
    } else if (avgParagraphLines <= 5) {
      overall += 60 * 0.2;
    } else {
      overall += 30 * 0.2;
    }
  }

  // Word count (15% weight) - ideal is 100-250 words
  if (wordCount >= 100 && wordCount <= 250) {
    overall += 100 * 0.15;
  } else if (wordCount >= 50 && wordCount < 100) {
    overall += 60 * 0.15;
  } else if (wordCount > 250 && wordCount <= 400) {
    overall += 70 * 0.15;
  } else if (wordCount < 50) {
    overall += 30 * 0.15;
  } else {
    overall += 40 * 0.15;
  }

  // CTA presence (15% weight)
  if (cta.trim().length > 0) {
    const ctaHasQuestion = /\?/.test(cta);
    overall += (ctaHasQuestion ? 100 : 70) * 0.15;
  }

  const overallScore = Math.round(overall);
  const suggestions = buildSuggestions(wordCount, avgSentenceLength, avgParagraphLines, emojiCount, hookScoreResult, cta);

  return {
    wordCount,
    readingTimeSec,
    avgSentenceLength,
    emojiCount,
    paragraphCount,
    avgParagraphLines,
    hookScore: hookScoreResult,
    overallScore,
    suggestions,
  };
}
