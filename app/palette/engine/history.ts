import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";
import { parseHex } from "./extract";

export const PALETTE_HISTORY_KEY = "app:palette";
export const PALETTE_HISTORY_VERSION = 1;
/**
 * Thumbnails are small JPEG data URLs, a few kilobytes each. Thirty of them
 * stays far under the ~5MB localStorage quota that every other save on this
 * origin shares.
 */
export const MAX_SAVED = 30;

export interface SavedPalette {
  id: string;
  colors: string[];
  createdAt: number;
  /** A small JPEG data URL of the source photo, absent for shared palettes. */
  thumb?: string;
}

export interface PaletteHistory {
  version: number;
  items: SavedPalette[];
}

export const emptyHistory = (): PaletteHistory => ({
  version: PALETTE_HISTORY_VERSION,
  items: [],
});

function isSaved(value: unknown): value is SavedPalette {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.createdAt === "number" &&
    Array.isArray(v.colors) &&
    v.colors.length > 0 &&
    v.colors.every((c) => typeof c === "string" && parseHex(c) !== null) &&
    (v.thumb === undefined || (typeof v.thumb === "string" && v.thumb.startsWith("data:image/")))
  );
}

/** Whatever survives validation; a corrupt entry is dropped, not fatal. */
export function loadHistory(storage: StorageLike): PaletteHistory {
  const raw = readJson(storage, PALETTE_HISTORY_KEY);
  if (typeof raw !== "object" || raw === null) return emptyHistory();
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return emptyHistory();
  return { version: PALETTE_HISTORY_VERSION, items: items.filter(isSaved).slice(0, MAX_SAVED) };
}

export function writeHistory(storage: StorageLike, history: PaletteHistory): void {
  writeJson(storage, PALETTE_HISTORY_KEY, history);
}

const sameColors = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((c, i) => c.toLowerCase() === b[i].toLowerCase());

/**
 * Newest first. Saving a palette that is already saved moves it to the top
 * instead of listing it twice — tapping Save again should not clutter.
 */
export function addPalette(history: PaletteHistory, entry: SavedPalette): PaletteHistory {
  const rest = history.items.filter((p) => !sameColors(p.colors, entry.colors));
  return { ...history, items: [entry, ...rest].slice(0, MAX_SAVED) };
}

export function removePalette(history: PaletteHistory, id: string): PaletteHistory {
  return { ...history, items: history.items.filter((p) => p.id !== id) };
}

export const findSaved = (
  history: PaletteHistory,
  colors: readonly string[],
): SavedPalette | undefined => history.items.find((p) => sameColors(p.colors, colors));
