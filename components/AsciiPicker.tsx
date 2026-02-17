"use client";

import React, { useState } from "react";
import { ASCII_CATEGORIES } from "@/lib/constants";

interface AsciiPickerProps {
  onSelect: (char: string) => void;
  onClose: () => void;
}

export default function AsciiPicker({ onSelect, onClose }: AsciiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="w-[340px] bg-editor-surface border border-editor-border rounded-xl shadow-2xl shadow-black/40 animate-in overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-xs font-medium text-editor-muted uppercase tracking-wider">
          Sonderzeichen
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-editor-muted hover:text-editor-text hover:bg-editor-surface-hover transition-colors"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-none">
        {ASCII_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            title={cat.name}
            className={`
              shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-sm
              transition-all duration-150
              ${i === activeCategory
                ? "bg-editor-accent text-white"
                : "text-editor-muted hover:bg-editor-surface-hover hover:text-editor-text"
              }
            `}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      <div className="px-3 pb-2">
        <div className="text-xs text-editor-muted mb-2">
          {ASCII_CATEGORIES[activeCategory].name}
        </div>
        <div className="grid grid-cols-10 gap-1">
          {ASCII_CATEGORIES[activeCategory].chars.map((char, i) => (
            <button
              key={`${char}-${i}`}
              onClick={() => onSelect(char)}
              title={`${char} einfügen`}
              className="w-8 h-8 flex items-center justify-center rounded-md text-base
                         text-editor-text hover:bg-editor-accent hover:text-white
                         transition-all duration-100 active:scale-90"
            >
              {char}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
