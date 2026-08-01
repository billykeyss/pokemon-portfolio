import { generate } from "./generate";
import type { Board, LevelParams } from "./types";

const SIZE = 6;

/**
 * Four vehicles and a three-move solution at level one, climbing to a crowded
 * board needing nine or more.
 *
 * Both dials move, and they cost very different amounts. Adding a vehicle is
 * free — placement is cheap and a denser board is genuinely harder to read.
 * Raising the move demand is not: every rejected candidate costs a full
 * breadth-first search, and boards past about nine moves are a rare enough draw
 * on a 6x6 that chasing them stalls the level load. So the move demand tops out
 * where generation stays responsive, and density carries the late game.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));
  return {
    size: SIZE,
    vehicles: Math.min(12, 4 + Math.floor((n - 1) / 3)),
    minMoves: Math.min(9, 3 + Math.floor((n - 1) / 3)),
  };
}

/** Spread consecutive levels across the seed space so 8 and 9 share nothing. */
export function seedForLevel(level: number): number {
  let h = (Math.max(1, Math.floor(level)) * 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

/** Generation runs a breadth-first search, so each level is built at most once. */
const cache = new Map<number, Board>();

export function levelFor(level: number): Board {
  const n = Math.max(1, Math.floor(level));
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const board = generate(paramsForLevel(n), seedForLevel(n));
  cache.set(n, board);
  return board;
}
