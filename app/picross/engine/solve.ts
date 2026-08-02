import { solveLine } from "./line";
import { UNKNOWN, type Board, type Puzzle } from "./types";

export type SolveStatus = "solved" | "stalled" | "contradiction";

export interface SolveResult {
  status: SolveStatus;
  /** What deduction alone establishes. Unknown cells needed a guess. */
  board: Board;
  passes: number;
}

export function solve(puzzle: Puzzle): SolveResult {
  const { size } = puzzle;

  /**
   * Bounded by the cell count, not by a round number.
   *
   * A pass that changes nothing ends the loop, so every pass that continues has
   * determined at least one cell — which bounds the useful passes by how many
   * cells exist. A fixed 200 was below the 225 cells of the 15x15 tier this
   * game ships, so a puzzle still making progress could be cut short and
   * reported stalled: a fair picture wrongly failing the fairness gate.
   */
  const maxPasses = size * size + 1;

  const board: Board = new Uint8Array(size * size);
  const buffer = new Uint8Array(size);

  let passes = 0;

  for (; passes < maxPasses; passes++) {
    let changed = 0;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) buffer[col] = board[row * size + col];

      const result = solveLine(buffer, puzzle.rowClues[row]);
      if (result.status === "contradiction") {
        return { status: "contradiction", board, passes };
      }
      for (let col = 0; col < size; col++) board[row * size + col] = result.line[col];
      changed += result.changed;
    }

    for (let col = 0; col < size; col++) {
      for (let row = 0; row < size; row++) buffer[row] = board[row * size + col];

      const result = solveLine(buffer, puzzle.colClues[col]);
      if (result.status === "contradiction") {
        return { status: "contradiction", board, passes };
      }
      for (let row = 0; row < size; row++) board[row * size + col] = result.line[row];
      changed += result.changed;
    }

    if (changed === 0) break;
  }

  const complete = !board.some((cell) => cell === UNKNOWN);
  return { status: complete ? "solved" : "stalled", board, passes };
}

/**
 * The bar every shipped puzzle must clear.
 *
 * Stronger than having a unique solution: a puzzle can be uniquely solvable and
 * still stall a player into a coin flip, because reaching that solution needs
 * reasoning deeper than any one line provides. Line-solvability is the promise
 * that at every point, some line has something forced.
 */
export function isLineSolvable(puzzle: Puzzle): boolean {
  return solve(puzzle).status === "solved";
}
