export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Read and parse a stored payload. Every failure mode — storage blocked by
 * private browsing, key absent, payload corrupt — collapses to null, because
 * the worst acceptable outcome for a save is starting fresh, never a crash.
 */
export function readJson(storage: StorageLike, key: string): unknown | null {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Persist a payload. Losing a save is bad; crashing mid-game is worse. */
export function writeJson(storage: StorageLike, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or quota exhaustion.
  }
}
