import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";
import { CELLS } from "./grid";
import { TIERS, type Cell, type Grid, type Tier } from "./types";

export const SUDOKU_SAVE_VERSION = 1;
export const SUDOKU_SAVE_KEY = "game:sudoku";

export interface TierStats {
  solved: number;
  bestMs: number | null;
}

/**
 * Grids are stored as 81-character strings rather than seeds.
 *
 * A seed would be smaller, but restoring from one means re-running the
 * generator — seconds of work to show a board the player was looking at a
 * moment ago. 243 characters is a fair price for an instant resume.
 */
export interface InProgress {
  tier: Tier;
  seed: number;
  givens: string;
  solution: string;
  entries: string;
  elapsedMs: number;
  mistakes: number;
}

export interface SudokuSave {
  version: number;
  tier: Tier;
  stats: Record<Tier, TierStats>;
  inProgress: InProgress | null;
}

export const encodeGrid = (grid: Grid): string => grid.join("");

export function decodeGrid(text: string): Cell[] {
  const out = new Array(CELLS).fill(0) as Cell[];
  if (typeof text !== "string" || text.length !== CELLS) return out;
  for (let i = 0; i < CELLS; i++) {
    const n = Number(text[i]);
    out[i] = Number.isInteger(n) && n >= 0 && n <= 9 ? (n as Cell) : 0;
  }
  return out;
}

export function defaultSudokuSave(): SudokuSave {
  return {
    version: SUDOKU_SAVE_VERSION,
    tier: "easy",
    stats: Object.fromEntries(
      TIERS.map((t) => [t, { solved: 0, bestMs: null }]),
    ) as Record<Tier, TierStats>,
    inProgress: null,
  };
}

/**
 * A solve folded into a tier's stats: one more solved, and the time kept only
 * if it beats what was already there.
 *
 * Pure and separate from the page so the arithmetic has tests. The *guard*
 * that stops one solve being folded in twice is not here — it keys on the
 * dealt puzzle's object identity, which only the page has.
 */
export function recordSolve(save: SudokuSave, tier: Tier, elapsedMs: number): SudokuSave {
  const stat = save.stats[tier];
  return {
    ...save,
    stats: {
      ...save.stats,
      [tier]: {
        solved: stat.solved + 1,
        bestMs: stat.bestMs === null ? elapsedMs : Math.min(stat.bestMs, elapsedMs),
      },
    },
  };
}

const nonNegative = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

const positiveOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : null;

const coerceTier = (v: unknown): Tier =>
  TIERS.includes(v as Tier) ? (v as Tier) : "easy";

function coerceStats(raw: unknown): Record<Tier, TierStats> {
  const base = defaultSudokuSave().stats;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const source = raw as Record<string, unknown>;
  for (const tier of TIERS) {
    const entry = source[tier];
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    base[tier] = { solved: nonNegative(e.solved), bestMs: positiveOrNull(e.bestMs) };
  }
  return base;
}

const isGridText = (v: unknown): v is string =>
  typeof v === "string" && v.length === CELLS && /^[0-9]{81}$/.test(v);

function coerceInProgress(raw: unknown): InProgress | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!isGridText(r.givens) || !isGridText(r.solution) || !isGridText(r.entries)) return null;

  return {
    tier: coerceTier(r.tier),
    seed: nonNegative(r.seed),
    givens: r.givens,
    solution: r.solution,
    entries: r.entries,
    elapsedMs: nonNegative(r.elapsedMs),
    mistakes: nonNegative(r.mistakes),
  };
}

/**
 * Coerce any stored payload into a valid save. A corrupt save must never crash
 * the route — the worst acceptable outcome is starting fresh.
 */
export function migrateSudokuSave(raw: unknown): SudokuSave {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaultSudokuSave();
  }
  const r = raw as Record<string, unknown>;

  return {
    version: SUDOKU_SAVE_VERSION,
    tier: coerceTier(r.tier),
    stats: coerceStats(r.stats),
    inProgress: coerceInProgress(r.inProgress),
  };
}

export function loadSudokuSave(storage: StorageLike): SudokuSave {
  const raw = readJson(storage, SUDOKU_SAVE_KEY);
  return raw === null ? defaultSudokuSave() : migrateSudokuSave(raw);
}

export function writeSudokuSave(storage: StorageLike, save: SudokuSave): void {
  writeJson(storage, SUDOKU_SAVE_KEY, { ...save, version: SUDOKU_SAVE_VERSION });
}
