# CRITTER KNIGHT Economy Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kills drop coins; a shop between rooms sells stat upgrades that
measurably change how the hero fights; and the ladder stays winnable now that
swing reach is bought rather than given.

**Architecture:** All run-modifiable numbers funnel through one function,
`statsOf(world)`, so no consumer re-derives a stat locally and later phases
(gear, evolution forms) slot in as extra layers rather than as scattered
arithmetic. Coins and the shop live in `engine/` as pure simulation state, so
the headless harness can play a full shopping run.

**Tech Stack:** TypeScript strict, Next.js 15 App Router (static export),
React 19, vitest, Tailwind 3, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-02-critter-knight-economy-design.md`

**Scope:** This plan covers **phase 1 of six** from the spec. Phases 2–6 (gear,
monsters, terrain, meta/evolution, balance) each get their own plan, written
once its predecessor lands — later phases depend on decisions that only become
concrete during implementation, and a plan written now for phase 5 would be
stale before it was read.

## Global Constraints

- `engine/` and `data/` import nothing from React, the DOM, or canvas.
- No `Math.random()` or `Date.now()` in `engine/` or `data/`. Randomness comes
  from `makeRng` (`@/app/game/_shared/rng`), seeded per level.
- Fixed timestep `FIXED_DT = 1/120`. Tick counts are integers.
- `_shared/critters.ts` is NOT modified.
- Every `RunMods` field must be read by the simulation — enforced by a guard
  test in Task 4.
- Arena stays `360 × 560`.
- TypeScript `strict: true`. `npx tsc --noEmit -p .` must pass at every commit.
- Run tests with `pnpm test <path>`; full suite with `pnpm test`.
- The full suite passes 1096 tests before this plan begins. It must never go
  down; every task adds tests.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/knight/data/upgrades.ts` | **Create.** `RunMods`, `defaultMods`, `UPGRADES`, `rollOffers`. Owns what an upgrade *is*. |
| `app/knight/data/upgrades.test.ts` | **Create.** Catalogue integrity + the mod-consumption guard. |
| `app/knight/engine/stats.ts` | **Create.** `Stats`, `BASE_STATS`, `statsOf`. The single place a final number is computed. |
| `app/knight/engine/stats.test.ts` | **Create.** |
| `app/knight/engine/coins.ts` | **Create.** `Coin`, drops, magnet, sweep. |
| `app/knight/engine/coins.test.ts` | **Create.** |
| `app/knight/engine/shop.ts` | **Create.** `Offer`, `ShopState`, rolling, reroll pricing, purchase. |
| `app/knight/engine/shop.test.ts` | **Create.** |
| `app/knight/engine/world.ts` | **Modify.** `RunMods` moves out; world gains `coins`, `purse`; `stepWorld` runs coins; stats replace constants. |
| `app/knight/engine/combat.ts` | **Modify.** `foeInReach` uses earned reach; damage/knockback/timing read `statsOf`. |
| `app/knight/engine/move.ts` | **Modify.** Hero speed reads `statsOf`. |
| `app/knight/ui/Shop.tsx` | **Create.** Between-room shop panel. |
| `app/knight/ui/Hud.tsx` | **Modify.** Show the purse. |
| `app/knight/render/draw.ts` | **Modify.** Draw coins. |
| `app/knight/page.tsx` | **Modify.** Shop replaces the "+9 reach" modal; mods persist across rooms in a run. |
| `app/knight/engine/ladder.test.ts` | **Modify.** Shopper personalities replace the fixed-grant assumptions. |

---

## Task 1: Earned reach must actually start a swing

`foeInReach` gates on the hardcoded `SWING_REACH`, so a swing never *begins*
against a foe beyond base reach — the earned bonus only widens what an
already-started swing can hit. Verified on shipped code: with `reachBonus = 45`
(effective reach 91) and a foe pinned at 80px, the hero never leaves `idle`.

This is first because every later task's balance numbers are meaningless while
half the reach stat is inert.

**Files:**
- Modify: `app/knight/engine/combat.ts` (the `foeInReach` function)
- Test: `app/knight/engine/combat.test.ts`

**Interfaces:**
- Consumes: `reachOf(world: World): number` — already exported from `combat.ts`.
- Produces: no signature change. `foeInReach` stays module-private.

- [ ] **Step 1: Write the failing test**

Append to `app/knight/engine/combat.test.ts`:

```ts
describe("earned reach starts swings, not just lands them", () => {
  it("swings at a foe inside earned reach but outside base reach", () => {
    const w = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    w.mods.reachBonus = 45; // effective reach 91
    const hero = spawnHero(w, { x: 180, y: 300 });
    // 80px away: outside base reach (46 + 11 = 57), inside earned (91 + 11 = 102).
    const foe = spawnEnemy(w, { x: 260, y: 300 }, 500);

    let swung = false;
    for (let i = 0; i < 60; i++) {
      // Pin the foe so only the reach test decides whether a swing starts.
      foe.pos.x = 260;
      foe.pos.y = 300;
      foe.vel.x = 0;
      foe.vel.y = 0;
      stepWorld(w);
      if (hero.attack.phase !== "idle") swung = true;
    }

    expect(swung).toBe(true);
  });

  it("still refuses a foe outside even the earned reach", () => {
    const w = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    w.mods.reachBonus = 45;
    const hero = spawnHero(w, { x: 180, y: 300 });
    const foe = spawnEnemy(w, { x: 340, y: 300 }, 500); // 160px — well beyond 102

    for (let i = 0; i < 60; i++) {
      foe.pos.x = 340;
      foe.pos.y = 300;
      foe.vel.x = 0;
      foe.vel.y = 0;
      stepWorld(w);
    }

    expect(hero.attack.phase).toBe("idle");
    expect(foe.hp).toBe(500);
  });
});
```

- [ ] **Step 2: Run it and watch the first case fail**

Run: `pnpm test app/knight/engine/combat`
Expected: "swings at a foe inside earned reach" FAILS (`expected false to be
true`); "still refuses a foe outside" PASSES.

- [ ] **Step 3: Make the gate use earned reach**

In `app/knight/engine/combat.ts`, inside `foeInReach`, replace:

```ts
    if (dist > SWING_REACH + t.radius) continue;
```

with:

```ts
    if (dist > reachOf(world) + t.radius) continue;
```

Then extend that function's doc comment with a sentence explaining why:

```
 * Gated on reachOf, not the base SWING_REACH: the decision to *start* a swing
 * and the decision of what that swing *hits* have to use the same number.
 * While they disagreed, a bought reach bonus widened the blow but never
 * widened the trigger, so a hero with +45 reach stood idle beside a foe at
 * 80px — the "auto attack doesn't work" bug in its purest form.
```

- [ ] **Step 4: Run the whole knight suite**

Run: `pnpm test app/knight`
Expected: PASS. Note that `ladder.test.ts` timings may shift, because heroes
with a reach bonus now engage sooner. If a ladder assertion fails, do NOT
weaken it — record the failure in your report; Task 9 re-anchors that file.

- [ ] **Step 5: Commit**

```bash
git add app/knight/engine/combat.ts app/knight/engine/combat.test.ts
git commit -m "fix(knight): earned reach must start a swing, not only land one"
```

---

## Task 2: The Stats layer

One function computes every run-modifiable number. Nothing else re-derives one.

**Files:**
- Create: `app/knight/engine/stats.ts`
- Create: `app/knight/engine/stats.test.ts`

**Interfaces:**
- Consumes: `World` (type-only) from `./world`; `RunMods` from `../data/upgrades`
  (created in Task 3 — for this task, import it from `./world` where it still
  lives, and Task 3 moves the import).
- Produces:
  - `export interface Stats { reach, arc, damage, maxHp, moveSpeed, knockback, windupTicks, activeTicks, recoverTicks, iframeTicks, coinMult: number }` — `arc` in radians, `reach`/`knockback`/`moveSpeed` in px or px/s, tick fields integers.
  - `export const BASE_STATS: Stats`
  - `export function statsOf(world: World): Stats`

- [ ] **Step 1: Write the failing test**

Create `app/knight/engine/stats.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld } from "./world";
import { BASE_STATS, statsOf } from "./stats";

const arena = { width: 360, height: 560 };

describe("statsOf", () => {
  it("returns the base numbers for an unmodified run", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(statsOf(w)).toEqual(BASE_STATS);
  });

  it("adds flat bonuses", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.reachBonus = 16;
    w.mods.damageBonus = 4;
    w.mods.maxHpBonus = 2;
    w.mods.iframeBonus = 8;

    const s = statsOf(w);
    expect(s.reach).toBe(BASE_STATS.reach + 16);
    expect(s.damage).toBe(BASE_STATS.damage + 4);
    expect(s.maxHp).toBe(BASE_STATS.maxHp + 2);
    expect(s.iframeTicks).toBe(BASE_STATS.iframeTicks + 8);
  });

  it("applies multipliers", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.moveSpeedMult = 1.25;
    w.mods.knockbackMult = 2;
    w.mods.coinMult = 1.5;

    const s = statsOf(w);
    expect(s.moveSpeed).toBeCloseTo(BASE_STATS.moveSpeed * 1.25, 5);
    expect(s.knockback).toBeCloseTo(BASE_STATS.knockback * 2, 5);
    expect(s.coinMult).toBeCloseTo(1.5, 5);
  });

  it("keeps swing timings whole ticks and never lets a phase vanish", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.swingSpeedMult = 0.01; // absurd on purpose

    const s = statsOf(w);
    for (const t of [s.windupTicks, s.activeTicks, s.recoverTicks]) {
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(1);
    }
  });

  it("never returns a negative or zero-length reach", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.reachBonus = -1000;
    expect(statsOf(w).reach).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test app/knight/engine/stats`
Expected: FAIL — cannot resolve `./stats`.

- [ ] **Step 3: Implement**

Create `app/knight/engine/stats.ts`:

```ts
import type { World } from "./world";
import {
  SWING_REACH,
  SWING_ARC,
  SWING_DAMAGE,
  KNOCKBACK,
  WINDUP_TICKS,
  ACTIVE_TICKS,
  RECOVER_TICKS,
  IFRAME_TICKS,
} from "./combat";
import { HERO_HP } from "./constants";
import { HERO_SPEED } from "./move";

/**
 * Every number a run can change, resolved.
 *
 * One function owns this arithmetic so no consumer re-derives a stat locally.
 * Later phases add layers — equipped gear, the current evolution form — and
 * they slot in here rather than scattering multipliers through the engine.
 */
export interface Stats {
  reach: number;
  /** Total width of the swing wedge, in radians. */
  arc: number;
  damage: number;
  maxHp: number;
  moveSpeed: number;
  knockback: number;
  windupTicks: number;
  activeTicks: number;
  recoverTicks: number;
  iframeTicks: number;
  coinMult: number;
}

export const BASE_STATS: Stats = {
  reach: SWING_REACH,
  arc: SWING_ARC,
  damage: SWING_DAMAGE,
  maxHp: HERO_HP,
  moveSpeed: HERO_SPEED,
  knockback: KNOCKBACK,
  windupTicks: WINDUP_TICKS,
  activeTicks: ACTIVE_TICKS,
  recoverTicks: RECOVER_TICKS,
  iframeTicks: IFRAME_TICKS,
  coinMult: 1,
};

/** At least one tick, always whole: a zero-length phase would never resolve. */
const ticks = (base: number, mult: number): number =>
  Math.max(1, Math.round(base * mult));

export function statsOf(world: World): Stats {
  const m = world.mods;
  return {
    // Floored at 1px: a non-positive reach would make the hero unable to ever
    // hit anything, which is a softlock rather than a weak build.
    reach: Math.max(1, BASE_STATS.reach + m.reachBonus),
    arc: BASE_STATS.arc,
    damage: Math.max(1, BASE_STATS.damage + m.damageBonus),
    maxHp: Math.max(1, BASE_STATS.maxHp + m.maxHpBonus),
    moveSpeed: BASE_STATS.moveSpeed * m.moveSpeedMult,
    knockback: BASE_STATS.knockback * m.knockbackMult,
    windupTicks: ticks(BASE_STATS.windupTicks, m.swingSpeedMult),
    activeTicks: ticks(BASE_STATS.activeTicks, m.swingSpeedMult),
    recoverTicks: ticks(BASE_STATS.recoverTicks, m.swingSpeedMult),
    iframeTicks: Math.max(0, BASE_STATS.iframeTicks + m.iframeBonus),
    coinMult: m.coinMult,
  };
}
```

Create `app/knight/engine/constants.ts` holding the three numbers that
currently sit unexported inside `world.ts`, so `stats.ts` can read them without
importing `world.ts`'s runtime (which would be circular):

```ts
/** Entity constants shared by the world and the stats layer. */
export const HERO_RADIUS = 12;
export const HERO_HP = 5;
export const ENEMY_RADIUS = 11;
```

`HERO_SPEED` is already exported from `move.ts` (value 132) and `move.ts`
imports only types, so `stats.ts` can import it from there directly — do not
duplicate it into `constants.ts`, and do not change hero speed in this task.

In `app/knight/engine/world.ts`, delete the local `HERO_RADIUS`, `HERO_HP` and
`ENEMY_RADIUS` consts and import them from `./constants` instead.

Extend `RunMods` in `app/knight/engine/world.ts` to the nine fields (Task 3
moves this whole block to `data/upgrades.ts`):

```ts
export interface RunMods {
  reachBonus: number;
  damageBonus: number;
  maxHpBonus: number;
  iframeBonus: number;
  swingSpeedMult: number;
  moveSpeedMult: number;
  knockbackMult: number;
  coinMult: number;
  healOnClear: number;
}

export function defaultMods(): RunMods {
  return {
    reachBonus: 0,
    damageBonus: 0,
    maxHpBonus: 0,
    iframeBonus: 0,
    swingSpeedMult: 1,
    moveSpeedMult: 1,
    knockbackMult: 1,
    coinMult: 1,
    healOnClear: 0,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test app/knight/engine/stats && npx tsc --noEmit -p .`
Expected: PASS, and typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add app/knight/engine/stats.ts app/knight/engine/stats.test.ts \
        app/knight/engine/constants.ts app/knight/engine/world.ts \
        app/knight/engine/move.ts
git commit -m "feat(knight): one stats layer resolving mods into final numbers"
```

---

## Task 3: The engine reads Stats, not constants

Wiring only. Behaviour must not change while every modifier is at its default.

**Files:**
- Modify: `app/knight/engine/combat.ts`, `app/knight/engine/move.ts`,
  `app/knight/engine/world.ts`
- Test: `app/knight/engine/stats.test.ts`

**Interfaces:**
- Consumes: `statsOf`, `Stats` from `./stats`.
- Produces: `reachOf(world)` now returns `statsOf(world).reach`.

- [ ] **Step 1: Write the failing test**

Append to `app/knight/engine/stats.test.ts`:

```ts
import { spawnHero, spawnEnemy, stepWorld } from "./world";

describe("the engine actually reads Stats", () => {
  it("spawns the hero with the modified max HP", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.maxHpBonus = 3;
    const hero = spawnHero(w, { x: 180, y: 470 });
    expect(hero.maxHp).toBe(BASE_STATS.maxHp + 3);
    expect(hero.hp).toBe(BASE_STATS.maxHp + 3);
  });

  it("deals the modified damage", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.damageBonus = 7;
    spawnHero(w, { x: 180, y: 300 });
    const foe = spawnEnemy(w, { x: 210, y: 300 }, 500);

    const before = foe.hp;
    for (let i = 0; i < 40; i++) {
      foe.pos.x = 210;
      foe.pos.y = 300;
      foe.vel.x = 0;
      foe.vel.y = 0;
      stepWorld(w);
      if (foe.hp < before) break;
    }

    expect(before - foe.hp).toBe(BASE_STATS.damage + 7);
  });

  it("swings faster with a lower swingSpeedMult", () => {
    const cycle = (mult: number): number => {
      const w = createWorld({ arena, seed: 1 });
      w.mods.swingSpeedMult = mult;
      const hero = spawnHero(w, { x: 180, y: 300 });
      const foe = spawnEnemy(w, { x: 210, y: 300 }, 100000);

      let swings = 0;
      let prev = hero.attack.phase;
      for (let i = 0; i < 1200; i++) {
        foe.pos.x = 210;
        foe.pos.y = 300;
        foe.vel.x = 0;
        foe.vel.y = 0;
        stepWorld(w);
        if (prev !== "windup" && hero.attack.phase === "windup") swings++;
        prev = hero.attack.phase;
      }
      return swings;
    };

    expect(cycle(0.5)).toBeGreaterThan(cycle(1));
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test app/knight/engine/stats`
Expected: all three new cases FAIL — HP, damage and timing are still constants.

- [ ] **Step 3: Wire each consumer**

In `app/knight/engine/combat.ts`:

```ts
import { statsOf } from "./stats";

export function reachOf(world: World): number {
  return statsOf(world).reach;
}
```

Delete the `SWING_REACH + world.mods.reachBonus` body. Then inside
`updateAttack`, read the stats once at the top and use them:

```ts
  const s = statsOf(world);
```

- `case "windup"`: `if (elapsed >= s.windupTicks)`, and
  `damageEntity(world, target, s.damage, e.pos.x, e.pos.y, s.knockback)`,
  and `hits.push({ targetId: target.id, damage: s.damage, killed: ... })`
- `case "active"`: `if (elapsed >= s.activeTicks)`
- `case "recover"`: `if (elapsed >= s.recoverTicks)`
- `inSwingArc`'s half-angle: keep `SWING_ARC` for now — `arc` becomes
  weapon-driven in phase 2 and changing it here would be unused generality.

In `app/knight/engine/world.ts`, `spawnHero` uses the stats max HP:

```ts
export function spawnHero(world: World, pos: Vec2): Entity {
  const s = statsOf(world);
  const hero = baseEntity(world, "hero", pos, HERO_RADIUS, s.maxHp);
  hero.iframeTicks = s.iframeTicks;
  return hero;
}
```

In `app/knight/engine/move.ts`, `steerHero` takes its top speed from
`statsOf(world).moveSpeed`. If its signature is `steerHero(hero, target, dt)`,
change it to `steerHero(world, hero, target, dt)` and update the single call
site in `stepWorld`; do not thread a bare number through.

- [ ] **Step 4: Run the full knight suite**

Run: `pnpm test app/knight && npx tsc --noEmit -p .`
Expected: PASS. Existing tests must not need edits — every default leaves the
numbers exactly as they were. If an existing test fails, the wiring changed
behaviour at default values, which is a bug in this task, not in the test.

- [ ] **Step 5: Commit**

```bash
git add app/knight/engine
git commit -m "feat(knight): combat, movement and spawning read the stats layer"
```

---

## Task 4: The upgrade catalogue and its guard

**Files:**
- Create: `app/knight/data/upgrades.ts`
- Create: `app/knight/data/upgrades.test.ts`
- Modify: `app/knight/engine/world.ts` (import `RunMods` instead of defining it)

**Interfaces:**
- Consumes: `Rng` from `@/app/game/_shared/rng`.
- Produces:
  - `export interface RunMods` (the nine fields from Task 2) and `defaultMods(): RunMods` — moved here from `world.ts`.
  - `export interface Upgrade { id: string; name: string; description: string; price: number; weight: number; apply(mods: RunMods): RunMods }`
  - `export const UPGRADES: readonly Upgrade[]`
  - `export function rollOffers(rng: Rng, count?: number): Upgrade[]` — default count 3, distinct ids, weighted.

- [ ] **Step 1: Write the failing test**

Create `app/knight/data/upgrades.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { makeRng } from "@/app/game/_shared/rng";
import { UPGRADES, rollOffers, defaultMods, type RunMods } from "./upgrades";

const ENGINE_DIR = join(__dirname, "..", "engine");

/** Everything that may legitimately consume a run modifier. */
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

  it("favours reach, the stat the ladder depends on", () => {
    let reach = 0;
    for (let seed = 0; seed < 400; seed++) {
      if (rollOffers(makeRng(seed)).some((u) => u.id === "reach")) reach++;
    }
    // Weight 5 of 24 total across three distinct draws — comfortably over half.
    expect(reach).toBeGreaterThan(200);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test app/knight/data/upgrades`
Expected: FAIL — cannot resolve `./upgrades`.

- [ ] **Step 3: Implement**

Create `app/knight/data/upgrades.ts`. Move `RunMods` and `defaultMods` here
verbatim from `world.ts`, then add:

```ts
import type { Rng } from "@/app/game/_shared/rng";

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Relative draw weight. Reach is heaviest on purpose — see rollOffers. */
  weight: number;
  /** Returns a new mods object; never mutates its argument. */
  apply(mods: RunMods): RunMods;
}

export const UPGRADES: readonly Upgrade[] = [
  {
    id: "reach",
    name: "Long Arm",
    description: "+8 swing reach",
    price: 12,
    weight: 5,
    apply: (m) => ({ ...m, reachBonus: m.reachBonus + 8 }),
  },
  {
    id: "damage",
    name: "Sharpened",
    description: "+4 damage a swing",
    price: 18,
    weight: 3,
    apply: (m) => ({ ...m, damageBonus: m.damageBonus + 4 }),
  },
  {
    id: "heart",
    name: "Stout",
    description: "+1 heart",
    price: 26,
    weight: 3,
    apply: (m) => ({ ...m, maxHpBonus: m.maxHpBonus + 1 }),
  },
  {
    id: "swift",
    name: "Quickstep",
    description: "Move 12% faster",
    price: 20,
    weight: 3,
    apply: (m) => ({ ...m, moveSpeedMult: m.moveSpeedMult * 1.12 }),
  },
  {
    id: "flurry",
    name: "Flurry",
    description: "Swing 15% faster",
    price: 30,
    weight: 2,
    apply: (m) => ({ ...m, swingSpeedMult: m.swingSpeedMult * 0.85 }),
  },
  {
    id: "heavy",
    name: "Heavy Hands",
    description: "40% more knockback",
    price: 16,
    weight: 2,
    apply: (m) => ({ ...m, knockbackMult: m.knockbackMult * 1.4 }),
  },
  {
    id: "greed",
    name: "Coin Sense",
    description: "35% more coins",
    price: 22,
    weight: 2,
    apply: (m) => ({ ...m, coinMult: m.coinMult * 1.35 }),
  },
  {
    id: "ward",
    name: "Warded",
    description: "Longer mercy after a hit",
    price: 24,
    weight: 2,
    apply: (m) => ({ ...m, iframeBonus: m.iframeBonus + 8 }),
  },
  {
    id: "mend",
    name: "Mending",
    description: "+1 heart back each room",
    price: 34,
    weight: 2,
    apply: (m) => ({ ...m, healOnClear: m.healOnClear + 1 }),
  },
];

/**
 * Draw `count` distinct upgrades, weighted.
 *
 * Weighting is not decoration. Reach is the stat the ladder's difficulty curve
 * is balanced against, and it is no longer granted automatically — so a player
 * who buys without a plan still has to drift toward it, or the game becomes
 * unwinnable through inattention rather than through choice.
 */
export function rollOffers(rng: Rng, count = 3): Upgrade[] {
  const pool = [...UPGRADES];
  const picks: Upgrade[] = [];
  const wanted = Math.min(count, pool.length);

  while (picks.length < wanted) {
    const total = pool.reduce((sum, u) => sum + u.weight, 0);
    let roll = rng.int(total);
    let chosen = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll < 0) {
        chosen = i;
        break;
      }
    }
    picks.push(pool[chosen]);
    pool.splice(chosen, 1);
  }

  return picks;
}
```

In `app/knight/engine/world.ts`, delete the `RunMods` interface and
`defaultMods` and import them: `import { defaultMods, type RunMods } from "../data/upgrades";`
Re-export the type so existing importers keep working:
`export type { RunMods };`

Check `rng.int`'s exact contract in `app/game/_shared/rng.ts` before relying on
it. If `int(n)` is exclusive of `n`, the code above is correct as written; if it
is inclusive, use `rng.int(total - 1)`.

- [ ] **Step 4: Run the tests**

Run: `pnpm test app/knight && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/knight/data/upgrades.ts app/knight/data/upgrades.test.ts \
        app/knight/engine/world.ts
git commit -m "feat(knight): upgrade catalogue with a guard that every mod is read"
```

---

## Task 5: Coins

**Files:**
- Create: `app/knight/engine/coins.ts`
- Create: `app/knight/engine/coins.test.ts`
- Modify: `app/knight/engine/world.ts`

**Interfaces:**
- Consumes: `statsOf` from `./stats`; `Vec2` from `./types`.
- Produces:
  - `export interface Coin { id: number; pos: Vec2; vel: Vec2; value: number }`
  - `export const MAGNET_RADIUS = 70`
  - `export function dropCoins(world: World, pos: Vec2, value: number): void`
  - `export function updateCoins(world: World, dt: number): void`
  - `export function sweepCoins(world: World): void`
  - `World` gains `coins: Coin[]` and `purse: number`.

- [ ] **Step 1: Write the failing test**

Create `app/knight/engine/coins.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, stepWorld, FIXED_DT } from "./world";
import { dropCoins, updateCoins, sweepCoins, MAGNET_RADIUS } from "./coins";

const arena = { width: 360, height: 560 };

describe("coins", () => {
  it("drops the stated value, scaled by coinMult and floored at one", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.coinMult = 1.35;
    dropCoins(w, { x: 100, y: 100 }, 2);
    expect(w.coins.reduce((n, c) => n + c.value, 0)).toBe(2); // floor(2 * 1.35)

    const w2 = createWorld({ arena, seed: 1 });
    w2.mods.coinMult = 0.01;
    dropCoins(w2, { x: 100, y: 100 }, 2);
    expect(w2.coins.reduce((n, c) => n + c.value, 0)).toBeGreaterThanOrEqual(1);
  });

  it("flies to a hero standing inside the magnet radius", () => {
    const w = createWorld({ arena, seed: 1 });
    const hero = spawnHero(w, { x: 180, y: 300 });
    dropCoins(w, { x: 180 + MAGNET_RADIUS - 10, y: 300 }, 1);

    for (let i = 0; i < 240 && w.coins.length > 0; i++) updateCoins(w, FIXED_DT);

    expect(w.coins).toHaveLength(0);
    expect(w.purse).toBe(1);
    expect(hero.hp).toBeGreaterThan(0);
  });

  it("ignores a hero far outside the magnet radius", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnHero(w, { x: 30, y: 30 });
    dropCoins(w, { x: 330, y: 530 }, 1);

    for (let i = 0; i < 120; i++) updateCoins(w, FIXED_DT);

    expect(w.coins).toHaveLength(1);
    expect(w.purse).toBe(0);
  });

  it("sweeps every remaining coin into the purse", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnHero(w, { x: 30, y: 30 });
    dropCoins(w, { x: 330, y: 530 }, 3);
    dropCoins(w, { x: 300, y: 500 }, 2);

    sweepCoins(w);

    expect(w.coins).toHaveLength(0);
    expect(w.purse).toBe(5);
  });

  it("credits the purse when an enemy dies in a real fight", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 205, y: 300 }, 10);

    for (let i = 0; i < 1200; i++) {
      stepWorld(w);
      if (!w.entities.some((e) => e.kind === "enemy" && e.deadAtTick < 0)) break;
    }
    sweepCoins(w);

    expect(w.purse).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test app/knight/engine/coins`
Expected: FAIL — cannot resolve `./coins`.

- [ ] **Step 3: Implement**

Create `app/knight/engine/coins.ts`:

```ts
import type { Vec2 } from "./types";
import type { World } from "./world";
import { heroOf } from "./world";
import { statsOf } from "./stats";

export interface Coin {
  id: number;
  pos: Vec2;
  vel: Vec2;
  value: number;
}

/** How close the hero must be before a coin comes to it. */
export const MAGNET_RADIUS = 70;
/** How fast a magnetised coin travels, px/sec. */
const MAGNET_SPEED = 260;
/** Close enough to count as collected. */
const PICKUP_RADIUS = 10;

/**
 * Drop one coin worth the enemy's value, scaled by the run's coin multiplier.
 *
 * One coin rather than a scatter: a scatter looks richer but leaves stragglers
 * behind terrain, and every straggler is a coin the player earned and did not
 * receive. Floored at 1 so a low multiplier can never zero out a kill.
 */
export function dropCoins(world: World, pos: Vec2, value: number): void {
  const scaled = Math.max(1, Math.floor(value * statsOf(world).coinMult));
  world.coins.push({
    id: world.nextId++,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    value: scaled,
  });
}

/** Magnetise nearby coins toward the hero and collect the ones that arrive. */
export function updateCoins(world: World, dt: number): void {
  const hero = heroOf(world);
  if (!hero || hero.deadAtTick >= 0) return;

  const remaining: Coin[] = [];
  for (const coin of world.coins) {
    const dx = hero.pos.x - coin.pos.x;
    const dy = hero.pos.y - coin.pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= PICKUP_RADIUS) {
      world.purse += coin.value;
      continue;
    }

    if (dist <= MAGNET_RADIUS) {
      coin.vel.x = (dx / dist) * MAGNET_SPEED;
      coin.vel.y = (dy / dist) * MAGNET_SPEED;
    } else {
      coin.vel.x = 0;
      coin.vel.y = 0;
    }

    coin.pos.x += coin.vel.x * dt;
    coin.pos.y += coin.vel.y * dt;
    remaining.push(coin);
  }
  world.coins = remaining;
}

/**
 * Bank every coin still on the floor.
 *
 * Called when a room clears, so a coin can never be stranded — behind terrain,
 * inside a pit, or simply somewhere the player did not walk. Money you earned
 * by winning the room is money you keep.
 */
export function sweepCoins(world: World): void {
  for (const coin of world.coins) world.purse += coin.value;
  world.coins = [];
}
```

In `app/knight/engine/world.ts`:

1. Add to `World`: `coins: Coin[];` and `purse: number;`
2. Add to `createWorld`: `coins: [], purse: 0,`
3. In `stepWorld`, after the swing loop resolves hits, drop coins for kills:

```ts
    for (const hit of swings) {
      const target = world.entities.find((t) => t.id === hit.targetId);
      if (!target) continue;
      if (hit.killed) dropCoins(world, target.pos, COIN_VALUE);
      // ... existing pushFx call stays as-is
    }
```

with `const COIN_VALUE = 2;` beside the other world constants and a comment
noting that per-archetype coin values arrive with the monster table in phase 3.

4. Near the end of `stepWorld`, before `expireFx(world)`:

```ts
  updateCoins(world, FIXED_DT);
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test app/knight && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/knight/engine/coins.ts app/knight/engine/coins.test.ts \
        app/knight/engine/world.ts
git commit -m "feat(knight): coins drop from kills, magnet to the hero, sweep on clear"
```

---

## Task 6: The shop

**Files:**
- Create: `app/knight/engine/shop.ts`
- Create: `app/knight/engine/shop.test.ts`

**Interfaces:**
- Consumes: `UPGRADES`, `rollOffers`, `Upgrade` from `../data/upgrades`;
  `makeRng` from `@/app/game/_shared/rng`; `seedForLevel` from `./level`.
- Produces:
  - `export interface Offer { upgrade: Upgrade; price: number }`
  - `export interface ShopState { offers: Offer[]; rerolls: number }`
  - `export function openShop(level: number): ShopState`
  - `export function rerollCost(rerolls: number): number`
  - `export function reroll(world: World, shop: ShopState, level: number): boolean`
  - `export function purchase(world: World, shop: ShopState, index: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `app/knight/engine/shop.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld } from "./world";
import { defaultMods } from "../data/upgrades";
import { openShop, purchase, reroll, rerollCost } from "./shop";

const arena = { width: 360, height: 560 };

describe("the shop", () => {
  it("opens with three priced offers", () => {
    const shop = openShop(3);
    expect(shop.offers).toHaveLength(3);
    for (const o of shop.offers) expect(o.price).toBe(o.upgrade.price);
    expect(shop.rerolls).toBe(0);
  });

  it("offers the same things for the same level", () => {
    expect(openShop(4).offers.map((o) => o.upgrade.id)).toEqual(
      openShop(4).offers.map((o) => o.upgrade.id),
    );
  });

  it("prices rerolls at five, rising by three each time", () => {
    expect(rerollCost(0)).toBe(5);
    expect(rerollCost(1)).toBe(8);
    expect(rerollCost(2)).toBe(11);
  });

  it("buys an affordable upgrade, spending the coins and applying the mod", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 100;
    const shop = openShop(2);
    const price = shop.offers[0].price;

    expect(purchase(w, shop, 0)).toBe(true);
    expect(w.purse).toBe(100 - price);
    expect(w.mods).not.toEqual(defaultMods());
    expect(shop.offers[0]).toBeUndefined();
  });

  it("refuses an upgrade it cannot afford and changes nothing", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 1;
    const shop = openShop(2);

    expect(purchase(w, shop, 0)).toBe(false);
    expect(w.purse).toBe(1);
    expect(w.mods).toEqual(defaultMods());
    expect(shop.offers).toHaveLength(3);
  });

  it("refuses an out-of-range or already-bought slot", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 1000;
    const shop = openShop(2);

    expect(purchase(w, shop, 99)).toBe(false);
    expect(purchase(w, shop, -1)).toBe(false);
    expect(purchase(w, shop, 0)).toBe(true);
    expect(purchase(w, shop, 0)).toBe(false); // that slot is spent
  });

  it("rerolls for coins and produces a different set", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 50;
    const shop = openShop(2);
    const before = shop.offers.map((o) => o.upgrade.id);

    expect(reroll(w, shop, 2)).toBe(true);
    expect(w.purse).toBe(50 - 5);
    expect(shop.rerolls).toBe(1);
    expect(shop.offers.map((o) => o.upgrade.id)).not.toEqual(before);
  });

  it("refuses a reroll it cannot afford", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 2;
    const shop = openShop(2);
    const before = shop.offers.map((o) => o.upgrade.id);

    expect(reroll(w, shop, 2)).toBe(false);
    expect(w.purse).toBe(2);
    expect(shop.offers.map((o) => o.upgrade.id)).toEqual(before);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test app/knight/engine/shop`
Expected: FAIL — cannot resolve `./shop`.

- [ ] **Step 3: Implement**

Create `app/knight/engine/shop.ts`:

```ts
import { makeRng } from "@/app/game/_shared/rng";
import type { World } from "./world";
import { seedForLevel } from "./level";
import { rollOffers, type Upgrade } from "../data/upgrades";

export interface Offer {
  upgrade: Upgrade;
  price: number;
}

export interface ShopState {
  /** A bought slot becomes a hole, so the row does not reshuffle under a thumb. */
  offers: Offer[];
  rerolls: number;
}

const REROLL_BASE = 5;
const REROLL_STEP = 3;
/** Keeps a shop's offers from colliding with the room layout's own draws. */
const SHOP_SALT = 0x5109;

/** Rising, so rerolling is a real cost rather than a free spin to the best card. */
export function rerollCost(rerolls: number): number {
  return REROLL_BASE + REROLL_STEP * rerolls;
}

/** The same level always offers the same shop, so a room is a known quantity. */
export function openShop(level: number): ShopState {
  const rng = makeRng(seedForLevel(level) ^ SHOP_SALT);
  return {
    offers: rollOffers(rng).map((upgrade) => ({ upgrade, price: upgrade.price })),
    rerolls: 0,
  };
}

export function purchase(world: World, shop: ShopState, index: number): boolean {
  const offer = shop.offers[index];
  if (!offer) return false;
  if (world.purse < offer.price) return false;

  world.purse -= offer.price;
  world.mods = offer.upgrade.apply(world.mods);
  delete shop.offers[index];
  return true;
}

export function reroll(world: World, shop: ShopState, level: number): boolean {
  const cost = rerollCost(shop.rerolls);
  if (world.purse < cost) return false;

  world.purse -= cost;
  shop.rerolls += 1;
  const rng = makeRng(seedForLevel(level) ^ (SHOP_SALT + shop.rerolls));
  shop.offers = rollOffers(rng).map((upgrade) => ({ upgrade, price: upgrade.price }));
  return true;
}
```

Note that `delete shop.offers[index]` leaves a sparse array, which is why the
test asserts `toBeUndefined()` rather than a shorter length: the remaining
cards must not slide sideways under the player's thumb between taps.

- [ ] **Step 4: Run the tests**

Run: `pnpm test app/knight && npx tsc --noEmit -p .`
Expected: PASS. If the reroll test fails because the reroll produced the same
three ids by chance, change the salt rather than weakening the assertion.

- [ ] **Step 5: Commit**

```bash
git add app/knight/engine/shop.ts app/knight/engine/shop.test.ts
git commit -m "feat(knight): between-room shop with weighted offers and paid rerolls"
```

---

## Task 7: Shop UI and page wiring

The "+9 reach" modal is replaced by the shop, and a run's mods now survive
between rooms.

**Files:**
- Create: `app/knight/ui/Shop.tsx`
- Modify: `app/knight/page.tsx`
- Modify: `app/knight/ui/Hud.tsx`
- Test: `app/knight/ui/Shop.test.tsx`

**Interfaces:**
- Consumes: `ShopState`, `Offer`, `rerollCost` from `../engine/shop`;
  `PixelPanel`, `PixelButton` from `@/app/game/_shared/pixel-ui`.
- Produces: `export function Shop(props: { shop: ShopState; purse: number; level: number; onBuy(index: number): void; onReroll(): void; onNext(): void }): JSX.Element`

- [ ] **Step 1: Write the failing test**

Create `app/knight/ui/Shop.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { openShop } from "../engine/shop";
import { Shop } from "./Shop";

describe("<Shop>", () => {
  const setup = (purse: number) => {
    const onBuy = vi.fn();
    const onReroll = vi.fn();
    const onNext = vi.fn();
    const shop = openShop(3);
    render(
      <Shop
        shop={shop}
        purse={purse}
        level={3}
        onBuy={onBuy}
        onReroll={onReroll}
        onNext={onNext}
      />,
    );
    return { shop, onBuy, onReroll, onNext };
  };

  it("shows the purse and every offer's name and price", () => {
    const { shop } = setup(500);
    expect(screen.getByText(/500/)).toBeTruthy();
    for (const offer of shop.offers) {
      expect(screen.getByText(offer.upgrade.name)).toBeTruthy();
      expect(screen.getAllByText(new RegExp(String(offer.price))).length).toBeGreaterThan(0);
    }
  });

  it("buys the card that was tapped", () => {
    const { onBuy, shop } = setup(500);
    fireEvent.click(screen.getByText(shop.offers[1].upgrade.name));
    expect(onBuy).toHaveBeenCalledWith(1);
  });

  it("disables a card the player cannot afford and does not call onBuy", () => {
    const { onBuy, shop } = setup(0);
    fireEvent.click(screen.getByText(shop.offers[0].upgrade.name));
    expect(onBuy).not.toHaveBeenCalled();
  });

  it("always lets the player leave, however empty the purse", () => {
    const { onNext } = setup(0);
    fireEvent.click(screen.getByRole("button", { name: /next room/i }));
    expect(onNext).toHaveBeenCalled();
  });
});
```

Check `app/game/_shared` for an existing component test to copy the render
setup from. If `@testing-library/react` is not already a dependency, do NOT add
it — instead assert against `openShop`/`rerollCost` in a plain `.test.ts` and
mark the DOM assertions as covered by the manual check in Step 6.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test app/knight/ui/Shop`
Expected: FAIL — cannot resolve `./Shop`.

- [ ] **Step 3: Build the component**

Create `app/knight/ui/Shop.tsx`:

```tsx
"use client";

import { PixelPanel, PixelButton } from "@/app/game/_shared/pixel-ui";
import { rerollCost, type ShopState } from "../engine/shop";

export function Shop({
  shop,
  purse,
  level,
  onBuy,
  onReroll,
  onNext,
}: {
  shop: ShopState;
  purse: number;
  level: number;
  onBuy(index: number): void;
  onReroll(): void;
  onNext(): void;
}) {
  const cost = rerollCost(shop.rerolls);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
      <PixelPanel className="w-full max-w-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            Level {level} cleared
          </h2>
          <span className="text-[11px] uppercase tracking-widest text-[#F8D030]">
            {purse} coins
          </span>
        </div>

        <ul className="mb-3">
          {shop.offers.map((offer, i) => {
            // Holes are bought slots. They stay holes so the remaining cards do
            // not slide sideways under a thumb that is already moving.
            if (!offer) return null;
            const affordable = purse >= offer.price;
            return (
              <li key={offer.upgrade.id}>
                <button
                  type="button"
                  disabled={!affordable}
                  aria-disabled={!affordable}
                  onClick={() => affordable && onBuy(i)}
                  className={`flex w-full items-center gap-2 border-b border-[#1d1730] px-1 py-2 text-left ${
                    affordable ? "hover:bg-[#130f1e]" : "opacity-40"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold uppercase tracking-wide">
                      {offer.upgrade.name}
                    </span>
                    <span className="block text-[10px] text-[#6d6188]">
                      {offer.upgrade.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[#F8D030]">
                    {offer.price}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2">
          <PixelButton onClick={onReroll} disabled={purse < cost}>
            {`Reroll · ${cost}`}
          </PixelButton>
          <PixelButton onClick={onNext}>Next room</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
```

Check `pixel-ui.tsx` first: if `PixelButton` does not accept a `disabled` prop,
add one there (forwarding it to the underlying `<button>` and applying
`opacity-40`) rather than working around it in this file.

An unaffordable card is shown rather than hidden. Seeing what you cannot yet
buy is what makes the next room worth clearing.

- [ ] **Step 4: Wire the page**

In `app/knight/page.tsx`:

1. Replace `reachRef` with `modsRef: useRef<RunMods>(defaultMods())` and
   `purseRef: useRef(0)`.
2. `populate(level, mods, purse)` sets `world.mods = mods` and
   `world.purse = purse` before spawning, so a run's build carries between
   rooms.
3. On clear: call `sweepCoins(worldRef.current)`, apply `healOnClear` to the
   hero's HP for the next room, store the purse, and open the shop with
   `openShop(level)` held in React state.
4. Render `<Shop>` instead of the current cleared-modal branch. `onBuy` calls
   `purchase(worldRef.current, shop, i)` then forces a re-render; `onReroll`
   calls `reroll(...)`; `onNext` advances the level and repopulates.
5. On death: reset mods and purse to defaults — the run is over.
6. Keep the existing "You fell" modal for the death branch unchanged.

In `app/knight/ui/Hud.tsx`, add a purse readout beside the hearts, styled to
match the existing critter-name text.

- [ ] **Step 5: Run everything**

Run: `pnpm test && npx tsc --noEmit -p . && pnpm build`
Expected: all PASS.

- [ ] **Step 6: Play it**

Start the dev server (`pnpm dev`, port 1315) and open `/knight`. Confirm by
hand: coins appear when something dies, they fly to you when you walk near,
the shop appears on clear showing your purse, an affordable card visibly
changes the next room (buy `reach` twice and watch the ring grow), and an
unaffordable card is visible but dead to the touch.

Record what you observed in your report. A green suite is not evidence the
shop is usable.

- [ ] **Step 7: Commit**

```bash
git add app/knight
git commit -m "feat(knight): the shop replaces the reach grant, mods persist across rooms"
```

---

## Task 8: Coins on screen

**Files:**
- Modify: `app/knight/render/draw.ts`
- Test: `app/knight/render/draw.test.ts` (create if absent)

**Interfaces:**
- Consumes: `World["coins"]`.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Coins are drawn, so assert on the draw calls rather than on pixels. Create or
append to `app/knight/render/draw.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createWorld, spawnHero } from "../engine/world";
import { dropCoins } from "../engine/coins";
import { drawWorld } from "./draw";

function fakeCtx() {
  const calls: string[] = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop: string) {
      if (prop === "canvas") return { width: 360, height: 560 };
      return (...args: unknown[]) => {
        calls.push(`${prop}(${args.join(",")})`);
      };
    },
    set() {
      return true;
    },
  };
  const ctx = new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe("drawWorld", () => {
  it("draws a coin that is on the floor", () => {
    const w = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    spawnHero(w, { x: 180, y: 470 });
    dropCoins(w, { x: 100, y: 100 }, 3);

    const bare = fakeCtx();
    const withCoin = fakeCtx();
    const w2 = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    spawnHero(w2, { x: 180, y: 470 });

    drawWorld(withCoin.ctx, w, { heroColor: "#fff", reducedMotion: true });
    drawWorld(bare.ctx, w2, { heroColor: "#fff", reducedMotion: true });

    expect(withCoin.calls.length).toBeGreaterThan(bare.calls.length);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm test app/knight/render/draw`
Expected: FAIL — the two call counts match, because coins are not drawn.

- [ ] **Step 3: Draw them**

In `drawWorld`, after the floor and before entities:

```ts
  // Coins read as pickup-able rather than as scenery because they bob. The
  // phase is keyed off the coin id so a pile does not pulse in unison.
  for (const coin of world.coins) {
    const bob = opts.reducedMotion
      ? 0
      : Math.round(Math.sin((world.tick + coin.id * 17) * 0.08));
    ctx.fillStyle = "#F8D030";
    ctx.fillRect(px(coin.pos.x) - 2, px(coin.pos.y) - 2 + bob, 5, 5);
    ctx.fillStyle = "#FFF3B0";
    ctx.fillRect(px(coin.pos.x) - 2, px(coin.pos.y) - 2 + bob, 5, 1);
  }
```

`#F8D030` is knight's accent in the arcade registry, so coins read as this
game's colour rather than as a generic gold. Use whatever local helper
`draw.ts` already uses for pixel-snapping in place of `px` if it is named
differently.

- [ ] **Step 4: Run the tests**

Run: `pnpm test app/knight && npx tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/knight/render
git commit -m "feat(knight): draw coins"
```

---

## Task 9: Re-anchor the ladder to a shopping run

The current ladder tests assume reach is granted. It is now bought, so the bar
changes: a player who shops *carelessly* must still survive.

**Files:**
- Modify: `app/knight/engine/ladder.test.ts`

**Interfaces:**
- Consumes: `openShop`, `purchase`, `reroll` from `./shop`; `sweepCoins` from
  `./coins`; `levelFor` from `./level`.
- Produces: no exports; this is a test file.

- [ ] **Step 1: Replace the reach-grant harness with shopper personalities**

Keep the existing `botStep` and `Outcome` helpers in `ladder.test.ts`. Replace
`playLevel` with a run-level harness that carries mods and purse forward, and
delete the three tests that assume an automatic grant (`lets a run that banks
its powerups…`, `gets harder as it goes`, `makes the reach powerup the
difference…`). Add:

```ts
import { makeRng } from "@/app/game/_shared/rng";
import { defaultMods } from "../data/upgrades";
import { seedForLevel } from "./level";
import { openShop, purchase, type ShopState } from "./shop";
import { sweepCoins } from "./coins";
import { statsOf } from "./stats";

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
 */
const random: Shopper = (w, shop, level) => {
  const rng = makeRng(seedForLevel(level));
  for (const i of slots(shop)) {
    if (rng.int(2) === 0) purchase(w, shop, i);
  }
};

/** Buys nothing at all. Allowed to fail — that is what makes the shop matter. */
const neverBuy: Shopper = () => {};

interface RunResult {
  /** Highest level cleared. */
  cleared: number;
}

/** Plays a whole run: rooms, coins, shopping, carrying the build forward. */
function playRun(shopper: Shopper, maxLevel: number): RunResult {
  let mods = defaultMods();
  let purse = 0;
  let cleared = 0;

  for (let level = 1; level <= maxLevel; level++) {
    const room = levelFor(level);
    const world = createWorld({ arena: room.arena, seed: level });
    world.mods = mods;
    world.purse = purse;
    const hero = spawnHero(world, room.heroStart);
    for (const spawn of room.spawns) spawnEnemy(world, spawn, room.enemyHp);

    const living = () =>
      world.entities.filter((e) => e.kind === "enemy" && e.deadAtTick < 0).length;

    let ticks = 0;
    while (!world.over && living() > 0 && ticks < TICK_CAP) {
      botStep(world, 0.6);
      stepWorld(world);
      ticks++;
    }

    if (living() > 0 || hero.deadAtTick >= 0) break;

    cleared = level;
    sweepCoins(world);
    const shop = openShop(level);
    shopper(world, shop, level);
    mods = world.mods;
    purse = world.purse;
  }

  return { cleared };
}
```

`statsOf` is imported so a failing run can be diagnosed by logging the build;
if the implementer does not use it, remove the import rather than leaving it.

- [ ] **Step 2: Write the bars**

```ts
it("lets a reach-focused run climb to level 20", () => {
  expect(playRun(greedyReach, 20).cleared).toBe(20);
});

it("lets a damage-focused run reach level 12", () => {
  expect(playRun(damageOnly, 12).cleared).toBeGreaterThanOrEqual(12);
});

// The load-bearing one. Reach is no longer granted, so a player who buys
// without a plan must still survive — otherwise the shop made the game worse.
it("lets a careless shopper reach level 15", () => {
  expect(playRun(random, 15).cleared).toBeGreaterThanOrEqual(15);
});

it("lets a run that buys nothing fail, and that is a real choice", () => {
  expect(playRun(neverBuy, 20).cleared).toBeLessThan(20);
});
```

Keep the existing `never opens a room with an enemy already on top of the
hero` and `keeps room size readable at high levels` tests unchanged.

- [ ] **Step 3: Run it**

Run: `pnpm test app/knight/engine/ladder`

If the careless shopper cannot reach 15, the fix is in the **game**, not the
test — in order of preference: raise `reach`'s weight in `UPGRADES`, lower its
price, or raise coin drops. Do not lower the bar to 12. Record which lever you
pulled and the before/after numbers in your report.

If the never-buyer *succeeds* to level 20, the shop is not load-bearing and
the economy is decorative — report that as a finding rather than deleting the
test.

- [ ] **Step 4: Full suite and build**

Run: `pnpm test && npx tsc --noEmit -p . && pnpm build`
Expected: all PASS, total test count above 1096.

- [ ] **Step 5: Commit**

```bash
git add app/knight/engine/ladder.test.ts app/knight/data/upgrades.ts
git commit -m "test(knight): the ladder must survive a careless shopper"
```

---

## Definition of done

- `pnpm test` green, count above 1096; `npx tsc --noEmit -p .` clean;
  `pnpm build` succeeds.
- Every `RunMods` field is read by the simulation (Task 4's guard proves it).
- A careless shopper clears level 15 (Task 9).
- `/knight` played by hand: coins drop, magnet, and sweep; the shop opens on
  clear; a bought upgrade visibly changes the next room.
- Phases 2–6 remain unbuilt and unplanned, by design.
