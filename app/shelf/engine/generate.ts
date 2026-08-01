import { makeRng, type Rng } from "@/app/game/_shared/rng";
import { MAX_TYPES } from "./items";
import { cloneBoard, resolveMatches } from "./rules";
import { isSolvable } from "./solve";
import { SHELF_WIDTH, type Board, type LevelParams, type Slot } from "./types";

const MAX_ATTEMPTS = 80;
const GEN_NODE_CAP = 40_000;

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
 * Stock the shelves.
 *
 * Every type contributes exactly SHELF_WIDTH copies, so a cleared board is
 * always reachable in principle. Some slots are left empty on purpose — they
 * are the only reason anything can move at all, and a board dealt full is
 * dead on arrival.
 *
 * Items are dealt round-robin across the slots that are in play, which spreads
 * the depth evenly rather than burying one slot under a tall pile.
 */
export function deal(params: LevelParams, rng: Rng): Board {
  const types = Math.min(params.types, MAX_TYPES);

  const items: number[] = [];
  for (let type = 0; type < types; type++) {
    for (let i = 0; i < SHELF_WIDTH; i++) items.push(type);
  }

  const slotCount = params.shelves * SHELF_WIDTH;
  const order = shuffled(
    Array.from({ length: slotCount }, (_, i) => i),
    rng,
  );
  const inPlay = order.slice(0, Math.max(1, slotCount - params.freeSlots));

  const stacks: Slot[] = Array.from({ length: slotCount }, () => []);
  const mixed = shuffled(items, rng);
  for (let i = 0; i < mixed.length; i++) {
    stacks[inPlay[i % inPlay.length]].push(mixed[i]);
  }

  const shelves: Slot[][] = [];
  for (let s = 0; s < params.shelves; s++) {
    shelves.push(stacks.slice(s * SHELF_WIDTH, (s + 1) * SHELF_WIDTH));
  }

  return { shelves, types };
}

/** A deal that clears itself the moment it is dealt is not a puzzle. */
function isTrivial(board: Board): boolean {
  const probe = cloneBoard(board);
  return resolveMatches(probe) > 0;
}

/**
 * Deal until a board is clearable.
 *
 * The fallback stacks each type into one slot per shelf. That board is solvable
 * by inspection — every shelf already holds one type — so the function is total
 * even if the search budget is never enough.
 */
export function generate(params: LevelParams, seed: number): Board {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = deal(params, rng);
    if (isTrivial(candidate)) continue;
    if (isSolvable(candidate, GEN_NODE_CAP)) return candidate;
  }

  const types = Math.min(params.types, MAX_TYPES);
  const shelves: Slot[][] = [];
  for (let s = 0; s < params.shelves; s++) {
    shelves.push([[], [], []]);
  }
  for (let type = 0; type < types; type++) {
    const shelf = type % params.shelves;
    const slot = Math.floor(type / params.shelves) % SHELF_WIDTH;
    for (let i = 0; i < SHELF_WIDTH; i++) shelves[shelf][slot].push(type);
  }

  return { shelves, types };
}
