"use client";

import React, { useState, useRef, useCallback } from "react";
import Toolbar from "./Toolbar";
import TextField from "./TextField";
import Preview from "./Preview";
import CharCount from "./CharCount";

export default function Editor() {
  const [hook, setHook] = useState("");
  const [content, setContent] = useState("");
  const [cta, setCta] = useState("");
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeFieldRef, setActiveFieldRef] =
    useState<React.RefObject<HTMLTextAreaElement> | null>(null);

  const fields: Record<string, string> = { hook, content, cta };

  const handleFieldUpdate = useCallback((fieldId: string, value: string) => {
    switch (fieldId) {
      case "hook":
        setHook(value);
        break;
      case "content":
        setContent(value);
        break;
      case "cta":
        setCta(value);
        break;
    }
  }, []);

  const handleFocus = useCallback(
    (fieldId: string, ref: React.RefObject<HTMLTextAreaElement>) => {
      setActiveFieldId(fieldId);
      setActiveFieldRef(ref);
    },
    []
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="text-center mb-8 pt-8 sm:pt-12">
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
          {/* Toolbar */}
          <Toolbar
            activeFieldRef={activeFieldRef}
            activeFieldId={activeFieldId}
            onUpdateField={handleFieldUpdate}
            fields={fields}
          />

          {/* Text Fields */}
          <div className="space-y-4">
            <TextField
              label="Hook"
              sublabel="Der Aufhänger"
              value={hook}
              onChange={setHook}
              fieldId="hook"
              onFocus={handleFocus}
              placeholder="Die erste Zeile, die zum Weiterlesen animiert..."
              minRows={2}
            />
            <TextField
              label="Inhalt"
              sublabel="Die Hauptbotschaft"
              value={content}
              onChange={setContent}
              fieldId="content"
              onFocus={handleFocus}
              placeholder="Der Kern deines Posts..."
              minRows={6}
            />
            <TextField
              label="CTA"
              sublabel="Call to Action"
              value={cta}
              onChange={setCta}
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
