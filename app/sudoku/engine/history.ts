import type { Cell, Digit, Idx } from "./types";

/**
 * A single undoable step. Placements and strike toggles are different shapes
 * of change — a Cell value versus one digit's struck flag in a cell's mark
 * mask — so this is a discriminated union rather than one shape wide enough
 * for both. `record`, `undo` and `redo` below never look inside a `Change`;
 * they move whichever one they are given, so a new kind only ever costs a
 * variant here, never a rewrite of the stack mechanics.
 */
export type Change =
  | { kind: "place"; index: Idx; before: Cell; after: Cell }
  | { kind: "strike"; index: Idx; digit: Digit; before: boolean; after: boolean };

export interface History {
  past: Change[];
  future: Change[];
}

export const emptyHistory = (): History => ({ past: [], future: [] });

/**
 * Recording a change discards the redo stack. Keeping it would let redo replay
 * a move from a timeline the player has already left.
 */
export function record(h: History, change: Change): History {
  return { past: [...h.past, change], future: [] };
}

export function undo(h: History): { history: History; change: Change } | null {
  const change = h.past[h.past.length - 1];
  if (change === undefined) return null;
  return {
    history: { past: h.past.slice(0, -1), future: [...h.future, change] },
    change,
  };
}

export function redo(h: History): { history: History; change: Change } | null {
  const change = h.future[h.future.length - 1];
  if (change === undefined) return null;
  return {
    history: { past: [...h.past, change], future: h.future.slice(0, -1) },
    change,
  };
}
