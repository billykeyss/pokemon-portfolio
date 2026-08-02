import { applyToState, initState, nextDeductionIn, techniqueRank } from "./techniques";
import type { Grid, Tier } from "./types";

/**
 * The ladder is shifted one rung down from pencil-and-paper convention.
 *
 * Naked singles are the backbone of paper Easy, but this game draws every
 * cell's candidates for the player — a cell with one mark left is not a
 * deduction, it is a colour. Hidden singles are the real floor, so ranks 0 and
 * 1 share a tier.
 */
export function tierOfRank(rank: number): Tier {
  if (rank <= 1) return "easy";
  if (rank === 2) return "medium";
  if (rank === 3) return "hard";
  return "expert";
}

/**
 * The rank of the hardest technique needed to finish a grid, or null if the
 * implemented techniques stall before the end.
 *
 * Null is a real answer, not a failure: the generator uses it to throw the
 * puzzle away rather than shipping one no hint can ever help with.
 */
export function hardestRank(grid: Grid): number | null {
  const state = initState(grid);
  let hardest = 0;

  for (;;) {
    if (state.grid.every((c) => c !== 0)) return hardest;

    const d = nextDeductionIn(state);
    if (d === null) return null;

    hardest = Math.max(hardest, techniqueRank(d.kind));
    applyToState(state, d);
  }
}

export function gradeGrid(grid: Grid): Tier | null {
  const rank = hardestRank(grid);
  return rank === null ? null : tierOfRank(rank);
}
