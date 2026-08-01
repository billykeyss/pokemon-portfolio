import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";

export const TRAFFIC_SAVE_VERSION = 1;
export const TRAFFIC_SAVE_KEY = "game:traffic";

export interface TrafficSave {
  version: number;
  level: number;
  best: number;
  /** Best move count per cleared level. */
  movesByLevel: Record<number, number>;
}

export function defaultTrafficSave(): TrafficSave {
  return { version: TRAFFIC_SAVE_VERSION, level: 1, best: 1, movesByLevel: {} };
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
export function migrateTrafficSave(raw: unknown): TrafficSave {
  const base = defaultTrafficSave();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;
  const level = posInt(r.level, base.level);

  return {
    version: TRAFFIC_SAVE_VERSION,
    level,
    best: Math.max(level, posInt(r.best, base.best)),
    movesByLevel: moveMap(r.movesByLevel),
  };
}

export function loadTrafficSave(storage: StorageLike): TrafficSave {
  const raw = readJson(storage, TRAFFIC_SAVE_KEY);
  return raw === null ? defaultTrafficSave() : migrateTrafficSave(raw);
}

export function writeTrafficSave(storage: StorageLike, save: TrafficSave): void {
  writeJson(storage, TRAFFIC_SAVE_KEY, { ...save, version: TRAFFIC_SAVE_VERSION });
}
