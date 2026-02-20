"use client";

import React, { useState, useMemo } from "react";

interface PreviewProps {
  hook: string;
  content: string;
  cta: string;
  visualUrl?: string | null;
  onRemoveVisual?: () => void;
}

export default function Preview({ hook, content, cta, visualUrl, onRemoveVisual }: PreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const fullText = useMemo(() => {
    const parts = [hook, content, cta].filter((p) => p.trim().length > 0);
    return parts.join("\n\n");
  }, [hook, content, cta]);

  const isEmpty = fullText.trim().length === 0;

  const truncatedText = useMemo(() => {
    if (expanded) return fullText;
    const lines = fullText.split("\n");
    if (lines.length <= 5) {
      if (fullText.length <= 200) return fullText;
      return fullText.slice(0, 200);
    }
    const firstLines = lines.slice(0, 5).join("\n");
    if (firstLines.length <= 200) return firstLines;
    return firstLines.slice(0, 200);
  }, [fullText, expanded]);

  const needsTruncation = fullText !== truncatedText;

  return (
    <div className="h-full flex flex-col">
      <div className="text-xs font-medium text-editor-muted uppercase tracking-wider mb-3">
        Vorschau
      </div>

      <div className="flex-1 bg-linkedin-bg rounded-xl p-4 pt-3 pb-3">
      <div className="bg-linkedin-card rounded-xl shadow-sm border border-linkedin-border overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-linkedin-blue to-linkedin-blue-hover flex items-center justify-center text-white font-bold text-lg shrink-0">
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-linkedin-text text-sm">
                Dein Name
              </div>
              <div className="text-xs text-linkedin-secondary leading-tight mt-0.5">
                Deine Beschreibung
              </div>
              <div className="text-xs text-linkedin-secondary mt-0.5 flex items-center gap-1">
                Gerade eben · 🌐
              </div>
            </div>
            <button className="text-linkedin-secondary hover:text-linkedin-text p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="6" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="18" r="2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-3 pb-3">
          {isEmpty ? (
            <div className="text-linkedin-secondary/50 text-sm italic py-8 text-center">
              Dein Post erscheint hier...
            </div>
          ) : (
            <div className="text-sm text-linkedin-text leading-[1.4] whitespace-pre-wrap break-words">
              {truncatedText}
              {needsTruncation && (
                <>
                  {"... "}
                  <button
                    onClick={() => setExpanded(true)}
                    className="text-linkedin-secondary hover:text-linkedin-blue hover:underline font-medium"
                  >
                    mehr anzeigen
                  </button>
                </>
              )}
              {expanded && fullText !== truncatedText && (
                <button
                  onClick={() => setExpanded(false)}
                  className="block mt-1 text-linkedin-secondary hover:text-linkedin-blue hover:underline font-medium text-sm"
                >
                  weniger anzeigen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Visual / Image */}
        {visualUrl && (
          <div className="relative group">
            <img src={visualUrl} alt="Post Visual" className="w-full h-auto" />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={visualUrl}
                download={`linkedin-visual-${Date.now()}.png`}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-editor-overlay text-editor-accent-foreground hover:bg-editor-overlay/90 transition-colors"
                title="Herunterladen"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
              {onRemoveVisual && (
                <button
                  onClick={onRemoveVisual}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-editor-overlay text-editor-accent-foreground hover:bg-editor-danger/80 transition-colors"
                  title="Bild entfernen"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Engagement Bar */}
        <div className="px-4 py-2 border-t border-linkedin-border">
          <div className="flex items-center gap-1.5 text-xs text-linkedin-secondary">
            <span className="flex -space-x-0.5">
              <span className="w-[18px] h-[18px] rounded-full bg-[#378FE9] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                  <path d="M13.4 5.2l-3.7-3.4c-.4-.4-1-.4-1.4 0L4.6 5.2c-.3.3-.1.8.3.8h2.2v4.5c0 .3.2.5.5.5h.8c.3 0 .5-.2.5-.5V6h2.2c.4 0 .6-.5.3-.8z" />
                </svg>
              </span>
              <span className="w-[18px] h-[18px] rounded-full bg-[#E16745] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                  <path d="M8 14.2l-1-1C3.4 10 1.5 8.3 1.5 6.2c0-1.7 1.3-3 3-3 .9 0 1.8.4 2.5 1.1.6-.7 1.5-1.1 2.5-1.1 1.7 0 3 1.3 3 3 0 2.1-1.9 3.8-5.5 7l-1 1z" />
                </svg>
              </span>
            </span>
            <span>42</span>
            <span className="ml-auto">3 Kommentare · 1 Repost</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-2 py-1 border-t border-linkedin-border flex items-center justify-around">
          {[
            {
              label: "Gefällt mir",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
              ),
            },
            {
              label: "Kommentieren",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              ),
            },
            {
              label: "Reposten",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 014-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 01-4 4H3" />
                </svg>
              ),
            },
            {
              label: "Senden",
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              ),
            },
          ].map(({ icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-medium text-linkedin-secondary hover:bg-linkedin-bg transition-colors"
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
