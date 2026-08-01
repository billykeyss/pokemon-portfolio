/** A bottle's contents, bottom-first. Values are indices into PALETTE. */
export type Bottle = number[];

export interface Puzzle {
  bottles: Bottle[];
  /** Units a bottle holds when full. */
  capacity: number;
  /** Distinct colours in play. Each contributes exactly `capacity` units. */
  colors: number;
}

export interface Move {
  from: number;
  to: number;
}

export interface LevelParams {
  colors: number;
  /** Empty bottles beyond the one-per-colour minimum. */
  free: number;
  capacity: number;
}
