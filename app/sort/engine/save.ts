import { coerceSpeed, DEFAULT_SPEED, type Speed } from "@/app/game/_shared/speed";
import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";

export const SORT_SAVE_VERSION = 1;
export const SORT_SAVE_KEY = "game:sort";

export interface SortSave {
  version: number;
  /** Level currently being played. */
  level: number;
  /** Highest level ever reached — the ceiling for level select. */
  best: number;
  /** Best move count per beaten level. */
  movesByLevel: Record<number, number>;
  /** Glyph overlay, on by default so colour is never the only cue. */
  symbols: boolean;
  speed: Speed;
}

export function defaultSortSave(): SortSave {
  return {
    version: SORT_SAVE_VERSION,
    level: 1,
    best: 1,
    movesByLevel: {},
    symbols: true,
    speed: DEFAULT_SPEED,
  };
}

const posInt = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.floor(v) : fallback;

function moveMap(v: unknown): Record<number, number> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};

  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    const level = Number(key);
    if (!Number.isInteger(level) || level < 1) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    out[level] = Math.floor(value);
  }
  return out;
}

/**
 * Coerce any stored payload into a valid save. A corrupt or partial save must
 * never crash the route — the worst acceptable outcome is starting fresh.
 */
export function migrateSortSave(raw: unknown): SortSave {
  const base = defaultSortSave();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;
  const level = posInt(r.level, base.level);

  return {
    version: SORT_SAVE_VERSION,
    level,
    // best can never sit below the level in progress, however the save got here.
    best: Math.max(level, posInt(r.best, base.best)),
    movesByLevel: moveMap(r.movesByLevel),
    symbols: typeof r.symbols === "boolean" ? r.symbols : base.symbols,
    speed: coerceSpeed(r.speed),
  };
}

export function loadSortSave(storage: StorageLike): SortSave {
  const raw = readJson(storage, SORT_SAVE_KEY);
  return raw === null ? defaultSortSave() : migrateSortSave(raw);
}

export function writeSortSave(storage: StorageLike, save: SortSave): void {
  writeJson(storage, SORT_SAVE_KEY, { ...save, version: SORT_SAVE_VERSION });
}
