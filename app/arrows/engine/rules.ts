import { DIRS, headOf, type Arrow, type Board, type Cell, type Move } from "./types";

export function cloneBoard(board: Board): Board {
  return {
    ...board,
    arrows: board.arrows.map((a) => ({ ...a, cells: a.cells.map((c) => ({ ...c })) })),
  };
}

export function arrowById(board: Board, id: number): Arrow | undefined {
  return board.arrows.find((a) => a.id === id);
}

/**
 * Grid of arrow ids, -1 where empty.
 *
 * Every cell of a track is marked, not just its head: an arrow's whole body is
 * what stands in other arrows' way.
 */
export function occupancy(board: Board): Int16Array {
  const grid = new Int16Array(board.size * board.size).fill(-1);
  for (const a of board.arrows) {
    for (const c of a.cells) grid[c.row * board.size + c.col] = a.id;
  }
  return grid;
}

/**
 * The cells an arrow must pass through to leave, beyond its own head.
 *
 * Its own track is not included. The body slides along the route the head has
 * already taken, so the only thing that can stop it is what lies past the head.
 */
export function exitPath(board: Board, arrow: Arrow): Cell[] {
  const { dx, dy } = DIRS[arrow.dir];
  const head = headOf(arrow);
  const cells: Cell[] = [];

  let row = head.row + dy;
  let col = head.col + dx;
  while (row >= 0 && col >= 0 && row < board.size && col < board.size) {
    cells.push({ row, col });
    row += dy;
    col += dx;
  }

  return cells;
}

/**
 * The first arrow standing in this one's way, or null if the run is clear.
 *
 * Returning the blocker rather than a boolean is what lets a misjudged tap
 * point at *why* it failed instead of only saying that it did.
 */
export function blockerOf(board: Board, id: number): Arrow | null {
  const arrow = arrowById(board, id);
  if (arrow === undefined) return null;

  const grid = occupancy(board);
  for (const { row, col } of exitPath(board, arrow)) {
    const hit = grid[row * board.size + col];
    if (hit !== -1 && hit !== id) return arrowById(board, hit) ?? null;
  }

  return null;
}

export function isFree(board: Board, id: number): boolean {
  return arrowById(board, id) !== undefined && blockerOf(board, id) === null;
}

export function freeArrows(board: Board): Arrow[] {
  return board.arrows.filter((a) => blockerOf(board, a.id) === null);
}

export function canMove(board: Board, move: Move): boolean {
  return isFree(board, move.id);
}

/** Returns a NEW board. Undo depends on cheap snapshots. */
export function applyMove(board: Board, move: Move): Board {
  if (!canMove(board, move)) throw new Error(`arrow ${move.id} is blocked`);
  return { ...board, arrows: board.arrows.filter((a) => a.id !== move.id) };
}

export function isSolved(board: Board): boolean {
  return board.arrows.length === 0;
}

export function legalMoves(board: Board): Move[] {
  return freeArrows(board).map((a) => ({ id: a.id }));
}

/** The arrow covering a cell, or null. Any cell of a track counts as a hit. */
export function arrowAt(board: Board, row: number, col: number): Arrow | null {
  return (
    board.arrows.find((a) => a.cells.some((c) => c.row === row && c.col === col)) ?? null
  );
}

/** Total cells covered by every arrow — how full the board is. */
export function coverage(board: Board): number {
  return board.arrows.reduce((n, a) => n + a.cells.length, 0);
}
