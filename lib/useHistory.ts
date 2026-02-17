"use client";

import { useReducer, useCallback, useRef } from "react";

export interface EditorState {
  hook: string;
  content: string;
  cta: string;
}

interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
}

type HistoryAction =
  | { type: "SET_FIELD"; field: keyof EditorState; value: string }
  | { type: "SET_ALL"; state: EditorState }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "COMMIT" };

const MAX_HISTORY = 50;

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "SET_FIELD": {
      const newPresent = { ...state.present, [action.field]: action.value };
      return { ...state, present: newPresent };
    }
    case "SET_ALL": {
      return { ...state, present: action.state };
    }
    case "COMMIT": {
      const past = [...state.past, state.present].slice(-MAX_HISTORY);
      return { ...state, past, future: [] };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }
    default:
      return state;
  }
}

const INITIAL_STATE: EditorState = { hook: "", content: "", cta: "" };

export function useHistory() {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: INITIAL_STATE,
    future: [],
  });

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastField = useRef<string | null>(null);

  const setField = useCallback((field: keyof EditorState, value: string) => {
    if (lastField.current !== field) {
      dispatch({ type: "COMMIT" });
      lastField.current = field;
    } else {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    }
    dispatch({ type: "SET_FIELD", field, value });
    commitTimer.current = setTimeout(() => {
      dispatch({ type: "COMMIT" });
      lastField.current = null;
    }, 500);
  }, []);

  const setAll = useCallback((newState: EditorState) => {
    dispatch({ type: "COMMIT" });
    dispatch({ type: "SET_ALL", state: newState });
    dispatch({ type: "COMMIT" });
    lastField.current = null;
  }, []);

  const undo = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    dispatch({ type: "UNDO" });
    lastField.current = null;
  }, []);

  const redo = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    dispatch({ type: "REDO" });
    lastField.current = null;
  }, []);

  return {
    state: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    setField,
    setAll,
    undo,
    redo,
  };
}
