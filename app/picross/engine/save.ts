import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";
import type { Board } from "./types";

export const PICROSS_SAVE_VERSION = 1;
export const PICROSS_SAVE_KEY = "game:picross";

export interface PicrossProgress {
  level: number;
  /** One character per cell: "0" unknown, "1" filled, "2" marked. */
  cells: string;
}

export interface PicrossSave {
  version: number;
  level: number;
  best: number;
  /** Levels the player has finished. */
  cleared: number[];
  /**
   * The board mid-solve.
   *
   * A 15x15 is ten minutes of work, so losing it to a refresh would be this
   * cabinet's worst moment. Every other game can regenerate its level from a
   * seed; here the player's own partial reasoning is the thing worth keeping.
   */
  progress: PicrossProgress | null;
}

export function defaultPicrossSave(): PicrossSave {
  return { version: PICROSS_SAVE_VERSION, level: 1, best: 1, cleared: [], progress: null };
}

export function encodeBoard(board: Board): string {
  let out = "";
  for (let i = 0; i < board.length; i++) out += String(board[i]);
  return out;
}

export function decodeBoard(text: string, size: number): Board | null {
  if (typeof text !== "string" || text.length !== size * size) return null;

  const board = new Uint8Array(size * size);
  for (let i = 0; i < text.length; i++) {
    const value = text.charCodeAt(i) - 48;
    if (value !== 0 && value !== 1 && value !== 2) return null;
    board[i] = value;
  }
  return board;
}

const posInt = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.floor(v) : fallback;

function progressOf(v: unknown): PicrossProgress | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;

  const r = v as Record<string, unknown>;
  // Progress that does not say which level it belongs to would be painted onto
  // whatever puzzle happens to be open.
  if (typeof r.level !== "number" || !Number.isFinite(r.level) || r.level < 1) return null;
  if (typeof r.cells !== "string" || !/^[012]+$/.test(r.cells)) return null;

  return { level: Math.floor(r.level), cells: r.cells };
}

/** Any corrupt payload collapses to a fresh save; never crash the route. */
export function migratePicrossSave(raw: unknown): PicrossSave {
  const base = defaultPicrossSave();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;
  const level = posInt(r.level, base.level);

  const cleared = Array.isArray(r.cleared)
    ? [...new Set(r.cleared.filter((n): n is number => typeof n === "number" && n >= 1))]
    : [];

  return {
    version: PICROSS_SAVE_VERSION,
    level,
    best: Math.max(level, posInt(r.best, base.best)),
    cleared,
    progress: progressOf(r.progress),
  };
}

export function loadPicrossSave(storage: StorageLike): PicrossSave {
  const raw = readJson(storage, PICROSS_SAVE_KEY);
  return raw === null ? defaultPicrossSave() : migratePicrossSave(raw);
}

export function writePicrossSave(storage: StorageLike, save: PicrossSave): void {
  writeJson(storage, PICROSS_SAVE_KEY, { ...save, version: PICROSS_SAVE_VERSION });
}
