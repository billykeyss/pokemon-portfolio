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
}

export const PLAYER_ID = 0;
