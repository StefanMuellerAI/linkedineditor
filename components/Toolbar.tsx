"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  toBold,
  toItalic,
  removeBold,
  removeItalic,
  isSelectionBold,
  isSelectionItalic,
  stripFormatting,
} from "@/lib/unicode";
import TemplatePicker from "./TemplatePicker";
import { PostTemplate } from "@/lib/templates";

const EmojiPickerPopover = dynamic(() => import("./EmojiPicker"), {
  ssr: false,
});

const AsciiPicker = dynamic(() => import("./AsciiPicker"), {
  ssr: false,
});

interface ToolbarProps {
  activeFieldRef: React.RefObject<HTMLTextAreaElement> | null;
  activeFieldId: string | null;
  onUpdateField: (fieldId: string, value: string) => void;
  fields: Record<string, string>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAIGenerate: () => void;
  onTemplateSelect: (template: PostTemplate) => void;
  hasContent: boolean;
}

export default function Toolbar({
  activeFieldRef,
  activeFieldId,
  onUpdateField,
  fields,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAIGenerate,
  onTemplateSelect,
  hasContent,
}: ToolbarProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAscii, setShowAscii] = useState(false);

  const getSelection = useCallback(() => {
    const el = activeFieldRef?.current;
    if (!el || !activeFieldId) return null;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = fields[activeFieldId] || "";
    return { el, start, end, value, hasSelection: start !== end };
  }, [activeFieldRef, activeFieldId, fields]);

  const applyFormat = useCallback(
    (formatter: (text: string) => string) => {
      const sel = getSelection();
      if (!sel || !activeFieldId) return;
      const { el, start, end, value } = sel;

      if (start === end) return;

      const before = value.slice(0, start);
      const selected = value.slice(start, end);
      const after = value.slice(end);
      const formatted = formatter(selected);
      const newValue = before + formatted + after;

      onUpdateField(activeFieldId, newValue);

      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start + formatted.length);
      });
    },
    [getSelection, activeFieldId, onUpdateField]
  );

  const handleBold = useCallback(() => {
    const sel = getSelection();
    if (!sel || !sel.hasSelection) return;
    const selected = sel.value.slice(sel.start, sel.end);
    if (isSelectionBold(selected)) {
      applyFormat(removeBold);
    } else {
      applyFormat(toBold);
    }
  }, [getSelection, applyFormat]);

  const handleItalic = useCallback(() => {
    const sel = getSelection();
    if (!sel || !sel.hasSelection) return;
    const selected = sel.value.slice(sel.start, sel.end);
    if (isSelectionItalic(selected)) {
      applyFormat(removeItalic);
    } else {
      applyFormat(toItalic);
    }
  }, [getSelection, applyFormat]);

  const handleStrip = useCallback(() => {
    const sel = getSelection();
    if (!sel || !sel.hasSelection) return;
    applyFormat(stripFormatting);
  }, [getSelection, applyFormat]);

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = activeFieldRef?.current;
      if (!el || !activeFieldId) return;
      const value = fields[activeFieldId] || "";
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = value.slice(0, start) + text + value.slice(end);
      onUpdateField(activeFieldId, newValue);
      const newPos = start + text.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      });
    },
    [activeFieldRef, activeFieldId, onUpdateField, fields]
  );

  const handleEmojiSelect = useCallback(
    (emoji: { native: string }) => {
      insertAtCursor(emoji.native);
      setShowEmoji(false);
    },
    [insertAtCursor]
  );

  const handleAsciiSelect = useCallback(
    (char: string) => {
      insertAtCursor(char);
    },
    [insertAtCursor]
  );

  const noField = !activeFieldId;

  return (
    <div className="relative flex items-center gap-1 px-3 py-2 bg-editor-surface border border-editor-border rounded-xl">
      <TemplatePicker onSelect={onTemplateSelect} hasContent={hasContent} />

      <div className="w-px h-5 bg-editor-border mx-1" />

      <ToolbarButton
        onClick={onUndo}
        disabled={!canUndo}
        title="Rückgängig (Ctrl+Z)"
        ariaLabel="Undo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 105.64-12.36L1 10" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={onRedo}
        disabled={!canRedo}
        title="Wiederholen (Ctrl+Shift+Z)"
        ariaLabel="Redo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 11-5.64-12.36L23 10" />
        </svg>
      </ToolbarButton>

      <div className="w-px h-5 bg-editor-border mx-1" />

      <ToolbarButton
        onClick={handleBold}
        disabled={noField}
        title="Fett (Text markieren)"
        ariaLabel="Bold"
      >
        <span className="font-bold text-sm">B</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={handleItalic}
        disabled={noField}
        title="Kursiv (Text markieren)"
        ariaLabel="Italic"
      >
        <span className="italic text-sm font-serif">I</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={handleStrip}
        disabled={noField}
        title="Formatierung entfernen & Emojis löschen (Text markieren)"
        ariaLabel="Strip Formatting"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0l4 4c.8.8.8 2 0 2.8L12 18" />
          <path d="M7 20l-4-4" />
        </svg>
      </ToolbarButton>

      <div className="w-px h-5 bg-editor-border mx-1" />

      <ToolbarButton
        onClick={() => setShowEmoji(!showEmoji)}
        disabled={noField}
        title="Emoji einfügen"
        ariaLabel="Emoji Picker"
        active={showEmoji}
      >
        <span className="text-sm">😀</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => setShowAscii(!showAscii)}
        disabled={noField}
        title="Sonderzeichen einfügen"
        ariaLabel="ASCII Picker"
        active={showAscii}
      >
        <span className="text-sm">✦</span>
      </ToolbarButton>

      <div className="w-px h-5 bg-editor-border mx-1" />

      <ToolbarButton
        onClick={onAIGenerate}
        disabled={false}
        title="KI-Generierung"
        ariaLabel="KI generieren"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
        </svg>
      </ToolbarButton>

      {!noField && (
        <span className="ml-auto text-xs text-editor-muted hidden sm:inline">
          Text markieren, dann formatieren
        </span>
      )}
      {noField && (
        <span className="ml-auto text-xs text-editor-muted hidden sm:inline">
          Klicke in ein Feld zum Starten
        </span>
      )}

      {showEmoji && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div
            className="fixed inset-0"
            onClick={() => setShowEmoji(false)}
          />
          <div className="relative">
            <EmojiPickerPopover onSelect={handleEmojiSelect} />
          </div>
        </div>
      )}

      {showAscii && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div
            className="fixed inset-0"
            onClick={() => setShowAscii(false)}
          />
          <div className="relative">
            <AsciiPicker
              onSelect={handleAsciiSelect}
              onClose={() => setShowAscii(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  title,
  ariaLabel,
  active,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  title: string;
  ariaLabel: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={`
        w-9 h-9 flex items-center justify-center rounded-lg
        transition-all duration-150
        ${disabled
          ? "opacity-30 cursor-not-allowed"
          : active
            ? "bg-editor-accent text-editor-accent-foreground"
            : "text-editor-text hover:bg-editor-surface-hover active:scale-95"
        }
      `}
    >
      {children}
    </button>
  );
}
