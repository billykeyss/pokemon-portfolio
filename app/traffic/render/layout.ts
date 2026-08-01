export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  /** Top-left of the playfield. */
  originX: number;
  originY: number;
  cell: number;
  size: number;
  /** Width of the wall drawn around the board. */
  wall: number;
  exitRow: number;
}

/** Wall thickness as a fraction of a cell. */
const WALL_RATIO = 0.16;
/** Fraction of the canvas the board may occupy, leaving room for the exit lane. */
const BOARD_FRACTION = 0.86;

/**
 * Square board, centred, with room reserved on the right for the exit lane the
 * winning car drives through. Pure — no canvas — so it can be asserted on.
 */
export function layoutBoard(
  size: number,
  exitRow: number,
  canvasW: number,
  canvasH: number,
): Layout {
  const available = Math.min(canvasW, canvasH) * BOARD_FRACTION;
  const cell = Math.max(1, Math.floor(available / size));
  const board = cell * size;

  return {
    originX: Math.round((canvasW - board) / 2),
    originY: Math.round((canvasH - board) / 2),
    cell,
    size,
    wall: Math.max(2, Math.round(cell * WALL_RATIO)),
    exitRow,
  };
}

/** Pixel rect of a single grid cell. */
export function cellRect(layout: Layout, row: number, col: number): Rect {
  return {
    x: layout.originX + col * layout.cell,
    y: layout.originY + row * layout.cell,
    w: layout.cell,
    h: layout.cell,
  };
}

/**
 * Pixel rect a vehicle covers. `offset` shifts it along its own axis in cells,
 * which is how a mid-slide or driving-out vehicle is placed.
 */
export function vehicleRect(
  layout: Layout,
  vehicle: { row: number; col: number; len: number; horizontal: boolean },
  offset = 0,
): Rect {
  const row = vehicle.horizontal ? vehicle.row : vehicle.row + offset;
  const col = vehicle.horizontal ? vehicle.col + offset : vehicle.col;

  return {
    x: layout.originX + col * layout.cell,
    y: layout.originY + row * layout.cell,
    w: layout.cell * (vehicle.horizontal ? vehicle.len : 1),
    h: layout.cell * (vehicle.horizontal ? 1 : vehicle.len),
  };
}

/** Grid cell under a point, or null if the point is off the board. */
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
