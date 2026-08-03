export interface Vehicle {
  /** Stable identity. Index 0 is always the player's car. */
  id: number;
  /** Row of the topmost cell. */
  row: number;
  /** Column of the leftmost cell. */
  col: number;
  /** Cells occupied along the vehicle's axis: 2 for a car, 3 for a truck. */
  len: number;
  horizontal: boolean;
  /** Which sprite to draw. Purely cosmetic. */
  kind: number;
}

export interface Board {
  size: number;
  vehicles: Vehicle[];
  /** Row the player's car escapes along, through the right edge. */
  exitRow: number;
}

/** Slide vehicle `id` by `delta` cells along its own axis. */
export interface Move {
  id: number;
  delta: number;
}

export interface LevelParams {
  size: number;
  vehicles: number;
  /** Shortest solution a generated board must require, so levels stay puzzles. */
  minMoves: number;
  /**
   * How many candidate boards to draw before settling for the best one seen.
   *
   * Density tops out at twelve vehicles on a 6x6 — past that the generator
   * cannot place them — so once that cap is reached this is the only dial left
   * that still makes boards harder. Generation keeps the hardest draw it finds,
   * so more draws means a higher expected par, at linear cost.
   */
  attempts?: number;
}

export const PLAYER_ID = 0;

/**
 * Row the player's car escapes along.
 *
 * Lives here rather than beside the generator so both the generator and the
 * placeholder a page shows while a board is building can derive it without the
 * two modules importing each other.
 */
export function exitRowFor(size: number): number {
  return Math.floor(size / 2) - 1;
}
