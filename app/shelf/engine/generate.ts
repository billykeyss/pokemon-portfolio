import { makeRng, type Rng } from "@/app/game/_shared/rng";
import { MAX_TYPES } from "./items";
import { isSolvable } from "./solve";
import { MATCH, type LevelParams, type Shelf } from "./types";

const MAX_ATTEMPTS = 60;
const GEN_NODE_CAP = 30_000;

/** Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deal every item into columns. Each type contributes exactly MATCH copies, so
 * a cleared board is always reachable in principle — whether it is reachable
 * through a tray of finite size is what the solver decides.
 */
export function deal(params: LevelParams, rng: Rng): Shelf {
  const items: number[] = [];
  const types = Math.min(params.types, MAX_TYPES);
  for (let type = 0; type < types; type++) {
    for (let i = 0; i < MATCH; i++) items.push(type);
  }

  const mixed = shuffled(items, rng);
  const columns: number[][] = Array.from({ length: params.columns }, () => []);

  // Round-robin rather than filling one column at a time, so no column ends up
  // empty and the depths stay even.
  for (let i = 0; i < mixed.length; i++) {
    columns[i % params.columns].push(mixed[i]);
  }

  return { columns, tray: [], traySize: params.traySize, types };
}

/**
 * A deal where every column already shows the same item is a giveaway, and one
 * where the first three takes clear a set immediately is barely a puzzle.
 */
function isTrivial(shelf: Shelf): boolean {
  const fronts = shelf.columns
    .map((c) => c[c.length - 1])
    .filter((v): v is number => v !== undefined);

  const counts = new Map<number, number>();
  for (const type of fronts) counts.set(type, (counts.get(type) ?? 0) + 1);
  return [...counts.values()].some((n) => n >= MATCH);
}

/**
 * Deal until a board is clearable within the tray.
 *
 * Unlike the other games, most random deals here *are* solvable — a generous
 * tray forgives a lot — so this usually returns on the first attempt. The
 * fallback deals into a single column, which is always clearable because items
 * come off in an order the tray can absorb three at a time.
 */
export function generate(params: LevelParams, seed: number): Shelf {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = deal(params, rng);
    if (isTrivial(candidate)) continue;
    if (isSolvable(candidate, GEN_NODE_CAP)) return candidate;
  }

  const types = Math.min(params.types, MAX_TYPES);
  const sorted: number[] = [];
  for (let type = 0; type < types; type++) {
    for (let i = 0; i < MATCH; i++) sorted.push(type);
  }

  const columns: number[][] = Array.from({ length: params.columns }, () => []);
  columns[0] = sorted.reverse();
  return { columns, tray: [], traySize: params.traySize, types };
}
