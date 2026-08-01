import type { Bottle, Move, Puzzle } from "./types";

/** The contiguous same-colour run at the top of a bottle, or null if empty. */
export function topRun(bottle: Bottle): { color: number; count: number } | null {
  if (bottle.length === 0) return null;
  const color = bottle[bottle.length - 1];
  let count = 1;
  for (let i = bottle.length - 2; i >= 0 && bottle[i] === color; i--) count++;
  return { color, count };
}

/** A bottle that is full and single-coloured — a finished colour. */
export function isComplete(bottle: Bottle, capacity: number): boolean {
  return bottle.length === capacity && topRun(bottle)?.count === capacity;
}

export function canPour(p: Puzzle, from: number, to: number): boolean {
  if (from === to) return false;
  const src = p.bottles[from];
  const dst = p.bottles[to];
  if (src === undefined || dst === undefined) return false;

  const run = topRun(src);
  if (run === null) return false;
  if (dst.length >= p.capacity) return false;

  return dst.length === 0 || dst[dst.length - 1] === run.color;
}

/** Units actually transferred: the whole top run, clamped by free space. */
export function pourCount(p: Puzzle, from: number, to: number): number {
  if (!canPour(p, from, to)) return 0;
  const run = topRun(p.bottles[from]);
  if (run === null) return 0;
  return Math.min(run.count, p.capacity - p.bottles[to].length);
}

export function clonePuzzle(p: Puzzle): Puzzle {
  return { ...p, bottles: p.bottles.map((b) => [...b]) };
}

/**
 * Returns a NEW puzzle. Undo and the solver both lean on cheap snapshots, so
 * mutation here would be a correctness bug, not a style question.
 */
export function applyMove(p: Puzzle, move: Move): Puzzle {
  const n = pourCount(p, move.from, move.to);
  if (n === 0) {
    throw new Error(`illegal move ${move.from} -> ${move.to}`);
  }

  const next = clonePuzzle(p);
  const moved = next.bottles[move.from].splice(-n, n);
  next.bottles[move.to].push(...moved);
  return next;
}

export function isSolved(p: Puzzle): boolean {
  return p.bottles.every((b) => b.length === 0 || isComplete(b, p.capacity));
}

/**
 * Legal moves, pruned of the ones that cannot lead anywhere new:
 *  - never disturb a completed bottle;
 *  - empty bottles are interchangeable, so offer only the first;
 *  - relocating an already-monochrome bottle into an empty one is a no-op.
 */
export function legalMoves(p: Puzzle): Move[] {
  const moves: Move[] = [];
  const firstEmpty = p.bottles.findIndex((b) => b.length === 0);

  for (let from = 0; from < p.bottles.length; from++) {
    const src = p.bottles[from];
    if (src.length === 0) continue;
    if (isComplete(src, p.capacity)) continue;

    const run = topRun(src);
    if (run === null) continue;
    const wholeBottle = run.count === src.length;

    for (let to = 0; to < p.bottles.length; to++) {
      if (from === to) continue;

      const dst = p.bottles[to];
      if (dst.length === 0) {
        if (to !== firstEmpty) continue;
        if (wholeBottle) continue;
      }
      if (!canPour(p, from, to)) continue;

      moves.push({ from, to });
    }
  }

  return moves;
}
