import { CELLS, rowOf } from "../engine/grid";
import type { Digit, Idx } from "../engine/types";

/**
 * What a keypress means, decided without reference to the board.
 *
 * Lifted out of the page's keydown listener so the two rules that are easy to
 * get wrong — which key redoes, and where an arrow lands — can be tested
 * without a React harness. Everything that needs board state (is a cell
 * selected? is a digit armed?) stays at the call site.
 */
export type KeyAction =
  | { kind: "digit"; digit: Digit }
  | { kind: "erase" }
  | { kind: "undo" }
  | { kind: "redo" }
  | { kind: "dismiss" }
  | { kind: "move"; delta: number };

const STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -9,
  ArrowDown: 9,
};

export function actionForKey(key: string, shiftKey: boolean): KeyAction | null {
  if (key >= "1" && key <= "9") return { kind: "digit", digit: Number(key) as Digit };
  if (key === "Backspace" || key === "Delete") return { kind: "erase" };

  // `KeyboardEvent.key` reports the shifted character, so Shift+U arrives as
  // "U" rather than "u" with shiftKey set. Comparing case-insensitively and
  // branching on shiftKey is what makes plain "u" *and* Caps-Lock "u" (key
  // "U", shiftKey false either way) undo, and only Shift+u (key "U", shiftKey
  // true) redo.
  if (key.toLowerCase() === "u") return { kind: shiftKey ? "redo" : "undo" };

  if (key === "Escape") return { kind: "dismiss" };

  const delta = STEP[key];
  return delta === undefined ? null : { kind: "move", delta };
}

export type KeypadAction =
  | { kind: "place"; cell: Idx; digit: Digit }
  | { kind: "arm"; digit: Digit }
  | { kind: "disarm" };

/**
 * What tapping a keypad digit means, given what is already selected.
 *
 * A selected cell is a stated target, so the tap fills it rather than arming
 * the digit. Arming unconditionally is what made cell-first input — the
 * default the design calls for — cost three taps on a touch screen: pick the
 * cell, tap the digit and watch the selection vanish, then pick the cell
 * again. The keyboard never had this problem because it always placed into
 * the selection; the keypad is now the same input, not a different one.
 */
export function keypadAction(digit: Digit | null, selected: Idx | null): KeypadAction {
  // The Keypad passes null when the armed digit is tapped a second time.
  if (digit === null) return { kind: "disarm" };
  if (selected !== null) return { kind: "place", cell: selected, digit };
  return { kind: "arm", digit };
}

/** Where an arrow step lands, or null when it would leave the grid. */
export function movedIndex(from: Idx, delta: number): Idx | null {
  const next = from + delta;
  if (next < 0 || next >= CELLS) return null;
  // The flat [0, 81) bound alone doesn't stop ArrowRight from a row's last
  // column landing in column 0 of the next row (or ArrowLeft wrapping backward
  // into the row above) — a horizontal step must leave the row unchanged.
  // Vertical steps never change column, so they need no such check.
  if ((delta === -1 || delta === 1) && rowOf(next) !== rowOf(from)) return null;
  return next;
}
