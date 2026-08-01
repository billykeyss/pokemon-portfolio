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
}

/** Share of the shorter canvas dimension the board may occupy. */
const BOARD_FRACTION = 0.94;

/**
 * A square board, centred, sized to whichever canvas dimension binds.
 *
 * Arrows fly outward past the edge, so the board deliberately stops short of
 * filling the canvas — the margin is where a released arrow is still visible on
 * its way out. Pure — no canvas — so it can be asserted on.
 */
export function layoutBoard(size: number, canvasW: number, canvasH: number): Layout {
  const available = Math.min(canvasW, canvasH) * BOARD_FRACTION;
  const cell = Math.max(1, Math.floor(available / Math.max(1, size)));
  const board = cell * size;

  return {
    originX: Math.round((canvasW - board) / 2),
    originY: Math.round((canvasH - board) / 2),
    cell,
    size,
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

/**
 * Grid cell under a point, or null off the board.
 *
 * Unlike the other games this does not pad the hit box outward. Tapping the
 * wrong arrow costs a heart, so a generous target that reaches into a
 * neighbour's cell would spend the player's mistakes for them.
 */
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
