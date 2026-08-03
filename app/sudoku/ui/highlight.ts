import { bit, hasDigit, valueAt, type Mask } from "../engine/candidates";
import type { HintHighlight } from "../engine/explain";
import { CELLS, PEERS, cellsOf } from "../engine/grid";
import type { Board, Digit, Idx } from "../engine/types";

/**
 * Flags rather than a single kind.
 *
 * A wrong entry that is also the selected cell is both at once. An enum would
 * force the UI to pick one and silently drop the other, which is exactly the
 * moment the player most needs both.
 */
export interface CellHighlight {
  selected: boolean;
  peer: boolean;
  sameDigit: boolean;
  armedCandidate: boolean;
  wrong: boolean;
  /** The cell is part of the argument the open hint rests on. */
  hint: boolean;
  /** The cell sits inside one of the units the open hint's argument is about. */
  hintUnit: boolean;
  /**
   * The digits the open hint removes from *this* cell, as a nine-bit mask.
   *
   * A hint like locked candidates proves nothing about where a digit goes — it
   * proves where it cannot. Those cells are the conclusion of the sentence the
   * panel prints, so the marks the argument strikes out have to be visible on
   * the board or the explanation is talking about something the player cannot
   * see.
   */
  eliminated: Mask;
}

export interface HighlightInput {
  board: Board;
  candidates: Mask[];
  selected: Idx | null;
  armed: Digit | null;
  hint: HintHighlight | null;
}

const blank = (): CellHighlight => ({
  selected: false,
  peer: false,
  sameDigit: false,
  armedCandidate: false,
  wrong: false,
  hint: false,
  hintUnit: false,
  eliminated: 0,
});

export function highlightMap(input: HighlightInput): CellHighlight[] {
  const { board, candidates, selected, armed, hint } = input;
  const map = Array.from({ length: CELLS }, blank);

  const focusDigit =
    armed ?? (selected === null ? null : (valueAt(board, selected) || null));
  const hintCells = new Set(hint?.cells ?? []);

  const hintUnitCells = new Set<Idx>();
  for (const unit of hint?.units ?? []) for (const i of cellsOf(unit)) hintUnitCells.add(i);

  // Several removals can land on one cell (a naked pair strikes two digits out
  // of the same neighbour), so they accumulate into one mask rather than
  // overwrite.
  const struck = new Array<Mask>(CELLS).fill(0);
  for (const e of hint?.eliminated ?? []) struck[e.cell] |= bit(e.digit);

  for (let i = 0; i < CELLS; i++) {
    const value = valueAt(board, i);
    const isGiven = board.puzzle.givens[i] !== 0;

    map[i].hint = hintCells.has(i);
    map[i].hintUnit = hintUnitCells.has(i);
    map[i].eliminated = struck[i];
    map[i].wrong = !isGiven && value !== 0 && value !== board.puzzle.solution[i];
    map[i].sameDigit = focusDigit !== null && value === focusDigit;
    // Keyed off focusDigit, not armed alone: selecting a cell that already
    // holds a digit is "see all remaining" reached from the board rather than
    // the keypad, and it should light the same cells arming that digit would.
    map[i].armedCandidate =
      focusDigit !== null && value === 0 && hasDigit(candidates[i], focusDigit);
  }

  if (selected !== null) {
    map[selected].selected = true;
    for (const p of PEERS[selected]) map[p].peer = true;
  }

  return map;
}
