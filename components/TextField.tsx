"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface TextFieldProps {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (value: string) => void;
  fieldId: string;
  onFocus: (fieldId: string, ref: React.RefObject<HTMLTextAreaElement>) => void;
  placeholder?: string;
  minRows?: number;
}

export default function TextField({
  label,
  sublabel,
  value,
  onChange,
  fieldId,
  onFocus,
  placeholder,
  minRows = 3,
}: TextFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    const minHeight = lineHeight * minRows + 24;
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`;
  }, [minRows]);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const notifyFocus = useCallback(() => {
    onFocus(fieldId, textareaRef as React.RefObject<HTMLTextAreaElement>);
  }, [fieldId, onFocus]);

  return (
    <div className="group relative">
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-editor-text tracking-wide uppercase">
          {label}
        </label>
        {sublabel && (
          <span className="text-xs text-editor-muted">{sublabel}</span>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          notifyFocus();
        }}
        onFocus={notifyFocus}
        onClick={notifyFocus}
        placeholder={placeholder}
        rows={minRows}
        spellCheck={false}
        className="w-full bg-editor-surface border border-editor-border rounded-lg px-4 py-3 
                   text-editor-text text-[15px] leading-6 resize-none outline-none
                   transition-all duration-200
                   placeholder:text-editor-muted/50
                   focus:border-editor-accent focus:ring-1 focus:ring-editor-accent/30
                   hover:border-editor-muted/50
                   scrollbar-thin scrollbar-thumb-editor-border scrollbar-track-transparent"
      />
      <div className="absolute bottom-3 right-3 text-xs text-editor-muted/60 pointer-events-none">
        {[...value].length}
      </div>
    </div>
  );
}
