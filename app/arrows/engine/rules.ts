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

/**
 * Arrows with a clear run off the board.
 *
 * Distinct from "can move" now that partial slides exist. This is the set the
 * guaranteed solution line uses: generation lays arrows down in reverse removal
 * order, so every board has an order in which each arrow leaves in one tap, and
 * sliding only ever adds moves on top of those.
 */
export function freeArrows(board: Board): Arrow[] {
  return board.arrows.filter((a) => blockerOf(board, a.id) === null);
}

/**
 * How many cells an arrow can advance before something stops it.
 *
 * `exits` means the run to the edge is clear and the arrow leaves the board
 * entirely. Otherwise `cells` is how far it gets before the first obstruction —
 * zero when it is hard against one.
 *
 * The two are independent: an arrow whose head already sits on the edge has an
 * empty run ahead of it, so it exits on `cells: 0`. Treating a zero distance as
 * "cannot move" strands exactly those arrows.
 */
export function slideDistance(
  board: Board,
  id: number,
): { cells: number; exits: boolean } {
  const arrow = arrowById(board, id);
  if (arrow === undefined) return { cells: 0, exits: false };

  const grid = occupancy(board);
  const path = exitPath(board, arrow);

  for (let i = 0; i < path.length; i++) {
    const { row, col } = path[i];
    const hit = grid[row * board.size + col];
    if (hit !== -1 && hit !== id) return { cells: i, exits: false };
  }

  return { cells: path.length, exits: true };
}

/**
 * Where an arrow's cells land after advancing `steps` along its own route.
 *
 * The body follows the path the head has already taken, so a bent arrow
 * straightens as it goes: cells that pass the last corner continue in the
 * direction the head points rather than repeating the bend.
 */
export function slideCells(arrow: Arrow, steps: number): Cell[] {
  if (steps <= 0) return arrow.cells.map((c) => ({ ...c }));

  const { dx, dy } = DIRS[arrow.dir];
  const head = headOf(arrow);
  const track: Cell[] = arrow.cells.map((c) => ({ ...c }));
  for (let i = 1; i <= steps; i++) {
    track.push({ row: head.row + dy * i, col: head.col + dx * i });
  }

  return track.slice(steps, steps + arrow.cells.length);
}

/**
 * A tap does something if the arrow can move at all — not only if it can leave.
 *
 * This is what stops the game being confluent. Under the old rule a blocked tap
 * was simply refused and the board was unchanged, so no order of taps could
 * ever be wrong. Now a partial slide parks the arrow somewhere new, where it
 * blocks whatever it landed across, and the player can wedge themselves.
 */
export function canMove(board: Board, move: Move): boolean {
  const slide = slideDistance(board, move.id);
  return slide.exits || slide.cells > 0;
}

/**
 * Returns a NEW board. Undo depends on cheap snapshots — and now needs them,
 * because a move can make the board worse.
 */
export function applyMove(board: Board, move: Move): Board {
  const slide = slideDistance(board, move.id);
  if (!slide.exits && slide.cells <= 0) {
    throw new Error(`arrow ${move.id} cannot move`);
  }

  if (slide.exits) {
    return { ...board, arrows: board.arrows.filter((a) => a.id !== move.id) };
  }

  return {
    ...board,
    arrows: board.arrows.map((a) =>
      a.id === move.id ? { ...a, cells: slideCells(a, slide.cells) } : a,
    ),
  };
}

export function isSolved(board: Board): boolean {
  return board.arrows.length === 0;
}

/** Every arrow that would move if tapped, whether it leaves or merely slides. */
export function legalMoves(board: Board): Move[] {
  return board.arrows
    .filter((a) => {
      const slide = slideDistance(board, a.id);
      return slide.exits || slide.cells > 0;
    })
    .map((a) => ({ id: a.id }));
}

/**
 * No arrow can move at all — every one is hard against a neighbour or a wall.
 *
 * A wedge subtler than this is possible (moves remain, but none of them lead
 * anywhere) and is deliberately not detected: proving it needs a search, and
 * undo already covers the player. This catches the dead stop.
 */
export function isStuck(board: Board): boolean {
  return !isSolved(board) && legalMoves(board).length === 0;
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
