"use client";

import React, { useEffect, useRef, useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerPopoverProps {
  onSelect: (emoji: { native: string }) => void;
}

export default function EmojiPickerPopover({ onSelect }: EmojiPickerPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const event = new MouseEvent("click", { bubbles: true });
        document.dispatchEvent(event);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-editor-border animate-in"
    >
      <Picker
        data={data}
        onEmojiSelect={onSelect}
        theme={isDark ? "dark" : "light"}
        previewPosition="none"
        skinTonePosition="search"
        set="native"
        perLine={8}
        maxFrequentRows={2}
        locale="de"
      />
    </div>
  );
}
