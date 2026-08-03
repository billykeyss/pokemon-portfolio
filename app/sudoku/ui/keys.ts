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
  | { kind: "strike"; digit: Digit }
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
  if (key >= "1" && key <= "9") {
    const digit = Number(key) as Digit;
    // Shift+digit strikes a candidate without leaving whatever mode the
    // keypad is in — the shortcut the design calls for "without switching
    // modes". It shares no key with Shift+u (redo): digits and the letter u
    // are different keys entirely, so there is nothing here for that guard
    // to collide with.
    return shiftKey ? { kind: "strike", digit } : { kind: "digit", digit };
  }
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
  | { kind: "strike"; cell: Idx; digit: Digit }
  | { kind: "arm"; digit: Digit }
  | { kind: "disarm" };

/**
 * What tapping a keypad digit means, given what is already selected and
 * whether mark mode is on.
 *
 * A selected cell is a stated target, so the tap fills it rather than arming
 * the digit. Arming unconditionally is what made cell-first input — the
 * default the design calls for — cost three taps on a touch screen: pick the
 * cell, tap the digit and watch the selection vanish, then pick the cell
 * again. The keyboard never had this problem because it always placed into
 * the selection; the keypad is now the same input, not a different one.
 *
 * Mark mode redirects a tap to a strike instead of a placement, but only
 * when there is a cell to strike in — there is no digit-first equivalent of
 * arming that paints strikes across the board, so a tap with nothing
 * selected disarms rather than silently doing nothing productive.
 */
export function keypadAction(
  digit: Digit | null,
  selected: Idx | null,
  markMode: boolean,
): KeypadAction {
  // The Keypad passes null when the armed digit is tapped a second time.
  if (digit === null) return { kind: "disarm" };
  if (markMode) return selected === null ? { kind: "disarm" } : { kind: "strike", cell: selected, digit };
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

/**
 * One line naming what the next tap will do.
 *
 * The board switches input direction implicitly: arm a digit and taps paint it
 * across cells, select a cell and taps fill that one, and mark mode redirects a
 * tap to a strike. Implicit switching is the right behaviour — an explicit mode
 * selector would cost a tap every turn — but with nothing naming the current
 * state the two directions are easy to confuse, and guessing wrong puts a digit
 * in the wrong square.
 *
 * `selected` and `armed` are mutually exclusive by construction: arming clears
 * the selection, and a tap on a cell while armed places rather than selects. So
 * exactly one branch below is ever live.
 */
export function inputStatus(
  selected: Idx | null,
  armed: Digit | null,
  markMode: boolean,
  nameOf: (i: Idx) => string,
): string {
  if (markMode) {
    return selected === null
      ? "Marking — tap a cell first"
      : `Marking ${nameOf(selected)} — tap a number to cross it off`;
  }
  if (armed !== null) return `${armed} armed — tap cells to place it`;
  if (selected !== null) return `${nameOf(selected)} — tap a number to fill it`;
  return "Tap a cell, or a number to arm it";
}
