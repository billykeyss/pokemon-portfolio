import type { Clue, Puzzle } from "../engine/types";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  originX: number;
  originY: number;
  cell: number;
  size: number;
  /** Gutter widths in cells. */
  rowGutter: number;
  colGutter: number;
}

/** Below this a cell is neither readable nor reliably tappable on a phone. */
export const MIN_CELL_PX = 16;

/** Share of the canvas the whole figure may occupy. */
const FRACTION = 0.98;

/**
 * How many clue slots a set of lines actually needs.
 *
 * Sized to the clues present rather than the theoretical worst case. A 15-long
 * line can hold 8 numbers, and reserving all 8 would leave 15px cells on a
 * phone; real pictures need 3 to 5. An empty line still gets one slot, because
 * it renders as "0" rather than as nothing.
 */
export function gutterFor(clues: readonly Clue[]): number {
  let deepest = 1;
  for (const clue of clues) deepest = Math.max(deepest, clue.length);
  return deepest;
}

export function layoutPuzzle(puzzle: Puzzle, canvasW: number, canvasH: number): Layout {
  const rowGutter = gutterFor(puzzle.rowClues);
  const colGutter = gutterFor(puzzle.colClues);

  const across = puzzle.size + rowGutter;
  const down = puzzle.size + colGutter;

  const cell = Math.max(
    1,
    Math.floor(Math.min((canvasW * FRACTION) / across, (canvasH * FRACTION) / down)),
  );

  const figureW = cell * across;
  const figureH = cell * down;

  return {
    originX: Math.round((canvasW - figureW) / 2) + cell * rowGutter,
    originY: Math.round((canvasH - figureH) / 2) + cell * colGutter,
    cell,
    size: puzzle.size,
    rowGutter,
    colGutter,
  };
}

export function cellRect(layout: Layout, row: number, col: number): Rect {
  return {
    x: layout.originX + col * layout.cell,
    y: layout.originY + row * layout.cell,
    w: layout.cell,
    h: layout.cell,
  };
}

/** Grid cell under a point, or null in the gutters and beyond. */
export function cellAt(
  layout: Layout,
  x: number,
  y: number,
): { row: number; col: number } | null {
  const col = Math.floor((x - layout.originX) / layout.cell);
  const row = Math.floor((y - layout.originY) / layout.cell);

  if (row < 0 || col < 0 || row >= layout.size || col >= layout.size) return null;
  return { row, col };
}
