"use client";

import React, { useState, useMemo, useCallback } from "react";
import { MAX_CHARS } from "@/lib/constants";
import PostAnalytics from "./PostAnalytics";

interface CharCountProps {
  hook: string;
  content: string;
  cta: string;
}

export default function CharCount({ hook, content, cta }: CharCountProps) {
  const [copied, setCopied] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const mergedText = useMemo(() => {
    const parts = [hook, content, cta].filter((p) => p.trim().length > 0);
    return parts.join("\n\n");
  }, [hook, content, cta]);

  const charCount = mergedText.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = charCount === 0;
  const percentage = Math.min((charCount / MAX_CHARS) * 100, 100);

  const barColor = useMemo(() => {
    if (isOverLimit) return "bg-red-500";
    if (percentage > 80) return "bg-amber-400";
    if (percentage > 60) return "bg-yellow-400";
    return "bg-editor-accent";
  }, [isOverLimit, percentage]);

  const handleCopy = useCallback(async () => {
    if (isOverLimit || isEmpty) return;
    try {
      await navigator.clipboard.writeText(mergedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = mergedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [mergedText, isOverLimit, isEmpty]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 px-1">
        {/* Progress + Count */}
        <div className="flex-1 space-y-2">
          <div className="h-1.5 bg-editor-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span
              className={`font-mono tabular-nums ${
                isOverLimit ? "text-red-400 font-semibold" : "text-editor-muted"
              }`}
            >
              {charCount.toLocaleString("de-DE")} / {MAX_CHARS.toLocaleString("de-DE")} Zeichen
            </span>
            {isOverLimit && (
              <span className="text-red-400 font-medium animate-pulse">
                {(charCount - MAX_CHARS).toLocaleString("de-DE")} zu viel
              </span>
            )}
          </div>
        </div>

        {/* Analytics Toggle */}
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={`
            px-3 py-3 rounded-xl text-sm font-medium shrink-0
            border transition-all duration-200
            ${showAnalytics
              ? "bg-editor-accent/10 text-editor-accent border-editor-accent/30"
              : "bg-editor-surface text-editor-muted border-editor-border hover:text-editor-text hover:border-editor-muted"
            }
          `}
          title="Post-Analyse anzeigen"
        >
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span className="hidden sm:inline">Analyse</span>
          </span>
        </button>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          disabled={isOverLimit || isEmpty}
          className={`
            relative px-6 py-3 rounded-xl font-medium text-sm
            transition-all duration-300 ease-out
            shrink-0
            ${
              isOverLimit || isEmpty
                ? "bg-editor-surface text-editor-muted/40 cursor-not-allowed border border-editor-border"
                : copied
                  ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                  : "bg-editor-accent text-white hover:bg-editor-accent-hover shadow-lg shadow-editor-accent/30 hover:shadow-editor-accent/50 active:scale-[0.97]"
            }
          `}
        >
          <span className="flex items-center gap-2">
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Kopiert!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Post kopieren
              </>
            )}
          </span>
        </button>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className="px-1 animate-in">
          <div className="bg-editor-surface border border-editor-border rounded-xl p-4">
            <PostAnalytics hook={hook} content={content} cta={cta} />
          </div>
        </div>
      )}
    </div>
  );
}
