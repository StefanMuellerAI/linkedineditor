"use client";

import React, { useMemo } from "react";
import { analyzePost } from "@/lib/analytics";

interface PostAnalyticsProps {
  hook: string;
  content: string;
  cta: string;
  onApplySuggestion?: (suggestion: string) => Promise<void>;
  optimizeLoading?: boolean;
  optimizeError?: string | null;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-editor-success";
  if (score >= 50) return "text-editor-warning";
  return "text-editor-danger";
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-editor-success";
  if (score >= 50) return "bg-editor-warning";
  return "bg-editor-danger";
}

function MetricCard({ label, value, sub, quality }: { label: string; value: string; sub?: string; quality: "good" | "ok" | "bad" }) {
  const dotColor = quality === "good" ? "bg-editor-success" : quality === "ok" ? "bg-editor-warning" : "bg-editor-danger";
  return (
    <div className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-editor-surface-hover/50">
      <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0`} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-editor-text tabular-nums">{value}</div>
        <div className="text-xs text-editor-muted">{label}</div>
        {sub && <div className="text-[10px] text-editor-muted/70 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function HookDetail({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
      active ? "bg-editor-success/20 text-editor-success" : "bg-editor-surface-hover text-editor-muted"
    }`}>
      {active ? "✓" : "–"} {label}
    </span>
  );
}

export default function PostAnalytics({
  hook,
  content,
  cta,
  onApplySuggestion,
  optimizeLoading = false,
  optimizeError = null,
}: PostAnalyticsProps) {
  const analytics = useMemo(() => analyzePost(hook, content, cta), [hook, content, cta]);

  if (analytics.wordCount === 0) {
    return (
      <div className="text-center py-6 text-editor-muted/50 text-sm italic">
        Beginne zu schreiben, um die Analyse zu sehen.
      </div>
    );
  }

  const sentenceQuality: "good" | "ok" | "bad" =
    analytics.avgSentenceLength >= 8 && analytics.avgSentenceLength <= 15 ? "good" :
    analytics.avgSentenceLength <= 20 ? "ok" : "bad";

  const paragraphQuality: "good" | "ok" | "bad" =
    analytics.avgParagraphLines <= 3 ? "good" :
    analytics.avgParagraphLines <= 5 ? "ok" : "bad";

  const wordQuality: "good" | "ok" | "bad" =
    analytics.wordCount >= 100 && analytics.wordCount <= 250 ? "good" :
    analytics.wordCount >= 50 && analytics.wordCount <= 400 ? "ok" : "bad";

  const readingMin = Math.floor(analytics.readingTimeSec / 60);
  const readingSec = analytics.readingTimeSec % 60;
  const readingStr = readingMin > 0 ? `${readingMin}m ${readingSec}s` : `${readingSec}s`;

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-editor-border"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              strokeWidth="2.5"
              strokeDasharray={`${analytics.overallScore}, 100`}
              strokeLinecap="round"
              className={scoreBg(analytics.overallScore).replace("bg-", "text-")}
              stroke="currentColor"
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor(analytics.overallScore)}`}>
            {analytics.overallScore}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-editor-text">Post-Score</div>
          <div className="text-xs text-editor-muted">
            {analytics.overallScore >= 75 ? "Stark! Bereit zum Posten." :
             analytics.overallScore >= 50 ? "Solide Basis. Noch Optimierungspotenzial." :
             "Noch ausbaufähig. Schau dir die Details an."}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Wörter"
          value={analytics.wordCount.toString()}
          sub="Ideal: 100–250"
          quality={wordQuality}
        />
        <MetricCard
          label="Lesezeit"
          value={readingStr}
          quality="good"
        />
        <MetricCard
          label="Ø Satzlänge"
          value={`${analytics.avgSentenceLength} Wörter`}
          sub="Ideal: 8–15"
          quality={sentenceQuality}
        />
        <MetricCard
          label="Absätze"
          value={`${analytics.paragraphCount} (Ø ${analytics.avgParagraphLines} Zeilen)`}
          sub="Ideal: ≤ 3 Zeilen/Absatz"
          quality={paragraphQuality}
        />
        <MetricCard
          label="Emojis"
          value={analytics.emojiCount.toString()}
          quality={analytics.emojiCount >= 1 && analytics.emojiCount <= 8 ? "good" : analytics.emojiCount === 0 ? "ok" : "bad"}
        />
        <MetricCard
          label="Hook-Score"
          value={`${analytics.hookScore.score}/100`}
          quality={analytics.hookScore.score >= 75 ? "good" : analytics.hookScore.score >= 50 ? "ok" : "bad"}
        />
      </div>

      {/* Hook Details */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-editor-muted uppercase tracking-wider">Hook-Details</div>
        <div className="flex flex-wrap gap-1.5">
          <HookDetail label="Frage" active={analytics.hookScore.hasQuestion} />
          <HookDetail label="Zahl" active={analytics.hookScore.hasNumber} />
          <HookDetail label="Power-Word" active={analytics.hookScore.hasPowerWord} />
          <HookDetail label="Kurz & prägnant" active={analytics.hookScore.isShort} />
        </div>
      </div>

      {/* AI Suggestions */}
      {analytics.suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-editor-muted uppercase tracking-wider">KI-Empfehlungen</div>
          {optimizeError && (
            <p className="text-xs text-editor-danger bg-editor-danger-soft rounded-lg px-3 py-2">
              {optimizeError}
            </p>
          )}
          <ul className="space-y-1.5">
            {analytics.suggestions.map((suggestion, index) => (
              <li key={`${index}-${suggestion}`} className="text-xs text-editor-text bg-editor-surface-hover/60 rounded-lg px-3 py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-editor-success mr-1.5">→</span>
                    {suggestion}
                  </div>
                  {onApplySuggestion && (
                    <button
                      type="button"
                      onClick={() => onApplySuggestion(suggestion)}
                      disabled={optimizeLoading}
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-editor-border bg-editor-bg px-2.5 py-1.5 text-[11px] font-medium text-editor-text transition-colors hover:bg-editor-surface disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {optimizeLoading ? "Wird angewendet..." : "Mit KI anwenden"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
