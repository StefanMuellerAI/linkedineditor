"use client";

import React, { useState, useCallback, useEffect } from "react";
import Toolbar from "./Toolbar";
import TextField from "./TextField";
import Preview from "./Preview";
import CharCount from "./CharCount";
import ThemeToggle from "./ThemeToggle";
import TemplatePicker from "./TemplatePicker";
import { useHistory, EditorState } from "@/lib/useHistory";
import { PostTemplate } from "@/lib/templates";

export default function Editor() {
  const { state, canUndo, canRedo, setField, setAll, undo, redo } = useHistory();
  const { hook, content, cta } = state;

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldRef, setActiveFieldRef] =
    useState<React.RefObject<HTMLTextAreaElement> | null>(null);

  const fields: Record<string, string> = { hook, content, cta };

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
          {/* Template Picker + Toolbar */}
          <div className="flex items-center gap-3">
            <TemplatePicker onSelect={handleTemplateSelect} hasContent={hasContent} />
          </div>
          <Toolbar
            activeFieldRef={activeFieldRef}
            activeFieldId={activeFieldId}
            onUpdateField={handleFieldUpdate}
            fields={fields}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
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
            <CharCount hook={hook} content={content} cta={cta} />
          </div>
        </div>

        {/* Preview Side */}
        <div className="lg:w-[380px] xl:w-[420px] shrink-0">
          <div className="lg:sticky lg:top-6">
            <Preview hook={hook} content={content} cta={cta} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 mt-12 border-t border-editor-border/30">
        <p className="text-xs text-editor-muted/50">
          LinkedIn Post Editor · Unicode-formatiert · Bereit für LinkedIn
        </p>
      </footer>
    </div>
  );
}
