import {
  DIRS,
  headOf,
  type Arrow,
  type Board,
  type Cell,
  type Dir,
  type End,
  type Move,
} from "./types";

/**
 * The cell that leads when moving from this end, and the way it points.
 *
 * Leading with the tail is the same motion mirrored: the track runs backwards
 * along itself, so the direction is whatever the first segment points *away*
 * from. A single-cell arrow has no segment to read, so it borrows the opposite
 * of its head.
 */
export function leadOf(arrow: Arrow, end: End): { cell: Cell; dir: Dir } {
  if (end === "head") return { cell: headOf(arrow), dir: arrow.dir };

  const [first, second] = arrow.cells;
  if (second === undefined) {
    const back = (arrow.dir + 2) % 4;
    return { cell: first, dir: back as Dir };
  }

  const dy = first.row - second.row;
  const dx = first.col - second.col;
  const dir = DIRS.findIndex((d) => d.dx === dx && d.dy === dy);
  return { cell: first, dir: (dir < 0 ? arrow.dir : dir) as Dir };
}

/** Ends this arrow may be sent from. */
export function endsOf(arrow: Arrow): End[] {
  return arrow.twoWay === true ? ["head", "tail"] : ["head"];
}

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
export function exitPath(board: Board, arrow: Arrow, end: End = "head"): Cell[] {
  const lead = leadOf(arrow, end);
  const { dx, dy } = DIRS[lead.dir];
  const cells: Cell[] = [];

  let row = lead.cell.row + dy;
  let col = lead.cell.col + dx;
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
export function blockerOf(board: Board, id: number, end: End = "head"): Arrow | null {
  const arrow = arrowById(board, id);
  if (arrow === undefined) return null;

  const grid = occupancy(board);
  for (const { row, col } of exitPath(board, arrow, end)) {
    const hit = grid[row * board.size + col];
    if (hit !== -1 && hit !== id) return arrowById(board, hit) ?? null;
  }

  return null;
}

/** The end with a clear run, preferring the head when both are open. */
export function clearEnd(board: Board, id: number): End | null {
  const arrow = arrowById(board, id);
  if (arrow === undefined) return null;
  return endsOf(arrow).find((e) => blockerOf(board, id, e) === null) ?? null;
}

/** Can this arrow leave the board right now, by either of its ends? */
export function isFree(board: Board, id: number): boolean {
  return arrowById(board, id) !== undefined && clearEnd(board, id) !== null;
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
  return board.arrows.filter((a) => clearEnd(board, a.id) !== null);
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
  end: End = "head",
): { cells: number; exits: boolean } {
  const arrow = arrowById(board, id);
  if (arrow === undefined) return { cells: 0, exits: false };

  const grid = occupancy(board);
  const path = exitPath(board, arrow, end);

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
export function slideCells(arrow: Arrow, steps: number, end: End = "head"): Cell[] {
  if (steps <= 0) return arrow.cells.map((c) => ({ ...c }));

  const lead = leadOf(arrow, end);
  const { dx, dy } = DIRS[lead.dir];
  const track: Cell[] = arrow.cells.map((c) => ({ ...c }));

  // Leading with the tail runs the same construction along a reversed track,
  // so the body still follows the route the leading cell has taken.
  if (end === "tail") track.reverse();

  for (let i = 1; i <= steps; i++) {
    track.push({ row: lead.cell.row + dy * i, col: lead.cell.col + dx * i });
  }

  const moved = track.slice(steps, steps + arrow.cells.length);
  // Put the track back the way round the arrow stores it, so cells[0] stays
  // the tail and the head stays last.
  return end === "tail" ? moved.reverse() : moved;
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
  const slide = slideDistance(board, move.id, move.end ?? "head");
  return slide.exits || slide.cells > 0;
}

/**
 * Returns a NEW board. Undo depends on cheap snapshots — and now needs them,
 * because a move can make the board worse.
 */
export function applyMove(board: Board, move: Move): Board {
  const end = move.end ?? "head";
  const slide = slideDistance(board, move.id, end);
  if (!slide.exits && slide.cells <= 0) {
    throw new Error(`arrow ${move.id} cannot move from its ${end}`);
  }

  if (slide.exits) {
    return { ...board, arrows: board.arrows.filter((a) => a.id !== move.id) };
  }

  return {
    ...board,
    arrows: board.arrows.map((a) =>
      a.id === move.id ? { ...a, cells: slideCells(a, slide.cells, end) } : a,
    ),
  };
}

export function isSolved(board: Board): boolean {
  return board.arrows.length === 0;
}

/** Every arrow that would move if tapped, whether it leaves or merely slides. */
export function legalMoves(board: Board): Move[] {
  const moves: Move[] = [];
  for (const a of board.arrows) {
    for (const end of endsOf(a)) {
      const slide = slideDistance(board, a.id, end);
      if (slide.exits || slide.cells > 0) moves.push({ id: a.id, end });
    }
  }
  return moves;
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
