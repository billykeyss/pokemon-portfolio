import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";

export const ARROWS_SAVE_VERSION = 1;
export const ARROWS_SAVE_KEY = "game:arrows";

export interface ArrowsSave {
  version: number;
  level: number;
  best: number;
  /** Fewest blocked taps used to clear each level — zero is a clean run. */
  missesByLevel: Record<number, number>;
}

export function defaultArrowsSave(): ArrowsSave {
  return { version: ARROWS_SAVE_VERSION, level: 1, best: 1, missesByLevel: {} };
}

const posInt = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.floor(v) : fallback;

function missMap(v: unknown): Record<number, number> {
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
 * Coerce any stored payload into a valid save. A corrupt save must never crash
 * the route — the worst acceptable outcome is starting fresh.
 */
export function migrateArrowsSave(raw: unknown): ArrowsSave {
  const base = defaultArrowsSave();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;
  const level = posInt(r.level, base.level);

  return {
    version: ARROWS_SAVE_VERSION,
    level,
    best: Math.max(level, posInt(r.best, base.best)),
    missesByLevel: missMap(r.missesByLevel),
  };
}

export function loadArrowsSave(storage: StorageLike): ArrowsSave {
  const raw = readJson(storage, ARROWS_SAVE_KEY);
  return raw === null ? defaultArrowsSave() : migrateArrowsSave(raw);
}

export function writeArrowsSave(storage: StorageLike, save: ArrowsSave): void {
  writeJson(storage, ARROWS_SAVE_KEY, { ...save, version: ARROWS_SAVE_VERSION });
}
