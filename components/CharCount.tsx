"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { MAX_CHARS } from "@/lib/constants";
import PostAnalytics from "./PostAnalytics";

interface CharCountProps {
  hook: string;
  content: string;
  cta: string;
  onVisualGenerate?: () => void;
  visualEnabled?: boolean;
  onImport?: (data: { hook: string; content: string; cta: string }) => void;
}

function exportToMarkdown(hook: string, content: string, cta: string): string {
  return `# Hook\n\n${hook}\n\n# Inhalt\n\n${content}\n\n# CTA\n\n${cta}\n`;
}

function parseMarkdown(md: string): { hook: string; content: string; cta: string } | null {
  const sections: Record<string, string> = {};
  let currentKey: string | null = null;
  const lines = md.split("\n");

  for (const line of lines) {
    const heading = line.match(/^#\s+(.+)$/);
    if (heading) {
      const title = heading[1].trim().toLowerCase();
      if (title === "hook") currentKey = "hook";
      else if (title === "inhalt" || title === "content") currentKey = "content";
      else if (title === "cta" || title === "call to action") currentKey = "cta";
      else currentKey = null;
      continue;
    }
    if (currentKey) {
      sections[currentKey] = sections[currentKey]
        ? sections[currentKey] + "\n" + line
        : line;
    }
  }

  if (!sections.hook && !sections.content && !sections.cta) return null;

  return {
    hook: (sections.hook || "").trim(),
    content: (sections.content || "").trim(),
    cta: (sections.cta || "").trim(),
  };
}

export default function CharCount({ hook, content, cta, onVisualGenerate, visualEnabled = false, onImport }: CharCountProps) {
  const [copied, setCopied] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isGeneratingTeleprompter, setIsGeneratingTeleprompter] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergedText = useMemo(() => {
    const parts = [hook, content, cta].filter((p) => p.trim().length > 0);
    return parts.join("\n\n");
  }, [hook, content, cta]);

  const charCount = mergedText.length;
  const isOverLimit = charCount > MAX_CHARS;
  const hasPostContent = charCount > 0;
  const isEmpty = !hasPostContent;
  const canOpenAnalytics = hasPostContent;
  const canOpenVisualGenerator = visualEnabled && hasPostContent;
  const disabledButtonClass = "bg-editor-surface/70 text-editor-muted/40 border-editor-border/70 cursor-not-allowed";
  const enabledSecondaryButtonClass = "bg-editor-surface text-editor-text border-editor-border hover:border-editor-muted";
  const percentage = Math.min((charCount / MAX_CHARS) * 100, 100);

  const barColor = useMemo(() => {
    if (isOverLimit) return "bg-editor-danger";
    if (percentage > 80) return "bg-editor-warning";
    if (percentage > 60) return "bg-editor-warning/70";
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

  React.useEffect(() => {
    if (!canOpenAnalytics && showAnalytics) {
      setShowAnalytics(false);
    }
  }, [canOpenAnalytics, showAnalytics]);

  const handleExport = useCallback(() => {
    const md = exportToMarkdown(hook, content, cta);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `linkedin-post-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [hook, content, cta]);

  const handleGenerateTeleprompter = useCallback(async () => {
    if (!hasPostContent || isGeneratingTeleprompter) return;

    try {
      setIsGeneratingTeleprompter(true);
      const response = await fetch("/api/teleprompter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: mergedText }),
      });

      const data = await response.json() as { script?: string; error?: string };
      if (!response.ok || !data.script) {
        throw new Error(data.error || "Teleprompter konnte nicht erstellt werden.");
      }

      const blob = new Blob([data.script], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `youtube-short-teleprompter-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Teleprompter konnte nicht erstellt werden.";
      alert(message);
    } finally {
      setIsGeneratingTeleprompter(false);
    }
  }, [hasPostContent, isGeneratingTeleprompter, mergedText]);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImport) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const parsed = parseMarkdown(text);
        if (parsed) {
          onImport(parsed);
        } else {
          alert("Die Datei konnte nicht gelesen werden. Bitte verwende das Format:\n\n# Hook\n...\n# Inhalt\n...\n# CTA\n...");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [onImport]
  );

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
                isOverLimit ? "text-editor-danger font-semibold" : "text-editor-muted"
              }`}
            >
              {charCount.toLocaleString("de-DE")} / {MAX_CHARS.toLocaleString("de-DE")} Zeichen
            </span>
            {isOverLimit && (
              <span className="text-editor-danger font-medium animate-pulse">
                {(charCount - MAX_CHARS).toLocaleString("de-DE")} zu viel
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Post aus .md importieren"
            className="px-3 py-3 rounded-xl text-sm font-medium shrink-0
                       border transition-all duration-200
                       bg-editor-surface text-editor-text border-editor-border hover:border-editor-muted"
          >
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Import</span>
            </span>
          </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          onChange={handleImportFile}
          className="hidden"
        />

          {/* Export */}
          <button
          onClick={handleExport}
          disabled={!hasPostContent}
          title="Post als .md exportieren"
          className={`px-3 py-3 rounded-xl text-sm font-medium shrink-0
                     border transition-all duration-200
                     ${!hasPostContent
                       ? disabledButtonClass
                       : enabledSecondaryButtonClass
                     }`}
        >
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export</span>
          </span>
        </button>

          {/* Teleprompter */}
          <button
            onClick={handleGenerateTeleprompter}
            disabled={!hasPostContent || isGeneratingTeleprompter}
            title="YouTube-Short-Teleprompter als .md erstellen"
            className={`px-3 py-3 rounded-xl text-sm font-medium shrink-0
                     border transition-all duration-200
                     ${!hasPostContent || isGeneratingTeleprompter
                       ? disabledButtonClass
                       : enabledSecondaryButtonClass
                     }`}
          >
            <span className="flex items-center gap-1.5">
              {isGeneratingTeleprompter ? (
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="14" y2="17" />
                </svg>
              )}
              <span>Teleprompter</span>
            </span>
          </button>

          {/* Analytics Toggle */}
          <button
          onClick={() => canOpenAnalytics && setShowAnalytics(!showAnalytics)}
          disabled={!canOpenAnalytics}
          className={`
            px-3 py-3 rounded-xl text-sm font-medium shrink-0
            border transition-all duration-200
            ${!canOpenAnalytics
              ? disabledButtonClass
              : showAnalytics
              ? "bg-editor-accent/10 text-editor-accent border-editor-accent/30"
              : enabledSecondaryButtonClass
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
            <span>Analyse</span>
          </span>
        </button>

          {/* Visual Generator */}
          <button
          onClick={onVisualGenerate}
          disabled={!canOpenVisualGenerator}
          title={!visualEnabled ? "GEMINI_API_KEY nicht konfiguriert" : "Visual zum Post generieren"}
          className={`
            px-3 py-3 rounded-xl text-sm font-medium shrink-0
            border transition-all duration-200
            ${!canOpenVisualGenerator
              ? disabledButtonClass
              : enabledSecondaryButtonClass
            }
          `}
        >
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span>Visual</span>
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
                ? "bg-editor-surface/70 text-editor-muted/40 cursor-not-allowed border border-editor-border/70"
                : copied
                  ? "bg-editor-success text-editor-success-foreground shadow-lg shadow-editor-success/30"
                  : "bg-editor-accent text-editor-accent-foreground hover:bg-editor-accent-hover shadow-lg shadow-editor-accent/30 hover:shadow-editor-accent/50 active:scale-[0.97]"
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
