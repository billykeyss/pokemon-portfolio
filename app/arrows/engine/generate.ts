import { makeRng, type Rng } from "@/app/game/_shared/rng";
import { freeRatio, isSolvable } from "./solve";
import {
  DIRS,
  DIR_COUNT,
  type Arrow,
  type Board,
  type Cell,
  type Dir,
  type LevelParams,
} from "./types";

/**
 * Draws per rung of the relaxation ladder.
 *
 * Tight boards are rare rather than hard to build: only about one draw in
 * sixteen clears the strictest bar, so a small budget lets a seed miss it and
 * settle for a looser board than asked for. Building is cheap — a few hundred
 * draws is tens of milliseconds, and each level is built once and cached.
 */
const MAX_ATTEMPTS = 150;
/** Hues to cycle through; adjacent arrows are pushed apart in the palette. */
export const HUE_COUNT = 10;

/**
 * Shortest track worth placing.
 *
 * A one-cell arrow is all head and no body: it draws as a stub with nothing to
 * follow, so it reads as a dot on the paper rather than as a route through it.
 * Two cells is the point where a track has a direction you can see.
 */
export const MIN_LENGTH = 2;

/** Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Grow one self-avoiding track from a free cell, marking the cells it takes.
 *
 * Turning is biased against: a track that changes direction at every step reads
 * as noise, where long runs broken by the occasional bend read as a route.
 */
function growTrack(
  size: number,
  taken: Int16Array,
  start: Cell,
  maxLength: number,
  rng: Rng,
): Cell[] {
  const cells: Cell[] = [start];
  let dir = rng.int(DIR_COUNT) as Dir;
  const longest = Math.max(MIN_LENGTH, maxLength);
  const target = MIN_LENGTH + rng.int(longest - MIN_LENGTH + 1);

  while (cells.length < target) {
    const candidates: Dir[] =
      rng.next() < 0.62
        ? [dir, ((dir + 1) % 4) as Dir, ((dir + 3) % 4) as Dir]
        : shuffled([0, 1, 2, 3] as Dir[], rng);

    let grew = false;
    for (const candidate of candidates) {
      const { dx, dy } = DIRS[candidate];
      const head = cells[cells.length - 1];
      const row = head.row + dy;
      const col = head.col + dx;

      if (row < 0 || col < 0 || row >= size || col >= size) continue;
      if (taken[row * size + col] !== -1) continue;

      cells.push({ row, col });
      taken[row * size + col] = 1;
      dir = candidate;
      grew = true;
      break;
    }

    if (!grew) break;
  }

  return cells;
}

/** Is the run from this head to the edge free of everything already placed? */
function exitIsClear(size: number, placed: Int16Array, head: Cell, dir: Dir): boolean {
  const { dx, dy } = DIRS[dir];
  let row = head.row + dy;
  let col = head.col + dx;

  while (row >= 0 && col >= 0 && row < size && col < size) {
    if (placed[row * size + col] !== -1) return false;
    row += dy;
    col += dx;
  }

  return true;
}

/** The heading implied by a track's final segment, taken from either end. */
function headingOf(cells: Cell[], reversed: boolean): Dir {
  if (cells.length < 2) return 0;
  const [from, to] = reversed
    ? [cells[1], cells[0]]
    : [cells[cells.length - 2], cells[cells.length - 1]];
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  return DIRS.findIndex((d) => d.dx === dx && d.dy === dy) as Dir;
}

/**
 * Build a packed board that is solvable by construction.
 *
 * Arrows are laid down in *reverse* removal order. Each new track only has to
 * find a heading whose run to the edge is clear of what is already on the
 * board — and that is exactly the condition for it to be releasable at the
 * moment those earlier-placed arrows are all that is left. Reverse the
 * placement order and you have a winning line.
 *
 * This replaces scattering arrows at random and testing afterwards, which
 * cannot fill a board: past roughly two thirds coverage a random layout is
 * nearly always deadlocked, so every candidate was rejected and generation fell
 * through to its near-empty fallback.
 *
 * A single-cell track has no segment to take a heading from and tries every
 * direction; a longer one tries its own two ends, since the head has to
 * continue the line the body already travels.
 */
export function build(params: LevelParams, rng: Rng): Board {
  const size = params.size;
  const cellCount = size * size;

  const reserved = new Int16Array(cellCount).fill(-1);
  const placed = new Int16Array(cellCount).fill(-1);
  const wanted = Math.floor(cellCount * params.fillTarget);

  const arrows: Arrow[] = [];
  let covered = 0;
  let guard = 0;

  while (covered < wanted && guard < cellCount * 20) {
    guard++;

    const free: number[] = [];
    for (let i = 0; i < cellCount; i++) if (reserved[i] === -1) free.push(i);
    if (free.length === 0) break;

    const seat = free[rng.int(free.length)];
    const start: Cell = { row: Math.floor(seat / size), col: seat % size };
    reserved[seat] = 1;

    const cells = growTrack(size, reserved, start, params.maxLength, rng);

    // A cell boxed in on all four sides cannot grow a body. Leave it as a gap in
    // the maze rather than placing a stub there.
    if (cells.length < Math.min(MIN_LENGTH, params.maxLength)) {
      for (const c of cells) reserved[c.row * size + c.col] = -1;
      continue;
    }

    const options: { cells: Cell[]; dir: Dir }[] =
      cells.length < 2
        ? shuffled([0, 1, 2, 3] as Dir[], rng).map((dir) => ({ cells, dir }))
        : [
            { cells, dir: headingOf(cells, false) },
            { cells: [...cells].reverse(), dir: headingOf(cells, true) },
          ];

    const choice = options.find((option) =>
      exitIsClear(size, placed, option.cells[option.cells.length - 1], option.dir),
    );

    if (choice === undefined) {
      // No heading escapes what is already down; give the cells back.
      for (const c of cells) reserved[c.row * size + c.col] = -1;
      continue;
    }

    for (const c of choice.cells) placed[c.row * size + c.col] = arrows.length;
    arrows.push({
      id: arrows.length,
      cells: choice.cells,
      dir: choice.dir,
      hue: 0,
    });
    covered += choice.cells.length;
  }

  // Laid down last-removed-first, so reversing puts ids in solving order.
  arrows.reverse();
  arrows.forEach((a, i) => {
    a.id = i;
    a.hue = i % HUE_COUNT;
  });

  return { size, arrows };
}

/**
 * Build boards until one is tight enough to be worth reading.
 *
 * Every candidate is already solvable, so the only filter that matters is the
 * free ratio: without it a board is technically a puzzle and practically a
 * formality, since most arrows start free and any tap works. The bar relaxes if
 * it cannot be met — a board looser than intended is a worse level, and no
 * board at all is a broken one — and solvability is re-checked as a cheap guard
 * against the construction ever being wrong.
 */
export function generate(params: LevelParams, seed: number): Board {
  const rng = makeRng(seed);

  // A board that misses the tightness bar is still worth keeping; one that is
  // half empty is not. Falling back on ratio alone once returned sparse boards,
  // because a thin layout naturally has a low free ratio too.
  const floor = Math.floor(params.size * params.size * params.fillTarget * 0.9);

  let best: Board | null = null;
  let bestRatio = Infinity;

  for (let target = params.maxFreeRatio; target <= 1.01; target += 0.06) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = build(params, rng);
      if (candidate.arrows.length === 0) continue;

      const covered = candidate.arrows.reduce((n, a) => n + a.cells.length, 0);
      if (covered < floor) continue;
      if (!isSolvable(candidate)) continue;

      const ratio = freeRatio(candidate);
      if (ratio <= target) return candidate;

      if (ratio < bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
    }
  }

  if (best !== null) return best;

  return {
    size: params.size,
    arrows: [{ id: 0, cells: [{ row: 0, col: 0 }], dir: 0, hue: 0 }],
  };
}

/** Alias kept for tests that want an unfiltered board. */
export const scatter = build;
