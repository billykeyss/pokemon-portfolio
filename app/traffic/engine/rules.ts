import { PLAYER_ID, type Board, type Move, type Vehicle } from "./types";

/** Every cell a vehicle covers. */
export function cellsOf(v: Vehicle): { row: number; col: number }[] {
  const cells = [];
  for (let i = 0; i < v.len; i++) {
    cells.push({
      row: v.horizontal ? v.row : v.row + i,
      col: v.horizontal ? v.col + i : v.col,
    });
  }
  return cells;
}

/**
 * Grid of vehicle ids, -1 where empty. Rebuilt per query rather than cached:
 * boards are 6x6 and a stale occupancy grid is a far worse bug than a rebuilt
 * one is a cost.
 */
export function occupancy(board: Board): Int8Array {
  const grid = new Int8Array(board.size * board.size).fill(-1);
  for (const v of board.vehicles) {
    for (const { row, col } of cellsOf(v)) {
      grid[row * board.size + col] = v.id;
    }
  }
  return grid;
}

export function vehicleById(board: Board, id: number): Vehicle | undefined {
  return board.vehicles.find((v) => v.id === id);
}

export function inBounds(board: Board, row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < board.size && col < board.size;
}

/**
 * How far this vehicle can slide in one direction before the wall or another
 * vehicle stops it. `dir` is -1 (up/left) or +1 (down/right).
 */
export function freeRun(board: Board, id: number, dir: number): number {
  const v = vehicleById(board, id);
  if (v === undefined || dir === 0) return 0;

  const grid = occupancy(board);
  let run = 0;

  for (let step = 1; step <= board.size; step++) {
    // The cell just beyond whichever end is leading.
    const lead = dir > 0 ? v.len - 1 + step : -step;
    const row = v.horizontal ? v.row : v.row + lead;
    const col = v.horizontal ? v.col + lead : v.col;

    if (!inBounds(board, row, col)) break;
    if (grid[row * board.size + col] !== -1) break;
    run = step;
  }

  return run;
}

export function canMove(board: Board, move: Move): boolean {
  if (move.delta === 0) return false;
  const dir = Math.sign(move.delta);
  return Math.abs(move.delta) <= freeRun(board, move.id, dir);
}

/** Returns a NEW board. Undo and the solver both depend on cheap snapshots. */
export function applyMove(board: Board, move: Move): Board {
  if (!canMove(board, move)) {
    throw new Error(`illegal move: vehicle ${move.id} by ${move.delta}`);
  }

  return {
    ...board,
    vehicles: board.vehicles.map((v) =>
      v.id !== move.id
        ? v
        : {
            ...v,
            row: v.horizontal ? v.row : v.row + move.delta,
            col: v.horizontal ? v.col + move.delta : v.col,
          },
    ),
  };
}

/** The player's car has reached the right edge and can drive out. */
export function isSolved(board: Board): boolean {
  const player = vehicleById(board, PLAYER_ID);
  if (player === undefined) return false;
  return player.col + player.len === board.size;
}

/**
 * Every legal move, with a slide of any distance counted as one move — that is
 * how these puzzles are scored, and it keeps the par a number of *decisions*
 * rather than a number of cells.
 */
export function legalMoves(board: Board): Move[] {
  const moves: Move[] = [];

  for (const v of board.vehicles) {
    for (const dir of [-1, 1]) {
      const run = freeRun(board, v.id, dir);
      for (let step = 1; step <= run; step++) {
        moves.push({ id: v.id, delta: dir * step });
      }
    }
  }

  return moves;
}

export function cloneBoard(board: Board): Board {
  return { ...board, vehicles: board.vehicles.map((v) => ({ ...v })) };
}

/** Do two vehicles share any cell? */
export function overlaps(a: Vehicle, b: Vehicle): boolean {
  const cells = new Set(cellsOf(a).map(({ row, col }) => `${row},${col}`));
  return cellsOf(b).some(({ row, col }) => cells.has(`${row},${col}`));
}

/** Does a vehicle fit on the board at all? */
export function fitsOnBoard(board: Pick<Board, "size">, v: Vehicle): boolean {
  const last = cellsOf(v)[v.len - 1];
  return (
    v.row >= 0 &&
    v.col >= 0 &&
    last.row < board.size &&
    last.col < board.size
  );
}
