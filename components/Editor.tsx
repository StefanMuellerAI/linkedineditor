"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Toolbar from "./Toolbar";
import TextField from "./TextField";
import Preview from "./Preview";
import CharCount from "./CharCount";
import ThemeToggle from "./ThemeToggle";
import TemplatePicker from "./TemplatePicker";
import AIGenerator from "./AIGenerator";
import VisualGenerator from "./VisualGenerator";
import { useHistory, EditorState } from "@/lib/useHistory";
import { PostTemplate } from "@/lib/templates";

export default function Editor() {
  const { state, canUndo, canRedo, setField, setAll, undo, redo } = useHistory();
  const { hook, content, cta } = state;

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldRef, setActiveFieldRef] =
    useState<React.RefObject<HTMLTextAreaElement> | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showVisualGenerator, setShowVisualGenerator] = useState(false);
  const [visualEnabled, setVisualEnabled] = useState(false);
  const [generatedVisual, setGeneratedVisual] = useState<string | null>(null);

  const fields: Record<string, string> = { hook, content, cta };

  const postText = useMemo(() => {
    const parts = [hook, content, cta].filter((p) => p.trim().length > 0);
    return parts.join("\n\n");
  }, [hook, content, cta]);

  useEffect(() => {
    fetch("/api/visual/check")
      .then((res) => res.json())
      .then((data) => setVisualEnabled(data.enabled === true))
      .catch(() => setVisualEnabled(false));
  }, []);

  const handleFieldUpdate = useCallback(
    (fieldId: string, value: string) => {
      setField(fieldId as keyof EditorState, value);
    },
    [setField]
  );

  const handleFocus = useCallback(
    (fieldId: string, ref: React.RefObject<HTMLTextAreaElement>) => {
      setActiveFieldId(fieldId);
      setActiveFieldRef(ref);
    },
    []
  );

  const handleTemplateSelect = useCallback(
    (template: PostTemplate) => {
      setAll({ hook: template.hook, content: template.content, cta: template.cta });
    },
    [setAll]
  );

  const handleAIGenerate = useCallback(
    (result: { hook: string; content: string; cta: string }) => {
      setAll(result);
    },
    [setAll]
  );

  const hasContent = hook.trim().length > 0 || content.trim().length > 0 || cta.trim().length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="relative text-center mb-8 pt-8 sm:pt-12">
        <div className="absolute right-0 top-8 sm:top-12">
          <ThemeToggle />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-editor-text mb-2">
          LinkedIn Post Editor
        </h1>
        <p className="text-editor-muted text-sm sm:text-base max-w-lg mx-auto">
          Verfasse, formatiere und kopiere deinen LinkedIn Post.
          <br className="hidden sm:block" />
          Unicode-Formatierung, die direkt in LinkedIn funktioniert.
        </p>
      </header>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Editor Side */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Template Picker */}
          <div className="flex items-center gap-3">
            <TemplatePicker onSelect={handleTemplateSelect} hasContent={hasContent} />
          </div>

          {/* Toolbar */}
          <Toolbar
            activeFieldRef={activeFieldRef}
            activeFieldId={activeFieldId}
            onUpdateField={handleFieldUpdate}
            fields={fields}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onAIGenerate={() => setShowAIGenerator(true)}
          />

          {/* Text Fields */}
          <div className="space-y-4">
            <TextField
              label="Hook"
              sublabel="Der Aufhänger"
              value={hook}
              onChange={(v) => setField("hook", v)}
              fieldId="hook"
              onFocus={handleFocus}
              placeholder="Die erste Zeile, die zum Weiterlesen animiert..."
              minRows={2}
            />
            <TextField
              label="Inhalt"
              sublabel="Die Hauptbotschaft"
              value={content}
              onChange={(v) => setField("content", v)}
              fieldId="content"
              onFocus={handleFocus}
              placeholder="Der Kern deines Posts..."
              minRows={6}
            />
            <TextField
              label="CTA"
              sublabel="Call to Action"
              value={cta}
              onChange={(v) => setField("cta", v)}
              fieldId="cta"
              onFocus={handleFocus}
              placeholder="Was soll der Leser als nächstes tun?"
              minRows={2}
            />
          </div>

          {/* Char Count + Copy */}
          <div className="pt-2">
            <CharCount
              hook={hook}
              content={content}
              cta={cta}
              visualEnabled={visualEnabled}
              onVisualGenerate={() => setShowVisualGenerator(true)}
            />
          </div>
        </div>

        {/* Preview Side */}
        <div className="lg:w-[380px] xl:w-[420px] shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Preview hook={hook} content={content} cta={cta} />

            {/* Generated Visual */}
            {generatedVisual && (
              <div className="bg-editor-surface border border-editor-border rounded-xl overflow-hidden animate-in">
                <div className="flex items-center justify-between px-3 pt-3 pb-1">
                  <span className="text-xs font-medium text-editor-muted uppercase tracking-wider">
                    Generiertes Visual
                  </span>
                  <div className="flex items-center gap-1">
                    <a
                      href={generatedVisual}
                      download={`linkedin-visual-${Date.now()}.png`}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-editor-muted hover:text-editor-text hover:bg-editor-surface-hover transition-colors"
                      title="Herunterladen"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                    <button
                      onClick={() => setGeneratedVisual(null)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-editor-muted hover:text-red-400 hover:bg-editor-surface-hover transition-colors"
                      title="Entfernen"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <img
                    src={generatedVisual}
                    alt="Generiertes Visual"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Generator Modal */}
      <AIGenerator
        open={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerate={handleAIGenerate}
      />

      {/* Visual Generator Modal */}
      <VisualGenerator
        open={showVisualGenerator}
        onClose={() => setShowVisualGenerator(false)}
        postText={postText}
        onImageGenerated={setGeneratedVisual}
      />

      {/* Footer */}
      <footer className="text-center py-8 mt-12 border-t border-editor-border/30">
        <p className="text-xs text-editor-muted/50">
          LinkedIn Post Editor · Unicode-formatiert · Bereit für LinkedIn
        </p>
      </footer>
    </div>
  );
}
