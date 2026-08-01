import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";

export const SHELF_SAVE_VERSION = 1;
export const SHELF_SAVE_KEY = "game:shelf";

export interface ShelfSave {
  version: number;
  level: number;
  best: number;
  /** Fewest takes used to clear each level. */
  movesByLevel: Record<number, number>;
}

export function defaultShelfSave(): ShelfSave {
  return { version: SHELF_SAVE_VERSION, level: 1, best: 1, movesByLevel: {} };
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
 * Coerce any stored payload into a valid save. A corrupt save must never crash
 * the route — the worst acceptable outcome is starting fresh.
 */
export function migrateShelfSave(raw: unknown): ShelfSave {
  const base = defaultShelfSave();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;
  const level = posInt(r.level, base.level);

  return {
    version: SHELF_SAVE_VERSION,
    level,
    best: Math.max(level, posInt(r.best, base.best)),
    movesByLevel: moveMap(r.movesByLevel),
  };
}

export function loadShelfSave(storage: StorageLike): ShelfSave {
  const raw = readJson(storage, SHELF_SAVE_KEY);
  return raw === null ? defaultShelfSave() : migrateShelfSave(raw);
}

export function writeShelfSave(storage: StorageLike, save: ShelfSave): void {
  writeJson(storage, SHELF_SAVE_KEY, { ...save, version: SHELF_SAVE_VERSION });
}
