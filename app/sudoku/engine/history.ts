import type { Cell, Idx } from "./types";

export interface Change {
  index: Idx;
  before: Cell;
  after: Cell;
}

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
