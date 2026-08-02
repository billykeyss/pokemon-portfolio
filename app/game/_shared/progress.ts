import { readJson, type StorageLike } from "./storage";

/**
 * How a cabinet reports where you left off.
 *
 * Each game owns its own summary, because only it knows what its save means:
 * a level number for the puzzles, a best wave for BOUNCEDEX. The dashboard
 * stays generic and never learns any game's internals.
 */
export interface ProgressSource {
  /** localStorage key the game writes to. */
  key: string;
  /** Turn a stored payload into a short status, or null for "not started". */
  summarize(save: unknown): string | null;
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;

const asPositiveInt = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : null;

/**
 * The four puzzle games share a save shape: `{ version, level, best }`.
 * Level 1 is the starting point, so it reads as "not started" rather than
 * boasting about progress the player has not made.
 */
export function levelProgress(key: string): ProgressSource {
  return {
    key,
    summarize(save) {
      const r = asRecord(save);
      if (!r) return null;
      const level = asPositiveInt(r.level);
      return level !== null && level > 1 ? `lv ${level}` : null;
    },
  };
}

/** BOUNCEDEX measures a run by how many waves you survived. */
export function waveProgress(key: string): ProgressSource {
  return {
    key,
    summarize(save) {
      const r = asRecord(save);
      if (!r) return null;
      const wave = asPositiveInt(r.bestWave);
      return wave !== null ? `wave ${wave}` : null;
    },
  };
}

/**
 * Read one cabinet's status. Any failure — storage blocked, key absent,
 * payload corrupt — collapses to null, because a broken save must never stop
 * the dashboard from rendering.
 */
export function readProgress(
  storage: StorageLike,
  source: ProgressSource | undefined,
): string | null {
  if (!source) return null;
  try {
    return source.summarize(readJson(storage, source.key));
  } catch {
    return null;
  }
}
