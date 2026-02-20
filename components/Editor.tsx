"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Toolbar from "./Toolbar";
import TextField from "./TextField";
import Preview from "./Preview";
import CharCount from "./CharCount";
import ThemeToggle from "./ThemeToggle";
import { PostTemplate } from "@/lib/templates";
import { useHistory, EditorState } from "@/lib/useHistory";

const AIGenerator = dynamic(() => import("./AIGenerator"), { ssr: false });
const VisualGenerator = dynamic(() => import("./VisualGenerator"), { ssr: false });

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
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");

  const fields = useMemo<Record<string, string>>(() => ({ hook, content, cta }), [hook, content, cta]);

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
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      {/* Header */}
      <header className="mb-6 sm:mb-8 pt-6 sm:pt-12">
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-0 sm:block">
          <div className="text-left sm:text-center">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-editor-text mb-2">
              LinkedIn Post Editor
            </h1>
            <p className="text-editor-muted text-sm sm:text-base max-w-lg sm:mx-auto">
              Verfasse, formatiere und kopiere deinen LinkedIn Post.
              <br className="hidden sm:block" />
              Unicode-Formatierung, die direkt in LinkedIn funktioniert.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="lg:hidden mb-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-editor-surface border border-editor-border p-1">
          <button
            onClick={() => setMobileView("edit")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mobileView === "edit"
                ? "bg-editor-accent text-editor-accent-foreground"
                : "text-editor-muted"
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setMobileView("preview")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              mobileView === "preview"
                ? "bg-editor-accent text-editor-accent-foreground"
                : "text-editor-muted"
            }`}
          >
            Vorschau
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Editor Side */}
        <div className={`flex-1 min-w-0 space-y-4 ${mobileView === "preview" ? "hidden lg:block" : ""}`}>
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
            onTemplateSelect={handleTemplateSelect}
            hasContent={hasContent}
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
              onImport={(data) => setAll(data)}
            />
          </div>
        </div>

        {/* Preview Side */}
        <div className={`lg:w-[380px] xl:w-[420px] shrink-0 ${mobileView === "edit" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-6">
            <Preview
              hook={hook}
              content={content}
              cta={cta}
              visualUrl={generatedVisual}
              onRemoveVisual={() => setGeneratedVisual(null)}
            />
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
