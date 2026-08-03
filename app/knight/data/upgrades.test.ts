import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { makeRng } from "@/app/game/_shared/rng";
import { UPGRADES, rollOffers, defaultMods, type RunMods } from "./upgrades";
import { createWorld, spawnHero, spawnEnemy, stepWorld } from "../engine/world";
import { paramsForLevel } from "../engine/level";

const ENGINE_DIR = join(__dirname, "..", "engine");

/**
 * Everything that may legitimately consume a run modifier.
 *
 * Scoped to `engine/` non-test files plus `page.tsx` only — no `ui/` file
 * reads a mod today, so including that directory would only widen the net
 * without buying anything, and a wider net is a weaker guard. `data/` is
 * deliberately excluded — RunMods' own declaration lives there, and letting
 * the declaration file count as a "consumer" would make this guard vacuous
 * (every field trivially "read" by the interface that defines it).
 *
 * What this guard proves, and what it does not: it catches a field nothing
 * mentions at all (the case this task exists for). It does NOT catch a field
 * whose name collides with an identically-named field on some other,
 * unrelated type — e.g. `coinMult` is also a field of `Stats` in
 * `engine/stats.ts`, so the substring `"coinMult"` would appear in that file
 * (via `Stats`'s own declaration and `BASE_STATS`) even if `RunMods.coinMult`
 * itself were never read. A textual guard can't distinguish those cases
 * without matching receiver expressions, which would make it brittle to
 * variable renames — not a trade worth making here. Real end-to-end coverage
 * (a harness that plays whole runs buying upgrades and asserts the run
 * actually changes) arrives in a later task; this guard is a cheap, coarse
 * first line, not a substitute for that.
 */
const CONSUMERS = [
  ...readdirSync(ENGINE_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => readFileSync(join(ENGINE_DIR, f), "utf8")),
  readFileSync(join(__dirname, "..", "page.tsx"), "utf8"),
].join("\n");

describe("the upgrade catalogue", () => {
  it("offers at least nine upgrades", () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(9);
  });

  it("gives every upgrade a unique id", () => {
    const ids = UPGRADES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every upgrade a name, a description, a price and a weight", () => {
    for (const u of UPGRADES) {
      expect(u.name.length, u.id).toBeGreaterThan(0);
      expect(u.description.length, u.id).toBeGreaterThan(0);
      expect(u.price, u.id).toBeGreaterThan(0);
      expect(u.weight, u.id).toBeGreaterThan(0);
    }
  });

  it("makes every upgrade actually change something", () => {
    const base = defaultMods();
    for (const u of UPGRADES) {
      expect(u.apply(defaultMods()), u.id).not.toEqual(base);
    }
  });

  it("does not mutate the mods it is given", () => {
    for (const u of UPGRADES) {
      const mods = defaultMods();
      u.apply(mods);
      expect(mods, u.id).toEqual(defaultMods());
    }
  });

  // The guard that matters: an upgrade nobody reads is worse than no upgrade,
  // because the player spent coins on it.
  it("has every RunMods field read by the simulation", () => {
    for (const field of Object.keys(defaultMods()) as (keyof RunMods)[]) {
      expect(CONSUMERS.includes(field), `${field} is never read`).toBe(true);
    }
  });

  it("rolls three distinct upgrades by default", () => {
    const picks = rollOffers(makeRng(1));
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => p.id)).size).toBe(3);
  });

  it("rolls the same offers for the same seed", () => {
    expect(rollOffers(makeRng(7)).map((u) => u.id)).toEqual(
      rollOffers(makeRng(7)).map((u) => u.id),
    );
  });

  it("never returns more upgrades than exist", () => {
    expect(rollOffers(makeRng(3), 999)).toHaveLength(UPGRADES.length);
  });

  // Design intent: reach is on offer more often than not. A threshold tuned
  // to a single small seed window isn't a real invariant — the previous
  // version of this test (400 seeds, threshold 200) sampled exactly the seed
  // range where mulberry32 happens to run a bit low, and failed
  // deterministically even though the true rate is comfortably over half.
  // Reach is weight 5 of 24 total in the current 9-upgrade catalogue, now
  // that "mend" (weight 2) is back (analytic P(reach in 3 draws) ≈ 0.552,
  // down from ≈0.595 in the 8-upgrade catalogue because mend dilutes the
  // pool without touching reach's own weight); measured over seeds 0..1999
  // that's 1050/2000 = 52.5%. With n=2000 the binomial sd is ~22, so the
  // >1000 bar sits about 2.25 sd below the measured count — a thinner margin
  // than the 8-upgrade catalogue's ~6 sd, but still a real, deterministic
  // clear (these are fixed seeds, not resampled per run, so 1050 is not
  // itself subject to flake — the sd figure only speaks to how comfortably
  // the fixed 1000 bar was chosen relative to the catalogue's true rate).
  it("favours reach, the stat the ladder depends on", () => {
    let reach = 0;
    for (let seed = 0; seed < 2000; seed++) {
      if (rollOffers(makeRng(seed)).some((u) => u.id === "reach")) reach++;
    }
    expect(reach).toBeGreaterThan(1000);
  });
});

/**
 * The spec's "Economy guard": no card is priced beyond what the ladder can
 * plausibly yield by the level it first appears; no card is unbuyable.
 *
 * Today's catalogue has no per-card level gating — every upgrade is eligible
 * from the very first shop's draw (`rollOffers` weights the whole pool
 * unconditionally; only enemy *patterns*, in `level.ts`, are gated by
 * level). So "the level it first appears" collapses, for every card, to
 * "somewhere within the ladder's designed depth" rather than a per-card
 * number — if a later phase adds per-card unlock levels (gear, in the
 * spec's phase 2), this guard's single shared horizon should become a
 * per-card one.
 *
 * "Plausible yield" is derived from the actual coin economy, not a
 * hardcoded income table: `perKillCoinValue` is *measured* by actually
 * running one kill through the real engine (spawn, swing, drop, collect)
 * rather than assumed, so this guard tracks `COIN_VALUE` (a private
 * constant in `world.ts`) even though it never imports it. Per-level enemy
 * counts come from `paramsForLevel`, the same function `level.ts` itself
 * uses to build every room. A hardcoded table would silently drift the
 * moment either changed; this can't.
 */
describe("the economy guard", () => {
  /** One real kill's coin payout, read off the engine rather than assumed. */
  function measureCoinValue(): number {
    const world = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    const hero = spawnHero(world, { x: 180, y: 300 });
    hero.facing = { x: 0, y: -1 };
    spawnEnemy(world, { x: 180, y: 300 - 30 }, 1); // 1 hp: dies to the first swing.
    for (let i = 0; i < 300 && world.purse === 0; i++) stepWorld(world);
    if (world.purse === 0) throw new Error("expected a measurable coin payout from one kill");
    return world.purse;
  }

  /** Total coins obtainable by clearing every room through `level`, saving
   *  every one (no coinMult bonus assumed — that would only raise this, so
   *  omitting it keeps the bound conservative rather than generous). */
  function plausibleYieldThrough(level: number, perKill: number): number {
    let total = 0;
    for (let n = 1; n <= level; n++) total += paramsForLevel(n).enemies * perKill;
    return total;
  }

  // Matches the ladder harness's own designed depth for an early-game build
  // (see ladder.test.ts's greedyReach bar, "clears to level 20") — the
  // horizon within which the *whole shop*, not just the cheapest card,
  // ought to be earnable by a player who saves toward it.
  const HORIZON = 20;

  it("prices no card beyond what the ladder can plausibly yield by then, and leaves none unbuyable", () => {
    const perKill = measureCoinValue();
    const ceiling = plausibleYieldThrough(HORIZON, perKill);
    for (const u of UPGRADES) {
      expect(u.price, `${u.id} priced above what level 1..${HORIZON} can plausibly yield`).toBeLessThanOrEqual(
        ceiling,
      );
    }
  });
});
