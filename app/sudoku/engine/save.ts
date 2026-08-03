import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";
import { ALL_DIGITS, type Mask } from "./candidates";
import { CELLS } from "./grid";
import { emptyMarks, type Marks } from "./marks";
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
  /** Struck-candidate marks, encoded the same way as the grids below. */
  marks: string;
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

/**
 * Marks are stored as three hex digits per cell — 0x000 to 0x1ff covers the
 * nine-bit range a Mask can hold, and a fixed width keeps the string the same
 * shape `isMarksText` below can validate in one regex, the same discipline
 * `isGridText` uses for the grids. 243 characters for 81 masks is a fair
 * price next to the 243 the three grids already cost, and mirroring their
 * encoding rather than reaching for something denser (base64, say) keeps this
 * file with one idiom instead of two.
 */
const MARK_HEX_DIGITS = 3;

// Unreachable today — setStrike only ever sets single valid-digit bits, and
// a malformed value would still get caught by isMarksText's length check on
// the way back in — but it costs one `&` to make the encoder as defensive
// about what it writes as decodeMarks already is about what it reads.
export const encodeMarks = (marks: Marks): string =>
  marks.map((m) => (m & ALL_DIGITS).toString(16).padStart(MARK_HEX_DIGITS, "0")).join("");

const isMarksText = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length === CELLS * MARK_HEX_DIGITS &&
  /^[0-9a-f]+$/i.test(v);

const EMPTY_MARKS_TEXT = encodeMarks(emptyMarks());

/**
 * Decoding is a trust boundary exactly like `decodeGrid`: any shape or
 * character that fails validation collapses the whole payload to no strikes,
 * rather than parsing what it can and guessing at the rest.
 */
export function decodeMarks(text: string): Marks {
  const out = new Array(CELLS).fill(0) as Mask[];
  if (!isMarksText(text)) return out;
  for (let i = 0; i < CELLS; i++) {
    const chunk = text.slice(i * MARK_HEX_DIGITS, i * MARK_HEX_DIGITS + MARK_HEX_DIGITS);
    // Three hex digits reach 0xfff, wider than a Mask's nine live bits
    // (0x1ff). A hand-edited or bit-rotted save could carry a value outside
    // that range; masking it down is cheap insurance against garbage bits
    // ever reaching a bit-counting consumer, the same margin decodeGrid keeps
    // by bounding each digit to 0..9 despite the regex already doing most of
    // the work.
    out[i] = Number.parseInt(chunk, 16) & ALL_DIGITS;
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
    // Marks are an annotation layer, not the puzzle itself — a corrupt marks
    // field falls back to no strikes rather than discarding an otherwise
    // perfectly resumable board the way a bad givens/solution/entries does.
    marks: isMarksText(r.marks) ? r.marks : EMPTY_MARKS_TEXT,
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
