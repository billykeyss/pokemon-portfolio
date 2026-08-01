# CRITTER KNIGHT — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable, good-feeling vertical slice of CRITTER KNIGHT at `/knight`: one room, one critter, one enemy type, drag-to-move, auto-swing when you stop, with hit flash, knockback, screen shake and death bursts.

**Architecture:** A pure fixed-timestep simulation (`engine/`, no React/DOM/canvas imports) advanced by the arcade's shared `useGameLoop`, painted by a separate canvas renderer whose animation poses are pure functions of state and time (`render/anim.ts`). This is the split that let a headless harness catch real bugs in BOUNCEDEX, repeated deliberately.

**Tech Stack:** Next.js 15 App Router (`output: "export"`), React 19 RC, TypeScript strict, Tailwind 3, Canvas 2D, Vitest, pnpm 10.11.0.

## Global Constraints

- **Package manager is pnpm 10.11.0.** Never `npm install` or `yarn`.
- **Static export only.** No server components doing I/O, no API routes, no runtime network calls.
- **All game routes are client components.** First line of every `page.tsx` under `app/knight/` is `"use client";`.
- **TypeScript is `strict: true`.** No `any` without an inline justification comment.
- **Path alias `@/*` maps to the repo root.** Import shared modules as `@/app/game/_shared/...`.
- **No new runtime dependencies.**
- **Portrait only.** Target 60fps on a mid-range phone.
- **`engine/` and `data/` import nothing from React, `next`, or the DOM.** A reviewer should reject a change that does.
- **The simulation is deterministic.** Never call `Math.random()` or `Date.now()` in `engine/`; all randomness flows through `makeRng` from `@/app/game/_shared/rng`.
- **Never break the resume or the existing games.** `app/page.tsx`, `components/`, and the other arcade routes are out of scope.
- **Route is `/knight`; display name is `CRITTER KNIGHT`** (all caps in UI).

## Scope: this plan is Slice 1 of 5

The spec is sequenced as vertical slices, each producing working software:

| Slice | Delivers | Plan |
| --- | --- | --- |
| **1** | One room, one enemy, drag + swing, full juice — **playable** | *this document* |
| 2 | Procedural rooms, doors, enemy archetypes, real AI | later |
| 3 | Weapons and armor, pickups and swapping | later |
| 4 | Critter powers, evolution mid-run, upgrade choices | later |
| 5 | Balance harness, difficulty curve, run summary and save | later |

Slice 1 deliberately hardcodes one room, one critter and one enemy. Getting the
*feel* right is the risk worth retiring first, because everything later is built
on top of it and feel is what most often needs rework.

## File Structure

```
app/game/_shared/critters.ts        roster promoted out of BOUNCEDEX     (Task 1)

app/knight/
├─ page.tsx                         route entry, input, HUD, loop        (Task 8)
├─ engine/
│  ├─ types.ts                      Entity, Hero, World, Arena           (Task 2)
│  ├─ world.ts                      state + fixed-step advance           (Task 2,3)
│  ├─ combat.ts                     swings, damage, knockback, i-frames  (Task 4)
│  ├─ ai.ts                         enemy steering                       (Task 5)
│  └─ fx.ts                         hit/kill/slash effect queue          (Task 6)
├─ data/
│  └─ enemies.ts                    the one Slice-1 archetype            (Task 5)
├─ render/
│  ├─ anim.ts                       pure pose functions                  (Task 6)
│  └─ draw.ts                       canvas painting                      (Task 7)
└─ ui/
   └─ Hud.tsx                       hearts, room label                   (Task 8)
```

The boundary that matters: `engine/` takes state plus input and returns state.
`render/anim.ts` turns state into a pose. `render/draw.ts` paints. `page.tsx`
owns React. A pose being a pure function of `(state, tick)` is what makes the
animation testable without a browser.

---

### Task 1: Promote the critter roster to `_shared`

The spec requires this first: leaving the roster under `app/bounce/bouncedex/data/`
would make every CRITTER KNIGHT balance change a change to BOUNCEDEX's source tree.

**Files:**
- Create: `app/game/_shared/critters.ts` (moved from `app/bounce/bouncedex/data/critters.ts`)
- Create: `app/game/_shared/critters.test.ts` (moved from `.../data/critters.test.ts`)
- Delete: `app/bounce/bouncedex/data/critters.ts`, `app/bounce/bouncedex/data/critters.test.ts`
- Modify: every BOUNCEDEX file importing `../data/critters` or `./data/critters`

**Interfaces:**
- Consumes: nothing.
- Produces: `@/app/game/_shared/critters` exporting `BehaviorTag`, `CritterDef`,
  `CRITTERS`, `BASE_CRITTERS`, `getCritter(id)`, `EVOLVE_HIT_THRESHOLD` — the
  same names as before, so this is purely a move.

- [ ] **Step 1: Move the files with git so history follows**

```bash
git mv app/bounce/bouncedex/data/critters.ts app/game/_shared/critters.ts
git mv app/bounce/bouncedex/data/critters.test.ts app/game/_shared/critters.test.ts
```

- [ ] **Step 2: Find every importer**

Run: `grep -rln "data/critters" app --include=*.ts --include=*.tsx`
Expected: a list of BOUNCEDEX engine, data, render and ui files.

- [ ] **Step 3: Repoint the imports**

Every `from "../data/critters"`, `from "./data/critters"` or
`from "../../data/critters"` becomes `from "@/app/game/_shared/critters"`.

```bash
grep -rl "data/critters" app --include=*.ts --include=*.tsx | while read -r f; do
  perl -pi -e 's{from "(\.\./)*(\./)?data/critters"}{from "\@/app/game/_shared/critters"}g' "$f"
done
```

The moved test imports the roster from its own directory, so fix that one back:

```bash
perl -pi -e 's{from "\@/app/game/_shared/critters"}{from "./critters"}' app/game/_shared/critters.test.ts
```

- [ ] **Step 4: Verify nothing still points at the old path**

Run: `grep -rn "data/critters" app --include=*.ts --include=*.tsx`
Expected: no output.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS — the same count as before the move. This is a pure move; a
failure here means an import was missed.

- [ ] **Step 6: Verify the production build**

Run: `pnpm build`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(game): promote critter roster to _shared

Both games read the roster as reference data. Leaving it inside
BOUNCEDEX would make every CRITTER KNIGHT balance change a change to
BOUNCEDEX's source tree."
```

---

### Task 2: World types and the fixed-step loop

**Files:**
- Create: `app/knight/engine/types.ts`
- Create: `app/knight/engine/world.ts`
- Test: `app/knight/engine/world.test.ts`

**Interfaces:**
- Consumes: `makeRng` from `@/app/game/_shared/rng`.
- Produces:
  - `type Vec2 = { x: number; y: number }`
  - `type EntityKind = "hero" | "enemy"`
  - `interface Entity { id: number; kind: EntityKind; pos: Vec2; vel: Vec2; radius: number; hp: number; maxHp: number; facing: Vec2; hitAtTick: number; deadAtTick: number; attack: AttackState }`
  - `interface AttackState { phase: "idle" | "windup" | "active" | "recover"; startedAtTick: number }`
  - `interface Arena { width: number; height: number }`
  - `interface World { tick: number; arena: Arena; entities: Entity[]; nextId: number; rngSeed: number; over: boolean; moveTarget: Vec2 | null }`
  - `FIXED_DT = 1 / 120`
  - `createWorld(opts: { arena: Arena; seed: number }): World`
  - `spawnHero(world: World, pos: Vec2): Entity`
  - `spawnEnemy(world: World, pos: Vec2, hp: number): Entity`
  - `heroOf(world: World): Entity | null`
  - `stepWorld(world: World): void`

- [ ] **Step 1: Write the failing test**

Create `app/knight/engine/world.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, heroOf, stepWorld, FIXED_DT } from "./world";

const arena = { width: 360, height: 560 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("createWorld", () => {
  it("starts empty, alive and at tick 0", () => {
    const w = fresh();
    expect(w.tick).toBe(0);
    expect(w.entities).toHaveLength(0);
    expect(w.over).toBe(false);
    expect(w.moveTarget).toBeNull();
  });

  it("uses a fixed timestep of 1/120s", () => {
    expect(FIXED_DT).toBeCloseTo(1 / 120);
  });
});

describe("spawning", () => {
  it("assigns unique ids", () => {
    const w = fresh();
    const a = spawnHero(w, { x: 180, y: 400 });
    const b = spawnEnemy(w, { x: 100, y: 100 }, 30);
    expect(a.id).not.toBe(b.id);
    expect(w.entities).toHaveLength(2);
  });

  it("finds the hero", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 400 });
    expect(heroOf(w)?.id).toBe(h.id);
  });

  it("returns null when there is no hero", () => {
    const w = fresh();
    spawnEnemy(w, { x: 10, y: 10 }, 5);
    expect(heroOf(w)).toBeNull();
  });

  it("starts entities idle and unhurt", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 400 });
    expect(h.attack.phase).toBe("idle");
    expect(h.hitAtTick).toBe(-1);
    expect(h.deadAtTick).toBe(-1);
    expect(h.hp).toBe(h.maxHp);
  });
});

describe("stepWorld", () => {
  it("advances the tick counter by exactly one", () => {
    const w = fresh();
    stepWorld(w);
    expect(w.tick).toBe(1);
  });

  it("stops simulating once the run is over", () => {
    const w = fresh();
    w.over = true;
    stepWorld(w);
    expect(w.tick).toBe(0);
  });

  it("keeps entities inside the arena", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 5, y: 5 });
    h.vel = { x: -9999, y: -9999 };
    stepWorld(w);
    expect(h.pos.x).toBeGreaterThanOrEqual(h.radius);
    expect(h.pos.y).toBeGreaterThanOrEqual(h.radius);
  });

  it("clamps entities to the far edges too", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 350, y: 550 });
    h.vel = { x: 9999, y: 9999 };
    stepWorld(w);
    expect(h.pos.x).toBeLessThanOrEqual(arena.width - h.radius);
    expect(h.pos.y).toBeLessThanOrEqual(arena.height - h.radius);
  });

  it("is deterministic for a given seed", () => {
    const run = () => {
      const w = createWorld({ arena, seed: 99 });
      spawnHero(w, { x: 180, y: 400 });
      spawnEnemy(w, { x: 120, y: 120 }, 30);
      w.moveTarget = { x: 300, y: 200 };
      for (let i = 0; i < 400; i++) stepWorld(w);
      return JSON.stringify(w);
    };
    expect(run()).toEqual(run());
  });

  it("ends the run when the hero dies", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 400 });
    h.hp = 0;
    stepWorld(w);
    expect(w.over).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test app/knight`
Expected: FAIL — cannot resolve `./world`.

- [ ] **Step 3: Implement types.ts**

```ts
export type Vec2 = { x: number; y: number };

export type EntityKind = "hero" | "enemy";

export type AttackPhase = "idle" | "windup" | "active" | "recover";

export interface AttackState {
  phase: AttackPhase;
  /** Tick the current phase began. Drives both timing and animation. */
  startedAtTick: number;
}

export interface Entity {
  id: number;
  kind: EntityKind;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  /** Unit vector the entity is facing; drives swing direction and sprite flip. */
  facing: Vec2;
  /** Tick this entity last took damage, or -1. Drives i-frames and hit flash. */
  hitAtTick: number;
  /** Tick this entity died, or -1. Corpses linger briefly so death can animate. */
  deadAtTick: number;
  attack: AttackState;
}

export interface Arena {
  width: number;
  height: number;
}
```

- [ ] **Step 4: Implement world.ts**

```ts
import type { Arena, Entity, Vec2 } from "./types";

/** Simulation runs at a fixed 120Hz regardless of render frame rate. */
export const FIXED_DT = 1 / 120;

/** How long a corpse lingers so its death can animate, in ticks. */
export const CORPSE_TICKS = 36;

const HERO_RADIUS = 12;
const HERO_HP = 5;
const ENEMY_RADIUS = 11;

export interface World {
  tick: number;
  arena: Arena;
  entities: Entity[];
  nextId: number;
  rngSeed: number;
  over: boolean;
  /** Where the thumb is dragging the hero, in arena space, or null. */
  moveTarget: Vec2 | null;
}

export function createWorld(opts: { arena: Arena; seed: number }): World {
  return {
    tick: 0,
    arena: opts.arena,
    entities: [],
    nextId: 1,
    rngSeed: opts.seed,
    over: false,
    moveTarget: null,
  };
}

function baseEntity(world: World, kind: Entity["kind"], pos: Vec2, radius: number, hp: number): Entity {
  const e: Entity = {
    id: world.nextId++,
    kind,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    radius,
    hp,
    maxHp: hp,
    facing: { x: 0, y: 1 },
    hitAtTick: -1,
    deadAtTick: -1,
    attack: { phase: "idle", startedAtTick: 0 },
  };
  world.entities.push(e);
  return e;
}

export function spawnHero(world: World, pos: Vec2): Entity {
  return baseEntity(world, "hero", pos, HERO_RADIUS, HERO_HP);
}

export function spawnEnemy(world: World, pos: Vec2, hp: number): Entity {
  return baseEntity(world, "enemy", pos, ENEMY_RADIUS, hp);
}

export function heroOf(world: World): Entity | null {
  return world.entities.find((e) => e.kind === "hero") ?? null;
}

/** Keep an entity inside the room. Positions are clamped, never wrapped. */
function clampToArena(e: Entity, arena: Arena): void {
  e.pos.x = Math.max(e.radius, Math.min(arena.width - e.radius, e.pos.x));
  e.pos.y = Math.max(e.radius, Math.min(arena.height - e.radius, e.pos.y));
}

/**
 * Advance the world by exactly one FIXED_DT. Mutates in place.
 * Later tasks insert steering, combat and AI into this function; the order is
 * intentional and documented where each is added.
 */
export function stepWorld(world: World): void {
  if (world.over) return;

  for (const e of world.entities) {
    if (e.deadAtTick >= 0) continue;
    e.pos.x += e.vel.x * FIXED_DT;
    e.pos.y += e.vel.y * FIXED_DT;
    clampToArena(e, world.arena);
  }

  // Corpses linger so death can animate, then leave.
  world.entities = world.entities.filter(
    (e) => e.deadAtTick < 0 || world.tick - e.deadAtTick < CORPSE_TICKS,
  );

  const hero = heroOf(world);
  if (hero && hero.hp <= 0 && hero.deadAtTick < 0) {
    hero.deadAtTick = world.tick;
  }
  if (!hero || hero.hp <= 0) world.over = true;

  world.tick += 1;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test app/knight`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add app/knight/engine/
git commit -m "feat(knight): add world types and fixed-step loop"
```

---

### Task 3: Drag-to-move steering

The spec's core control: the hero tracks the thumb with a smoothing delay so
movement feels weighty rather than teleporting.

**Files:**
- Create: `app/knight/engine/move.ts`
- Test: `app/knight/engine/move.test.ts`
- Modify: `app/knight/engine/world.ts` (call `steerHero` from `stepWorld`)

**Interfaces:**
- Consumes: `Entity`, `Vec2`, `FIXED_DT`.
- Produces:
  - `HERO_SPEED = 132` (px/s)
  - `ACCEL = 14` (how fast velocity converges on the target, per second)
  - `STOP_SPEED = 18` (below this the hero counts as standing still)
  - `steerHero(hero: Entity, target: Vec2 | null, dt: number): void`
  - `isStandingStill(e: Entity): boolean`

- [ ] **Step 1: Write the failing test**

Create `app/knight/engine/move.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { steerHero, isStandingStill, HERO_SPEED, STOP_SPEED } from "./move";
import type { Entity } from "./types";

function hero(over: Partial<Entity> = {}): Entity {
  return {
    id: 1,
    kind: "hero",
    pos: { x: 100, y: 100 },
    vel: { x: 0, y: 0 },
    radius: 12,
    hp: 5,
    maxHp: 5,
    facing: { x: 0, y: 1 },
    hitAtTick: -1,
    deadAtTick: -1,
    attack: { phase: "idle", startedAtTick: 0 },
    ...over,
  };
}

describe("steerHero", () => {
  it("accelerates toward the target rather than snapping", () => {
    const h = hero();
    steerHero(h, { x: 300, y: 100 }, 1 / 120);
    expect(h.vel.x).toBeGreaterThan(0);
    // One step must not reach full speed, or movement feels weightless.
    expect(h.vel.x).toBeLessThan(HERO_SPEED);
  });

  it("converges on full speed when held", () => {
    const h = hero();
    for (let i = 0; i < 240; i++) steerHero(h, { x: 300, y: 100 }, 1 / 120);
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeCloseTo(HERO_SPEED, 0);
  });

  it("decelerates to a stop when the target is released", () => {
    const h = hero({ vel: { x: HERO_SPEED, y: 0 } });
    for (let i = 0; i < 240; i++) steerHero(h, null, 1 / 120);
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeLessThan(1);
  });

  it("faces the direction of travel", () => {
    const h = hero();
    for (let i = 0; i < 30; i++) steerHero(h, { x: 100, y: 400 }, 1 / 120);
    expect(h.facing.y).toBeGreaterThan(0.9);
  });

  it("keeps facing after stopping rather than snapping to a default", () => {
    const h = hero();
    for (let i = 0; i < 30; i++) steerHero(h, { x: 400, y: 100 }, 1 / 120);
    const facedX = h.facing.x;
    for (let i = 0; i < 240; i++) steerHero(h, null, 1 / 120);
    expect(h.facing.x).toBeCloseTo(facedX, 1);
  });

  it("does not jitter when the target is already underfoot", () => {
    const h = hero();
    for (let i = 0; i < 60; i++) steerHero(h, { x: 100, y: 100 }, 1 / 120);
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeLessThan(STOP_SPEED);
  });
});

describe("isStandingStill", () => {
  it("is true below the stop speed", () => {
    expect(isStandingStill(hero({ vel: { x: STOP_SPEED - 1, y: 0 } }))).toBe(true);
  });

  it("is false above it", () => {
    expect(isStandingStill(hero({ vel: { x: STOP_SPEED + 1, y: 0 } }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test app/knight`
Expected: FAIL — cannot resolve `./move`.

- [ ] **Step 3: Implement move.ts**

```ts
import type { Entity, Vec2 } from "./types";

/** Top speed in pixels per second. */
export const HERO_SPEED = 132;
/** How fast velocity converges on the desired velocity, per second. */
export const ACCEL = 14;
/** Below this speed the hero counts as standing still, and may swing. */
export const STOP_SPEED = 18;
/** Inside this distance of the target, stop pushing — otherwise the hero
 *  oscillates around the thumb. */
const ARRIVE_RADIUS = 6;

/**
 * Move the hero toward the drag target.
 *
 * Velocity is eased toward the desired velocity rather than set to it: setting
 * it directly makes the hero feel like a cursor, and the whole skill of the
 * game is spacing, which needs weight to read.
 */
export function steerHero(hero: Entity, target: Vec2 | null, dt: number): void {
  let desiredX = 0;
  let desiredY = 0;

  if (target) {
    const dx = target.x - hero.pos.x;
    const dy = target.y - hero.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > ARRIVE_RADIUS) {
      desiredX = (dx / dist) * HERO_SPEED;
      desiredY = (dy / dist) * HERO_SPEED;
    }
  }

  // Exponential convergence, frame-rate independent.
  const k = 1 - Math.exp(-ACCEL * dt);
  hero.vel.x += (desiredX - hero.vel.x) * k;
  hero.vel.y += (desiredY - hero.vel.y) * k;

  // Face where we are actually going, and hold that facing once stopped so the
  // sprite does not snap back to a default the moment the thumb lifts.
  const speed = Math.hypot(hero.vel.x, hero.vel.y);
  if (speed > STOP_SPEED) {
    hero.facing.x = hero.vel.x / speed;
    hero.facing.y = hero.vel.y / speed;
  }
}

export function isStandingStill(e: Entity): boolean {
  return Math.hypot(e.vel.x, e.vel.y) < STOP_SPEED;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test app/knight`
Expected: PASS, 8 new tests.

- [ ] **Step 5: Wire steering into the simulation**

In `app/knight/engine/world.ts`, add the import:

```ts
import { steerHero } from "./move";
```

Then, inside `stepWorld`, immediately after the `if (world.over) return;` line:

```ts
  const steering = heroOf(world);
  if (steering && steering.deadAtTick < 0) {
    steerHero(steering, world.moveTarget, FIXED_DT);
  }
```

- [ ] **Step 6: Add the integration test**

Append to `app/knight/engine/world.test.ts`:

```ts
describe("drag to move", () => {
  it("walks the hero toward the drag target", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 400 });
    w.moveTarget = { x: 180, y: 120 };
    for (let i = 0; i < 240; i++) stepWorld(w);
    expect(h.pos.y).toBeLessThan(400);
  });

  it("does not move a dead hero", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 400 });
    h.deadAtTick = 0;
    w.moveTarget = { x: 180, y: 120 };
    const before = { ...h.pos };
    stepWorld(w);
    expect(h.pos).toEqual(before);
  });
});
```

- [ ] **Step 7: Run the suite**

Run: `pnpm test app/knight`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/knight/engine/
git commit -m "feat(knight): add drag-to-move steering with weight"
```

---

### Task 4: Melee swings, damage and knockback

**Files:**
- Create: `app/knight/engine/combat.ts`
- Test: `app/knight/engine/combat.test.ts`
- Modify: `app/knight/engine/world.ts` (call `updateAttack` from `stepWorld`)

**Interfaces:**
- Consumes: `Entity`, `Vec2`, `World`, `isStandingStill`.
- Produces:
  - `WINDUP_TICKS = 14`, `ACTIVE_TICKS = 7`, `RECOVER_TICKS = 20`
  - `IFRAME_TICKS = 42`
  - `SWING_REACH = 46`, `SWING_ARC = Math.PI * 0.7` (total arc, radians)
  - `SWING_DAMAGE = 10`, `KNOCKBACK = 210`
  - `interface SwingHit { targetId: number; damage: number; killed: boolean }`
  - `updateAttack(world: World, e: Entity): SwingHit[]`
  - `inSwingArc(attacker: Entity, target: Entity): boolean`
  - `damageEntity(world: World, target: Entity, amount: number, fromX: number, fromY: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `app/knight/engine/combat.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, stepWorld } from "./world";
import {
  inSwingArc,
  damageEntity,
  IFRAME_TICKS,
  SWING_REACH,
  KNOCKBACK,
} from "./combat";

const arena = { width: 360, height: 560 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("inSwingArc", () => {
  it("hits a target directly ahead and within reach", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180, y: 300 - SWING_REACH * 0.5 }, 30);
    expect(inSwingArc(h, e)).toBe(true);
  });

  it("misses a target behind the attacker", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180, y: 300 + SWING_REACH * 0.5 }, 30);
    expect(inSwingArc(h, e)).toBe(false);
  });

  it("misses a target beyond reach", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180, y: 300 - SWING_REACH * 4 }, 30);
    expect(inSwingArc(h, e)).toBe(false);
  });

  it("hits to the side, since the arc is wide", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180 + 26, y: 300 - 26 }, 30);
    expect(inSwingArc(h, e)).toBe(true);
  });
});

describe("damageEntity", () => {
  it("reduces hp and stamps the hit tick", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 30);
    w.tick = 50;
    expect(damageEntity(w, e, 10, 100, 120)).toBe(true);
    expect(e.hp).toBe(20);
    expect(e.hitAtTick).toBe(50);
  });

  it("knocks the target away from the damage source", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 30);
    damageEntity(w, e, 10, 100, 140);
    expect(e.vel.y).toBeLessThan(0);
    expect(Math.abs(e.vel.y)).toBeCloseTo(KNOCKBACK, 0);
  });

  it("refuses damage during invulnerability", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 30);
    w.tick = 10;
    damageEntity(w, e, 10, 100, 120);
    w.tick = 10 + IFRAME_TICKS - 1;
    expect(damageEntity(w, e, 10, 100, 120)).toBe(false);
    expect(e.hp).toBe(20);
  });

  it("allows damage again once invulnerability lapses", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 30);
    w.tick = 10;
    damageEntity(w, e, 10, 100, 120);
    w.tick = 10 + IFRAME_TICKS;
    expect(damageEntity(w, e, 10, 100, 120)).toBe(true);
    expect(e.hp).toBe(10);
  });

  it("marks a killed entity dead rather than deleting it mid-step", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 5);
    w.tick = 7;
    damageEntity(w, e, 10, 100, 120);
    expect(e.hp).toBeLessThanOrEqual(0);
    expect(e.deadAtTick).toBe(7);
    // Still present this step so the renderer can animate the death.
    expect(w.entities).toContain(e);
  });

  it("does not re-kill a corpse", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 5);
    damageEntity(w, e, 10, 100, 120);
    const deadAt = e.deadAtTick;
    w.tick += IFRAME_TICKS + 1;
    expect(damageEntity(w, e, 10, 100, 120)).toBe(false);
    expect(e.deadAtTick).toBe(deadAt);
  });
});

describe("swing lifecycle", () => {
  it("swings automatically when standing still near an enemy", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    spawnEnemy(w, { x: 180, y: 300 - 30 }, 300);
    for (let i = 0; i < 30; i++) stepWorld(w);
    expect(h.attack.phase).not.toBe("idle");
  });

  it("does not swing while moving", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 180, y: 260 }, 300);
    w.moveTarget = { x: 180, y: 540 };
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(h.attack.phase).toBe("idle");
  });

  it("does not swing with no enemy in range", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 20, y: 20 }, 300);
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(h.attack.phase).toBe("idle");
  });

  it("damages the enemy once per swing, not once per tick", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180, y: 300 - 30 }, 100000);
    for (let i = 0; i < 60; i++) stepWorld(w);
    const dealt = 100000 - e.hp;
    // A per-tick bug would deal many multiples of a single swing.
    expect(dealt).toBeGreaterThan(0);
    expect(dealt).toBeLessThanOrEqual(30);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test app/knight`
Expected: FAIL — cannot resolve `./combat`.

- [ ] **Step 3: Implement combat.ts**

```ts
import type { Entity } from "./types";
import type { World } from "./world";
import { isStandingStill } from "./move";

/** Swing timing, in ticks at 120Hz. Wind-up is long enough to read as a tell. */
export const WINDUP_TICKS = 14;
export const ACTIVE_TICKS = 7;
export const RECOVER_TICKS = 20;

/** Invulnerability after taking a hit, so a crowd cannot chain-delete you. */
export const IFRAME_TICKS = 42;

export const SWING_REACH = 46;
/** Total arc width in radians — generous, because aiming is automatic. */
export const SWING_ARC = Math.PI * 0.7;
export const SWING_DAMAGE = 10;
export const KNOCKBACK = 210;

export interface SwingHit {
  targetId: number;
  damage: number;
  killed: boolean;
}

/** Whether `target` is inside `attacker`'s swing wedge. */
export function inSwingArc(attacker: Entity, target: Entity): boolean {
  const dx = target.pos.x - attacker.pos.x;
  const dy = target.pos.y - attacker.pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > SWING_REACH + target.radius) return false;
  if (dist === 0) return true;

  const dot = (dx / dist) * attacker.facing.x + (dy / dist) * attacker.facing.y;
  // Clamp guards against a floating-point |dot| slightly over 1.
  return Math.acos(Math.max(-1, Math.min(1, dot))) <= SWING_ARC / 2;
}

/**
 * Apply damage, knockback and invulnerability.
 * Returns false when the hit was refused — during i-frames, or on a corpse.
 *
 * A killed entity is *marked* dead rather than removed, so the renderer gets a
 * frame to animate the death and so removing it cannot invalidate an array
 * another loop is mid-way through.
 */
export function damageEntity(
  world: World,
  target: Entity,
  amount: number,
  fromX: number,
  fromY: number,
): boolean {
  if (target.deadAtTick >= 0) return false;
  if (target.hitAtTick >= 0 && world.tick - target.hitAtTick < IFRAME_TICKS) {
    return false;
  }

  target.hp -= amount;
  target.hitAtTick = world.tick;

  const dx = target.pos.x - fromX;
  const dy = target.pos.y - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  target.vel.x = (dx / dist) * KNOCKBACK;
  target.vel.y = (dy / dist) * KNOCKBACK;

  if (target.hp <= 0) target.deadAtTick = world.tick;
  return true;
}

/** True when any living enemy sits inside the hero's swing wedge. */
function enemyInReach(world: World, hero: Entity): boolean {
  return world.entities.some(
    (e) => e.kind === "enemy" && e.deadAtTick < 0 && inSwingArc(hero, e),
  );
}

/**
 * Drive one entity's attack state machine and resolve its damage.
 *
 * Damage lands on the single tick the swing enters `active`, not for the whole
 * active window: applying it every active tick would multiply a swing's damage
 * by its duration.
 */
export function updateAttack(world: World, e: Entity): SwingHit[] {
  if (e.deadAtTick >= 0) {
    e.attack.phase = "idle";
    return [];
  }

  const elapsed = world.tick - e.attack.startedAtTick;
  const hits: SwingHit[] = [];

  switch (e.attack.phase) {
    case "idle":
      // Stopping next to something is the whole input for attacking.
      if (isStandingStill(e) && enemyInReach(world, e)) {
        e.attack.phase = "windup";
        e.attack.startedAtTick = world.tick;
      }
      break;

    case "windup":
      if (elapsed >= WINDUP_TICKS) {
        e.attack.phase = "active";
        e.attack.startedAtTick = world.tick;

        for (const target of world.entities) {
          if (target.kind === e.kind || target.deadAtTick >= 0) continue;
          if (!inSwingArc(e, target)) continue;
          if (!damageEntity(world, target, SWING_DAMAGE, e.pos.x, e.pos.y)) continue;
          hits.push({
            targetId: target.id,
            damage: SWING_DAMAGE,
            killed: target.deadAtTick >= 0,
          });
        }
      }
      break;

    case "active":
      if (elapsed >= ACTIVE_TICKS) {
        e.attack.phase = "recover";
        e.attack.startedAtTick = world.tick;
      }
      break;

    case "recover":
      if (elapsed >= RECOVER_TICKS) {
        e.attack.phase = "idle";
        e.attack.startedAtTick = world.tick;
      }
      break;
  }

  return hits;
}
```

- [ ] **Step 4: Wire attacks into the simulation**

In `app/knight/engine/world.ts`, add the import:

```ts
import { updateAttack } from "./combat";
```

Add a hits sink to `World` (inside the interface):

```ts
  /** Swing hits produced by the most recent step; the renderer drains this. */
  hits: SwingHit[];
```

with `import type { SwingHit } from "./combat";` and `hits: []` in `createWorld`.

In `stepWorld`, immediately after the steering block:

```ts
  world.hits.length = 0;
  for (const e of world.entities) {
    world.hits.push(...updateAttack(world, e));
  }
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test app/knight`
Expected: PASS, 15 new tests.

- [ ] **Step 6: Commit**

```bash
git add app/knight/engine/
git commit -m "feat(knight): add melee swings, damage, knockback and i-frames"
```

---

### Task 5: The Slice-1 enemy and its AI

**Files:**
- Create: `app/knight/data/enemies.ts`
- Create: `app/knight/engine/ai.ts`
- Test: `app/knight/engine/ai.test.ts`
- Modify: `app/knight/engine/world.ts` (call `steerEnemy` from `stepWorld`)

**Interfaces:**
- Consumes: `Entity`, `World`, `damageEntity`, `heroOf`.
- Produces:
  - `interface EnemyDef { id: string; name: string; hp: number; speed: number; color: string; touchDamage: number }`
  - `ENEMIES: Record<string, EnemyDef>`, `GRUNT: EnemyDef`
  - `steerEnemy(world: World, e: Entity, def: EnemyDef, dt: number): void`
  - `ENEMY_ACCEL = 9`

- [ ] **Step 1: Write the failing test**

Create `app/knight/engine/ai.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, stepWorld } from "./world";
import { steerEnemy } from "./ai";
import { GRUNT } from "../data/enemies";

const arena = { width: 360, height: 560 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("steerEnemy", () => {
  it("closes on the hero", () => {
    const w = fresh();
    spawnHero(w, { x: 180, y: 500 });
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 120; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(e.vel.y).toBeGreaterThan(0);
  });

  it("stands still with no hero to chase", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 60; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeLessThan(1);
  });

  it("ignores a dead hero", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 500 });
    h.deadAtTick = 0;
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 60; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeLessThan(1);
  });

  it("never exceeds its own speed", () => {
    const w = fresh();
    spawnHero(w, { x: 180, y: 500 });
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 600; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeLessThanOrEqual(GRUNT.speed + 1);
  });

  it("faces the hero", () => {
    const w = fresh();
    spawnHero(w, { x: 180, y: 500 });
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 60; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(e.facing.y).toBeGreaterThan(0.8);
  });
});

describe("touch damage", () => {
  it("hurts the hero on contact", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 180, y: 300 }, GRUNT.hp);
    stepWorld(w);
    expect(h.hp).toBeLessThan(h.maxHp);
  });

  it("cannot chain-delete the hero, thanks to i-frames", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    for (let i = 0; i < 4; i++) spawnEnemy(w, { x: 180, y: 300 }, GRUNT.hp);
    stepWorld(w);
    expect(h.hp).toBe(h.maxHp - GRUNT.touchDamage);
  });

  it("does not hurt the hero at a distance", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 40, y: 40 }, GRUNT.hp);
    stepWorld(w);
    expect(h.hp).toBe(h.maxHp);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test app/knight`
Expected: FAIL — cannot resolve `./ai` and `../data/enemies`.

- [ ] **Step 3: Implement data/enemies.ts**

```ts
export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  /** Top speed in pixels per second. Slower than the hero, so spacing works. */
  speed: number;
  color: string;
  /** Hearts lost when this enemy touches the hero. */
  touchDamage: number;
}

/** Slice 1 ships exactly one archetype; more arrive with rooms in Slice 2. */
export const GRUNT: EnemyDef = {
  id: "grunt",
  name: "Grunt",
  hp: 30,
  speed: 74,
  color: "#8d5fa0",
  touchDamage: 1,
};

export const ENEMIES: Record<string, EnemyDef> = {
  [GRUNT.id]: GRUNT,
};
```

- [ ] **Step 4: Implement engine/ai.ts**

```ts
import type { Entity } from "./types";
import type { World } from "./world";
import { heroOf } from "./world";
import { damageEntity } from "./combat";
import type { EnemyDef } from "../data/enemies";

/** How fast an enemy's velocity converges, per second. Lower than the hero's,
 *  so enemies read as lumbering and can be kited. */
export const ENEMY_ACCEL = 9;

/** Walk toward the hero. Slice 1 keeps this deliberately plain — the point of
 *  the slice is whether swinging feels good, not whether the AI is clever. */
export function steerEnemy(
  world: World,
  e: Entity,
  def: EnemyDef,
  dt: number,
): void {
  if (e.deadAtTick >= 0) return;

  const hero = heroOf(world);
  let desiredX = 0;
  let desiredY = 0;

  if (hero && hero.deadAtTick < 0) {
    const dx = hero.pos.x - e.pos.x;
    const dy = hero.pos.y - e.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      desiredX = (dx / dist) * def.speed;
      desiredY = (dy / dist) * def.speed;
      e.facing.x = dx / dist;
      e.facing.y = dy / dist;
    }
  }

  const k = 1 - Math.exp(-ENEMY_ACCEL * dt);
  e.vel.x += (desiredX - e.vel.x) * k;
  e.vel.y += (desiredY - e.vel.y) * k;
}

/** Enemies hurt the hero by touching them. */
export function applyTouchDamage(world: World, def: EnemyDef): void {
  const hero = heroOf(world);
  if (!hero || hero.deadAtTick >= 0) return;

  for (const e of world.entities) {
    if (e.kind !== "enemy" || e.deadAtTick >= 0) continue;
    const dist = Math.hypot(hero.pos.x - e.pos.x, hero.pos.y - e.pos.y);
    if (dist > hero.radius + e.radius) continue;
    // damageEntity enforces i-frames, so a pile-up costs one heart, not four.
    damageEntity(world, hero, def.touchDamage, e.pos.x, e.pos.y);
  }
}
```

- [ ] **Step 5: Wire AI into the simulation**

In `app/knight/engine/world.ts`, add:

```ts
import { steerEnemy, applyTouchDamage } from "./ai";
import { GRUNT } from "../data/enemies";
```

In `stepWorld`, immediately after the hero steering block and before the attack
block:

```ts
  for (const e of world.entities) {
    if (e.kind === "enemy") steerEnemy(world, e, GRUNT, FIXED_DT);
  }
  applyTouchDamage(world, GRUNT);
```

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm test app/knight`
Expected: PASS, 8 new tests.

- [ ] **Step 7: Commit**

```bash
git add app/knight/
git commit -m "feat(knight): add grunt enemy and chase AI"
```

---

### Task 6: Effects queue and pure animation poses

The spec makes graphics a first-class requirement. This task delivers the two
pure pieces the renderer needs: an fx queue the simulation owns, and pose
functions that are pure functions of state and time.

**Files:**
- Create: `app/knight/engine/fx.ts`
- Create: `app/knight/render/anim.ts`
- Test: `app/knight/engine/fx.test.ts`
- Test: `app/knight/render/anim.test.ts`
- Modify: `app/knight/engine/world.ts` (own and expire the fx list)

**Interfaces:**
- Consumes: `World`, `Entity`, `AttackPhase`.
- Produces:
  - `type FxKind = "slash" | "impact" | "death"`
  - `interface Fx { kind: FxKind; x: number; y: number; angle: number; tick: number }`
  - `FX_TICKS = 30`, `MAX_FX = 48`
  - `pushFx(world: World, fx: Fx): void`
  - `expireFx(world: World): void`
  - `interface Pose { offsetX: number; offsetY: number; scaleX: number; scaleY: number; tilt: number; flash: number }`
  - `poseFor(e: Entity, tick: number): Pose`
  - `SHAKE_TICKS = 12`, `shakeAt(world: World): number`

- [ ] **Step 1: Write the failing fx test**

Create `app/knight/engine/fx.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld } from "./world";
import { pushFx, expireFx, FX_TICKS, MAX_FX } from "./fx";

const arena = { width: 360, height: 560 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("fx queue", () => {
  it("queues an effect", () => {
    const w = fresh();
    pushFx(w, { kind: "impact", x: 10, y: 20, angle: 0, tick: 0 });
    expect(w.fx).toHaveLength(1);
  });

  it("expires effects once they are older than FX_TICKS", () => {
    const w = fresh();
    pushFx(w, { kind: "impact", x: 10, y: 20, angle: 0, tick: 0 });
    w.tick = FX_TICKS + 1;
    expireFx(w);
    expect(w.fx).toHaveLength(0);
  });

  it("keeps effects that are still alive", () => {
    const w = fresh();
    pushFx(w, { kind: "impact", x: 10, y: 20, angle: 0, tick: 0 });
    w.tick = FX_TICKS - 1;
    expireFx(w);
    expect(w.fx).toHaveLength(1);
  });

  it("stays bounded under a flood", () => {
    const w = fresh();
    for (let i = 0; i < MAX_FX * 4; i++) {
      pushFx(w, { kind: "impact", x: i, y: 0, angle: 0, tick: 0 });
    }
    expect(w.fx.length).toBeLessThanOrEqual(MAX_FX);
  });

  it("drops the oldest first when full", () => {
    const w = fresh();
    for (let i = 0; i < MAX_FX + 1; i++) {
      pushFx(w, { kind: "impact", x: i, y: 0, angle: 0, tick: 0 });
    }
    expect(w.fx[0].x).not.toBe(0);
  });
});
```

- [ ] **Step 2: Write the failing anim test**

Create `app/knight/render/anim.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { poseFor } from "./anim";
import type { Entity } from "../engine/types";

function entity(over: Partial<Entity> = {}): Entity {
  return {
    id: 1,
    kind: "hero",
    pos: { x: 100, y: 100 },
    vel: { x: 0, y: 0 },
    radius: 12,
    hp: 5,
    maxHp: 5,
    facing: { x: 0, y: 1 },
    hitAtTick: -1,
    deadAtTick: -1,
    attack: { phase: "idle", startedAtTick: 0 },
    ...over,
  };
}

describe("poseFor", () => {
  it("bobs while idle without drifting away", () => {
    const seen: number[] = [];
    for (let t = 0; t < 240; t++) seen.push(poseFor(entity(), t).offsetY);
    expect(Math.max(...seen)).toBeGreaterThan(0);
    expect(Math.min(...seen)).toBeLessThan(0);
    // A bob must stay small, or the sprite detaches from its hitbox.
    expect(Math.max(...seen.map(Math.abs))).toBeLessThan(4);
  });

  it("squashes and stretches while walking", () => {
    const walking = entity({ vel: { x: 120, y: 0 } });
    let sawSquash = false;
    let sawStretch = false;
    for (let t = 0; t < 240; t++) {
      const p = poseFor(walking, t);
      if (p.scaleY < 0.99) sawSquash = true;
      if (p.scaleY > 1.01) sawStretch = true;
    }
    expect(sawSquash && sawStretch).toBe(true);
  });

  it("tilts into the direction of travel", () => {
    const right = poseFor(entity({ vel: { x: 130, y: 0 } }), 10).tilt;
    const left = poseFor(entity({ vel: { x: -130, y: 0 } }), 10).tilt;
    expect(Math.sign(right)).toBe(-Math.sign(left));
    expect(right).not.toBe(0);
  });

  it("pulls back during wind-up and lunges when active", () => {
    const windup = poseFor(
      entity({ facing: { x: 1, y: 0 }, attack: { phase: "windup", startedAtTick: 0 } }),
      7,
    );
    const active = poseFor(
      entity({ facing: { x: 1, y: 0 }, attack: { phase: "active", startedAtTick: 0 } }),
      1,
    );
    expect(windup.offsetX).toBeLessThan(0);
    expect(active.offsetX).toBeGreaterThan(0);
  });

  it("flashes white on the tick it is hit and fades out", () => {
    const hit = entity({ hitAtTick: 100 });
    expect(poseFor(hit, 100).flash).toBeCloseTo(1, 1);
    expect(poseFor(hit, 108).flash).toBeLessThan(poseFor(hit, 101).flash);
    expect(poseFor(hit, 200).flash).toBe(0);
  });

  it("collapses on death", () => {
    const dead = entity({ deadAtTick: 50 });
    const early = poseFor(dead, 51);
    const late = poseFor(dead, 70);
    expect(late.scaleY).toBeLessThan(early.scaleY);
    expect(late.scaleY).toBeGreaterThanOrEqual(0);
  });

  it("is bounded in every state, so a sprite can never explode", () => {
    const states: Entity[] = [
      entity(),
      entity({ vel: { x: 400, y: 400 } }),
      entity({ attack: { phase: "windup", startedAtTick: 0 } }),
      entity({ attack: { phase: "active", startedAtTick: 0 } }),
      entity({ attack: { phase: "recover", startedAtTick: 0 } }),
      entity({ hitAtTick: 0 }),
      entity({ deadAtTick: 0 }),
    ];
    for (const e of states) {
      for (let t = 0; t < 200; t++) {
        const p = poseFor(e, t);
        expect(Number.isFinite(p.offsetX)).toBe(true);
        expect(Number.isFinite(p.offsetY)).toBe(true);
        expect(p.scaleX).toBeGreaterThan(0);
        expect(p.scaleX).toBeLessThan(2.5);
        expect(p.scaleY).toBeGreaterThanOrEqual(0);
        expect(p.scaleY).toBeLessThan(2.5);
        expect(Math.abs(p.tilt)).toBeLessThan(1);
        expect(p.flash).toBeGreaterThanOrEqual(0);
        expect(p.flash).toBeLessThanOrEqual(1);
      }
    }
  });
});
```

- [ ] **Step 3: Run to verify both fail**

Run: `pnpm test app/knight`
Expected: FAIL — cannot resolve `./fx` and `./anim`.

- [ ] **Step 4: Implement engine/fx.ts**

```ts
import type { World } from "./world";

export type FxKind = "slash" | "impact" | "death";

export interface Fx {
  kind: FxKind;
  x: number;
  y: number;
  /** Radians. Used by slashes to orient the arc. */
  angle: number;
  tick: number;
}

/** How long an effect lives. */
export const FX_TICKS = 30;
/** Hard cap so a crowded room cannot flood the renderer. */
export const MAX_FX = 48;

/**
 * The simulation owns effects rather than the renderer because several
 * simulation steps run between render frames — an effect queued and cleared
 * within one step would never be drawn.
 */
export function pushFx(world: World, fx: Fx): void {
  if (world.fx.length >= MAX_FX) world.fx.shift();
  world.fx.push(fx);
}

export function expireFx(world: World): void {
  if (world.fx.length === 0) return;
  world.fx = world.fx.filter((f) => world.tick - f.tick < FX_TICKS);
}
```

- [ ] **Step 5: Implement render/anim.ts**

```ts
import type { Entity } from "../engine/types";
import { WINDUP_TICKS, ACTIVE_TICKS, RECOVER_TICKS } from "../engine/combat";
import { CORPSE_TICKS } from "../engine/world";

export interface Pose {
  /** Sprite offset from the entity's position, in pixels. */
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  /** Lean, in radians. */
  tilt: number;
  /** White-out amount, 0..1. */
  flash: number;
}

/** Ticks a hit stays visibly white. */
const FLASH_TICKS = 14;
/** How far the sprite pulls back winding up, and lunges swinging. */
const WINDUP_PULL = 5;
const LUNGE_REACH = 9;
const WALK_SPEED_REF = 132;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * The visual pose for an entity at a tick.
 *
 * Pure on purpose: a pose is a function of simulation state and time, so it
 * cannot drift out of sync with the game, and it is testable without a browser.
 */
export function poseFor(e: Entity, tick: number): Pose {
  const pose: Pose = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    tilt: 0,
    flash: 0,
  };

  // --- death overrides everything ----------------------------------------
  if (e.deadAtTick >= 0) {
    const t = clamp01((tick - e.deadAtTick) / CORPSE_TICKS);
    pose.scaleY = Math.max(0, 1 - t);
    pose.scaleX = 1 + t * 0.5;
    pose.flash = clamp01(1 - t * 2);
    return pose;
  }

  // --- locomotion ---------------------------------------------------------
  const speed = Math.hypot(e.vel.x, e.vel.y);
  const moving = speed > 8;
  const bobRate = moving ? 0.34 : 0.09;
  const bobAmp = moving ? 2.4 : 1.2;
  const phase = tick * bobRate;

  pose.offsetY = -Math.abs(Math.sin(phase)) * bobAmp;

  if (moving) {
    const squash = Math.sin(phase * 2) * 0.06;
    pose.scaleY = 1 + squash;
    pose.scaleX = 1 - squash;
    // Lean away from travel: a positive x velocity leans the sprite left.
    pose.tilt = -(e.vel.x / WALK_SPEED_REF) * 0.16;
  } else {
    const breathe = Math.sin(phase) * 0.02;
    pose.scaleY = 1 + breathe;
    pose.scaleX = 1 - breathe;
  }

  // --- attack -------------------------------------------------------------
  const elapsed = tick - e.attack.startedAtTick;
  if (e.attack.phase === "windup") {
    const t = clamp01(elapsed / WINDUP_TICKS);
    pose.offsetX -= e.facing.x * WINDUP_PULL * t;
    pose.offsetY -= e.facing.y * WINDUP_PULL * t;
  } else if (e.attack.phase === "active") {
    const t = clamp01(elapsed / ACTIVE_TICKS);
    pose.offsetX += e.facing.x * LUNGE_REACH * (1 - t);
    pose.offsetY += e.facing.y * LUNGE_REACH * (1 - t);
  } else if (e.attack.phase === "recover") {
    const t = clamp01(elapsed / RECOVER_TICKS);
    const ease = (1 - t) * (1 - t);
    pose.offsetX += e.facing.x * LUNGE_REACH * 0.35 * ease;
    pose.offsetY += e.facing.y * LUNGE_REACH * 0.35 * ease;
  }

  // --- hit flash ----------------------------------------------------------
  if (e.hitAtTick >= 0) {
    const since = tick - e.hitAtTick;
    if (since >= 0 && since < FLASH_TICKS) {
      pose.flash = clamp01(1 - since / FLASH_TICKS);
    }
  }

  return pose;
}

/** Screen shake magnitude, in pixels, decaying from the most recent hit. */
export const SHAKE_TICKS = 12;

export function shakeFrom(lastHitTick: number, tick: number): number {
  if (lastHitTick < 0) return 0;
  const since = tick - lastHitTick;
  if (since < 0 || since >= SHAKE_TICKS) return 0;
  return (1 - since / SHAKE_TICKS) * 4;
}
```

- [ ] **Step 6: Own the fx list on the world**

In `app/knight/engine/world.ts`:

Add to the `World` interface:

```ts
  /** Short-lived visual effects. Owned by the sim so they survive the gap
   *  between simulation steps and render frames. */
  fx: Fx[];
  /** Tick of the most recent damaging hit, for screen shake. */
  lastHitTick: number;
```

with `import type { Fx } from "./fx";`, `import { pushFx, expireFx } from "./fx";`
and `fx: []`, `lastHitTick: -1` in `createWorld`.

Replace the attack block in `stepWorld` with one that also queues effects:

```ts
  world.hits.length = 0;
  for (const e of world.entities) {
    const swings = updateAttack(world, e);
    if (e.attack.phase === "active" && world.tick === e.attack.startedAtTick) {
      pushFx(world, {
        kind: "slash",
        x: e.pos.x + e.facing.x * 18,
        y: e.pos.y + e.facing.y * 18,
        angle: Math.atan2(e.facing.y, e.facing.x),
        tick: world.tick,
      });
    }
    for (const hit of swings) {
      const target = world.entities.find((t) => t.id === hit.targetId);
      if (!target) continue;
      pushFx(world, {
        kind: hit.killed ? "death" : "impact",
        x: target.pos.x,
        y: target.pos.y,
        angle: 0,
        tick: world.tick,
      });
      world.lastHitTick = world.tick;
    }
    world.hits.push(...swings);
  }
```

And add `expireFx(world);` immediately before `world.tick += 1;`.

- [ ] **Step 7: Run to verify everything passes**

Run: `pnpm test app/knight`
Expected: PASS, 12 new tests.

- [ ] **Step 8: Commit**

```bash
git add app/knight/
git commit -m "feat(knight): add fx queue and pure animation poses"
```

---

### Task 7: Canvas renderer

**Files:**
- Create: `app/knight/render/draw.ts`

**Interfaces:**
- Consumes: `World`, `Entity`, `poseFor`, `shakeFrom`, `Fx`, `GRUNT`, `drawPixelGrid`.
- Produces: `drawWorld(ctx: CanvasRenderingContext2D, world: World, opts: DrawOptions): void`
  where `interface DrawOptions { heroColor: string; reducedMotion: boolean }`.

No unit test: canvas output is verified by eye, which is acceptable precisely
because `draw.ts` decides nothing — every value it paints comes from the pure
modules already under test.

- [ ] **Step 1: Implement draw.ts**

```ts
import type { World } from "../engine/world";
import type { Entity } from "../engine/types";
import type { Fx } from "../engine/fx";
import { FX_TICKS } from "../engine/fx";
import { poseFor, shakeFrom } from "./anim";
import { SWING_REACH, SWING_ARC } from "../engine/combat";
import { GRUNT } from "../data/enemies";

export interface DrawOptions {
  /** The player critter's colour, from the shared roster. */
  heroColor: string;
  reducedMotion: boolean;
}

const BG = "#141020";
const FLOOR = "#1d1730";
const GRID = "#251d3a";

const px = (n: number) => Math.round(n);

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  opts: DrawOptions,
): void {
  const { arena } = world;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const shake = opts.reducedMotion ? 0 : shakeFrom(world.lastHitTick, world.tick);
  if (shake > 0) {
    // Deterministic wobble from the tick, so the renderer stays reproducible.
    ctx.translate(Math.sin(world.tick * 1.7) * shake, Math.cos(world.tick * 2.3) * shake);
  }

  drawFloor(ctx, arena.width, arena.height);

  // Corpses first, so living things are never hidden behind them.
  for (const e of world.entities) if (e.deadAtTick >= 0) drawEntity(ctx, e, world, opts);
  for (const e of world.entities) if (e.deadAtTick < 0) drawEntity(ctx, e, world, opts);

  for (const f of world.fx) drawFx(ctx, f, world.tick);

  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG;
  ctx.fillRect(-40, -40, w + 80, h + 80);

  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 40) {
    ctx.moveTo(px(x) + 0.5, 0);
    ctx.lineTo(px(x) + 0.5, h);
  }
  for (let y = 0; y <= h; y += 40) {
    ctx.moveTo(0, px(y) + 0.5);
    ctx.lineTo(w, px(y) + 0.5);
  }
  ctx.stroke();

  // Walls read as a border so the play area has an edge.
  ctx.strokeStyle = "#3a2f55";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  world: World,
  opts: DrawOptions,
): void {
  const pose = poseFor(e, world.tick);
  const base = e.kind === "hero" ? opts.heroColor : GRUNT.color;
  const r = e.radius;

  ctx.save();
  ctx.translate(px(e.pos.x + pose.offsetX), px(e.pos.y + pose.offsetY));
  ctx.rotate(pose.tilt);
  ctx.scale(pose.scaleX, pose.scaleY);

  // Contact shadow keeps entities planted on the floor.
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes, offset toward facing, so the entity reads as looking where it moves.
  ctx.fillStyle = "#f8f0e0";
  const ex = e.facing.x * r * 0.22;
  const ey = e.facing.y * r * 0.16;
  ctx.fillRect(px(-r * 0.42 + ex), px(-r * 0.2 + ey), 4, 5);
  ctx.fillRect(px(r * 0.18 + ex), px(-r * 0.2 + ey), 4, 5);

  if (pose.flash > 0) {
    ctx.globalAlpha = pose.flash;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // Enemy health pip, so a swing visibly matters.
  if (e.kind === "enemy" && e.deadAtTick < 0 && e.hp < e.maxHp) {
    const w = r * 2;
    ctx.fillStyle = "#2a2140";
    ctx.fillRect(px(e.pos.x - r), px(e.pos.y - r - 8), w, 3);
    ctx.fillStyle = "#e05050";
    ctx.fillRect(px(e.pos.x - r), px(e.pos.y - r - 8), w * Math.max(0, e.hp / e.maxHp), 3);
  }
}

function drawFx(ctx: CanvasRenderingContext2D, f: Fx, tick: number): void {
  const t = (tick - f.tick) / FX_TICKS;
  if (t < 0 || t >= 1) return;
  const alpha = 1 - t;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (f.kind === "slash") {
    // An arc sweeping through the swing wedge, widening as it fades.
    ctx.strokeStyle = "#f8f0e0";
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, SWING_REACH * (0.5 + t * 0.5), f.angle - SWING_ARC / 2, f.angle + SWING_ARC / 2);
    ctx.stroke();
  } else if (f.kind === "impact") {
    ctx.fillStyle = "#F8D030";
    const reach = 6 + t * 16;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      ctx.fillRect(px(f.x + dx * reach) - 2, px(f.y + dy * reach) - 2, 4, 4);
    }
  } else {
    // Death: eight shards flying out.
    ctx.fillStyle = "#ffffff";
    const reach = 4 + t * 28;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillRect(px(f.x + Math.cos(a) * reach) - 2, px(f.y + Math.sin(a) * reach) - 2, 4, 4);
    }
  }

  ctx.restore();
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/knight/render/draw.ts
git commit -m "feat(knight): add canvas renderer with slash, impact and death fx"
```

---

### Task 8: The playable route

**Files:**
- Create: `app/knight/page.tsx`
- Create: `app/knight/ui/Hud.tsx`
- Create: `app/knight/error.tsx`
- Modify: `app/game/_shared/registry.ts`

**Interfaces:**
- Consumes: everything above, plus `useGameLoop`, `PixelPanel`, `PixelButton`,
  `getCritter`, `BASE_CRITTERS`.
- Produces: the route.

- [ ] **Step 1: Implement the HUD**

Create `app/knight/ui/Hud.tsx`:

```tsx
"use client";

export function Hud({
  hp,
  maxHp,
  critterName,
}: {
  hp: number;
  maxHp: number;
  critterName: string;
}) {
  return (
    <div className="flex items-center justify-between border-b-4 border-[#f8f0e0] bg-[#1b1428] px-3 py-2 text-sm font-bold uppercase tracking-wider text-[#f8f0e0]">
      <span>{critterName}</span>
      <span aria-label={`${hp} of ${maxHp} health`}>
        {"♥".repeat(Math.max(0, hp))}
        <span className="opacity-30">{"♥".repeat(Math.max(0, maxHp - hp))}</span>
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Implement the error boundary**

Create `app/knight/error.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function KnightError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[knight]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0d0a15] p-6 text-[#f8f0e0]">
      <h1 className="text-lg font-bold uppercase tracking-widest">Run interrupted</h1>
      <button
        type="button"
        onClick={reset}
        className="border-4 border-[#f8f0e0] px-4 py-3 text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000]"
      >
        Try again
      </button>
      <Link href="/game" className="text-xs uppercase tracking-widest underline opacity-70">
        Back to arcade
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Implement the route**

Create `app/knight/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import { PixelPanel, PixelButton } from "@/app/game/_shared/pixel-ui";
import { BASE_CRITTERS, getCritter } from "@/app/game/_shared/critters";
import {
  createWorld,
  spawnHero,
  spawnEnemy,
  stepWorld,
  heroOf,
  FIXED_DT,
  type World,
} from "./engine/world";
import { GRUNT } from "./data/enemies";
import { drawWorld } from "./render/draw";
import { Hud } from "./ui/Hud";

const ARENA = { width: 360, height: 560 };
/** Slice 1 fights one hand-placed wave; Slice 2 generates rooms. */
const WAVE = [
  { x: 70, y: 90 },
  { x: 290, y: 90 },
  { x: 180, y: 60 },
  { x: 60, y: 230 },
  { x: 300, y: 230 },
];

const STARTER = BASE_CRITTERS[0].id;

function populate(seed: number): World {
  const world = createWorld({ arena: ARENA, seed });
  spawnHero(world, { x: ARENA.width / 2, y: ARENA.height - 90 });
  for (const p of WAVE) spawnEnemy(world, p, GRUNT.hp);
  return world;
}

export default function KnightPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World>(populate(1));
  const [reducedMotion, setReducedMotion] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [hud, setHud] = useState({ hp: 5, maxHp: 5, over: false, cleared: false });

  const critter = getCritter(STARTER);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!canvasRef.current?.getContext("2d")) setCanvasFailed(true);
  }, []);

  const step = useCallback(() => {
    const world = worldRef.current;
    stepWorld(world);
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const world = worldRef.current;

    drawWorld(ctx, world, { heroColor: critter.color, reducedMotion });

    const hero = heroOf(world);
    const alive = world.entities.some((e) => e.kind === "enemy" && e.deadAtTick < 0);
    setHud((prev) => {
      const next = {
        hp: hero?.hp ?? 0,
        maxHp: hero?.maxHp ?? 5,
        over: world.over,
        cleared: !alive,
      };
      return prev.hp === next.hp &&
        prev.maxHp === next.maxHp &&
        prev.over === next.over &&
        prev.cleared === next.cleared
        ? prev
        : next;
    });
  }, [critter.color, reducedMotion]);

  const finished = hud.over || hud.cleared;
  useGameLoop({
    step,
    draw,
    fixedDt: FIXED_DT,
    running: !finished && !canvasFailed,
  });

  const restart = useCallback(() => {
    worldRef.current = populate(worldRef.current.tick + 1);
    setHud({ hp: 5, maxHp: 5, over: false, cleared: false });
  }, []);

  const toArena = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ARENA.width,
      y: ((e.clientY - rect.top) / rect.height) * ARENA.height,
    };
  };

  return (
    <main className="flex min-h-dvh select-none flex-col bg-[#0d0a15]">
      <Hud hp={hud.hp} maxHp={hud.maxHp} critterName={critter.name} />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {canvasFailed && (
          <p className="p-6 text-center text-xs uppercase tracking-wider text-[#f8f0e0]">
            This browser cannot draw the game.
          </p>
        )}

        <canvas
          ref={canvasRef}
          width={ARENA.width}
          height={ARENA.height}
          className="h-full max-h-full w-auto touch-none"
          style={{ imageRendering: "pixelated" }}
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Capture is a nicety; losing it must not break input.
            }
            worldRef.current.moveTarget = toArena(e);
          }}
          onPointerMove={(e) => {
            if (worldRef.current.moveTarget === null) return;
            e.preventDefault();
            worldRef.current.moveTarget = toArena(e);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            worldRef.current.moveTarget = null;
          }}
          onPointerCancel={() => {
            worldRef.current.moveTarget = null;
          }}
        />

        {finished && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
            <PixelPanel className="w-full max-w-sm text-center">
              <h2 className="mb-4 text-lg font-bold uppercase tracking-widest">
                {hud.cleared ? "Room cleared" : "You fell"}
              </h2>
              <div className="flex flex-col gap-2">
                <PixelButton onClick={restart}>Again</PixelButton>
                <Link
                  href="/game"
                  className="text-center text-xs uppercase tracking-widest underline opacity-70"
                >
                  Back to arcade
                </Link>
              </div>
            </PixelPanel>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Register the cabinet**

In `app/game/_shared/registry.ts`, append to `GAMES`:

```ts
  {
    slug: "critter-knight",
    title: "CRITTER KNIGHT",
    tagline: "Drag to move. Stop to swing.",
    href: "/knight",
    accent: "#E05050",
    available: true,
  },
```

- [ ] **Step 5: Play it**

Run: `pnpm dev`, open `http://localhost:1315/knight` at a phone-sized viewport.

Verify by hand:
- Dragging moves the hero, and it accelerates rather than snapping.
- Releasing the drag coasts to a stop.
- Standing next to an enemy swings automatically; moving away stops swinging.
- A swing flashes the enemy white, knocks it back, and shows a slash arc.
- Killing an enemy bursts it into shards.
- Enemies chase; touching one costs a heart and briefly makes you invulnerable.
- Clearing all five enemies shows "Room cleared".
- Losing all hearts shows "You fell".
- The page never scrolls while dragging on the canvas.

- [ ] **Step 6: Verify the production build**

Run: `pnpm build`
Expected: exit 0, and `out/knight.html` exists.

- [ ] **Step 7: Confirm nothing else broke**

Run: `pnpm test`
Expected: PASS — the whole arcade suite, not just `app/knight`.

- [ ] **Step 8: Commit**

```bash
git add app/knight/ app/game/_shared/registry.ts
git commit -m "feat(knight): add playable slice-1 route and register the cabinet"
```

---

### Task 9: Offline caching — and a live bug in it

Adding `/knight` to the service worker turned up a defect that already affects
shipped routes. `public/sw.js` precaches `/game/`, `/sort/`, `/traffic/` and
`/shelf/` in `CORE`, but its `fetch` handler only intercepts `/bounce`,
`/_next`, the manifest and the icon:

```js
const handled =
  url.pathname.startsWith("/bounce") ||
  url.pathname.startsWith("/_next") ||
  url.pathname === "/manifest.webmanifest" ||
  url.pathname === "/icon.svg";
```

**Four routes are cached and never served.** With the network down they 404
despite sitting in the cache — the identical failure the manifest had before it
was added to this condition. Fix it for every route, not just the new one.

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Add the route to the precache list and bump the cache name**

In `public/sw.js`, add `"/knight/"` to `CORE` (trailing slash, matching the
other entries — the static export serves these as directory indexes), and change
`CACHE_NAME` from `"arcade-v5"` to `"arcade-v6"` so existing clients discard the
stale cache on activate.

- [ ] **Step 2: Make the fetch handler cover every arcade route**

Replace the `handled` expression with a prefix list, so adding a game means
adding one string in one place rather than remembering two:

```js
// Every arcade route, plus the shared assets. A path that is precached but not
// intercepted still 404s offline, which is exactly what happened to /game,
// /sort, /traffic and /shelf.
const ROUTE_PREFIXES = ["/game", "/bounce", "/sort", "/traffic", "/shelf", "/knight"];

const handled =
  url.pathname.startsWith("/_next") ||
  url.pathname === "/manifest.webmanifest" ||
  url.pathname === "/icon.svg" ||
  ROUTE_PREFIXES.some((p) => url.pathname.startsWith(p));
if (!handled) return;
```

- [ ] **Step 3: Verify offline, against the static export**

`next dev` does not serve the export the way production does, so this must run
against `out/`:

```bash
pnpm build && pnpm dlx serve out -l 3210
```

In the browser at `http://localhost:3210/game`: visit `/game`, `/knight` and
`/sort` so the worker caches them, confirm the worker is activated under
DevTools → Application → Service Workers, then stop the server and reload each.

Expected: all three still load with the origin down. Before this fix, `/game`
and `/sort` would fail.

- [ ] **Step 4: Commit**

```bash
git add public/sw.js
git commit -m "fix(arcade): serve every game route offline, not just /bounce

CORE precached /game, /sort, /traffic and /shelf, but the fetch handler
only intercepted /bounce — so four routes sat in the cache and still
404'd with the network down. Routes now come from one prefix list."
```

---

## Self-Review Notes

**Spec coverage for Slice 1.** Controls — drag to move with weight, auto-swing
when stopped (Tasks 3, 4, 8). Health, i-frames and death (Task 4). One enemy
archetype and chase AI (Task 5). Animation vocabulary — idle bob, walk squash
and tilt, wind-up pull-back, attack lunge, hit flash, death collapse (Task 6),
all pure and tested. Effects — slash arc, impact burst, death shards, screen
shake (Tasks 6, 7). Architecture — `engine/` free of React/DOM/canvas, poses
pure (Tasks 2–6). Error handling — canvas fallback and error boundary (Task 8),
arena clamping (Task 2). Roster promoted to `_shared` (Task 1). Offline
(Task 9).

**Deferred to later slices, by design:** procedural rooms and doors, the full
enemy roster, weapons, armor, powers, evolution, upgrades, the balance harness,
and the run save. Slice 1 hardcodes one room, one critter, one enemy on purpose.

**Type consistency checked.** `Entity`, `AttackState`, `World`, `Fx`, `Pose`,
`EnemyDef` and `SwingHit` are defined once and referenced with the same names
and shapes throughout. `CORPSE_TICKS` is exported from `world.ts` and consumed
by `anim.ts`; `WINDUP_TICKS`, `ACTIVE_TICKS`, `RECOVER_TICKS`, `SWING_REACH` and
`SWING_ARC` are exported from `combat.ts` and consumed by `anim.ts` and
`draw.ts`.

**Known risk, called out rather than hidden.** Slice 1 draws entities as shaded
circles with eyes, not sprites. That is deliberate: `useSprites` already falls
back when art is missing, the spec states missing art must never mean a missing
game, and the image-model quota was exhausted at design time. Slice 2 or a
dedicated art pass swaps in generated sprites through the existing
`scripts/sprites` pipeline without touching the simulation — `draw.ts` is the
only file that changes.
