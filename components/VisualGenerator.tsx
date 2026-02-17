"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface VisualGeneratorProps {
  open: boolean;
  onClose: () => void;
  postText: string;
  onImageGenerated?: (imageUrl: string) => void;
}

const TYPES = [
  { id: "infographic", label: "Infografik" },
  { id: "comic", label: "Comic" },
];

const STYLES = [
  { id: "flat", label: "Flat / Modern" },
  { id: "sketchnote", label: "Sketchnote" },
  { id: "corporate", label: "Corporate" },
  { id: "retro", label: "Retro / Vintage" },
  { id: "minimal", label: "Minimalistisch" },
  { id: "playful", label: "Bunt / Playful" },
  { id: "blueprint", label: "Technisch / Blueprint" },
  { id: "watercolor", label: "Watercolor" },
];

const RATIOS = [
  { id: "1:1", label: "1:1 (Quadrat)" },
  { id: "4:5", label: "4:5 (Portrait)" },
  { id: "16:9", label: "16:9 (Landscape)" },
];

const selectClasses = `w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2.5
  text-sm text-editor-text
  focus:border-editor-accent focus:ring-1 focus:ring-editor-accent/30 outline-none
  disabled:opacity-50 transition-colors appearance-none
  bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238888AA%22%20stroke-width%3D%222.5%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')]
  bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8`;

export default function VisualGenerator({ open, onClose, postText, onImageGenerated }: VisualGeneratorProps) {
  const [type, setType] = useState("infographic");
  const [style, setStyle] = useState("flat");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, loading, onClose]);

  useEffect(() => {
    if (open) {
      setImageUrl(null);
      setError(null);
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  const handleGenerate = useCallback(async () => {
    if (!postText.trim()) {
      setError("Kein Post-Text vorhanden. Schreibe zuerst einen Post.");
      return;
    }
    setError(null);
    setImageUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/visual/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText, type, style, aspectRatio }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten.");
        return;
      }

      setImageUrl(data.image);
      if (onImageGenerated) onImageGenerated(data.image);
    } catch {
      setError("Netzwerkfehler. Bitte pruefe deine Verbindung.");
    } finally {
      setLoading(false);
    }
  }, [postText, type, style, aspectRatio]);

  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `linkedin-visual-${type}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl, type]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-editor-surface border border-editor-border rounded-2xl shadow-2xl shadow-black/40 animate-in overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-editor-text">Visual generieren</h2>
              <p className="text-xs text-editor-muted">Infografik oder Comic zum Post</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-editor-muted hover:text-editor-text hover:bg-editor-surface-hover transition-colors disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4 overflow-y-auto">
          {/* Post-Text Vorschau */}
          <div className="px-3 py-2.5 bg-editor-bg border border-editor-border rounded-lg">
            <div className="text-[10px] font-medium text-editor-muted uppercase tracking-wider mb-1">Post-Text wird verwendet</div>
            <div className="text-xs text-editor-text/70 line-clamp-3 whitespace-pre-wrap">
              {postText.trim() || "Kein Text vorhanden..."}
            </div>
          </div>

          {/* Typ */}
          <div>
            <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
              Typ
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  disabled={loading}
                  className={`
                    px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150
                    ${type === t.id
                      ? "bg-editor-accent/10 text-editor-accent border-editor-accent/30"
                      : "bg-editor-bg text-editor-muted border-editor-border hover:text-editor-text hover:border-editor-muted"
                    }
                    disabled:opacity-50
                  `}
                >
                  {t.id === "infographic" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                      {t.label}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                      </svg>
                      {t.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stil + Ratio nebeneinander */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
                Stil
              </label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                disabled={loading}
                className={selectClasses}
              >
                {STYLES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
                Seitenverhaeltnis
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={loading}
                className={selectClasses}
              >
                {RATIOS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generated Image Preview */}
          {imageUrl && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-editor-muted uppercase tracking-wider">Ergebnis</div>
              <div className="relative rounded-lg overflow-hidden border border-editor-border bg-editor-bg">
                <img src={imageUrl} alt="Generiertes Visual" className="w-full h-auto" />
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-2.5 rounded-lg text-sm font-medium border border-editor-border
                           text-editor-text bg-editor-surface hover:bg-editor-surface-hover transition-colors
                           flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Bild herunterladen
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !postText.trim()}
            className={`
              w-full py-3 rounded-xl font-medium text-sm transition-all duration-300
              flex items-center justify-center gap-2
              ${loading
                ? "bg-emerald-500/70 text-white cursor-wait"
                : !postText.trim()
                  ? "bg-editor-surface-hover text-editor-muted cursor-not-allowed border border-editor-border"
                  : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-[0.98]"
              }
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Visual wird generiert...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Visual generieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
