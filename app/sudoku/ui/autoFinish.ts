import { soleDigit, valueAt, type Mask } from "../engine/candidates";
import { CELLS } from "../engine/grid";
import type { Board, Digit, Idx, Puzzle } from "../engine/types";

/**
 * How few empty cells left counts as "the mop-up" rather than "the puzzle".
 * A named, commented constant because this is exactly the number a player's
 * feedback session retunes — start conservative and widen it once the trigger
 * has been felt in play.
 */
export const AUTO_FINISH_MAX = 5;

export interface AutoFinishPlacement {
  cell: Idx;
  digit: Digit;
}

/**
 * The placements that would complete the board, or null if the position does
 * not qualify.
 *
 * All three conditions are load-bearing:
 *
 * - At most AUTO_FINISH_MAX empty cells remain — few enough that finishing
 *   them is bookkeeping, not deduction.
 * - Every one of those cells has exactly one candidate. One cell with a real
 *   choice left is one decision the player has not made, and the game must
 *   not make it for them.
 * - No wrong entry sits on the board. Candidates are computed from the merged
 *   grid, wrong entries included, so a mistake corrupts what "exactly one
 *   candidate" means for every cell that sees it — the same trap `showHint`
 *   guards against by reasoning from the solution instead of the raw board.
 *   Once this holds, "exactly one candidate" *is* the solution digit: every
 *   filled cell already agrees with the solution, so peer elimination can
 *   never strip the true digit out of an empty cell's mask, and a mask down
 *   to one bit has nowhere else for that bit to be.
 */
export function autoFinishable(board: Board, candidates: Mask[]): AutoFinishPlacement[] | null {
  const empties: Idx[] = [];
  for (let i = 0; i < CELLS; i++) {
    const value = valueAt(board, i);
    if (value === 0) {
      empties.push(i);
      continue;
    }
    if (value !== board.puzzle.solution[i]) return null;
  }

  if (empties.length === 0 || empties.length > AUTO_FINISH_MAX) return null;

  const placements: AutoFinishPlacement[] = [];
  for (const cell of empties) {
    const digit = soleDigit(candidates[cell]);
    if (digit === null) return null;
    placements.push({ cell, digit });
  }
  return placements;
}

/**
 * Whether auto-finish should act on this board right now: `autoFinishable`'s
 * placement decision, gated to fire at most once per dealt puzzle.
 *
 * Without this gate, undo accomplishes nothing at the one moment it is used
 * here. Reverting an auto-finish's placements lands the board back in the
 * exact state that qualified it, and a trigger that only reads board state
 * would fire again immediately — silently discarding the intent behind the
 * press. The player asked for that board back; "nothing is left to work out"
 * being still true is exactly why undo has to win, not a reason to override
 * it.
 *
 * `firedFor` is the puzzle auto-finish has already completed, or null —
 * typically a ref the caller owns, the same pattern `recordedPuzzleRef`
 * already uses for solve-stats idempotency. Compared by reference rather
 * than value: `puzzleFor` returns a fresh `Puzzle` on every deal and every
 * restore, so this only ever suppresses a re-fire on the exact same dealt
 * puzzle — a new deal is always live, and the guard clears itself for free
 * without needing an explicit reset.
 */
export function autoFinishTrigger(
  board: Board,
  candidates: Mask[],
  firedFor: Puzzle | null,
): AutoFinishPlacement[] | null {
  if (firedFor === board.puzzle) return null;
  return autoFinishable(board, candidates);
}
