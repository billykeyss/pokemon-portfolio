/** Compass index: 0 north, 1 east, 2 south, 3 west. */
export type Dir = 0 | 1 | 2 | 3;

/**
 * Step taken per direction. Row grows downward, so index 2 (south) is +1 on y.
 *
 * Four directions rather than eight: an arrow's body is a run of orthogonal
 * segments, and diagonal bends would read as ambiguous about which cells the
 * track actually covers.
 */
export const DIRS: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export const DIR_COUNT = 4;

export interface Cell {
  row: number;
  col: number;
}

/**
 * One arrow: a winding track of cells with a head at the end.
 *
 * `cells[0]` is the tail and the last entry is the head. Releasing it slides
 * the whole track forward along itself and off the board, so the body is only
 * ever an obstacle to *other* arrows — what decides whether this one can leave
 * is the run of cells beyond its head.
 */
export interface Arrow {
  /** Stable identity; never reused within a board. */
  id: number;
  cells: Cell[];
  /** Where the head points, which is the direction of its final segment. */
  dir: Dir;
  /**
   * A head on the tail as well, so the arrow can leave either way.
   *
   * Two exits is not simply two chances — with sliding, the direction you send
   * it is a decision, because the two choices leave it blocking different
   * cells. An arrow that could have gone either way and went the wrong way is
   * the mistake this makes available.
   */
  twoWay?: boolean;
  /** Palette index, purely cosmetic. */
  hue: number;
}

export interface Board {
  size: number;
  arrows: Arrow[];
}

/** Which end of a two-way arrow leads. Single-ended arrows always lead "head". */
export type End = "head" | "tail";

/** Move the arrow with this id, leading with the given end. */
export interface Move {
  id: number;
  end?: End;
}

export interface LevelParams {
  size: number;
  /** Longest track an arrow may be grown to, in cells. */
  maxLength: number;
  /**
   * Share of the board to cover with track.
   *
   * Packing is what makes the board read as a maze rather than as scattered
   * pieces, and it is also the honest way to size a level: tracks vary in
   * length, so asking for a number of arrows asks for an unknown amount of
   * board. Filling to a fraction says what it means.
   */
  fillTarget: number;
  /**
   * Upper bound on how many arrows may be releasable at any point during the
   * solve, as a fraction of those left. Lower means a tighter board — fewer
   * candidates to spot, which is the whole of the difficulty here.
   */
  maxFreeRatio: number;
  /**
   * Share of arrows given a second head.
   *
   * Applied before the tightness bar is measured, not after: a two-way arrow
   * has two chances to be releasable, so promoting a board after gating it
   * would hand the player something looser than the bar it passed.
   */
  twoWayShare: number;
}

export function headOf(arrow: Arrow): Cell {
  return arrow.cells[arrow.cells.length - 1];
}
