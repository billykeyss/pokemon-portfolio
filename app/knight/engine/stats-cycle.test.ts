import { describe, it, expect } from "vitest";
// This import must come first, and must be "./combat" — not "./stats" or
// "./world". It pins the exact module-evaluation order that once broke
// BASE_STATS: combat.ts imports statsOf from stats.ts, and stats.ts's base
// constants (SWING_REACH, SWING_DAMAGE, WINDUP_TICKS, etc.) used to be
// imported back from combat.ts. Whichever of the two modules a test (or
// page) happened to load first would read the other's plain `const`
// exports before they were assigned, silently producing `undefined` /
// `NaN` rather than throwing. Every current production entry point routes
// through world.ts or move.ts first, which masked the bug — this file
// exists specifically to load combat.ts with nothing else pre-loaded, so a
// reintroduced cycle fails here even if no other test notices.
import { SWING_REACH, SWING_DAMAGE, WINDUP_TICKS } from "./combat";
import { BASE_STATS, statsOf } from "./stats";
import { createWorld } from "./world";

describe("stats.ts survives combat.ts loading first", () => {
  it("has a fully-initialized BASE_STATS when combat.ts is the first module touched", () => {
    expect(Number.isFinite(BASE_STATS.reach)).toBe(true);
    expect(Number.isFinite(BASE_STATS.damage)).toBe(true);
    expect(Number.isFinite(BASE_STATS.windupTicks)).toBe(true);
    expect(BASE_STATS.reach).toBe(SWING_REACH);
    expect(BASE_STATS.damage).toBe(SWING_DAMAGE);
    expect(BASE_STATS.windupTicks).toBe(WINDUP_TICKS);
  });

  it("statsOf still resolves finite numbers in this load order", () => {
    const w = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    const s = statsOf(w);
    for (const [key, value] of Object.entries(s)) {
      expect(Number.isFinite(value), `${key} should be finite, got ${value}`).toBe(true);
    }
  });
});
