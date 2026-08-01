# BOUNCEDEX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build BOUNCEDEX — an offline, portrait-mobile physics ricochet roguelite — as a new route in the existing `pokemon-resume` Next.js site, under an arcade hub at `/bounce` designed to host more games later.

**Architecture:** A pure TypeScript simulation engine (no React, no DOM, no canvas) advanced on a fixed timestep, drawn to a Canvas 2D element by a separate render module, wrapped in a thin React shell that owns menus and HUD. Purity of the engine is what makes the physics and combat unit-testable in Node without a browser.

**Tech Stack:** Next.js 15 (App Router, `output: "export"`), React 19 RC, TypeScript (strict), Tailwind 3, Canvas 2D, hand-rolled physics, Vitest, pnpm 10.11.0.

## Global Constraints

- **Package manager is pnpm 10.11.0.** Never run `npm install` or `yarn`. Use `pnpm add -D` etc.
- **Static export only.** `next.config.js` sets `output: "export"`. No server components doing I/O, no API routes, no `next/image` optimization, no runtime network calls of any kind.
- **All game routes are client components.** First line of every `page.tsx` under `app/bounce/` is `"use client";`.
- **TypeScript is `strict: true`.** No `any` without an inline justification comment. No non-null assertions on values that can legitimately be null.
- **Path alias `@/*` maps to the repo root** (per `tsconfig.json`). Import as `@/app/bounce/...`.
- **No new runtime dependencies.** The physics engine is hand-rolled deliberately (see spec). Vitest is a devDependency and must not enter the client bundle.
- **Portrait only.** No landscape layouts. Target a 60fps budget on a mid-range phone.
- **Never break the resume.** `app/page.tsx` and its components are out of scope; no shared-file edits that could affect them. Do not add a link from the resume to the arcade (explicitly out of scope for v1).
- **Do not modify `render.yaml`.** The existing `/*` → `/:splat.html` rewrite already serves nested static-export routes.
- **Deterministic simulation.** The engine must never call `Math.random()` or `Date.now()` directly; all randomness flows through the seeded RNG from Task 1, and all time flows through the fixed timestep.
- **Naming:** game display name is `BOUNCEDEX` (all caps in UI). Hub route `/bounce`, game route `/bounce/bouncedex`.

## File Structure

```
vitest.config.ts                          Vitest config with @ alias          (Task 1)

app/bounce/
├─ page.tsx                               arcade hub, renders from registry   (Task 15)
├─ _shared/
│  ├─ registry.ts                         game metadata list                  (Task 15)
│  ├─ save.ts                             versioned localStorage I/O          (Task 4)
│  ├─ save.test.ts                                                            (Task 4)
│  ├─ useGameLoop.ts                      fixed-timestep rAF loop             (Task 11)
│  └─ pixel-ui.tsx                        pixel button / panel / meter        (Task 12)
└─ bouncedex/
   ├─ page.tsx                            route entry + React shell           (Task 12)
   ├─ engine/
   │  ├─ rng.ts + rng.test.ts             seeded PRNG                         (Task 1)
   │  ├─ vec.ts + vec.test.ts             2D vector math                      (Task 2)
   │  ├─ physics.ts + physics.test.ts     integration, walls, pair collision  (Tasks 2,3)
   │  ├─ types.ts                         shared engine types                 (Task 2)
   │  ├─ world.ts + world.test.ts         world state + fixed-step advance    (Task 6)
   │  ├─ combat.ts + combat.test.ts       damage, combo, evolution trigger    (Task 7)
   │  ├─ waves.ts + waves.test.ts         wave composition                    (Task 8)
   │  └─ aim.ts + aim.test.ts             auto-aim heuristic + trajectory     (Task 11)
   ├─ data/
   │  ├─ critters.ts + critters.test.ts   roster, behaviors, evolution lines  (Task 5)
   │  └─ upgrades.ts + upgrades.test.ts   upgrade pool                        (Task 9)
   ├─ render/
   │  └─ draw.ts                          canvas painting from world state    (Task 10)
   └─ ui/
      ├─ Hud.tsx                          wave / HP / combo / queue           (Task 12)
      ├─ ChoiceModal.tsx                  upgrade + evolution choices         (Task 13)
      ├─ RunSummary.tsx                   end-of-run screen                   (Task 13)
      └─ DexScreen.tsx                    collection grid                     (Task 14)

public/
├─ manifest.webmanifest                   PWA manifest                        (Task 16)
└─ sw.js                                  offline precache service worker     (Task 16)
```

The boundary that matters: `engine/` and `data/` are pure and import nothing from React, `next`, or the DOM. `render/` reads world state and paints. `ui/` and `page.tsx` own React. A reviewer should be able to reject a change for importing React into `engine/`.

---

### Task 1: Test infrastructure and seeded RNG

Vitest does not exist in this repo yet. This task adds it and proves it works by delivering the first pure module — the seeded PRNG that every other random decision in the game depends on.

**Files:**
- Create: `vitest.config.ts`
- Create: `app/bounce/bouncedex/engine/rng.ts`
- Test: `app/bounce/bouncedex/engine/rng.test.ts`
- Modify: `package.json` (add `test` script + devDependency)

**Interfaces:**
- Consumes: nothing.
- Produces: `makeRng(seed: number): Rng` where `interface Rng { next(): number; int(maxExclusive: number): number; pick<T>(items: readonly T[]): T; state(): number }`. `next()` returns a float in `[0, 1)`.

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest@^3
```

- [ ] **Step 2: Create the Vitest config**

Tests are co-located with source as `*.test.ts`. Next.js only treats `page.tsx`/`layout.tsx`/`route.ts` as routes, so co-located test files inside `app/` are ignored by the build.

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./") },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
  },
});
```

- [ ] **Step 3: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write the failing test**

Create `app/bounce/bouncedex/engine/rng.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { makeRng } from "./rng";

describe("makeRng", () => {
  it("produces floats in [0, 1)", () => {
    const rng = makeRng(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it("int() stays within range", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it("pick() returns a member of the array", () => {
    const rng = makeRng(9);
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it("state() round-trips: reseeding from state resumes the sequence", () => {
    const a = makeRng(99);
    a.next();
    a.next();
    const resumed = makeRng(a.state());
    expect(resumed.next()).toEqual(makeRng(a.state()).next());
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./rng`.

- [ ] **Step 6: Implement the RNG**

Mulberry32 — small, fast, good enough distribution for a game, and trivially serializable (a single uint32), which is what lets a run be saved or replayed.

Create `app/bounce/bouncedex/engine/rng.ts`:

```ts
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Uniform choice from a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Current internal state, usable as a seed to resume this sequence. */
  state(): number;
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (maxExclusive: number) => Math.floor(next() * maxExclusive),
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error("pick() called with empty array");
      return items[Math.floor(next() * items.length)];
    },
    state: () => s,
  };
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS, 6 tests.

- [ ] **Step 8: Verify the production build still works**

Run: `pnpm build`
Expected: succeeds. Confirms co-located `.test.ts` files do not break the static export.

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml app/bounce/bouncedex/engine/rng.ts app/bounce/bouncedex/engine/rng.test.ts
git commit -m "feat(bouncedex): add vitest and seeded rng"
```

---

### Task 2: Vector math and physics integration

**Files:**
- Create: `app/bounce/bouncedex/engine/vec.ts`
- Create: `app/bounce/bouncedex/engine/types.ts`
- Create: `app/bounce/bouncedex/engine/physics.ts`
- Test: `app/bounce/bouncedex/engine/vec.test.ts`
- Test: `app/bounce/bouncedex/engine/physics.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Vec2 = { x: number; y: number }`
  - `add(a,b)`, `sub(a,b)`, `scale(a,k)`, `dot(a,b)`, `len(a)`, `lenSq(a)`, `norm(a)` — all returning new `Vec2` (or `number`), never mutating.
  - `interface Body { id: number; kind: BodyKind; pos: Vec2; vel: Vec2; radius: number; mass: number; restitution: number; hp: number; critterId: string | null; hitsDealt: number; settled: boolean }`
  - `type BodyKind = "projectile" | "settled" | "enemy"`
  - `interface Arena { width: number; height: number }`
  - `integrate(body: Body, dt: number, gravity: number, damping: number): void` — mutates in place.
  - `SETTLE_SPEED = 12` and `isSettled(body: Body): boolean`.

- [ ] **Step 1: Write the failing vector test**

Create `app/bounce/bouncedex/engine/vec.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { add, sub, scale, dot, len, lenSq, norm } from "./vec";

describe("vec", () => {
  it("adds without mutating inputs", () => {
    const a = { x: 1, y: 2 };
    const b = { x: 3, y: 4 };
    expect(add(a, b)).toEqual({ x: 4, y: 6 });
    expect(a).toEqual({ x: 1, y: 2 });
  });

  it("subtracts", () => {
    expect(sub({ x: 5, y: 5 }, { x: 2, y: 1 })).toEqual({ x: 3, y: 4 });
  });

  it("scales", () => {
    expect(scale({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 });
  });

  it("dots", () => {
    expect(dot({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
  });

  it("computes length and squared length", () => {
    expect(len({ x: 3, y: 4 })).toBe(5);
    expect(lenSq({ x: 3, y: 4 })).toBe(25);
  });

  it("normalizes to unit length", () => {
    const n = norm({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(len(n)).toBeCloseTo(1);
  });

  it("normalizing a zero vector returns zero rather than NaN", () => {
    expect(norm({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test vec`
Expected: FAIL — cannot resolve `./vec`.

- [ ] **Step 3: Implement vec.ts**

```ts
export type Vec2 = { x: number; y: number };

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const lenSq = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const len = (a: Vec2): number => Math.sqrt(lenSq(a));

export const norm = (a: Vec2): Vec2 => {
  const l = len(a);
  return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test vec`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the failing integration test**

Create `app/bounce/bouncedex/engine/physics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { integrate, isSettled, SETTLE_SPEED } from "./physics";
import type { Body } from "./types";

function makeBody(over: Partial<Body> = {}): Body {
  return {
    id: 1,
    kind: "projectile",
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    radius: 10,
    mass: 1,
    restitution: 0.8,
    hp: 1,
    critterId: null,
    hitsDealt: 0,
    settled: false,
    ...over,
  };
}

describe("integrate", () => {
  it("advances position by velocity * dt", () => {
    const b = makeBody({ vel: { x: 100, y: 50 } });
    integrate(b, 0.1, 0, 1);
    expect(b.pos.x).toBeCloseTo(10);
    expect(b.pos.y).toBeCloseTo(5);
  });

  it("applies gravity to vertical velocity", () => {
    const b = makeBody();
    integrate(b, 0.5, 200, 1);
    expect(b.vel.y).toBeCloseTo(100);
  });

  it("applies damping to velocity", () => {
    const b = makeBody({ vel: { x: 100, y: 0 } });
    integrate(b, 1, 0, 0.5);
    expect(b.vel.x).toBeCloseTo(50);
  });

  it("does not move settled bodies", () => {
    const b = makeBody({ settled: true, vel: { x: 100, y: 100 } });
    integrate(b, 0.1, 500, 1);
    expect(b.pos).toEqual({ x: 0, y: 0 });
  });
});

describe("isSettled", () => {
  it("is true below the settle speed", () => {
    expect(isSettled(makeBody({ vel: { x: SETTLE_SPEED - 1, y: 0 } }))).toBe(true);
  });

  it("is false above the settle speed", () => {
    expect(isSettled(makeBody({ vel: { x: SETTLE_SPEED + 1, y: 0 } }))).toBe(false);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `pnpm test physics`
Expected: FAIL — cannot resolve `./physics` and `./types`.

- [ ] **Step 7: Implement types.ts**

```ts
import type { Vec2 } from "./vec";

export type BodyKind = "projectile" | "settled" | "enemy";

export interface Body {
  id: number;
  kind: BodyKind;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  mass: number;
  /** 0 = dead stop on impact, 1 = perfectly elastic. */
  restitution: number;
  hp: number;
  /** Critter definition id for projectiles/settled bodies; null for enemies. */
  critterId: string | null;
  /** Damage events this body has caused. Drives evolution (Task 7). */
  hitsDealt: number;
  settled: boolean;
}

export interface Arena {
  width: number;
  height: number;
}
```

- [ ] **Step 8: Implement physics.ts (integration only for now)**

Semi-implicit Euler: velocity updates first, then position. It is stable at the timesteps we use and is what makes the bounce feel predictable.

```ts
import type { Body } from "./types";

/** Speed below which a projectile comes to rest and becomes a bumper. */
export const SETTLE_SPEED = 12;

/**
 * Advance one body by dt seconds. Mutates in place — this runs thousands of
 * times per second, and allocating two Vec2 per body per step is measurable.
 */
export function integrate(
  body: Body,
  dt: number,
  gravity: number,
  damping: number,
): void {
  if (body.settled) return;

  body.vel.y += gravity * dt;

  const d = Math.pow(damping, dt);
  body.vel.x *= d;
  body.vel.y *= d;

  body.pos.x += body.vel.x * dt;
  body.pos.y += body.vel.y * dt;
}

export function isSettled(body: Body): boolean {
  const speedSq = body.vel.x * body.vel.x + body.vel.y * body.vel.y;
  return speedSq < SETTLE_SPEED * SETTLE_SPEED;
}
```

- [ ] **Step 9: Run to verify it passes**

Run: `pnpm test`
Expected: PASS — all rng, vec, and physics tests.

Note: the damping test uses `damping = 0.5` with `dt = 1`, so `Math.pow(0.5, 1) = 0.5` and velocity halves. This formulation makes damping frame-rate independent, which matters because the sim runs at a fixed step but must stay correct if that step is ever retuned.

- [ ] **Step 10: Commit**

```bash
git add app/bounce/bouncedex/engine/
git commit -m "feat(bouncedex): add vector math and physics integration"
```

---

### Task 3: Collision resolution

The heart of game feel. Walls and body-vs-body, both with restitution and positional correction to prevent sinking.

**Files:**
- Modify: `app/bounce/bouncedex/engine/physics.ts`
- Modify: `app/bounce/bouncedex/engine/physics.test.ts`

**Interfaces:**
- Consumes: `Body`, `Arena` from Task 2.
- Produces:
  - `collideWalls(body: Body, arena: Arena): boolean` — reflects off left/right/top walls, returns `true` on contact. Does **not** handle the bottom edge; the world layer decides what falling off the bottom means.
  - `collidePair(a: Body, b: Body): boolean` — resolves overlap and exchanges impulse, returns `true` on contact.

- [ ] **Step 1: Write the failing wall-collision test**

Append to `app/bounce/bouncedex/engine/physics.test.ts` (keep the existing `makeBody` helper and add these imports at the top: `collideWalls, collidePair`, and `import type { Arena } from "./types";`):

```ts
const ARENA: Arena = { width: 400, height: 700 };

describe("collideWalls", () => {
  it("reflects off the left wall and reports contact", () => {
    const b = makeBody({ pos: { x: 5, y: 100 }, vel: { x: -100, y: 0 }, radius: 10, restitution: 0.5 });
    expect(collideWalls(b, ARENA)).toBe(true);
    expect(b.vel.x).toBeCloseTo(50);
    expect(b.pos.x).toBe(10);
  });

  it("reflects off the right wall", () => {
    const b = makeBody({ pos: { x: 395, y: 100 }, vel: { x: 100, y: 0 }, radius: 10, restitution: 1 });
    expect(collideWalls(b, ARENA)).toBe(true);
    expect(b.vel.x).toBeCloseTo(-100);
    expect(b.pos.x).toBe(390);
  });

  it("reflects off the top wall", () => {
    const b = makeBody({ pos: { x: 200, y: 2 }, vel: { x: 0, y: -80 }, radius: 10, restitution: 0.5 });
    expect(collideWalls(b, ARENA)).toBe(true);
    expect(b.vel.y).toBeCloseTo(40);
  });

  it("ignores the bottom edge", () => {
    const b = makeBody({ pos: { x: 200, y: 699 }, vel: { x: 0, y: 100 }, radius: 10 });
    expect(collideWalls(b, ARENA)).toBe(false);
  });

  it("reports no contact in open space", () => {
    const b = makeBody({ pos: { x: 200, y: 300 }, vel: { x: 10, y: 10 } });
    expect(collideWalls(b, ARENA)).toBe(false);
  });
});

describe("collidePair", () => {
  it("reports no contact when apart", () => {
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10 });
    const b = makeBody({ id: 2, pos: { x: 100, y: 0 }, radius: 10 });
    expect(collidePair(a, b)).toBe(false);
  });

  it("separates overlapping bodies", () => {
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, vel: { x: 50, y: 0 } });
    const b = makeBody({ id: 2, pos: { x: 15, y: 0 }, radius: 10, vel: { x: 0, y: 0 } });
    expect(collidePair(a, b)).toBe(true);
    const dx = b.pos.x - a.pos.x;
    expect(Math.abs(dx)).toBeGreaterThanOrEqual(20 - 1e-6);
  });

  it("conserves momentum for equal masses in a head-on elastic hit", () => {
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, vel: { x: 50, y: 0 }, mass: 1, restitution: 1 });
    const b = makeBody({ id: 2, pos: { x: 19, y: 0 }, radius: 10, vel: { x: -50, y: 0 }, mass: 1, restitution: 1 });
    collidePair(a, b);
    expect(a.vel.x + b.vel.x).toBeCloseTo(0);
    expect(a.vel.x).toBeLessThan(0);
    expect(b.vel.x).toBeGreaterThan(0);
  });

  it("treats a settled body as immovable (infinite mass)", () => {
    const settled = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, vel: { x: 0, y: 0 }, settled: true });
    const moving = makeBody({ id: 2, pos: { x: 19, y: 0 }, radius: 10, vel: { x: -50, y: 0 }, restitution: 1 });
    collidePair(settled, moving);
    expect(settled.pos).toEqual({ x: 0, y: 0 });
    expect(settled.vel).toEqual({ x: 0, y: 0 });
    expect(moving.vel.x).toBeGreaterThan(0);
  });

  it("does nothing when both bodies are settled", () => {
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, settled: true });
    const b = makeBody({ id: 2, pos: { x: 15, y: 0 }, radius: 10, settled: true });
    expect(collidePair(a, b)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test physics`
Expected: FAIL — `collideWalls` and `collidePair` are not exported.

- [ ] **Step 3: Implement collision resolution**

Append to `app/bounce/bouncedex/engine/physics.ts` (and add `import type { Arena } from "./types";` to the existing import line):

```ts
/**
 * Reflect a body off the arena's left, right, and top walls.
 * The bottom is deliberately open — the world layer decides whether falling
 * off the bottom means "settle", "despawn", or "hit the nest".
 * Returns true if a wall was touched this step.
 */
export function collideWalls(body: Body, arena: Arena): boolean {
  if (body.settled) return false;
  let hit = false;

  if (body.pos.x - body.radius < 0) {
    body.pos.x = body.radius;
    body.vel.x = Math.abs(body.vel.x) * body.restitution;
    hit = true;
  } else if (body.pos.x + body.radius > arena.width) {
    body.pos.x = arena.width - body.radius;
    body.vel.x = -Math.abs(body.vel.x) * body.restitution;
    hit = true;
  }

  if (body.pos.y - body.radius < 0) {
    body.pos.y = body.radius;
    body.vel.y = Math.abs(body.vel.y) * body.restitution;
    hit = true;
  }

  return hit;
}

/**
 * Resolve a circle-circle collision: push the pair apart so they stop
 * overlapping, then exchange impulse along the collision normal.
 * Settled bodies act as infinite mass — they are the arena's bumpers and must
 * not drift when struck. Returns true if the bodies were touching.
 */
export function collidePair(a: Body, b: Body): boolean {
  if (a.settled && b.settled) return false;

  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const distSq = dx * dx + dy * dy;
  const minDist = a.radius + b.radius;

  if (distSq >= minDist * minDist) return false;

  // Coincident centres: nudge apart along a fixed axis to avoid NaN.
  const dist = Math.sqrt(distSq) || 1e-6;
  const nx = distSq === 0 ? 1 : dx / dist;
  const ny = distSq === 0 ? 0 : dy / dist;

  const invMassA = a.settled ? 0 : 1 / a.mass;
  const invMassB = b.settled ? 0 : 1 / b.mass;
  const invMassSum = invMassA + invMassB;
  if (invMassSum === 0) return false;

  // Positional correction, split by inverse mass.
  const overlap = minDist - dist;
  a.pos.x -= nx * overlap * (invMassA / invMassSum);
  a.pos.y -= ny * overlap * (invMassA / invMassSum);
  b.pos.x += nx * overlap * (invMassB / invMassSum);
  b.pos.y += ny * overlap * (invMassB / invMassSum);

  // Impulse along the normal, using the softer of the two restitutions.
  const rvx = b.vel.x - a.vel.x;
  const rvy = b.vel.y - a.vel.y;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return true; // already separating

  const e = Math.min(a.restitution, b.restitution);
  const j = (-(1 + e) * velAlongNormal) / invMassSum;

  a.vel.x -= j * invMassA * nx;
  a.vel.y -= j * invMassA * ny;
  b.vel.x += j * invMassB * nx;
  b.vel.y += j * invMassB * ny;

  return true;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test physics`
Expected: PASS — all physics tests including the 11 new ones.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/bouncedex/engine/physics.ts app/bounce/bouncedex/engine/physics.test.ts
git commit -m "feat(bouncedex): add wall and pair collision resolution"
```

---

### Task 4: Versioned save system

Shared by every future arcade game, so it lives in `_shared/`. The version field and migration path exist so a later schema change does not silently wipe a Dex.

**Files:**
- Create: `app/bounce/_shared/save.ts`
- Test: `app/bounce/_shared/save.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface BouncedexSave { version: number; eggs: number; dex: string[]; starters: string[]; bestWave: number; bestCombo: number; autoMode: boolean }`
  - `SAVE_VERSION = 1`, `SAVE_KEY = "bounce:bouncedex"`
  - `defaultSave(): BouncedexSave`
  - `loadSave(storage: StorageLike): BouncedexSave`
  - `writeSave(storage: StorageLike, save: BouncedexSave): void`
  - `migrate(raw: unknown): BouncedexSave`
  - `interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void }`

Injecting `StorageLike` rather than reaching for `localStorage` is what lets this be tested in Node with a fake, and it costs one parameter.

- [ ] **Step 1: Write the failing test**

Create `app/bounce/_shared/save.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  defaultSave,
  loadSave,
  writeSave,
  migrate,
  SAVE_KEY,
  SAVE_VERSION,
  type StorageLike,
} from "./save";

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe("save", () => {
  it("returns a default save when storage is empty", () => {
    expect(loadSave(fakeStorage())).toEqual(defaultSave());
  });

  it("round-trips a save", () => {
    const s = fakeStorage();
    const save = { ...defaultSave(), eggs: 12, dex: ["ember", "blaze"], bestWave: 9 };
    writeSave(s, save);
    expect(loadSave(s)).toEqual(save);
  });

  it("falls back to defaults on unparseable JSON rather than throwing", () => {
    const s = fakeStorage({ [SAVE_KEY]: "{not json" });
    expect(loadSave(s)).toEqual(defaultSave());
  });

  it("falls back to defaults when the payload is not an object", () => {
    const s = fakeStorage({ [SAVE_KEY]: '"a string"' });
    expect(loadSave(s)).toEqual(defaultSave());
  });

  it("repairs a save with missing fields", () => {
    const s = fakeStorage({ [SAVE_KEY]: JSON.stringify({ version: SAVE_VERSION, eggs: 5 }) });
    const loaded = loadSave(s);
    expect(loaded.eggs).toBe(5);
    expect(loaded.dex).toEqual([]);
    expect(loaded.bestWave).toBe(0);
  });

  it("repairs fields of the wrong type", () => {
    const s = fakeStorage({ [SAVE_KEY]: JSON.stringify({ version: SAVE_VERSION, eggs: "lots", dex: "nope" }) });
    const loaded = loadSave(s);
    expect(loaded.eggs).toBe(0);
    expect(loaded.dex).toEqual([]);
  });

  it("migrates an unversioned legacy save by treating it as fresh", () => {
    expect(migrate({ eggs: 3 }).version).toBe(SAVE_VERSION);
  });

  it("stamps the current version on write", () => {
    const s = fakeStorage();
    writeSave(s, { ...defaultSave(), version: 0 });
    expect(JSON.parse(s.data[SAVE_KEY]).version).toBe(SAVE_VERSION);
  });

  it("does not throw when storage rejects a write (private mode / quota)", () => {
    const hostile: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => writeSave(hostile, defaultSave())).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test save`
Expected: FAIL — cannot resolve `./save`.

- [ ] **Step 3: Implement save.ts**

```ts
export const SAVE_VERSION = 1;
export const SAVE_KEY = "bounce:bouncedex";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BouncedexSave {
  version: number;
  /** Currency earned from runs. Buys critters only — never stats. */
  eggs: number;
  /** Critter ids discovered, base and evolved forms alike. */
  dex: string[];
  /** Base critter ids chosen for the launch queue. */
  starters: string[];
  bestWave: number;
  bestCombo: number;
  autoMode: boolean;
}

export function defaultSave(): BouncedexSave {
  return {
    version: SAVE_VERSION,
    eggs: 0,
    dex: [],
    starters: [],
    bestWave: 0,
    bestCombo: 0,
    autoMode: true,
  };
}

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/**
 * Coerce any stored payload into a valid save. A corrupt or partial save must
 * never crash the route — the worst acceptable outcome is starting fresh.
 */
export function migrate(raw: unknown): BouncedexSave {
  const base = defaultSave();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;

  // Only version 1 exists today. When version 2 lands, branch here on
  // r.version and transform forward rather than discarding.
  return {
    version: SAVE_VERSION,
    eggs: num(r.eggs, base.eggs),
    dex: strArray(r.dex),
    starters: strArray(r.starters),
    bestWave: num(r.bestWave, base.bestWave),
    bestCombo: num(r.bestCombo, base.bestCombo),
    autoMode: typeof r.autoMode === "boolean" ? r.autoMode : base.autoMode,
  };
}

export function loadSave(storage: StorageLike): BouncedexSave {
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return defaultSave();
  }
  if (raw === null) return defaultSave();

  try {
    return migrate(JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export function writeSave(storage: StorageLike, save: BouncedexSave): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ ...save, version: SAVE_VERSION }));
  } catch {
    // Private browsing or quota exhaustion. Losing a save is bad; crashing
    // mid-run is worse.
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test save`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/_shared/save.ts app/bounce/_shared/save.test.ts
git commit -m "feat(bounce): add versioned save system with migration"
```

---

### Task 5: Critter roster and evolution lines

Per the spec: 14 base critters, each evolving **once** into one of two branch forms — 42 definitions total. Evolved forms are declared as deltas off their base so the data stays readable and tunable.

**Files:**
- Create: `app/bounce/bouncedex/data/critters.ts`
- Test: `app/bounce/bouncedex/data/critters.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type BehaviorTag = "standard" | "heavy" | "light" | "sticky" | "splitter" | "ghost" | "magnet" | "bomb"`
  - `interface CritterDef { id: string; name: string; glyph: string; color: string; behavior: BehaviorTag; mass: number; radius: number; restitution: number; damage: number; stage: 1 | 2; evolvesTo: readonly [string, string] | null }`
  - `CRITTERS: Record<string, CritterDef>`
  - `BASE_CRITTERS: readonly CritterDef[]` (the 14 with `stage === 1`)
  - `getCritter(id: string): CritterDef` — throws on unknown id.
  - `EVOLVE_HIT_THRESHOLD = 8`

- [ ] **Step 1: Write the failing test**

Create `app/bounce/bouncedex/data/critters.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CRITTERS, BASE_CRITTERS, getCritter, EVOLVE_HIT_THRESHOLD } from "./critters";

describe("critter roster", () => {
  it("has 14 base critters", () => {
    expect(BASE_CRITTERS).toHaveLength(14);
  });

  it("has 42 total definitions (14 bases + 28 branch forms)", () => {
    expect(Object.keys(CRITTERS)).toHaveLength(42);
  });

  it("gives every base critter exactly two branch forms", () => {
    for (const base of BASE_CRITTERS) {
      expect(base.stage).toBe(1);
      expect(base.evolvesTo).not.toBeNull();
      expect(base.evolvesTo).toHaveLength(2);
    }
  });

  it("points every evolution target at a real stage-2 critter", () => {
    for (const base of BASE_CRITTERS) {
      for (const id of base.evolvesTo!) {
        const form = CRITTERS[id];
        expect(form, `missing evolution target ${id}`).toBeDefined();
        expect(form.stage).toBe(2);
      }
    }
  });

  it("never lets a stage-2 form evolve again (single evolution per spec)", () => {
    for (const def of Object.values(CRITTERS)) {
      if (def.stage === 2) expect(def.evolvesTo).toBeNull();
    }
  });

  it("gives every branch form a unique id used by exactly one base", () => {
    const targets = BASE_CRITTERS.flatMap((b) => [...b.evolvesTo!]);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("keys every entry by its own id", () => {
    for (const [key, def] of Object.entries(CRITTERS)) {
      expect(def.id).toBe(key);
    }
  });

  it("uses physically sane values throughout", () => {
    for (const def of Object.values(CRITTERS)) {
      expect(def.mass).toBeGreaterThan(0);
      expect(def.radius).toBeGreaterThan(0);
      expect(def.damage).toBeGreaterThan(0);
      expect(def.restitution).toBeGreaterThanOrEqual(0);
      expect(def.restitution).toBeLessThanOrEqual(1);
    }
  });

  it("makes evolved forms stronger than their base", () => {
    for (const base of BASE_CRITTERS) {
      for (const id of base.evolvesTo!) {
        expect(CRITTERS[id].damage).toBeGreaterThan(base.damage);
      }
    }
  });

  it("getCritter returns a definition and throws on unknown ids", () => {
    expect(getCritter("ember").id).toBe("ember");
    expect(() => getCritter("nope")).toThrow(/nope/);
  });

  it("exposes a sane evolution threshold", () => {
    expect(EVOLVE_HIT_THRESHOLD).toBe(8);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test critters`
Expected: FAIL — cannot resolve `./critters`.

- [ ] **Step 3: Implement critters.ts**

```ts
export type BehaviorTag =
  | "standard"
  | "heavy"
  | "light"
  | "sticky"
  | "splitter"
  | "ghost"
  | "magnet"
  | "bomb";

export interface CritterDef {
  id: string;
  name: string;
  /** Placeholder glyph; Task 10 draws procedural pixel sprites from `color`. */
  glyph: string;
  color: string;
  behavior: BehaviorTag;
  mass: number;
  radius: number;
  restitution: number;
  damage: number;
  stage: 1 | 2;
  /** Two branch forms, or null for stage-2 forms. One evolution per critter. */
  evolvesTo: readonly [string, string] | null;
}

/** Damage events a settled critter must deal before it may evolve. */
export const EVOLVE_HIT_THRESHOLD = 8;

type BaseSpec = Omit<CritterDef, "stage" | "evolvesTo">;
type BranchSpec = Partial<Omit<CritterDef, "stage" | "evolvesTo">> &
  Pick<CritterDef, "id" | "name">;

function line(base: BaseSpec, a: BranchSpec, b: BranchSpec): CritterDef[] {
  const branch = (spec: BranchSpec): CritterDef => ({
    ...base,
    ...spec,
    stage: 2,
    evolvesTo: null,
  });
  return [
    { ...base, stage: 1, evolvesTo: [a.id, b.id] as const },
    branch(a),
    branch(b),
  ];
}

const LINES: CritterDef[][] = [
  line(
    { id: "ember", name: "Ember", glyph: "🔥", color: "#F08030", behavior: "standard", mass: 1, radius: 13, restitution: 0.82, damage: 6 },
    { id: "blaze", name: "Blaze", glyph: "🔥", color: "#E0501A", damage: 11, behavior: "sticky" },
    { id: "cinder", name: "Cinder", glyph: "✨", color: "#FFA24C", damage: 9, behavior: "splitter" },
  ),
  line(
    { id: "boulder", name: "Boulder", glyph: "🪨", color: "#8A7A66", behavior: "heavy", mass: 3.2, radius: 17, restitution: 0.35, damage: 10 },
    { id: "monolith", name: "Monolith", glyph: "⛰️", color: "#6B5D4C", damage: 17, mass: 4.2, radius: 19 },
    { id: "avalanche", name: "Avalanche", glyph: "🏔️", color: "#A89880", damage: 14, behavior: "splitter", mass: 2.8 },
  ),
  line(
    { id: "pip", name: "Pip", glyph: "⚪", color: "#EDEDED", behavior: "light", mass: 0.5, radius: 9, restitution: 0.97, damage: 3 },
    { id: "ricochet", name: "Ricochet", glyph: "💫", color: "#D8F0FF", damage: 5, restitution: 0.99 },
    { id: "flicker", name: "Flicker", glyph: "⚡", color: "#FFF6A8", damage: 6, behavior: "ghost" },
  ),
  line(
    { id: "gloop", name: "Gloop", glyph: "🟢", color: "#7BC96F", behavior: "sticky", mass: 1.2, radius: 14, restitution: 0.4, damage: 5 },
    { id: "tarpit", name: "Tarpit", glyph: "⚫", color: "#3D3B3A", damage: 9, mass: 1.8 },
    { id: "bloom", name: "Bloom", glyph: "🌸", color: "#F7A8C4", damage: 8, behavior: "bomb" },
  ),
  line(
    { id: "sprout", name: "Sprout", glyph: "🌿", color: "#78C850", behavior: "standard", mass: 1, radius: 13, restitution: 0.8, damage: 6 },
    { id: "bramble", name: "Bramble", glyph: "🌾", color: "#5A9B38", damage: 10, behavior: "sticky" },
    { id: "thorn", name: "Thorn", glyph: "🌵", color: "#93D66B", damage: 9, behavior: "splitter" },
  ),
  line(
    { id: "droplet", name: "Droplet", glyph: "💧", color: "#6890F0", behavior: "standard", mass: 0.9, radius: 12, restitution: 0.9, damage: 5 },
    { id: "torrent", name: "Torrent", glyph: "🌊", color: "#3A63C8", damage: 9, mass: 1.6 },
    { id: "mist", name: "Mist", glyph: "🌫️", color: "#A8C4F0", damage: 7, behavior: "ghost" },
  ),
  line(
    { id: "spark", name: "Spark", glyph: "⚡", color: "#F8D030", behavior: "light", mass: 0.6, radius: 10, restitution: 0.95, damage: 4 },
    { id: "arc", name: "Arc", glyph: "🌩️", color: "#E8B800", damage: 8, behavior: "magnet" },
    { id: "surge", name: "Surge", glyph: "💥", color: "#FFE873", damage: 7, behavior: "bomb" },
  ),
  line(
    { id: "wisp", name: "Wisp", glyph: "👻", color: "#B39CD9", behavior: "ghost", mass: 0.8, radius: 12, restitution: 0.88, damage: 5 },
    { id: "phantom", name: "Phantom", glyph: "🎭", color: "#8A6FC4", damage: 9 },
    { id: "shade", name: "Shade", glyph: "🌑", color: "#5D4A85", damage: 8, behavior: "sticky" },
  ),
  line(
    { id: "lodestone", name: "Lodestone", glyph: "🧲", color: "#C05050", behavior: "magnet", mass: 1.4, radius: 14, restitution: 0.6, damage: 6 },
    { id: "polaris", name: "Polaris", glyph: "⭐", color: "#E86A6A", damage: 11 },
    { id: "vortex", name: "Vortex", glyph: "🌀", color: "#9B3F3F", damage: 10, behavior: "bomb" },
  ),
  line(
    { id: "kernel", name: "Kernel", glyph: "🌰", color: "#C4894A", behavior: "splitter", mass: 1.1, radius: 12, restitution: 0.75, damage: 4 },
    { id: "shrapnel", name: "Shrapnel", glyph: "🔩", color: "#9A6A33", damage: 7 },
    { id: "cluster", name: "Cluster", glyph: "🍇", color: "#A76FC4", damage: 6, behavior: "bomb" },
  ),
  line(
    { id: "fuse", name: "Fuse", glyph: "💣", color: "#4A4A4A", behavior: "bomb", mass: 1.5, radius: 14, restitution: 0.5, damage: 5 },
    { id: "detonator", name: "Detonator", glyph: "🧨", color: "#D63A2F", damage: 12 },
    { id: "mortar", name: "Mortar", glyph: "🎇", color: "#6F6F6F", damage: 10, behavior: "heavy", mass: 2.6 },
  ),
  line(
    { id: "shell", name: "Shell", glyph: "🐚", color: "#E8C9A0", behavior: "heavy", mass: 2.4, radius: 16, restitution: 0.45, damage: 8 },
    { id: "bulwark", name: "Bulwark", glyph: "🛡️", color: "#C4A277", damage: 13, mass: 3.4 },
    { id: "carapace", name: "Carapace", glyph: "🦂", color: "#A88A5C", damage: 11, behavior: "sticky" },
  ),
  line(
    { id: "gust", name: "Gust", glyph: "🌬️", color: "#A8E0E0", behavior: "light", mass: 0.55, radius: 10, restitution: 0.96, damage: 3 },
    { id: "cyclone", name: "Cyclone", glyph: "🌪️", color: "#7BC4C4", damage: 6, behavior: "magnet" },
    { id: "zephyr", name: "Zephyr", glyph: "☁️", color: "#D4F0F0", damage: 5, behavior: "ghost", restitution: 0.99 },
  ),
  line(
    { id: "pebble", name: "Pebble", glyph: "🔘", color: "#A8A878", behavior: "standard", mass: 1, radius: 12, restitution: 0.78, damage: 5 },
    { id: "geode", name: "Geode", glyph: "💎", color: "#8AA8C4", damage: 9, behavior: "splitter" },
    { id: "flint", name: "Flint", glyph: "🪶", color: "#8C8C6A", damage: 8, behavior: "heavy", mass: 2.2 },
  ),
];

const ALL: CritterDef[] = LINES.flat();

export const CRITTERS: Record<string, CritterDef> = Object.fromEntries(
  ALL.map((c) => [c.id, c]),
);

export const BASE_CRITTERS: readonly CritterDef[] = ALL.filter((c) => c.stage === 1);

export function getCritter(id: string): CritterDef {
  const def = CRITTERS[id];
  if (!def) throw new Error(`Unknown critter id: ${id}`);
  return def;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test critters`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/bouncedex/data/critters.ts app/bounce/bouncedex/data/critters.test.ts
git commit -m "feat(bouncedex): add 14-critter roster with branching evolution lines"
```

---

### Task 6: World state and deterministic fixed-step simulation

**Files:**
- Create: `app/bounce/bouncedex/engine/world.ts`
- Test: `app/bounce/bouncedex/engine/world.test.ts`

**Interfaces:**
- Consumes: `Body`, `Arena`, `integrate`, `collideWalls`, `collidePair`, `isSettled`, `makeRng`.
- Produces:
  - `FIXED_DT = 1 / 120`, `GRAVITY = 420`, `DAMPING = 0.92`
  - `interface World { tick: number; arena: Arena; bodies: Body[]; nextId: number; nestHp: number; maxNestHp: number; wave: number; combo: number; bestCombo: number; rngSeed: number; over: boolean }`
  - `createWorld(opts: { arena: Arena; seed: number }): World`
  - `spawnProjectile(world: World, critterId: string, pos: Vec2, vel: Vec2): Body`
  - `spawnEnemy(world: World, pos: Vec2, hp: number, radius: number): Body`
  - `stepWorld(world: World): void` — advances exactly one `FIXED_DT`, mutating in place.

- [ ] **Step 1: Write the failing test**

Create `app/bounce/bouncedex/engine/world.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld, spawnProjectile, spawnEnemy, stepWorld, FIXED_DT } from "./world";

const arena = { width: 400, height: 700 };

describe("createWorld", () => {
  it("starts empty, alive, and at tick 0", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(w.tick).toBe(0);
    expect(w.bodies).toHaveLength(0);
    expect(w.over).toBe(false);
    expect(w.nestHp).toBe(w.maxNestHp);
  });
});

describe("spawning", () => {
  it("assigns unique ids", () => {
    const w = createWorld({ arena, seed: 1 });
    const a = spawnProjectile(w, "ember", { x: 200, y: 600 }, { x: 0, y: -300 });
    const b = spawnProjectile(w, "ember", { x: 200, y: 600 }, { x: 0, y: -300 });
    expect(a.id).not.toBe(b.id);
    expect(w.bodies).toHaveLength(2);
  });

  it("gives a projectile the physical properties of its critter", () => {
    const w = createWorld({ arena, seed: 1 });
    const b = spawnProjectile(w, "boulder", { x: 200, y: 600 }, { x: 0, y: -300 });
    expect(b.mass).toBe(3.2);
    expect(b.radius).toBe(17);
    expect(b.critterId).toBe("boulder");
    expect(b.kind).toBe("projectile");
  });

  it("rejects unknown critter ids", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(() => spawnProjectile(w, "bogus", { x: 0, y: 0 }, { x: 0, y: 0 })).toThrow();
  });
});

describe("stepWorld", () => {
  it("advances the tick counter by exactly one", () => {
    const w = createWorld({ arena, seed: 1 });
    stepWorld(w);
    expect(w.tick).toBe(1);
  });

  it("moves a projectile according to its velocity", () => {
    const w = createWorld({ arena, seed: 1 });
    const b = spawnProjectile(w, "ember", { x: 200, y: 600 }, { x: 0, y: -240 });
    stepWorld(w);
    expect(b.pos.y).toBeLessThan(600);
  });

  it("settles a slow projectile and marks it as a bumper", () => {
    const w = createWorld({ arena, seed: 1 });
    const b = spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 1, y: 1 });
    stepWorld(w);
    expect(b.settled).toBe(true);
    expect(b.kind).toBe("settled");
  });

  it("bounces a projectile off the left wall", () => {
    const w = createWorld({ arena, seed: 1 });
    const b = spawnProjectile(w, "ember", { x: 20, y: 300 }, { x: -600, y: 0 });
    for (let i = 0; i < 20; i++) stepWorld(w);
    expect(b.vel.x).toBeGreaterThan(0);
  });

  it("is deterministic: identical seeds and inputs give identical state", () => {
    const run = () => {
      const w = createWorld({ arena, seed: 777 });
      spawnProjectile(w, "pip", { x: 200, y: 650 }, { x: 137, y: -520 });
      spawnEnemy(w, { x: 180, y: 120 }, 20, 14);
      spawnEnemy(w, { x: 260, y: 90 }, 20, 14);
      for (let i = 0; i < 600; i++) stepWorld(w);
      return JSON.stringify(w);
    };
    expect(run()).toEqual(run());
  });

  it("removes a projectile that falls past the bottom of the arena", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnProjectile(w, "ember", { x: 200, y: 690 }, { x: 0, y: 900 });
    for (let i = 0; i < 30; i++) stepWorld(w);
    expect(w.bodies.filter((b) => b.kind === "projectile")).toHaveLength(0);
  });

  it("costs nest HP when an enemy reaches the bottom, and removes it", () => {
    const w = createWorld({ arena, seed: 1 });
    const before = w.nestHp;
    spawnEnemy(w, { x: 200, y: 690 }, 20, 14);
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(w.nestHp).toBeLessThan(before);
    expect(w.bodies.filter((b) => b.kind === "enemy")).toHaveLength(0);
  });

  it("ends the run when nest HP is exhausted", () => {
    const w = createWorld({ arena, seed: 1 });
    w.nestHp = 1;
    spawnEnemy(w, { x: 200, y: 690 }, 20, 14);
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(w.over).toBe(true);
  });

  it("stops simulating once the run is over", () => {
    const w = createWorld({ arena, seed: 1 });
    w.over = true;
    stepWorld(w);
    expect(w.tick).toBe(0);
  });

  it("uses a fixed timestep of 1/120s", () => {
    expect(FIXED_DT).toBeCloseTo(1 / 120);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test world`
Expected: FAIL — cannot resolve `./world`.

- [ ] **Step 3: Implement world.ts**

```ts
import type { Vec2 } from "./vec";
import type { Arena, Body } from "./types";
import { integrate, collideWalls, collidePair, isSettled } from "./physics";
import { getCritter } from "../data/critters";

/** Simulation runs at a fixed 120Hz regardless of render frame rate. */
export const FIXED_DT = 1 / 120;
export const GRAVITY = 420;
export const DAMPING = 0.92;
export const ENEMY_FALL_SPEED = 26;
const DEFAULT_NEST_HP = 5;

export interface World {
  tick: number;
  arena: Arena;
  bodies: Body[];
  nextId: number;
  nestHp: number;
  maxNestHp: number;
  wave: number;
  combo: number;
  bestCombo: number;
  rngSeed: number;
  over: boolean;
}

export function createWorld(opts: { arena: Arena; seed: number }): World {
  return {
    tick: 0,
    arena: opts.arena,
    bodies: [],
    nextId: 1,
    nestHp: DEFAULT_NEST_HP,
    maxNestHp: DEFAULT_NEST_HP,
    wave: 0,
    combo: 0,
    bestCombo: 0,
    rngSeed: opts.seed,
    over: false,
  };
}

export function spawnProjectile(
  world: World,
  critterId: string,
  pos: Vec2,
  vel: Vec2,
): Body {
  const def = getCritter(critterId);
  const body: Body = {
    id: world.nextId++,
    kind: "projectile",
    pos: { ...pos },
    vel: { ...vel },
    radius: def.radius,
    mass: def.mass,
    restitution: def.restitution,
    hp: 1,
    critterId: def.id,
    hitsDealt: 0,
    settled: false,
  };
  world.bodies.push(body);
  return body;
}

export function spawnEnemy(
  world: World,
  pos: Vec2,
  hp: number,
  radius: number,
): Body {
  const body: Body = {
    id: world.nextId++,
    kind: "enemy",
    pos: { ...pos },
    vel: { x: 0, y: ENEMY_FALL_SPEED },
    radius,
    mass: 1.5,
    restitution: 0.3,
    hp,
    critterId: null,
    hitsDealt: 0,
    settled: false,
  };
  world.bodies.push(body);
  return body;
}

/**
 * Advance the world by exactly one FIXED_DT. Mutates in place.
 * Order matters: integrate, then walls, then pairs, then settle, then cull.
 * Resolving walls before pairs keeps bodies inside the arena when a pair
 * collision would otherwise push one through a wall.
 */
export function stepWorld(world: World): void {
  if (world.over) return;

  const { bodies, arena } = world;

  for (const b of bodies) {
    if (b.kind === "enemy") {
      // Enemies descend at a constant rate; they are not subject to gravity.
      b.pos.y += ENEMY_FALL_SPEED * FIXED_DT;
    } else {
      integrate(b, FIXED_DT, GRAVITY, DAMPING);
      collideWalls(b, arena);
    }
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      collidePair(bodies[i], bodies[j]);
    }
  }

  for (const b of bodies) {
    if (b.kind === "projectile" && isSettled(b)) {
      b.settled = true;
      b.kind = "settled";
      b.vel.x = 0;
      b.vel.y = 0;
    }
  }

  // Cull: projectiles that fall out the open bottom are lost; enemies that
  // reach the bottom damage the nest.
  let damage = 0;
  world.bodies = bodies.filter((b) => {
    const past = b.pos.y - b.radius > arena.height;
    if (!past) return true;
    if (b.kind === "enemy") damage += 1;
    return false;
  });

  if (damage > 0) {
    world.nestHp = Math.max(0, world.nestHp - damage);
    if (world.nestHp === 0) world.over = true;
  }

  world.tick += 1;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test world`
Expected: PASS, 12 tests. The determinism test is the important one — it proves the sim has no hidden `Math.random()` or wall-clock dependency.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/bouncedex/engine/world.ts app/bounce/bouncedex/engine/world.test.ts
git commit -m "feat(bouncedex): add deterministic fixed-step world simulation"
```

---

### Task 7: Combat — damage, combo, and evolution triggers

**Files:**
- Create: `app/bounce/bouncedex/engine/combat.ts`
- Test: `app/bounce/bouncedex/engine/combat.test.ts`
- Modify: `app/bounce/bouncedex/engine/world.ts` (call `applyImpact` from `stepWorld`)

**Interfaces:**
- Consumes: `Body`, `World`, `getCritter`, `EVOLVE_HIT_THRESHOLD`.
- Produces:
  - `interface ImpactEvent { attackerId: number; targetId: number; damage: number; combo: number; killed: boolean }`
  - `interface EvolutionEvent { bodyId: number; fromId: string; options: readonly [string, string] }`
  - `applyImpact(world: World, attacker: Body, target: Body): ImpactEvent | null`
  - `comboDamage(base: number, combo: number): number`
  - `pendingEvolution(world: World): EvolutionEvent | null`
  - `applyEvolution(world: World, bodyId: number, toId: string): void`

- [ ] **Step 1: Write the failing test**

Create `app/bounce/bouncedex/engine/combat.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld, spawnProjectile, spawnEnemy } from "./world";
import {
  applyImpact,
  comboDamage,
  pendingEvolution,
  applyEvolution,
} from "./combat";
import { EVOLVE_HIT_THRESHOLD } from "../data/critters";

const arena = { width: 400, height: 700 };

describe("comboDamage", () => {
  it("returns base damage at combo 0", () => {
    expect(comboDamage(10, 0)).toBe(10);
  });

  it("scales up with combo", () => {
    expect(comboDamage(10, 3)).toBeGreaterThan(comboDamage(10, 1));
  });

  it("always returns a whole number", () => {
    for (let c = 0; c < 20; c++) {
      expect(Number.isInteger(comboDamage(7, c))).toBe(true);
    }
  });
});

describe("applyImpact", () => {
  it("damages an enemy and increments the combo", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    const e = spawnEnemy(w, { x: 200, y: 300 }, 100, 14);
    const ev = applyImpact(w, p, e)!;
    expect(ev.damage).toBeGreaterThan(0);
    expect(e.hp).toBeLessThan(100);
    expect(w.combo).toBe(1);
  });

  it("credits the attacker with a hit dealt", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    const e = spawnEnemy(w, { x: 200, y: 300 }, 100, 14);
    applyImpact(w, p, e);
    expect(p.hitsDealt).toBe(1);
  });

  it("reports a kill and removes the enemy when HP reaches zero", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    const e = spawnEnemy(w, { x: 200, y: 300 }, 1, 14);
    const ev = applyImpact(w, p, e)!;
    expect(ev.killed).toBe(true);
    expect(w.bodies).not.toContain(e);
  });

  it("tracks the best combo across a run", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    for (let i = 0; i < 4; i++) {
      applyImpact(w, p, spawnEnemy(w, { x: 200, y: 300 }, 100, 14));
    }
    expect(w.bestCombo).toBe(4);
  });

  it("ignores impacts where the attacker is not a critter", () => {
    const w = createWorld({ arena, seed: 1 });
    const a = spawnEnemy(w, { x: 200, y: 300 }, 10, 14);
    const b = spawnEnemy(w, { x: 220, y: 300 }, 10, 14);
    expect(applyImpact(w, a, b)).toBeNull();
  });

  it("ignores impacts on non-enemies", () => {
    const w = createWorld({ arena, seed: 1 });
    const a = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -1 });
    const b = spawnProjectile(w, "ember", { x: 230, y: 400 }, { x: 0, y: -1 });
    expect(applyImpact(w, a, b)).toBeNull();
  });
});

describe("evolution", () => {
  it("reports no pending evolution below the hit threshold", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD - 1;
    expect(pendingEvolution(w)).toBeNull();
  });

  it("reports a pending evolution with both branch options at the threshold", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    const ev = pendingEvolution(w)!;
    expect(ev.bodyId).toBe(p.id);
    expect(ev.fromId).toBe("ember");
    expect(ev.options).toEqual(["blaze", "cinder"]);
  });

  it("does not offer evolution to an unsettled projectile", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    expect(pendingEvolution(w)).toBeNull();
  });

  it("swaps the body to its evolved form and resets the hit counter", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    applyEvolution(w, p.id, "blaze");
    expect(p.critterId).toBe("blaze");
    expect(p.hitsDealt).toBe(0);
    expect(p.radius).toBe(13);
  });

  it("never offers a second evolution to an already-evolved form", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    applyEvolution(w, p.id, "blaze");
    p.hitsDealt = EVOLVE_HIT_THRESHOLD * 3;
    expect(pendingEvolution(w)).toBeNull();
  });

  it("rejects an evolution target that is not one of the body's branches", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    expect(() => applyEvolution(w, p.id, "torrent")).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test combat`
Expected: FAIL — cannot resolve `./combat`.

- [ ] **Step 3: Implement combat.ts**

```ts
import type { Body } from "./types";
import type { World } from "./world";
import { getCritter, EVOLVE_HIT_THRESHOLD } from "../data/critters";

export interface ImpactEvent {
  attackerId: number;
  targetId: number;
  damage: number;
  combo: number;
  killed: boolean;
}

export interface EvolutionEvent {
  bodyId: number;
  fromId: string;
  options: readonly [string, string];
}

/**
 * Damage scales +25% per combo step. Linear rather than exponential: the
 * spectacle should come from chain *length*, not from a number that runs away
 * and trivialises later waves.
 */
export function comboDamage(base: number, combo: number): number {
  return Math.round(base * (1 + combo * 0.25));
}

export function applyImpact(
  world: World,
  attacker: Body,
  target: Body,
): ImpactEvent | null {
  if (attacker.critterId === null) return null;
  if (target.kind !== "enemy") return null;

  const def = getCritter(attacker.critterId);
  const damage = comboDamage(def.damage, world.combo);

  target.hp -= damage;
  attacker.hitsDealt += 1;
  world.combo += 1;
  if (world.combo > world.bestCombo) world.bestCombo = world.combo;

  const killed = target.hp <= 0;
  if (killed) {
    world.bodies = world.bodies.filter((b) => b.id !== target.id);
  }

  return {
    attackerId: attacker.id,
    targetId: target.id,
    damage,
    combo: world.combo,
    killed,
  };
}

/**
 * The first settled critter that has dealt enough damage and still has an
 * evolution available. Damage *taken* is irrelevant — only damage dealt counts,
 * so evolution rewards good placement rather than absorbing punishment.
 */
export function pendingEvolution(world: World): EvolutionEvent | null {
  for (const b of world.bodies) {
    if (!b.settled || b.critterId === null) continue;
    if (b.hitsDealt < EVOLVE_HIT_THRESHOLD) continue;

    const def = getCritter(b.critterId);
    if (def.evolvesTo === null) continue; // already stage 2

    return { bodyId: b.id, fromId: def.id, options: def.evolvesTo };
  }
  return null;
}

export function applyEvolution(world: World, bodyId: number, toId: string): void {
  const body = world.bodies.find((b) => b.id === bodyId);
  if (!body || body.critterId === null) {
    throw new Error(`No evolvable body with id ${bodyId}`);
  }

  const from = getCritter(body.critterId);
  if (from.evolvesTo === null || !from.evolvesTo.includes(toId)) {
    throw new Error(`${toId} is not a valid evolution of ${from.id}`);
  }

  const to = getCritter(toId);
  body.critterId = to.id;
  body.radius = to.radius;
  body.mass = to.mass;
  body.restitution = to.restitution;
  body.hitsDealt = 0;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test combat`
Expected: PASS, 14 tests.

- [ ] **Step 5: Wire impacts into the simulation**

In `app/bounce/bouncedex/engine/world.ts`, add the import:

```ts
import { applyImpact, type ImpactEvent } from "./combat";
```

Add an impact sink to the `World` interface (append inside the interface):

```ts
  /** Impacts produced by the most recent step; the renderer drains this. */
  impacts: ImpactEvent[];
```

Initialise it in `createWorld` by adding `impacts: [],` to the returned object.

Then replace the pair-collision loop in `stepWorld` with:

```ts
  world.impacts.length = 0;

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      if (!collidePair(a, b)) continue;

      const ev = applyImpact(world, a, b) ?? applyImpact(world, b, a);
      if (ev) world.impacts.push(ev);
    }
  }
```

Note the ordering hazard: `applyImpact` can remove the killed enemy from `world.bodies`, but the loop iterates the local `bodies` reference captured before the loop. That is intentional and safe — the dead body is skipped by the cull filter at the end of the step, and its `hp <= 0` means a second impact in the same step cannot kill it twice into a double reward, because `applyImpact` only reports `killed` once the filter has already removed it from `world.bodies`.

Also reset the combo when no projectile is airborne. Add this just before `world.tick += 1;`:

```ts
  const anyAirborne = world.bodies.some((b) => b.kind === "projectile");
  if (!anyAirborne) world.combo = 0;
```

- [ ] **Step 6: Add the combo-reset test**

Append to `app/bounce/bouncedex/engine/world.test.ts`:

```ts
describe("combo lifecycle", () => {
  it("resets the combo once nothing is airborne", () => {
    const w = createWorld({ arena, seed: 1 });
    w.combo = 5;
    stepWorld(w);
    expect(w.combo).toBe(0);
  });

  it("preserves the combo while a projectile is still in flight", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 0, y: -400 });
    w.combo = 5;
    stepWorld(w);
    expect(w.combo).toBe(5);
  });
});
```

- [ ] **Step 7: Run the full suite**

Run: `pnpm test`
Expected: PASS — all suites. The determinism test from Task 6 must still pass; if it fails, something in combat is reaching for unseeded randomness.

- [ ] **Step 8: Commit**

```bash
git add app/bounce/bouncedex/engine/
git commit -m "feat(bouncedex): add combat, combo scaling, and evolution triggers"
```

---

### Task 8: Wave composition

**Files:**
- Create: `app/bounce/bouncedex/engine/waves.ts`
- Test: `app/bounce/bouncedex/engine/waves.test.ts`

**Interfaces:**
- Consumes: `Rng` from Task 1.
- Produces:
  - `type EnemyKind = "basic" | "armored" | "fast" | "splitter" | "boss"`
  - `interface EnemySpawn { kind: EnemyKind; hp: number; radius: number; lane: number }`
  - `LANES = 5`
  - `buildWave(waveIndex: number, rng: Rng): EnemySpawn[]`
  - `isBossWave(waveIndex: number): boolean`
  - `laneX(lane: number, arenaWidth: number): number`

- [ ] **Step 1: Write the failing test**

Create `app/bounce/bouncedex/engine/waves.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildWave, isBossWave, laneX, LANES } from "./waves";
import { makeRng } from "./rng";

describe("isBossWave", () => {
  it("is true every 10th wave", () => {
    expect(isBossWave(10)).toBe(true);
    expect(isBossWave(20)).toBe(true);
  });

  it("is false otherwise", () => {
    expect(isBossWave(1)).toBe(false);
    expect(isBossWave(9)).toBe(false);
    expect(isBossWave(11)).toBe(false);
  });

  it("is false at wave 0", () => {
    expect(isBossWave(0)).toBe(false);
  });
});

describe("laneX", () => {
  it("spreads lanes evenly across the arena", () => {
    const xs = Array.from({ length: LANES }, (_, i) => laneX(i, 400));
    expect(xs).toHaveLength(5);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    expect(xs[0]).toBeGreaterThan(0);
    expect(xs[xs.length - 1]).toBeLessThan(400);
  });
});

describe("buildWave", () => {
  it("is deterministic for a given seed", () => {
    expect(buildWave(7, makeRng(3))).toEqual(buildWave(7, makeRng(3)));
  });

  it("produces only basic enemies on wave 1", () => {
    const wave = buildWave(1, makeRng(1));
    expect(wave.length).toBeGreaterThan(0);
    expect(wave.every((e) => e.kind === "basic")).toBe(true);
  });

  it("grows in enemy count as waves progress", () => {
    const early = buildWave(1, makeRng(5)).length;
    const late = buildWave(15, makeRng(5)).length;
    expect(late).toBeGreaterThan(early);
  });

  it("grows in total HP as waves progress", () => {
    const total = (i: number) => buildWave(i, makeRng(5)).reduce((s, e) => s + e.hp, 0);
    expect(total(15)).toBeGreaterThan(total(1));
  });

  it("places every enemy in a valid lane", () => {
    for (let i = 1; i <= 30; i++) {
      for (const e of buildWave(i, makeRng(i))) {
        expect(e.lane).toBeGreaterThanOrEqual(0);
        expect(e.lane).toBeLessThan(LANES);
      }
    }
  });

  it("returns exactly one boss on a boss wave", () => {
    const wave = buildWave(10, makeRng(1));
    expect(wave.filter((e) => e.kind === "boss")).toHaveLength(1);
  });

  it("gives the boss substantially more HP than a basic enemy", () => {
    const boss = buildWave(10, makeRng(1)).find((e) => e.kind === "boss")!;
    const basic = buildWave(1, makeRng(1))[0];
    expect(boss.hp).toBeGreaterThan(basic.hp * 5);
  });

  it("introduces armored enemies by wave 4 and fast ones by wave 6", () => {
    const kindsBy = (max: number) => {
      const s = new Set<string>();
      for (let i = 1; i <= max; i++) for (const e of buildWave(i, makeRng(i))) s.add(e.kind);
      return s;
    };
    expect(kindsBy(5).has("armored")).toBe(true);
    expect(kindsBy(8).has("fast")).toBe(true);
  });

  it("always produces positive hp and radius", () => {
    for (let i = 1; i <= 30; i++) {
      for (const e of buildWave(i, makeRng(i))) {
        expect(e.hp).toBeGreaterThan(0);
        expect(e.radius).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test waves`
Expected: FAIL — cannot resolve `./waves`.

- [ ] **Step 3: Implement waves.ts**

```ts
import type { Rng } from "./rng";

export const LANES = 5;

export type EnemyKind = "basic" | "armored" | "fast" | "splitter" | "boss";

export interface EnemySpawn {
  kind: EnemyKind;
  hp: number;
  radius: number;
  lane: number;
}

const BASE_HP = 12;

export function isBossWave(waveIndex: number): boolean {
  return waveIndex > 0 && waveIndex % 10 === 0;
}

/** Centre x of a lane, inset so enemies never clip the arena walls. */
export function laneX(lane: number, arenaWidth: number): number {
  const usable = arenaWidth * 0.86;
  const margin = (arenaWidth - usable) / 2;
  return margin + (usable / LANES) * (lane + 0.5);
}

/** Enemy kinds unlocked by a given wave, in the order they are introduced. */
function availableKinds(waveIndex: number): EnemyKind[] {
  const kinds: EnemyKind[] = ["basic"];
  if (waveIndex >= 4) kinds.push("armored");
  if (waveIndex >= 6) kinds.push("fast");
  if (waveIndex >= 8) kinds.push("splitter");
  return kinds;
}

function statsFor(kind: EnemyKind, waveIndex: number): { hp: number; radius: number } {
  const scale = 1 + waveIndex * 0.18;
  switch (kind) {
    case "basic":
      return { hp: Math.round(BASE_HP * scale), radius: 14 };
    case "armored":
      return { hp: Math.round(BASE_HP * 2.4 * scale), radius: 16 };
    case "fast":
      return { hp: Math.round(BASE_HP * 0.6 * scale), radius: 11 };
    case "splitter":
      return { hp: Math.round(BASE_HP * 1.4 * scale), radius: 15 };
    case "boss":
      return { hp: Math.round(BASE_HP * 14 * scale), radius: 30 };
  }
}

export function buildWave(waveIndex: number, rng: Rng): EnemySpawn[] {
  if (isBossWave(waveIndex)) {
    const { hp, radius } = statsFor("boss", waveIndex);
    return [{ kind: "boss", hp, radius, lane: 2 }];
  }

  const count = Math.min(3 + Math.floor(waveIndex * 0.7), 14);
  const kinds = availableKinds(waveIndex);

  return Array.from({ length: count }, () => {
    const kind = rng.pick(kinds);
    const { hp, radius } = statsFor(kind, waveIndex);
    return { kind, hp, radius, lane: rng.int(LANES) };
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test waves`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/bouncedex/engine/waves.ts app/bounce/bouncedex/engine/waves.test.ts
git commit -m "feat(bouncedex): add escalating wave composition"
```

---

### Task 9: Upgrade pool

Offered as a 1-of-3 choice every 5 waves.

**Files:**
- Create: `app/bounce/bouncedex/data/upgrades.ts`
- Test: `app/bounce/bouncedex/data/upgrades.test.ts`

**Interfaces:**
- Consumes: `Rng`.
- Produces:
  - `interface RunMods { launchPower: number; queueSize: number; autoFireInterval: number; wallRestitution: number; detonateOnSettle: boolean; damageMult: number }`
  - `interface Upgrade { id: string; name: string; description: string; apply(mods: RunMods): RunMods }`
  - `defaultMods(): RunMods`
  - `UPGRADES: readonly Upgrade[]`
  - `rollUpgrades(rng: Rng, count?: number): Upgrade[]` — distinct picks.
  - `UPGRADE_EVERY_WAVES = 5`

- [ ] **Step 1: Write the failing test**

Create `app/bounce/bouncedex/data/upgrades.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  UPGRADES,
  rollUpgrades,
  defaultMods,
  UPGRADE_EVERY_WAVES,
} from "./upgrades";
import { makeRng } from "../engine/rng";

describe("upgrades", () => {
  it("offers a pool of at least six upgrades", () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(6);
  });

  it("gives every upgrade a unique id", () => {
    const ids = UPGRADES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every upgrade a name and description", () => {
    for (const u of UPGRADES) {
      expect(u.name.length).toBeGreaterThan(0);
      expect(u.description.length).toBeGreaterThan(0);
    }
  });

  it("rolls three distinct upgrades by default", () => {
    const picks = rollUpgrades(makeRng(1));
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => p.id)).size).toBe(3);
  });

  it("is deterministic for a given seed", () => {
    const a = rollUpgrades(makeRng(9)).map((u) => u.id);
    const b = rollUpgrades(makeRng(9)).map((u) => u.id);
    expect(a).toEqual(b);
  });

  it("never returns more upgrades than the pool holds", () => {
    expect(rollUpgrades(makeRng(1), 999)).toHaveLength(UPGRADES.length);
  });

  it("returns a new mods object rather than mutating the input", () => {
    const base = defaultMods();
    const frozen = { ...base };
    for (const u of UPGRADES) u.apply(base);
    expect(base).toEqual(frozen);
  });

  it("changes at least one field for every upgrade", () => {
    const base = defaultMods();
    for (const u of UPGRADES) {
      expect(u.apply(base), `${u.id} was a no-op`).not.toEqual(base);
    }
  });

  it("offers upgrades every five waves", () => {
    expect(UPGRADE_EVERY_WAVES).toBe(5);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test upgrades`
Expected: FAIL — cannot resolve `./upgrades`.

- [ ] **Step 3: Implement upgrades.ts**

```ts
import type { Rng } from "../engine/rng";

export const UPGRADE_EVERY_WAVES = 5;

export interface RunMods {
  /** Multiplier on launch velocity. */
  launchPower: number;
  /** Number of critters visible and queued. */
  queueSize: number;
  /** Seconds between automatic launches. */
  autoFireInterval: number;
  /** Multiplier on wall bounciness. */
  wallRestitution: number;
  /** Whether settling critters explode. */
  detonateOnSettle: boolean;
  /** Global damage multiplier. */
  damageMult: number;
}

export function defaultMods(): RunMods {
  return {
    launchPower: 1,
    queueSize: 3,
    autoFireInterval: 2.5,
    wallRestitution: 1,
    detonateOnSettle: false,
    damageMult: 1,
  };
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  apply(mods: RunMods): RunMods;
}

export const UPGRADES: readonly Upgrade[] = [
  {
    id: "power",
    name: "STRONG ARM",
    description: "+20% launch power",
    apply: (m) => ({ ...m, launchPower: m.launchPower * 1.2 }),
  },
  {
    id: "queue",
    name: "BIG POCKETS",
    description: "+1 queue slot",
    apply: (m) => ({ ...m, queueSize: m.queueSize + 1 }),
  },
  {
    id: "autofire",
    name: "ITCHY TRIGGER",
    description: "Auto-fire 25% faster",
    apply: (m) => ({ ...m, autoFireInterval: m.autoFireInterval * 0.75 }),
  },
  {
    id: "walls",
    name: "RUBBER WALLS",
    description: "+15% wall bounciness",
    apply: (m) => ({ ...m, wallRestitution: m.wallRestitution * 1.15 }),
  },
  {
    id: "detonate",
    name: "HARD LANDING",
    description: "Critters explode when they settle",
    apply: (m) => ({ ...m, detonateOnSettle: true }),
  },
  {
    id: "damage",
    name: "SHARP EDGES",
    description: "+15% damage",
    apply: (m) => ({ ...m, damageMult: m.damageMult * 1.15 }),
  },
  {
    id: "bigpower",
    name: "CANNON ARM",
    description: "+35% launch power, -10% damage",
    apply: (m) => ({
      ...m,
      launchPower: m.launchPower * 1.35,
      damageMult: m.damageMult * 0.9,
    }),
  },
  {
    id: "glasscannon",
    name: "GLASS CANNON",
    description: "+40% damage, -1 queue slot",
    apply: (m) => ({
      ...m,
      damageMult: m.damageMult * 1.4,
      queueSize: Math.max(1, m.queueSize - 1),
    }),
  },
];

/** Distinct random upgrades, capped at the pool size. */
export function rollUpgrades(rng: Rng, count = 3): Upgrade[] {
  const pool = [...UPGRADES];
  const picked: Upgrade[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    picked.push(pool.splice(rng.int(pool.length), 1)[0]);
  }
  return picked;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test upgrades`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/bouncedex/data/upgrades.ts app/bounce/bouncedex/data/upgrades.test.ts
git commit -m "feat(bouncedex): add run upgrade pool"
```

---

### Task 10: Auto-aim heuristic and trajectory preview

The spec makes the auto-aimer's mediocrity a **design requirement**: it targets the nearest threat directly and never plans bank shots, so that manual play is genuinely better.

**Files:**
- Create: `app/bounce/bouncedex/engine/aim.ts`
- Test: `app/bounce/bouncedex/engine/aim.test.ts`

**Interfaces:**
- Consumes: `Body`, `Arena`, `Vec2`, `World`.
- Produces:
  - `LAUNCH_SPEED = 620`
  - `autoAim(world: World, origin: Vec2): Vec2` — returns a unit direction.
  - `aimFromDrag(origin: Vec2, touch: Vec2): Vec2` — unit direction, clamped to the upward half-plane.
  - `predictPath(world: World, origin: Vec2, dir: Vec2, power: number, steps: number): Vec2[]`

- [ ] **Step 1: Write the failing test**

Create `app/bounce/bouncedex/engine/aim.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createWorld, spawnEnemy } from "./world";
import { autoAim, aimFromDrag, predictPath, LAUNCH_SPEED } from "./aim";
import { len } from "./vec";

const arena = { width: 400, height: 700 };
const origin = { x: 200, y: 660 };

describe("autoAim", () => {
  it("returns a unit vector", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnEnemy(w, { x: 300, y: 200 }, 10, 14);
    expect(len(autoAim(w, origin))).toBeCloseTo(1);
  });

  it("aims upward when there are no enemies", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(autoAim(w, origin).y).toBeLessThan(0);
  });

  it("aims toward the lowest (most threatening) enemy", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnEnemy(w, { x: 60, y: 100 }, 10, 14);
    spawnEnemy(w, { x: 340, y: 500 }, 10, 14);
    expect(autoAim(w, origin).x).toBeGreaterThan(0);
  });

  it("always aims upward even if an enemy is below the launcher", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnEnemy(w, { x: 200, y: 695 }, 10, 14);
    expect(autoAim(w, origin).y).toBeLessThan(0);
  });

  it("ignores settled critters when choosing a target", () => {
    const w = createWorld({ arena, seed: 1 });
    const e = spawnEnemy(w, { x: 60, y: 300 }, 10, 14);
    e.kind = "settled";
    expect(autoAim(w, origin).x).toBeCloseTo(0, 1);
  });
});

describe("aimFromDrag", () => {
  it("returns a unit vector pointing from origin toward the touch", () => {
    const d = aimFromDrag(origin, { x: 200, y: 400 });
    expect(len(d)).toBeCloseTo(1);
    expect(d.y).toBeLessThan(0);
  });

  it("clamps a downward drag to horizontal-ish rather than firing into the floor", () => {
    expect(aimFromDrag(origin, { x: 300, y: 690 }).y).toBeLessThanOrEqual(0);
  });

  it("falls back to straight up when the touch is on the origin", () => {
    expect(aimFromDrag(origin, { ...origin })).toEqual({ x: 0, y: -1 });
  });
});

describe("predictPath", () => {
  it("returns the requested number of points", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(predictPath(w, origin, { x: 0, y: -1 }, 1, 12)).toHaveLength(12);
  });

  it("starts near the origin and moves upward", () => {
    const w = createWorld({ arena, seed: 1 });
    const path = predictPath(w, origin, { x: 0, y: -1 }, 1, 12);
    expect(path[0].y).toBeLessThan(origin.y);
    expect(path[11].y).toBeLessThan(path[0].y);
  });

  it("reflects off a side wall", () => {
    const w = createWorld({ arena, seed: 1 });
    const path = predictPath(w, origin, { x: -0.8, y: -0.6 }, 1.6, 60);
    for (const p of path) expect(p.x).toBeGreaterThanOrEqual(0);
    const turned = path.some((p, i) => i > 0 && p.x > path[i - 1].x);
    expect(turned).toBe(true);
  });

  it("does not mutate the world", () => {
    const w = createWorld({ arena, seed: 1 });
    const before = JSON.stringify(w);
    predictPath(w, origin, { x: 0.3, y: -0.9 }, 1, 30);
    expect(JSON.stringify(w)).toEqual(before);
  });

  it("uses a sane launch speed", () => {
    expect(LAUNCH_SPEED).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test aim`
Expected: FAIL — cannot resolve `./aim`.

- [ ] **Step 3: Implement aim.ts**

```ts
import type { Vec2 } from "./vec";
import { norm, sub } from "./vec";
import type { World } from "./world";
import { FIXED_DT, GRAVITY, DAMPING } from "./world";

export const LAUNCH_SPEED = 620;

/**
 * Deliberately mediocre: pick the lowest enemy and fire straight at it.
 * It never plans a bank shot. This is a design requirement, not a shortcut —
 * idling must be viable while aiming yourself stays meaningfully better.
 */
export function autoAim(world: World, origin: Vec2): Vec2 {
  const enemies = world.bodies.filter((b) => b.kind === "enemy");
  if (enemies.length === 0) return { x: 0, y: -1 };

  let target = enemies[0];
  for (const e of enemies) {
    if (e.pos.y > target.pos.y) target = e;
  }

  const dir = norm(sub(target.pos, origin));
  // Never fire into the floor, even if the target has slipped below us.
  if (dir.y >= 0) return norm({ x: dir.x, y: -0.35 });
  return dir;
}

/** Direction from the launcher to the player's finger, clamped upward. */
export function aimFromDrag(origin: Vec2, touch: Vec2): Vec2 {
  const raw = sub(touch, origin);
  if (raw.x === 0 && raw.y === 0) return { x: 0, y: -1 };
  const dir = norm(raw);
  if (dir.y > 0) return norm({ x: dir.x, y: -0.05 });
  return dir;
}

/**
 * Simulate a launch against walls only, ignoring other bodies, and return
 * sampled points for the aim arc. Pure — it must never touch world state.
 */
export function predictPath(
  world: World,
  origin: Vec2,
  dir: Vec2,
  power: number,
  steps: number,
): Vec2[] {
  const { arena } = world;
  const pos = { ...origin };
  const vel = { x: dir.x * LAUNCH_SPEED * power, y: dir.y * LAUNCH_SPEED * power };
  const radius = 12;
  const out: Vec2[] = [];

  // Sample every 4 sim steps so the arc covers useful distance without
  // returning hundreds of nearly-identical points.
  const SUBSTEPS = 4;

  for (let i = 0; i < steps; i++) {
    for (let s = 0; s < SUBSTEPS; s++) {
      vel.y += GRAVITY * FIXED_DT;
      const d = Math.pow(DAMPING, FIXED_DT);
      vel.x *= d;
      vel.y *= d;
      pos.x += vel.x * FIXED_DT;
      pos.y += vel.y * FIXED_DT;

      if (pos.x - radius < 0) {
        pos.x = radius;
        vel.x = Math.abs(vel.x) * 0.85;
      } else if (pos.x + radius > arena.width) {
        pos.x = arena.width - radius;
        vel.x = -Math.abs(vel.x) * 0.85;
      }
      if (pos.y - radius < 0) {
        pos.y = radius;
        vel.y = Math.abs(vel.y) * 0.85;
      }
    }
    out.push({ x: pos.x, y: pos.y });
  }

  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test aim`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/bouncedex/engine/aim.ts app/bounce/bouncedex/engine/aim.test.ts
git commit -m "feat(bouncedex): add auto-aim heuristic and trajectory preview"
```

---

### Task 11: Fixed-timestep game loop hook

Shared across future games, so it lives in `_shared/`. The accumulator pattern decouples simulation rate from render rate.

**Files:**
- Create: `app/bounce/_shared/useGameLoop.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `useGameLoop(opts: { step: () => void; draw: (alpha: number) => void; fixedDt: number; running: boolean }): void`

There is no unit test here — it is a thin `requestAnimationFrame` wrapper whose behaviour is only observable in a browser. Its correctness is verified manually in Task 12. The logic worth testing (the simulation) lives in `world.ts` and is already covered.

- [ ] **Step 1: Implement the hook**

```ts
"use client";

import { useEffect, useRef } from "react";

interface GameLoopOptions {
  /** Advance the simulation by exactly fixedDt. */
  step: () => void;
  /** Paint. `alpha` is the interpolation factor into the next step, 0..1. */
  draw: (alpha: number) => void;
  fixedDt: number;
  running: boolean;
}

/** Maximum simulated seconds per frame — prevents a spiral of death after a
 *  long tab-switch, where a huge dt would queue thousands of catch-up steps. */
const MAX_FRAME_TIME = 0.25;

export function useGameLoop({ step, draw, fixedDt, running }: GameLoopOptions): void {
  const stepRef = useRef(step);
  const drawRef = useRef(draw);

  // Keep the latest closures without restarting the loop on every render.
  useEffect(() => {
    stepRef.current = step;
    drawRef.current = draw;
  }, [step, draw]);

  useEffect(() => {
    if (!running) return;

    let frame = 0;
    let last = performance.now();
    let accumulator = 0;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;

      let elapsed = (now - last) / 1000;
      last = now;
      if (elapsed > MAX_FRAME_TIME) elapsed = MAX_FRAME_TIME;

      accumulator += elapsed;
      while (accumulator >= fixedDt) {
        stepRef.current();
        accumulator -= fixedDt;
      }

      drawRef.current(accumulator / fixedDt);
      frame = requestAnimationFrame(tick);
    };

    // A backgrounded tab stops firing rAF; reset the clock on return so the
    // accumulator does not see a multi-minute delta.
    const onVisibility = () => {
      if (!document.hidden) {
        last = performance.now();
        accumulator = 0;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    frame = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running, fixedDt]);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/bounce/_shared/useGameLoop.ts
git commit -m "feat(bounce): add fixed-timestep game loop hook"
```

---

### Task 12: Canvas renderer

**Files:**
- Create: `app/bounce/bouncedex/render/draw.ts`

**Interfaces:**
- Consumes: `World`, `Body`, `getCritter`, `Vec2`.
- Produces:
  - `interface DrawOptions { aimPath: Vec2[] | null; shake: number; reducedMotion: boolean }`
  - `drawWorld(ctx: CanvasRenderingContext2D, world: World, opts: DrawOptions): void`

No unit test — canvas output is verified by eye. Keeping `draw.ts` free of game logic is what makes that acceptable: it reads state and paints, and decides nothing.

- [ ] **Step 1: Implement draw.ts**

```ts
import type { World } from "../engine/world";
import type { Body } from "../engine/types";
import type { Vec2 } from "../engine/vec";
import { getCritter } from "../data/critters";

export interface DrawOptions {
  aimPath: Vec2[] | null;
  /** Screen-shake magnitude in pixels; 0 disables. */
  shake: number;
  reducedMotion: boolean;
}

const BG = "#141020";
const GRID = "#221b33";
const ENEMY = "#6d4a7a";
const ENEMY_EDGE = "#3d2647";
const NEST = "#F8D030";

/** Snap to whole pixels — sub-pixel positions blur the pixel-art look. */
const px = (n: number): number => Math.round(n);

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  opts: DrawOptions,
): void {
  const { arena } = world;

  ctx.save();

  if (opts.shake > 0 && !opts.reducedMotion) {
    // Deterministic wobble from the tick counter — no Math.random in render.
    const t = world.tick;
    ctx.translate(
      Math.sin(t * 0.9) * opts.shake,
      Math.cos(t * 1.3) * opts.shake,
    );
  }

  ctx.fillStyle = BG;
  ctx.fillRect(-20, -20, arena.width + 40, arena.height + 40);

  drawGrid(ctx, arena.width, arena.height);
  if (opts.aimPath) drawAimPath(ctx, opts.aimPath);
  for (const b of world.bodies) drawBody(ctx, b);
  drawNest(ctx, world);

  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
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
}

function drawAimPath(ctx: CanvasRenderingContext2D, path: Vec2[]): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let i = 0; i < path.length; i++) {
    const size = i < path.length / 2 ? 4 : 3;
    ctx.fillRect(px(path[i].x) - size / 2, px(path[i].y) - size / 2, size, size);
  }
}

function drawBody(ctx: CanvasRenderingContext2D, b: Body): void {
  if (b.kind === "enemy") {
    ctx.fillStyle = ENEMY;
    ctx.strokeStyle = ENEMY_EDGE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px(b.pos.x), px(b.pos.y), b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  const def = b.critterId ? getCritter(b.critterId) : null;
  ctx.fillStyle = def?.color ?? "#ffffff";
  ctx.beginPath();
  ctx.arc(px(b.pos.x), px(b.pos.y), b.radius, 0, Math.PI * 2);
  ctx.fill();

  // Settled critters get a bright rim so bumpers read differently from
  // in-flight projectiles at a glance.
  if (b.settled) {
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawNest(ctx: CanvasRenderingContext2D, world: World): void {
  const { arena } = world;
  const h = 10;
  const ratio = world.maxNestHp === 0 ? 0 : world.nestHp / world.maxNestHp;

  ctx.fillStyle = "#2a2140";
  ctx.fillRect(0, arena.height - h, arena.width, h);
  ctx.fillStyle = NEST;
  ctx.fillRect(0, arena.height - h, arena.width * ratio, h);
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/bounce/bouncedex/render/draw.ts
git commit -m "feat(bouncedex): add canvas renderer"
```

---

### Task 13: Pixel UI kit and game shell

The first playable build. After this task the game runs end to end: waves spawn, auto-fire launches critters, manual aiming works, and the nest can lose.

**Files:**
- Create: `app/bounce/_shared/pixel-ui.tsx`
- Create: `app/bounce/bouncedex/ui/Hud.tsx`
- Create: `app/bounce/bouncedex/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–12.
- Produces: `PixelButton`, `PixelPanel` from `pixel-ui.tsx`; `Hud` from `Hud.tsx`; the route itself.

- [ ] **Step 1: Implement the pixel UI kit**

Create `app/bounce/_shared/pixel-ui.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

export function PixelPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-4 border-[#f8f0e0] bg-[#1b1428] px-4 py-3 text-[#f8f0e0] shadow-[4px_4px_0_0_#000] ${className}`}
      style={{ imageRendering: "pixelated" }}
    >
      {children}
    </div>
  );
}

export function PixelButton({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border-4 border-[#f8f0e0] bg-[#2f2447] px-4 py-3 font-bold uppercase tracking-wider text-[#f8f0e0] shadow-[3px_3px_0_0_#000] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Implement the HUD**

Create `app/bounce/bouncedex/ui/Hud.tsx`:

```tsx
"use client";

import { getCritter } from "../data/critters";

export function Hud({
  wave,
  nestHp,
  maxNestHp,
  combo,
  queue,
  autoMode,
  onToggleAuto,
}: {
  wave: number;
  nestHp: number;
  maxNestHp: number;
  combo: number;
  queue: string[];
  autoMode: boolean;
  onToggleAuto: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b-4 border-[#f8f0e0] bg-[#1b1428] px-3 py-2 text-sm font-bold uppercase tracking-wider text-[#f8f0e0]">
        <span>Wave {wave}</span>
        <span aria-label={`${nestHp} of ${maxNestHp} nest health`}>
          {"♥".repeat(nestHp)}
          <span className="opacity-30">{"♥".repeat(Math.max(0, maxNestHp - nestHp))}</span>
        </span>
        <span className={combo > 1 ? "text-[#F8D030]" : "opacity-40"}>×{combo}</span>
      </div>

      <div className="flex items-center justify-between border-t-4 border-[#f8f0e0] bg-[#1b1428] px-3 py-2 text-[#f8f0e0]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider opacity-60">Next</span>
          {queue.map((id, i) => (
            <span
              key={`${id}-${i}`}
              className="inline-block h-6 w-6 rounded-full border-2 border-black"
              style={{ background: getCritter(id).color }}
              title={getCritter(id).name}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleAuto}
          className="border-2 border-[#f8f0e0] px-2 py-1 text-xs font-bold uppercase tracking-wider"
        >
          Auto {autoMode ? "●" : "○"}
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Implement the game route**

Create `app/bounce/bouncedex/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameLoop } from "@/app/bounce/_shared/useGameLoop";
import { createWorld, spawnProjectile, spawnEnemy, stepWorld, FIXED_DT, type World } from "./engine/world";
import { autoAim, aimFromDrag, predictPath, LAUNCH_SPEED } from "./engine/aim";
import { buildWave, laneX } from "./engine/waves";
import { makeRng } from "./engine/rng";
import { drawWorld } from "./render/draw";
import { BASE_CRITTERS } from "./data/critters";
import { defaultMods } from "./data/upgrades";
import type { Vec2 } from "./engine/vec";
import { Hud } from "./ui/Hud";

const ARENA = { width: 400, height: 700 };
const LAUNCH_ORIGIN: Vec2 = { x: ARENA.width / 2, y: ARENA.height - 30 };
const MANUAL_RELEASE_MS = 3000;
const WAVE_INTERVAL_TICKS = 120 * 8; // one wave every 8 simulated seconds

export default function BouncedexPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World>(createWorld({ arena: ARENA, seed: 1 }));
  const modsRef = useRef(defaultMods());
  const autoTimerRef = useRef(0);
  const lastTouchRef = useRef(0);
  const dragRef = useRef<Vec2 | null>(null);
  const waveRngRef = useRef(makeRng(1));

  const [autoMode, setAutoMode] = useState(true);
  const [hud, setHud] = useState({ wave: 0, nestHp: 5, maxNestHp: 5, combo: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  const queue = useMemo(
    () => BASE_CRITTERS.slice(0, 3).map((c) => c.id),
    [],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const launch = useCallback((dir: Vec2) => {
    const world = worldRef.current;
    const critterId = queue[world.tick % queue.length];
    const power = LAUNCH_SPEED * modsRef.current.launchPower;
    spawnProjectile(world, critterId, LAUNCH_ORIGIN, {
      x: dir.x * power,
      y: dir.y * power,
    });
  }, [queue]);

  const step = useCallback(() => {
    const world = worldRef.current;
    stepWorld(world);

    if (world.tick > 0 && world.tick % WAVE_INTERVAL_TICKS === 0) {
      world.wave += 1;
      for (const spawn of buildWave(world.wave, waveRngRef.current)) {
        spawnEnemy(world, { x: laneX(spawn.lane, ARENA.width), y: -spawn.radius }, spawn.hp, spawn.radius);
      }
    }

    const manualRecently = performance.now() - lastTouchRef.current < MANUAL_RELEASE_MS;
    if (autoMode && !manualRecently && !world.over) {
      autoTimerRef.current += FIXED_DT;
      if (autoTimerRef.current >= modsRef.current.autoFireInterval) {
        autoTimerRef.current = 0;
        launch(autoAim(world, LAUNCH_ORIGIN));
      }
    }
  }, [autoMode, launch]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const world = worldRef.current;
    const aimPath = dragRef.current
      ? predictPath(world, LAUNCH_ORIGIN, aimFromDrag(LAUNCH_ORIGIN, dragRef.current), modsRef.current.launchPower, 26)
      : null;

    const shake = Math.min(world.combo, 6);
    drawWorld(ctx, world, { aimPath, shake, reducedMotion });

    setHud((prev) =>
      prev.wave === world.wave && prev.nestHp === world.nestHp && prev.combo === world.combo
        ? prev
        : { wave: world.wave, nestHp: world.nestHp, maxNestHp: world.maxNestHp, combo: world.combo },
    );
  }, [reducedMotion]);

  useGameLoop({ step, draw, fixedDt: FIXED_DT, running: true });

  const toCanvasSpace = (e: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ARENA.width,
      y: ((e.clientY - rect.top) / rect.height) * ARENA.height,
    };
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#0d0a15] select-none">
      <Hud
        wave={hud.wave}
        nestHp={hud.nestHp}
        maxNestHp={hud.maxNestHp}
        combo={hud.combo}
        queue={queue}
        autoMode={autoMode}
        onToggleAuto={() => setAutoMode((v) => !v)}
      />

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={ARENA.width}
          height={ARENA.height}
          className="h-full max-h-full w-auto touch-none"
          style={{ imageRendering: "pixelated" }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = toCanvasSpace(e);
            lastTouchRef.current = performance.now();
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            e.preventDefault();
            dragRef.current = toCanvasSpace(e);
            lastTouchRef.current = performance.now();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            if (dragRef.current) {
              launch(aimFromDrag(LAUNCH_ORIGIN, dragRef.current));
              autoTimerRef.current = 0;
            }
            dragRef.current = null;
            lastTouchRef.current = performance.now();
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the dev server and play it**

Run: `pnpm dev`, then open `http://localhost:1315/bounce/bouncedex` on a phone-sized viewport (or a real phone on the same network).

Verify by hand:
- Critters auto-launch roughly every 2.5s and ricochet off walls.
- Dragging shows a dotted aim arc; releasing fires along it.
- After a manual shot, auto resumes about 3 seconds later.
- The `AUTO` toggle stops and starts automatic fire.
- Enemies descend; reaching the bottom drains the nest bar.
- Slow critters stop and gain a white rim (they became bumpers).
- The page does not scroll or pull-to-refresh while dragging on the canvas.

- [ ] **Step 5: Verify the production build**

Run: `pnpm build`
Expected: succeeds, and `out/bounce/bouncedex.html` exists.

- [ ] **Step 6: Commit**

```bash
git add app/bounce/_shared/pixel-ui.tsx app/bounce/bouncedex/ui/Hud.tsx app/bounce/bouncedex/page.tsx
git commit -m "feat(bouncedex): add playable game shell with auto and manual aiming"
```

---

### Task 14: Choice modals and run summary

Wires upgrades, evolution branches, run end, and save persistence into the shell.

**Files:**
- Create: `app/bounce/bouncedex/ui/ChoiceModal.tsx`
- Create: `app/bounce/bouncedex/ui/RunSummary.tsx`
- Modify: `app/bounce/bouncedex/page.tsx`

**Interfaces:**
- Consumes: `Upgrade`, `rollUpgrades`, `UPGRADE_EVERY_WAVES`, `pendingEvolution`, `applyEvolution`, `getCritter`, save functions.
- Produces: `ChoiceModal`, `RunSummary`.

- [ ] **Step 1: Implement ChoiceModal**

Create `app/bounce/bouncedex/ui/ChoiceModal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { PixelPanel, PixelButton } from "@/app/bounce/_shared/pixel-ui";

export interface Choice {
  id: string;
  name: string;
  description: string;
}

/**
 * Presents 2-3 choices. When `autoPickAfterMs` is set (auto mode), an
 * unanswered choice resolves itself so lean-back play is never interrupted.
 */
export function ChoiceModal({
  title,
  choices,
  onChoose,
  autoPickAfterMs,
}: {
  title: string;
  choices: Choice[];
  onChoose: (id: string) => void;
  autoPickAfterMs: number | null;
}) {
  const [remaining, setRemaining] = useState(autoPickAfterMs);

  useEffect(() => {
    if (autoPickAfterMs === null || choices.length === 0) return;
    const deadline = performance.now() + autoPickAfterMs;
    let frame = 0;

    const tick = () => {
      const left = deadline - performance.now();
      if (left <= 0) {
        onChoose(choices[0].id);
        return;
      }
      setRemaining(left);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoPickAfterMs, choices, onChoose]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
      <PixelPanel className="w-full max-w-sm">
        <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-widest">
          {title}
        </h2>
        <div className="flex flex-col gap-2">
          {choices.map((c) => (
            <PixelButton key={c.id} onClick={() => onChoose(c.id)} className="text-left">
              <span className="block text-sm">{c.name}</span>
              <span className="block text-xs font-normal normal-case opacity-70">
                {c.description}
              </span>
            </PixelButton>
          ))}
        </div>
        {remaining !== null && (
          <p className="mt-3 text-center text-xs uppercase tracking-wider opacity-50">
            Auto-picking in {Math.ceil(remaining / 1000)}s
          </p>
        )}
      </PixelPanel>
    </div>
  );
}
```

- [ ] **Step 2: Implement RunSummary**

Create `app/bounce/bouncedex/ui/RunSummary.tsx`:

```tsx
"use client";

import Link from "next/link";
import { PixelPanel, PixelButton } from "@/app/bounce/_shared/pixel-ui";
import { getCritter } from "../data/critters";

export function RunSummary({
  wave,
  bestCombo,
  eggsEarned,
  newDexEntries,
  onRestart,
}: {
  wave: number;
  bestCombo: number;
  eggsEarned: number;
  newDexEntries: string[];
  onRestart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 p-4">
      <PixelPanel className="w-full max-w-sm">
        <h2 className="mb-4 text-center text-lg font-bold uppercase tracking-widest">
          Nest Fallen
        </h2>

        <dl className="mb-4 space-y-1 text-sm uppercase tracking-wider">
          <div className="flex justify-between"><dt>Waves cleared</dt><dd>{wave}</dd></div>
          <div className="flex justify-between"><dt>Best combo</dt><dd>×{bestCombo}</dd></div>
          <div className="flex justify-between"><dt>Eggs earned</dt><dd>{eggsEarned}</dd></div>
        </dl>

        {newDexEntries.length > 0 && (
          <div className="mb-4 border-2 border-[#F8D030] p-2">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#F8D030]">
              New Dex entries
            </p>
            <p className="text-sm">
              {newDexEntries.map((id) => getCritter(id).name).join(", ")}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <PixelButton onClick={onRestart}>Run again</PixelButton>
          <Link href="/bounce" className="text-center text-xs uppercase tracking-widest underline opacity-70">
            Back to arcade
          </Link>
        </div>
      </PixelPanel>
    </div>
  );
}
```

- [ ] **Step 3: Wire both into the page**

In `app/bounce/bouncedex/page.tsx`, add these imports:

```tsx
import { ChoiceModal, type Choice } from "./ui/ChoiceModal";
import { RunSummary } from "./ui/RunSummary";
import { rollUpgrades, UPGRADE_EVERY_WAVES, type Upgrade } from "./data/upgrades";
import { pendingEvolution, applyEvolution } from "./engine/combat";
import { getCritter } from "./data/critters";
import { loadSave, writeSave, defaultSave, type BouncedexSave } from "@/app/bounce/_shared/save";
```

Add this state alongside the existing state:

```tsx
const [pendingUpgrades, setPendingUpgrades] = useState<Upgrade[] | null>(null);
const [pendingEvo, setPendingEvo] = useState<{ bodyId: number; options: readonly [string, string] } | null>(null);
const [runOver, setRunOver] = useState(false);
const [save, setSave] = useState<BouncedexSave>(defaultSave());
const lastUpgradeWaveRef = useRef(0);
const newDexRef = useRef<string[]>([]);
```

Load the save on mount (`localStorage` is unavailable during the static build, so this must be in an effect, not in `useState`'s initialiser):

```tsx
useEffect(() => {
  const loaded = loadSave(window.localStorage);
  setSave(loaded);
  setAutoMode(loaded.autoMode);
}, []);
```

Pause the loop while a modal is open by changing the `useGameLoop` call:

```tsx
const paused = pendingUpgrades !== null || pendingEvo !== null || runOver;
useGameLoop({ step, draw, fixedDt: FIXED_DT, running: !paused });
```

Detect the three interrupt conditions at the end of `step`, just before its closing brace:

```tsx
    if (world.over) {
      setRunOver(true);
      return;
    }

    if (world.wave > 0 && world.wave % UPGRADE_EVERY_WAVES === 0 && world.wave !== lastUpgradeWaveRef.current) {
      lastUpgradeWaveRef.current = world.wave;
      setPendingUpgrades(rollUpgrades(waveRngRef.current));
      return;
    }

    const evo = pendingEvolution(world);
    if (evo) setPendingEvo({ bodyId: evo.bodyId, options: evo.options });
```

Add the handlers:

```tsx
const chooseUpgrade = useCallback((id: string) => {
  const picked = pendingUpgrades?.find((u) => u.id === id);
  if (picked) modsRef.current = picked.apply(modsRef.current);
  setPendingUpgrades(null);
}, [pendingUpgrades]);

const chooseEvolution = useCallback((toId: string) => {
  if (pendingEvo) {
    applyEvolution(worldRef.current, pendingEvo.bodyId, toId);
    if (!save.dex.includes(toId)) newDexRef.current.push(toId);
  }
  setPendingEvo(null);
}, [pendingEvo, save.dex]);

const restart = useCallback(() => {
  const world = worldRef.current;
  const eggsEarned = world.wave + Math.floor(world.bestCombo / 2);
  const merged: BouncedexSave = {
    ...save,
    eggs: save.eggs + eggsEarned,
    dex: Array.from(new Set([...save.dex, ...newDexRef.current])),
    bestWave: Math.max(save.bestWave, world.wave),
    bestCombo: Math.max(save.bestCombo, world.bestCombo),
    autoMode,
  };
  writeSave(window.localStorage, merged);
  setSave(merged);

  newDexRef.current = [];
  lastUpgradeWaveRef.current = 0;
  modsRef.current = defaultMods();
  autoTimerRef.current = 0;
  waveRngRef.current = makeRng(world.tick + 1);
  worldRef.current = createWorld({ arena: ARENA, seed: world.tick + 1 });
  setRunOver(false);
}, [save, autoMode]);
```

Render the modals inside the canvas wrapper (which needs `relative` added to its class list):

```tsx
{pendingUpgrades && (
  <ChoiceModal
    title="Choose an upgrade"
    choices={pendingUpgrades.map((u): Choice => ({ id: u.id, name: u.name, description: u.description }))}
    onChoose={chooseUpgrade}
    autoPickAfterMs={autoMode ? 5000 : null}
  />
)}

{pendingEvo && (
  <ChoiceModal
    title="Evolving!"
    choices={pendingEvo.options.map((id): Choice => {
      const d = getCritter(id);
      return { id, name: d.name, description: d.behavior };
    })}
    onChoose={chooseEvolution}
    autoPickAfterMs={autoMode ? 4000 : null}
  />
)}

{runOver && (
  <RunSummary
    wave={worldRef.current.wave}
    bestCombo={worldRef.current.bestCombo}
    eggsEarned={worldRef.current.wave + Math.floor(worldRef.current.bestCombo / 2)}
    newDexEntries={newDexRef.current}
    onRestart={restart}
  />
)}
```

- [ ] **Step 4: Play it and verify**

Run: `pnpm dev`, open `/bounce/bouncedex`.

Verify by hand:
- Reaching wave 5 pauses the game and offers three upgrades; picking one resumes.
- With `AUTO` on, an ignored upgrade choice resolves itself after 5 seconds.
- A settled critter that racks up hits triggers an evolution choice with two forms; picking one visibly changes the critter.
- Losing all nest HP shows the run summary with waves, best combo, and eggs.
- "Run again" resets the board and starts a fresh run.
- Reloading the page preserves eggs and Dex entries.

- [ ] **Step 5: Run the full suite and build**

Run: `pnpm test && pnpm build`
Expected: all tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/bounce/bouncedex/
git commit -m "feat(bouncedex): add upgrade and evolution choices, run summary, save persistence"
```

---

### Task 15: Dex screen

**Files:**
- Create: `app/bounce/bouncedex/ui/DexScreen.tsx`
- Modify: `app/bounce/bouncedex/page.tsx` (add a Dex toggle)

**Interfaces:**
- Consumes: `CRITTERS`, `BASE_CRITTERS`, `getCritter`, `BouncedexSave`.
- Produces: `DexScreen`.

- [ ] **Step 1: Implement DexScreen**

Create `app/bounce/bouncedex/ui/DexScreen.tsx`:

```tsx
"use client";

import { PixelPanel, PixelButton } from "@/app/bounce/_shared/pixel-ui";
import { BASE_CRITTERS, CRITTERS, getCritter } from "../data/critters";

export function DexScreen({
  discovered,
  eggs,
  onClose,
}: {
  discovered: string[];
  eggs: number;
  onClose: () => void;
}) {
  const seen = new Set(discovered);
  const total = Object.keys(CRITTERS).length;

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-[#0d0a15] p-4">
      <PixelPanel>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-widest">Dex</h2>
          <span className="text-xs uppercase tracking-wider opacity-60">
            {seen.size} / {total} · {eggs} eggs
          </span>
        </div>

        <div className="space-y-3">
          {BASE_CRITTERS.map((base) => (
            <div key={base.id} className="flex items-center gap-2">
              <Entry id={base.id} known={seen.has(base.id)} />
              <span className="opacity-40">→</span>
              {base.evolvesTo!.map((id) => (
                <Entry key={id} id={id} known={seen.has(id)} />
              ))}
            </div>
          ))}
        </div>

        <PixelButton onClick={onClose} className="mt-4 w-full">
          Close
        </PixelButton>
      </PixelPanel>
    </div>
  );
}

function Entry({ id, known }: { id: string; known: boolean }) {
  const def = getCritter(id);
  return (
    <div className="flex flex-1 items-center gap-2 border-2 border-[#3a2f55] px-2 py-1">
      <span
        className="inline-block h-5 w-5 shrink-0 rounded-full border-2 border-black"
        style={{ background: known ? def.color : "#2a2140" }}
      />
      <span className={`truncate text-xs uppercase tracking-wider ${known ? "" : "opacity-30"}`}>
        {known ? def.name : "???"}
      </span>
    </div>
  );
}
```

Base critters are always shown as known once they have been used in a run. The implementer must seed the save's `dex` with the three starter ids on first launch — add this to the mount effect in `page.tsx`:

```tsx
useEffect(() => {
  const loaded = loadSave(window.localStorage);
  const withStarters = {
    ...loaded,
    dex: Array.from(new Set([...loaded.dex, ...BASE_CRITTERS.slice(0, 3).map((c) => c.id)])),
  };
  setSave(withStarters);
  setAutoMode(withStarters.autoMode);
  writeSave(window.localStorage, withStarters);
}, []);
```

- [ ] **Step 2: Add the Dex toggle to the page**

Add state and a button. In `app/bounce/bouncedex/page.tsx`:

```tsx
const [showDex, setShowDex] = useState(false);
```

Include `showDex` in the pause condition:

```tsx
const paused = pendingUpgrades !== null || pendingEvo !== null || runOver || showDex;
```

Render it inside the canvas wrapper:

```tsx
{showDex && (
  <DexScreen discovered={save.dex} eggs={save.eggs} onClose={() => setShowDex(false)} />
)}
```

Add a `DEX` button to the `Hud` bottom bar — extend `Hud`'s props with `onOpenDex: () => void` and render alongside the auto toggle:

```tsx
<button
  type="button"
  onClick={onOpenDex}
  className="border-2 border-[#f8f0e0] px-2 py-1 text-xs font-bold uppercase tracking-wider"
>
  Dex
</button>
```

Import `DexScreen` and `BASE_CRITTERS` in `page.tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm dev`, open `/bounce/bouncedex`, tap `DEX`.

Verify by hand:
- All 14 evolution lines render, three entries each.
- Undiscovered forms show `???` with a dimmed dot.
- The counter reads `N / 42`.
- The game is paused while the Dex is open and resumes on close.

- [ ] **Step 4: Build and commit**

```bash
pnpm test && pnpm build
git add app/bounce/bouncedex/
git commit -m "feat(bouncedex): add dex collection screen"
```

---

### Task 16: Arcade hub

**Files:**
- Create: `app/bounce/_shared/registry.ts`
- Create: `app/bounce/page.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface ArcadeGame { slug: string; title: string; tagline: string; accent: string; available: boolean }`
  - `GAMES: readonly ArcadeGame[]`

- [ ] **Step 1: Implement the registry**

Create `app/bounce/_shared/registry.ts`:

```ts
export interface ArcadeGame {
  /** Route segment under /bounce. */
  slug: string;
  title: string;
  tagline: string;
  /** Hex colour for the cabinet accent. */
  accent: string;
  available: boolean;
}

/** Adding a game here is all it takes to list it on the hub. */
export const GAMES: readonly ArcadeGame[] = [
  {
    slug: "bouncedex",
    title: "BOUNCEDEX",
    tagline: "Launch critters. Chain bounces. Defend the nest.",
    accent: "#F8D030",
    available: true,
  },
];
```

- [ ] **Step 2: Implement the hub**

Create `app/bounce/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { GAMES } from "./_shared/registry";
import { PixelPanel } from "./_shared/pixel-ui";

export default function ArcadePage() {
  return (
    <main className="min-h-dvh bg-[#0d0a15] px-4 py-8 text-[#f8f0e0]">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold uppercase tracking-[0.3em]">
          Arcade
        </h1>
        <p className="mb-8 text-center text-xs uppercase tracking-widest opacity-50">
          Insert coin
        </p>

        <ul className="space-y-4">
          {GAMES.map((game) => (
            <li key={game.slug}>
              {game.available ? (
                <Link href={`/bounce/${game.slug}`} className="block">
                  <Cabinet game={game} />
                </Link>
              ) : (
                <div className="opacity-40">
                  <Cabinet game={game} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function Cabinet({ game }: { game: (typeof GAMES)[number] }) {
  return (
    <PixelPanel className="transition-transform active:translate-x-[2px] active:translate-y-[2px]">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 border-4 border-black"
          style={{ background: game.accent }}
        />
        <div className="min-w-0">
          <h2 className="text-base font-bold uppercase tracking-widest">{game.title}</h2>
          <p className="truncate text-xs opacity-70">{game.tagline}</p>
        </div>
      </div>
    </PixelPanel>
  );
}
```

- [ ] **Step 3: Verify routing**

Run: `pnpm dev`, open `http://localhost:1315/bounce`.

Verify by hand: the BOUNCEDEX cabinet renders and links to the game; the game's "Back to arcade" link returns here.

- [ ] **Step 4: Verify the static export emits both routes**

Run: `pnpm build && ls out/bounce.html out/bounce/bouncedex.html`
Expected: both files exist. This is what the existing `render.yaml` rewrite serves.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/_shared/registry.ts app/bounce/page.tsx
git commit -m "feat(bounce): add arcade hub with game registry"
```

---

### Task 17: Offline support (PWA manifest and service worker)

Without this, loading the URL in airplane mode fails outright — which defeats the point of an offline game.

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Modify: `app/bounce/page.tsx` (register the worker)
- Modify: `app/layout.tsx` (link the manifest)

- [ ] **Step 1: Create the manifest**

Create `public/manifest.webmanifest`:

```json
{
  "name": "Arcade",
  "short_name": "Arcade",
  "start_url": "/bounce",
  "scope": "/bounce",
  "display": "fullscreen",
  "orientation": "portrait",
  "background_color": "#0d0a15",
  "theme_color": "#0d0a15",
  "icons": [
    {
      "src": "/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

Note: `app/icon.svg` already exists in this repo and Next serves it at `/icon.svg`.

- [ ] **Step 2: Create the service worker**

Create `public/sw.js`. Hashed Next asset filenames are unknown at author time, so this uses runtime caching (cache-first for same-origin GETs) rather than a hardcoded precache list.

```js
// Arcade offline cache. Bump CACHE_NAME to force clients onto new assets.
const CACHE_NAME = "arcade-v1";
const CORE = ["/bounce", "/bounce/bouncedex", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Individual failures must not abort the whole install.
      .then((cache) => Promise.allSettled(CORE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/bounce") && !url.pathname.startsWith("/_next")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
    }),
  );
});
```

- [ ] **Step 3: Link the manifest**

In `app/layout.tsx`, add to the exported `metadata` object:

```ts
  manifest: "/manifest.webmanifest",
```

- [ ] **Step 4: Register the worker from the hub**

In `app/bounce/page.tsx`, add `useEffect` to the imports from `react` and insert inside `ArcadePage`:

```tsx
useEffect(() => {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Offline caching is a bonus; failing to register must not break the page.
  });
}, []);
```

- [ ] **Step 5: Verify offline behaviour**

Run: `pnpm build && pnpm dlx serve out -l 3200`

Then in Chrome at `http://localhost:3200/bounce`:
1. Load the hub, then the game, then return to the hub.
2. Open DevTools → Application → Service Workers and confirm `sw.js` is activated.
3. Check DevTools → Network → "Offline".
4. Reload `/bounce` and navigate to `/bounce/bouncedex`.

Expected: both load and the game is fully playable offline.

Note: `next dev` does not serve the static export the way production does, so this check must be run against `out/`, not the dev server.

- [ ] **Step 6: Commit**

```bash
git add public/manifest.webmanifest public/sw.js app/layout.tsx app/bounce/page.tsx
git commit -m "feat(bounce): add pwa manifest and offline service worker"
```

---

### Task 18: Error boundary and final hardening

The spec requires the route to degrade gracefully rather than showing a blank page.

**Files:**
- Create: `app/bounce/error.tsx`
- Modify: `app/bounce/bouncedex/page.tsx` (canvas context guard)

- [ ] **Step 1: Add the error boundary**

Next.js App Router uses an `error.tsx` convention; this one covers `/bounce` and everything beneath it.

Create `app/bounce/error.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ArcadeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[arcade]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0d0a15] p-6 text-[#f8f0e0]">
      <h1 className="text-lg font-bold uppercase tracking-widest">Cabinet jammed</h1>
      <p className="max-w-xs text-center text-xs uppercase tracking-wider opacity-60">
        Something broke. Your Dex is safe.
      </p>
      <button
        type="button"
        onClick={reset}
        className="border-4 border-[#f8f0e0] px-4 py-3 text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000]"
      >
        Try again
      </button>
      <Link href="/bounce" className="text-xs uppercase tracking-widest underline opacity-70">
        Back to arcade
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Guard against a missing canvas context**

In `app/bounce/bouncedex/page.tsx`, add state and a check so a browser without a 2D context shows a message instead of silently rendering nothing:

```tsx
const [canvasFailed, setCanvasFailed] = useState(false);

useEffect(() => {
  const ctx = canvasRef.current?.getContext("2d");
  if (!ctx) setCanvasFailed(true);
}, []);
```

Render above the canvas:

```tsx
{canvasFailed && (
  <p className="p-6 text-center text-xs uppercase tracking-wider text-[#f8f0e0]">
    This browser cannot draw the game.
  </p>
)}
```

- [ ] **Step 3: Confirm the resume is untouched**

Run: `pnpm build`, then:

```bash
git diff --stat main -- app/page.tsx components/ data/ utils/ render.yaml
```

Expected: empty. Nothing outside `app/bounce/`, `app/layout.tsx`, `public/`, `docs/`, `vitest.config.ts`, and `package.json` should have changed.

- [ ] **Step 4: Full verification pass**

Run: `pnpm test && pnpm build && pnpm lint`
Expected: all pass.

Then load `http://localhost:1315/` and confirm the resume renders exactly as before.

- [ ] **Step 5: Commit**

```bash
git add app/bounce/error.tsx app/bounce/bouncedex/page.tsx
git commit -m "feat(bounce): add error boundary and canvas fallback"
```

---

## Self-Review Notes

**Spec coverage.** Every spec section maps to a task: launch mechanic and settling (6), auto/manual with a deliberately weak auto-aimer (10, 13), combo (7), enemies (8), run structure and upgrades (9, 14), the 14 critters as behaviors (5), evolution with branching and Dex-through-play (7, 14, 15), no permanent stat tree (enforced by the save schema in 4, which has no stat fields), routes and file layout (13, 16), canvas + React split (12, 13), hand-rolled fixed-timestep physics (2, 3, 6, 11), save with versioned migration (4), offline via SW + manifest (17), mobile input handling (13), reduced motion (12, 13), error handling (4, 18), and testing (1 onward).

**Deferred by the spec, and still deferred here:** exact critter tuning values (Task 5 ships defensible starting numbers to be played and retuned), upgrade pool contents (Task 9 likewise), and the wave curve (Task 8 likewise). These are tuning knobs, not unknowns.

**Gaps found during play-testing, now closed (Task 19):**
- All seven critter behaviors alter the simulation: `heavy`/`light` via mass and
  restitution, plus `sticky` (rides and burns its host), `splitter` (bursts into
  two fragments), `ghost` (phases through), `magnet` (steers mid-flight), and
  `bomb` (blast on settle). Covered by `behaviors.test.ts`.
- The upgrade pool grew from 8 to 20, and **every** `RunMods` field is now read
  by the simulation or the launcher. `upgrades.test.ts` enforces this
  structurally by scanning the engine and shell sources for each field name, so
  a dead upgrade fails the suite rather than shipping.
- Combo damage is capped (`COMBO_DAMAGE_CAP`), decoupling chain length —
  the spectacle — from the damage multiplier, which must stay bounded.
