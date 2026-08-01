import { coerceSpeed, DEFAULT_SPEED, type Speed } from "@/app/game/_shared/speed";
import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "bounce:bouncedex";

export type { StorageLike };

export interface BouncedexSave {
  version: number;
  /** Currency earned from runs. Buys critters only — never stats. */
  eggs: number;
  /** Critter ids discovered, base and evolved forms alike. */
  dex: string[];
  /** Base critter ids chosen for the launch queue. */
  starters: string[];
  bestWave: number;
  bestCombo: number;
  autoMode: boolean;
  /** Playback speed, remembered between sessions. */
  speed: Speed;
}

export function defaultSave(): BouncedexSave {
  return {
    version: SAVE_VERSION,
    eggs: 0,
    dex: [],
    starters: [],
    bestWave: 0,
    bestCombo: 0,
    autoMode: true,
    speed: DEFAULT_SPEED,
  };
}

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/**
 * Coerce any stored payload into a valid save. A corrupt or partial save must
 * never crash the route — the worst acceptable outcome is starting fresh.
 */
export function migrate(raw: unknown): BouncedexSave {
  const base = defaultSave();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;

  // Only version 1 exists today. When version 2 lands, branch here on
  // r.version and transform forward rather than discarding.
  return {
    version: SAVE_VERSION,
    eggs: num(r.eggs, base.eggs),
    dex: strArray(r.dex),
    starters: strArray(r.starters),
    bestWave: num(r.bestWave, base.bestWave),
    bestCombo: num(r.bestCombo, base.bestCombo),
    autoMode: typeof r.autoMode === "boolean" ? r.autoMode : base.autoMode,
    // Additive field: saves written before speed existed simply get the
    // default, so no schema version bump is needed.
    speed: coerceSpeed(r.speed),
  };
}

export function loadSave(storage: StorageLike): BouncedexSave {
  const raw = readJson(storage, SAVE_KEY);
  return raw === null ? defaultSave() : migrate(raw);
}

export function writeSave(storage: StorageLike, save: BouncedexSave): void {
  writeJson(storage, SAVE_KEY, { ...save, version: SAVE_VERSION });
}
