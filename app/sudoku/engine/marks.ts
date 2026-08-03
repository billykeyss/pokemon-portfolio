import { bit, hasDigit, type Mask } from "./candidates";
import { CELLS } from "./grid";
import type { Digit, Idx } from "./types";

/**
 * One struck-candidate bitmask per cell, indexed exactly like a Grid.
 *
 * This is a display annotation the player writes by hand, not board truth:
 * nothing here ever reaches `nextDeduction`, `hardestRank`, generation or the
 * solved check, all of which keep reasoning over the real candidate set no
 * matter what has been struck. A player who strikes wrongly gets a cluttered
 * board, never a broken hint or an unfinishable puzzle. Keeping `Marks` out
 * of `Board` entirely is what makes that a structural guarantee rather than a
 * discipline someone could forget: no engine function even has a parameter a
 * mark could travel through.
 */
export type Marks = readonly Mask[];

export const emptyMarks = (): Marks => new Array(CELLS).fill(0) as Mask[];

/** Set or clear one digit's strike in one cell, to a known target state. */
export function setStrike(marks: Marks, index: Idx, digit: Digit, struck: boolean): Marks {
  const out = [...marks];
  out[index] = struck ? marks[index] | bit(digit) : marks[index] & ~bit(digit);
  return out;
}

export interface StrikeResult {
  marks: Marks;
  before: boolean;
  after: boolean;
}

/**
 * Toggle one digit's strike in one cell, guarded to only ever strike within
 * the current candidate set. A strike on a digit the board no longer offers
 * is moot — there is nothing on screen to strike or to un-strike — and
 * putting the guard here means every caller (the keypad in mark mode, and
 * the Shift+digit shortcut) gets it for free instead of each having to
 * remember it separately.
 *
 * Returns null when the toggle is refused, so a caller can tell "nothing
 * happened" apart from "the digit is now unstruck" without inspecting masks.
 */
export function toggleStrike(
  marks: Marks,
  index: Idx,
  digit: Digit,
  candidates: Mask,
): StrikeResult | null {
  if (!hasDigit(candidates, digit)) return null;
  const before = hasDigit(marks[index], digit);
  const after = !before;
  return { marks: setStrike(marks, index, digit, after), before, after };
}

/**
 * The strikes actually worth drawing: a mark on a digit that has since
 * fallen out of the candidate set (a peer claimed it) is moot rather than
 * deleted. Deleting it would be indistinguishable from the player having
 * un-struck it themselves, and this way the mark comes back on its own if
 * the candidate ever does — undoing the placement that claimed it, say.
 * Applying the filter once here, rather than at every render site, is what
 * keeps that rule in one place.
 */
export function visibleMarks(mark: Mask, candidates: Mask): Mask {
  return mark & candidates;
}
