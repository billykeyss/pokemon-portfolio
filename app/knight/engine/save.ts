import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";

export const KNIGHT_SAVE_KEY = "game:knight";
export const KNIGHT_SAVE_VERSION = 1;

export interface KnightSave {
  version: number;
  /** Highest level unlocked. Level 1 is always available. */
  level: number;
  /** Deepest level ever cleared. */
  best: number;
}

export function defaultSave(): KnightSave {
  return { version: KNIGHT_SAVE_VERSION, level: 1, best: 0 };
}

const asLevel = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;

const asCount = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

/**
 * Coerce any stored payload into a usable save. Every failure — blocked
 * storage, missing key, corrupt JSON, wrong types — becomes a fresh save
 * rather than an exception, because losing progress beats a route that
 * will not load.
 */
export function loadSave(storage: StorageLike): KnightSave {
  const raw = readJson(storage, KNIGHT_SAVE_KEY);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaultSave();
  }
  const r = raw as Record<string, unknown>;
  return {
    version: KNIGHT_SAVE_VERSION,
    level: asLevel(r.level),
    best: asCount(r.best),
  };
}

export function writeSave(storage: StorageLike, save: KnightSave): void {
  writeJson(storage, KNIGHT_SAVE_KEY, { ...save, version: KNIGHT_SAVE_VERSION });
}

/** Record a cleared level: unlock the next one and remember how deep you got. */
export function recordClear(save: KnightSave, level: number): KnightSave {
  const n = asLevel(level);
  return {
    ...save,
    level: Math.max(save.level, n + 1),
    best: Math.max(save.best, n),
  };
}
