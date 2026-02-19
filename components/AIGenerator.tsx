"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { TEMPLATES } from "@/lib/templates";
import { TONE_OPTIONS } from "@/lib/prompts";

interface AIGeneratorProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (result: { hook: string; content: string; cta: string }) => void;
}

const USABLE_TEMPLATES = TEMPLATES.filter((t) => t.id !== "empty");

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const selectClasses = `w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2.5
  text-sm text-editor-text
  focus:border-editor-accent focus:ring-1 focus:ring-editor-accent/30 outline-none
  disabled:opacity-50 transition-colors appearance-none
  bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238888AA%22%20stroke-width%3D%222.5%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')]
  bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8`;

export default function AIGenerator({ open, onClose, onGenerate }: AIGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [templateId, setTemplateId] = useState(USABLE_TEMPLATES[0]?.id || "aida");
  const [addressMode, setAddressMode] = useState<"du" | "sie">("du");
  const [perspective, setPerspective] = useState<"ich" | "leser">("ich");
  const [tone, setTone] = useState("professionell");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const recordingBaseTopicRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognition));

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, loading, onClose]);

  useEffect(() => {
    if (!open && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      setIsRecording(false);
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    setError(null);
    const ext = f.name.split(".").pop()?.toLowerCase();
    const allowed = ["txt", "md", "pdf", "docx"];
    if (!allowed.includes(ext || "")) {
      setError("Nicht unterstuetzter Dateityp. Erlaubt: .txt, .md, .pdf, .docx");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Datei ist zu gross (max 5 MB).");
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Bitte gib ein Thema an.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("topic", topic.trim());
      formData.append("templateId", templateId);
      formData.append("addressMode", addressMode);
      formData.append("perspective", perspective);
      formData.append("tone", tone);
      if (file) formData.append("file", file);

      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten.");
        return;
      }

      onGenerate({ hook: data.hook, content: data.content, cta: data.cta });
      setTopic("");
      setFile(null);
      onClose();
    } catch {
      setError("Netzwerkfehler. Bitte pruefe deine Verbindung.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!speechSupported || loading) return;

    if (isRecording && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Sprachaufnahme wird auf diesem Geraet/Browser nicht unterstuetzt.");
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "de-DE";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setError(null);
      recordingBaseTopicRef.current = topic.trim();
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let sessionTranscript = "";

      for (let i = 0; i < event.results.length; i += 1) {
        const transcriptPart = event.results[i][0]?.transcript || "";
        sessionTranscript += transcriptPart;
      }

      const cleanSessionTranscript = sessionTranscript.trim();
      const baseTopic = recordingBaseTopicRef.current;

      if (!cleanSessionTranscript) {
        setTopic(baseTopic);
        return;
      }

      setTopic(baseTopic ? `${baseTopic} ${cleanSessionTranscript}`.trim() : cleanSessionTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("Kein Mikrofonzugriff. Bitte Browser-Berechtigung aktivieren.");
      } else if (event.error !== "aborted") {
        setError("Sprachaufnahme fehlgeschlagen. Bitte erneut versuchen.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      speechRecognitionRef.current = null;
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

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
            <div className="w-8 h-8 rounded-lg bg-editor-accent/20 flex items-center justify-center shadow-sm shadow-editor-accent/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-editor-accent">
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-editor-text">KI-Generierung</h2>
              <p className="text-xs text-editor-muted">Post automatisch erstellen lassen</p>
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
          {/* Topic */}
          <div>
            <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
              Thema *
            </label>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-editor-muted/80">Du kannst dein Thema auch einsprechen.</span>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={!speechSupported || loading}
                className={`
                  inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors
                  ${isRecording
                    ? "border-red-400/60 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                    : "border-editor-border bg-editor-bg text-editor-text hover:bg-editor-surface-hover"
                  }
                  ${(!speechSupported || loading) ? "cursor-not-allowed opacity-50" : ""}
                `}
              >
                <span className={`h-2 w-2 rounded-full ${isRecording ? "bg-red-400 animate-pulse" : "bg-editor-muted"}`} />
                {isRecording ? "Aufnahme stoppen" : "Thema einsprechen"}
              </button>
            </div>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Worüber soll der Post handeln? Z.B.: Remote Work Produktivität, KI im Marketing, Meine Karriere-Lektion..."
              rows={3}
              disabled={loading}
              className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2.5
                         text-sm text-editor-text placeholder:text-editor-muted/50
                         focus:border-editor-accent focus:ring-1 focus:ring-editor-accent/30 outline-none
                         resize-none disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Perspektive + Anrede + Tonalitaet */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
                Perspektive
              </label>
              <select
                value={perspective}
                onChange={(e) => setPerspective(e.target.value as "ich" | "leser")}
                disabled={loading}
                className={selectClasses}
              >
                <option value="ich">Ich-Perspektive</option>
                <option value="leser">Leser ansprechen</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
                Anrede
              </label>
              <select
                value={addressMode}
                onChange={(e) => setAddressMode(e.target.value as "du" | "sie")}
                disabled={loading}
                className={selectClasses}
              >
                <option value="du">Du (informell)</option>
                <option value="sie">Sie (formell)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
                Tonalität
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={loading}
                className={selectClasses}
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
              Dokument (optional)
            </label>
            {file ? (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-editor-bg border border-editor-border rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-editor-accent shrink-0">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-editor-text truncate">{file.name}</div>
                  <div className="text-xs text-editor-muted">{formatFileSize(file.size)}</div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  disabled={loading}
                  className="w-6 h-6 flex items-center justify-center rounded text-editor-muted hover:text-red-400 transition-colors disabled:opacity-30"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  flex flex-col items-center gap-1.5 px-4 py-4 rounded-lg border-2 border-dashed cursor-pointer
                  transition-colors text-center
                  ${dragOver
                    ? "border-editor-accent bg-editor-accent/5"
                    : "border-editor-border hover:border-editor-muted bg-editor-bg"
                  }
                  ${loading ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-editor-muted">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-xs text-editor-muted">
                  Datei hierher ziehen oder <span className="text-editor-accent">durchsuchen</span>
                </span>
                <span className="text-[10px] text-editor-muted/60">.txt, .md, .pdf (max 20 Seiten), .docx -- max 5 MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,.docx"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-medium text-editor-muted uppercase tracking-wider mb-1.5">
              Vorlage
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={loading}
              className={selectClasses}
            >
              {USABLE_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.icon} {tpl.name} — {tpl.description}
                </option>
              ))}
            </select>
          </div>

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

        </div>

        {/* Generate Button -- fixed at bottom */}
        <div className="px-5 pb-5 pt-3 shrink-0 border-t border-editor-border/50">
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className={`
              w-full py-3 rounded-xl font-medium text-sm transition-all duration-300
              flex items-center justify-center gap-2
              ${loading
                ? "bg-editor-accent/75 text-editor-accent-foreground cursor-wait"
                : !topic.trim()
                  ? "bg-editor-bg text-editor-muted cursor-not-allowed border border-editor-border"
                  : "bg-editor-accent text-editor-accent-foreground hover:bg-editor-accent-hover shadow-lg shadow-editor-accent/30 hover:shadow-editor-accent/50 active:scale-[0.98]"
              }
            `}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Post wird generiert...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
                </svg>
                Post generieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
