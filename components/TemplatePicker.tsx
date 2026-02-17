"use client";

import React, { useState, useRef, useEffect } from "react";
import { TEMPLATES, PostTemplate } from "@/lib/templates";

interface TemplatePickerProps {
  onSelect: (template: PostTemplate) => void;
  hasContent: boolean;
}

export default function TemplatePicker({ onSelect, hasContent }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<PostTemplate | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirming(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleSelect = (template: PostTemplate) => {
    if (hasContent && template.id !== "empty") {
      setConfirming(template);
    } else {
      onSelect(template);
      setOpen(false);
      setConfirming(null);
    }
  };

  const confirmOverwrite = () => {
    if (confirming) {
      onSelect(confirming);
      setOpen(false);
      setConfirming(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
          border transition-all duration-150
          ${open
            ? "bg-editor-accent text-white border-editor-accent"
            : "bg-editor-surface text-editor-muted border-editor-border hover:text-editor-text hover:border-editor-muted"
          }
        `}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        Vorlage wählen
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[340px] sm:w-[400px] animate-in">
          <div className="bg-editor-surface border border-editor-border rounded-xl shadow-2xl shadow-black/30 overflow-hidden">
            <div className="px-3 pt-3 pb-2">
              <span className="text-xs font-medium text-editor-muted uppercase tracking-wider">
                Post-Vorlagen
              </span>
            </div>

            {confirming ? (
              <div className="px-4 pb-4">
                <div className="bg-editor-surface-hover rounded-lg p-4 space-y-3">
                  <p className="text-sm text-editor-text">
                    Vorhandenen Text mit <strong>{confirming.name}</strong> überschreiben?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmOverwrite}
                      className="flex-1 px-3 py-2 bg-editor-accent text-white rounded-lg text-sm font-medium
                                 hover:bg-editor-accent-hover transition-colors"
                    >
                      Überschreiben
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="flex-1 px-3 py-2 bg-editor-surface border border-editor-border text-editor-text rounded-lg text-sm
                                 hover:bg-editor-surface-hover transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto px-2 pb-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelect(tpl)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left
                               hover:bg-editor-surface-hover transition-colors group"
                  >
                    <span className="text-lg shrink-0 mt-0.5">{tpl.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-editor-text group-hover:text-editor-accent transition-colors">
                        {tpl.name}
                      </div>
                      <div className="text-xs text-editor-muted truncate">
                        {tpl.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
