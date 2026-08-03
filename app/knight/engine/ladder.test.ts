import { describe, it, expect } from "vitest";
import { makeRng } from "@/app/game/_shared/rng";
import type { World } from "./world";
import { heroOf, stepWorld } from "./world";
import type { Entity } from "./types";
import { reachOf } from "./combat";
import { levelFor, paramsForLevel, seedForLevel } from "./level";
import { openShop, purchase, type ShopState } from "./shop";
import { beginRoom, settleClear, carryForward, freshCarry } from "./run";
import { statsOf } from "./stats";
import type { Stats } from "./stats";
import { UPGRADES, type RunMods } from "../data/upgrades";

/**
 * Plays the level ladder the way the page does.
 *
 * loop.test.ts asks whether combat works at all in one room. This asks the
 * question that only appears once rooms are strung together: does a whole
 * run — mods, purse and hp carried forward exactly the way `page.tsx` carries
 * them — survive the difficulty curve for each of a few shopper personalities,
 * from a plan-free reach rush down to a player who buys nothing at all.
 *
 * Reach used to be granted automatically on every clear, and the ladder was
 * balanced around that guarantee. It is bought now, which removes the floor:
 * a player who spends badly can, in principle, wall themselves out of a run
 * they cannot recover from. These tests exist to prove that a *careless*
 * shopper — not an optimal one — still reaches a reasonable depth.
 *
 * That claim is only honest if shopping is the one careless variable. The
 * bot (`botStep`, below) is deliberately built to play competently — it
 * uses the game's central spacing mechanic — so a bar failing here says
 * something about the shop, not about a bot that also plays badly.
 */

/**
 * Models a *competent but unremarkable* player's movement — someone who uses
 * spacing, the mechanic `move.ts` itself calls "the whole skill of the
 * game," but is not optimising anything beyond it.
 *
 * What it models: hit-and-run. Close to swing range and hold while a swing
 * is available (idle/windup/active); back off once the swing enters
 * `recover`, when the hero cannot act again but is not yet safe; break away
 * from the fight entirely when several enemies are pressed in at once,
 * because no amount of good single-target spacing saves you from a pincer.
 *
 * What it does NOT model, on purpose: target prioritisation (it always
 * engages whichever living enemy is nearest — no threat assessment, no
 * focusing the one about to hit it), kiting around terrain or luring enemies
 * into chokepoints, dodging a specific attack, or anything that adapts to a
 * particular level's layout or number. It also does not read `hero.hp` —
 * hearts are visible on the HUD, but factoring remaining health into
 * movement would be a second behaviour ("play more cautiously while hurt"),
 * and the brief for this bot is one uniform behaviour, not a panic mode.
 * A failing bar built on this bot describes a player who understands
 * spacing and nothing else about tactics — not a good player, and not the
 * no-kiting worst case the ladder used to measure either.
 *
 * Inputs are restricted to what a player watching the screen can see:
 * entity positions and radii (the drawn circles), whether an entity is
 * still alive (`deadAtTick`), the hero's own swing phase (windup/active/
 * recover is a distinct animation pose), and `reachOf(world)` — drawn
 * on-screen as the faint ring in `draw.ts`, not a hidden number. It only
 * ever writes `world.moveTarget`, the same single input a real drag does;
 * it never touches position, velocity, or attack state directly.
 */
function botStep(world: World): void {
  const hero = heroOf(world);
  if (!hero || hero.deadAtTick >= 0) {
    world.moveTarget = null;
    return;
  }

  const living = world.entities.filter((e) => e.kind === "enemy" && e.deadAtTick < 0);
  if (living.length === 0) {
    world.moveTarget = null;
    return;
  }

  let nearest = living[0];
  let nearestDist = Math.hypot(nearest.pos.x - hero.pos.x, nearest.pos.y - hero.pos.y);
  for (const e of living) {
    const d = Math.hypot(e.pos.x - hero.pos.x, e.pos.y - hero.pos.y);
    if (d < nearestDist || (d === nearestDist && e.id < nearest.id)) {
      nearest = e;
      nearestDist = d;
    }
  }

  const reach = reachOf(world);

  // "On you": near enough to be a live contact threat this instant, not
  // merely somewhere in the room. A fixed personal-space bubble around the
  // drawn collision circles, not scaled by reach — how close is "too close
  // to have company" is a physical judgement, not a weapon-length one.
  const CLOSE_MARGIN = 20;
  const pressing = living.filter(
    (e) =>
      Math.hypot(e.pos.x - hero.pos.x, e.pos.y - hero.pos.y) <=
      hero.radius + e.radius + CLOSE_MARGIN,
  );

  // Several = at least two at once: two simultaneous contact threats already
  // double the chance of eating a hit inside one i-frame window, which is
  // exactly the situation single-target spacing cannot solve by itself.
  if (pressing.length >= 2) {
    // Break away from the crowd's centre of pressure, not just the nearest
    // one of them — retreating from a single attacker while pincered can walk
    // straight into the other. Sum the "away from each" unit vectors; when
    // they roughly cancel (attackers on opposite sides), fall back to
    // breaking away from the closest one rather than freezing in place.
    let sx = 0;
    let sy = 0;
    for (const e of pressing) {
      const dx = hero.pos.x - e.pos.x;
      const dy = hero.pos.y - e.pos.y;
      const d = Math.hypot(dx, dy) || 1;
      sx += dx / d;
      sy += dy / d;
    }
    const mag = Math.hypot(sx, sy);
    let ux: number;
    let uy: number;
    if (mag < 0.05) {
      const dx = hero.pos.x - nearest.pos.x;
      const dy = hero.pos.y - nearest.pos.y;
      const d = Math.hypot(dx, dy) || 1;
      ux = dx / d;
      uy = dy / d;
    } else {
      ux = sx / mag;
      uy = sy / mag;
    }
    world.moveTarget = { x: hero.pos.x + ux * reach, y: hero.pos.y + uy * reach };
    return;
  }

  if (hero.attack.phase === "recover") {
    // Vulnerable and cannot act again yet — open distance from whatever is
    // nearest rather than holding station next to it.
    const dx = hero.pos.x - nearest.pos.x;
    const dy = hero.pos.y - nearest.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    world.moveTarget = { x: hero.pos.x + (dx / d) * reach, y: hero.pos.y + (dy / d) * reach };
    return;
  }

  // Idle, windup, or active: a swing is either available or already
  // committed. Close to just inside reach and hold — not the very edge
  // (an enemy drifting a pixel would leave the arc and whiff), not deep
  // inside it either (that only trades away margin for nothing, once
  // retreat-on-recover is doing the work of creating distance).
  const ENGAGE_FRACTION = 0.8;
  const standoff = reach * ENGAGE_FRACTION;
  if (nearestDist <= standoff) {
    world.moveTarget = null;
    return;
  }
  const ux = (nearest.pos.x - hero.pos.x) / nearestDist;
  const uy = (nearest.pos.y - hero.pos.y) / nearestDist;
  world.moveTarget = { x: nearest.pos.x - ux * standoff, y: nearest.pos.y - uy * standoff };
}

const TICK_CAP = 120 * 90; // 90s at 120Hz.

type Shopper = (world: World, shop: ShopState, level: number) => void;

/** Every slot still on the shelf, newest-first so indices stay valid as we buy. */
const slots = (shop: ShopState): number[] =>
  shop.offers.map((o, i) => (o ? i : -1)).filter((i) => i >= 0).reverse();

/** Buys reach whenever it is on offer, then spends the rest on anything. */
const greedyReach: Shopper = (w, shop) => {
  for (const i of slots(shop)) {
    if (shop.offers[i]?.upgrade.id === "reach") purchase(w, shop, i);
  }
  for (const i of slots(shop)) purchase(w, shop, i);
};

/** Buys damage and nothing else — a build with an obvious blind spot. */
const damageOnly: Shopper = (w, shop) => {
  for (const i of slots(shop)) {
    if (shop.offers[i]?.upgrade.id === "damage") purchase(w, shop, i);
  }
};

/**
 * Buys at random. The load-bearing personality: reach is no longer granted, so
 * a player who buys without a plan must still survive.
 *
 * Takes a `salt`, mixed into the rng seed alongside the level, rather than
 * being one fixed shopper. A careless shopper's outcome is a random
 * variable — its build depends on which cards happened to be offered and
 * which coin flips happened to land — so asserting one seed's result is a
 * point estimate of a distribution, not a fact about the economy. `salt`
 * is what lets `carelessSweep`, below, draw many independent careless runs
 * instead of resampling the same one under a different name. Reseeded per
 * level even for a single salt, so the coin flips governing level 1 and
 * level 14 stay unrelated draws within one run too.
 */
const careless =
  (salt: number): Shopper =>
  (w, shop, level) => {
    const rng = makeRng(seedForLevel(level) ^ salt);
    for (const i of slots(shop)) {
      if (rng.int(2) === 0) purchase(w, shop, i);
    }
  };

/** Buys nothing at all. Allowed to fail — that is what makes the shop matter. */
const neverBuy: Shopper = () => {};

interface RunResult {
  /** Highest level cleared. */
  cleared: number;
  /** The build's mods when the run stopped, win or lose — for diagnosing a
   *  failed bar without rerunning anything. */
  mods: RunMods;
  /** Coins on hand when the run stopped. */
  purse: number;
  /** statsOf(world) resolved from `mods`, so a failure's build can be read
   *  directly (e.g. "reach was still base") without doing the arithmetic. */
  stats: Stats;
}

/**
 * Plays a whole run: rooms, coins, shopping, carrying the build forward.
 *
 * Uses `beginRoom`/`settleClear`/`carryForward`/`freshCarry` — the exact
 * functions `page.tsx` calls, at the exact points it calls them (build the
 * room, fight it, settle the clear, shop, carry forward) — rather than
 * reimplementing any of that inline. A prior bug in the carry path
 * (purchases discarded on room transition) was invisible to over a thousand
 * passing tests precisely because this harness used to rebuild the room and
 * the clear-transition by hand instead of calling the page's own functions;
 * a page-only regression in either had nothing here to catch it. Importing
 * them means this harness now walks the identical path the game does, so a
 * mutation to `beginRoom` or `settleClear` shows up here too.
 */
function playRun(shopper: Shopper, maxLevel: number): RunResult {
  let carry = freshCarry();
  let cleared = 0;
  let lastWorld: World | null = null;

  for (let level = 1; level <= maxLevel; level++) {
    const world = beginRoom(level, carry);
    const hero = heroOf(world);
    if (!hero) throw new Error("beginRoom did not spawn a hero");
    lastWorld = world;

    const living = () =>
      world.entities.filter((e) => e.kind === "enemy" && e.deadAtTick < 0).length;

    let ticks = 0;
    while (!world.over && living() > 0 && ticks < TICK_CAP) {
      botStep(world);
      stepWorld(world);
      ticks++;
    }

    if (living() > 0 || hero.deadAtTick >= 0) break;

    cleared = level;
    // Mirrors the clear-transition effect in page.tsx: settle (sweep +
    // mend), then shop, then carry forward.
    settleClear(world);
    const shop = openShop(level);
    shopper(world, shop, level);
    carry = carryForward(world);
  }

  const world = lastWorld as World;
  return { cleared, mods: world.mods, purse: world.purse, stats: statsOf(world) };
}

/** How many independent careless runs `carelessSweep` draws. */
const SWEEP_SIZE = 30;
/**
 * Spreads the sweep's salts apart. Not a room or shop seed — mixed only into
 * `careless`'s own rng — so the sweep cannot correlate with anything the
 * level generator or the offer draws do; it is purely fanning out 30
 * independent careless shoppers.
 */
const SWEEP_SALT_STEP = 0x9e3779b1;

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Plays `SWEEP_SIZE` independent careless runs and returns how far each got.
 *
 * A careless shopper's outcome is a random variable, not a fixed point — its
 * build depends on which cards were offered and which coin flips happened to
 * land. Asserting a single seed's result is a point estimate of that
 * distribution, and this plan has already shipped two real bugs from exactly
 * that shortcut (a reach-frequency threshold tuned to one lucky seed window,
 * a reroll-distinctness check that exercised one level). A third time, in
 * the opposite direction, is what motivated this sweep: salt 0 alone dies at
 * the first `ring` encirclement (gated to level 8) while most of the other
 * 29 salts clear the whole ladder — a single-seed assertion on salt 0 would
 * have reported "the economy is broken" off a result the distribution says
 * is the exception, not the rule.
 */
function carelessSweep(maxLevel: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < SWEEP_SIZE; i++) {
    results.push(playRun(careless(i * SWEEP_SALT_STEP), maxLevel).cleared);
  }
  return results;
}

describe("the level ladder", () => {
  // `cleared` alone only catches catastrophe: halving reach's own effect
  // (`reachBonus + 8` -> `+ 4` in upgrades.ts) still clears level 20 on the
  // difficulty cushion, because `RunResult.stats` was returned but never
  // asserted on. Pinning the final built stat catches a quieter nerf too.
  // Measured 2026-08-03 against the real catalogue: 13 reach purchases by
  // level 20 give reachBonus 104, stats.reach 150 (base 46 + 104). The bar
  // sits well below that but above what the halved card produces (reachBonus
  // 52, stats.reach 98) so a real nerf still trips it.
  it("lets a reach-focused run climb to level 20", () => {
    const r = playRun(greedyReach, 20);
    expect(r.cleared).toBe(20);
    expect(r.stats.reach).toBeGreaterThanOrEqual(140);
  });

  // Same reasoning as the reach bar above, for the damage-focused build.
  // Measured 2026-08-03: 2 damage purchases by level 12 give damageBonus 8,
  // stats.damage 18 (base 10 + 8). A comparable halving of the damage card
  // (damageBonus + 4 -> + 2) produces damageBonus 4, stats.damage 14 — below
  // this bar.
  it("lets a damage-focused run reach level 12", () => {
    const r = playRun(damageOnly, 12);
    expect(r.cleared).toBeGreaterThanOrEqual(12);
    expect(r.stats.damage).toBeGreaterThanOrEqual(16);
  });

  // The load-bearing one, and the one bar in this file that measures a
  // distribution rather than a single seed — see carelessSweep's doc comment
  // for why a point estimate is not trustworthy here the way it is for the
  // three directed-strategy bars above and below.
  //
  // Measured 2026-08-03 (task-9-report.md has the full per-salt trace):
  // 27/30 salts reach >=15, mean 18.7, median 20. The 3 misses all die in
  // level 8 against the game's first `ring` encirclement (gated to level 8
  // in level.ts) holding a build around reachBonus 24 — a real, deliberate
  // difficulty spike at the first surround room, not a bug, and left alone
  // on purpose. 24/30 (80%) is the pass bar: 3 seeds of headroom below the
  // measured 27, so an incidental change will not flake this, but a real
  // regression in the economy will still trip it. The median bar guards
  // against a bar met only by a handful of spectacular runs dragging up a
  // poor middle.
  it("lets a careless shopper reach level 15, most of the time", () => {
    const results = carelessSweep(20);
    const passCount = results.filter((cleared) => cleared >= 15).length;
    expect(passCount).toBeGreaterThanOrEqual(24);
    expect(median(results)).toBeGreaterThanOrEqual(15);
  });

  // Measured 2026-08-03: neverBuy clears 13, dies in 14 — the shop is doing
  // real work rather than being decorative. `toBeLessThan(20)` used to be the
  // bar here, which a run reaching all the way to 19 would still satisfy;
  // tightened to 14 (one level of headroom above the measured 13) so a real
  // loosening of the economy — e.g. inflating COIN_VALUE, which lets a
  // no-shopping run coast past this bar too — trips the suite instead of
  // passing 159/159 unnoticed.
  it("lets a run that buys nothing fail, and that is a real choice", () => {
    expect(playRun(neverBuy, 20).cleared).toBeLessThanOrEqual(14);
  });

  // Pins the design invariant that otherwise lives only in comments (see
  // upgrades.ts's `reach` card and world.ts's `COIN_VALUE`): level one is two
  // grunts at COIN_VALUE=5 coins each, and Long Arm is priced at exactly that
  // income, so the very first shop is a real decision — buy the one card you
  // can afford, or save toward something else — never a shrug because
  // nothing is affordable, and never a freebie because everything is. This
  // fails if income drifts (e.g. COIN_VALUE or the level-1 enemy count) or if
  // the cheapest card's price drifts out of sync with it.
  it("clearing level 1 yields exactly enough to buy exactly one Long Arm", () => {
    const reach = UPGRADES.find((u) => u.id === "reach");
    if (!reach) throw new Error("expected a 'reach' upgrade in the catalogue");

    const income = playRun(neverBuy, 1).purse;

    expect(income).toBe(10);
    expect(reach.price).toBe(10);
    // Exactly one, not "at least one": affording two would mean the first
    // shop isn't a choice at all.
    expect(income).toBeGreaterThanOrEqual(reach.price);
    expect(income).toBeLessThan(reach.price * 2);
  });

  it("never opens a room with an enemy already on top of the hero", () => {
    for (let level = 1; level <= 30; level++) {
      const room = levelFor(level);
      for (const spawn of room.spawns) {
        const gap = Math.hypot(spawn.x - room.heroStart.x, spawn.y - room.heroStart.y);
        expect(gap, `level ${level} spawn at ${spawn.x},${spawn.y}`).toBeGreaterThan(60);
      }
    }
  });

  it("keeps room size readable at high levels", () => {
    // The count dial is capped so a late room is a fight, not a wall of bodies.
    expect(paramsForLevel(99).enemies).toBeLessThanOrEqual(14);
    expect(paramsForLevel(99).enemyHp).toBeGreaterThan(paramsForLevel(10).enemyHp);
  });
});
