# Arcade Shell + Potion Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/game` arcade dashboard and a fully playable seeded water-sort puzzle at `/sort` with a first-class pour animation.

**Architecture:** Shared arcade chrome moves from `app/bounce/_shared` to `app/game/_shared` so top-level game routes can use it. Potion Sort splits into a pure, unit-tested `engine/` (rules, canonical-dedup DFS solver, seeded generator, animation phase machine), a `render/` layer where only canvas painting is untested, and thin React UI. Logical state commits on click; the animator interpolates between a pre-move snapshot and the committed state, so undo/win/hint never depend on animation timing.

**Tech Stack:** Next.js 15 App Router (`output: "export"`), React 19 RC, TypeScript strict, Tailwind, Vitest (node env), canvas 2D.

## Global Constraints

- Static export only — `output: "export"` in `next.config.js`. No server redirects, no route handlers, no `next/headers`.
- TypeScript `strict: true`. No `any` in committed code.
- Tests colocate as `*.test.ts` beside their subject; Vitest `include` is `app/**/*.test.ts(x)`, environment `node`. Tests must not touch `document`, `window`, or a canvas context.
- The 167 pre-existing tests must stay green at every commit.
- Path alias `@/*` → repo root, configured in both `tsconfig.json` and `vitest.config.ts`.
- All randomness flows through `makeRng` from `_shared/rng.ts`. Never call `Math.random()` in engine code.
- Bottle capacity is `4`. Colour cap is `12`.
- Save keys: bouncedex keeps `bounce:bouncedex`; Potion Sort uses `game:sort`.
- Pixel chrome: `border-4`, `shadow-[4px_4px_0_0_#000]`, background `#0d0a15`, foreground `#f8f0e0`, panel `#1b1428`.
- Commit after every task.

---

## File Structure

**P0 — moves and shell**

| Path | Responsibility |
|---|---|
| `app/game/_shared/registry.ts` | Game list; `href`-based so games live anywhere (moved) |
| `app/game/_shared/pixel-ui.tsx` | `PixelPanel`, `PixelButton` (moved, unchanged) |
| `app/game/_shared/useGameLoop.ts` | Fixed-timestep loop (moved, unchanged) |
| `app/game/_shared/speed.ts` | Speed enum + cycling (moved, unchanged) |
| `app/game/_shared/rng.ts` | Mulberry32 seeded RNG (moved up from bouncedex) |
| `app/game/_shared/storage.ts` | Generic `StorageLike`, safe JSON read/write (new) |
| `app/game/page.tsx` | Dashboard (new) |
| `app/bounce/page.tsx` | Client redirect to `/game` (rewritten) |
| `app/bounce/bouncedex/save.ts` | Bouncedex save schema (moved down from `_shared`) |

**P1 — Potion Sort**

| Path | Responsibility |
|---|---|
| `app/sort/engine/types.ts` | `Bottle`, `Puzzle`, `Move`, `LevelParams` |
| `app/sort/engine/palette.ts` | 12 type colours + glyphs |
| `app/sort/engine/rules.ts` | Move legality, application, win check |
| `app/sort/engine/solve.ts` | Canonical-dedup DFS, node-capped |
| `app/sort/engine/generate.ts` | Seeded deal + verification |
| `app/sort/engine/level.ts` | Difficulty curve + memoized `levelFor` |
| `app/sort/engine/anim.ts` | Pour phase machine (pure timing) |
| `app/sort/engine/save.ts` | Potion Sort save schema |
| `app/sort/render/layout.ts` | Bottle rects + hit-testing (pure) |
| `app/sort/render/draw.ts` | Canvas painting (untested by design) |
| `app/sort/ui/Hud.tsx` | Level, moves, assist buttons |
| `app/sort/ui/LevelSelect.tsx` | Grid of beaten levels |
| `app/sort/ui/WinBanner.tsx` | Level-clear overlay |
| `app/sort/page.tsx` | Wiring: input, loop, state, persistence |

---

### Task 1: Move shared chrome to `app/game/_shared`

**Files:**
- Move: `app/bounce/_shared/{registry.ts,pixel-ui.tsx,useGameLoop.ts,speed.ts,speed.test.ts}` → `app/game/_shared/`
- Move: `app/bounce/bouncedex/engine/rng.ts` + `rng.test.ts` → `app/game/_shared/`
- Move: `app/bounce/_shared/save.ts` + `save.test.ts` → `app/bounce/bouncedex/`
- Modify: every file importing the above

**Interfaces:**
- Consumes: nothing
- Produces: `@/app/game/_shared/rng` exporting `makeRng(seed: number): Rng` and `interface Rng { next(): number; int(maxExclusive: number): number; pick<T>(items: readonly T[]): T; state(): number }`; `@/app/game/_shared/pixel-ui` exporting `PixelPanel` and `PixelButton`; `@/app/game/_shared/speed` exporting `SPEEDS`, `type Speed`, `DEFAULT_SPEED`, `nextSpeed`, `coerceSpeed`; `@/app/game/_shared/useGameLoop` exporting `useGameLoop`

- [ ] **Step 1: Confirm the baseline is green**

Run: `pnpm test`
Expected: `Test Files 13 passed (13)`, `Tests 167 passed (167)`

- [ ] **Step 2: Move the files with git mv**

```bash
mkdir -p app/game/_shared
git mv app/bounce/_shared/registry.ts       app/game/_shared/registry.ts
git mv app/bounce/_shared/pixel-ui.tsx      app/game/_shared/pixel-ui.tsx
git mv app/bounce/_shared/useGameLoop.ts    app/game/_shared/useGameLoop.ts
git mv app/bounce/_shared/speed.ts          app/game/_shared/speed.ts
git mv app/bounce/_shared/speed.test.ts     app/game/_shared/speed.test.ts
git mv app/bounce/bouncedex/engine/rng.ts      app/game/_shared/rng.ts
git mv app/bounce/bouncedex/engine/rng.test.ts app/game/_shared/rng.test.ts
git mv app/bounce/_shared/save.ts           app/bounce/bouncedex/save.ts
git mv app/bounce/_shared/save.test.ts      app/bounce/bouncedex/save.test.ts
rmdir app/bounce/_shared
```

- [ ] **Step 3: Find every broken import**

```bash
grep -rn "_shared\|engine/rng\|from \"\./rng\"\|from \"\.\./rng\"" app --include=*.ts --include=*.tsx
```

Rewrite each hit to the alias form. Relative imports inside `app/bounce/bouncedex/**` that reached `../../_shared/x` become `@/app/game/_shared/x`. Imports of `./rng` from files still in `bouncedex/engine/` become `@/app/game/_shared/rng`. `save.ts` now sits in `bouncedex/`, so `bouncedex/page.tsx` imports it as `./save` and `save.ts` imports speed as `@/app/game/_shared/speed`.

- [ ] **Step 4: Verify nothing references the old paths**

Run: `grep -rn "bounce/_shared\|bounce/bouncedex/engine/rng" app || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 5: Typecheck and test**

Run: `npx tsc --noEmit && pnpm test`
Expected: no type errors; `Tests 167 passed (167)` — the same count, since only locations changed

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: promote shared arcade chrome to app/game/_shared"
```

---

### Task 2: Extract generic storage plumbing

**Files:**
- Create: `app/game/_shared/storage.ts`
- Create: `app/game/_shared/storage.test.ts`
- Modify: `app/bounce/bouncedex/save.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  }
  export function readJson(storage: StorageLike, key: string): unknown | null;
  export function writeJson(storage: StorageLike, key: string, value: unknown): void;
  ```
  `readJson` returns `null` when the key is absent, when `getItem` throws, or when the payload is not valid JSON. `writeJson` swallows quota and private-browsing errors.

- [ ] **Step 1: Write the failing test**

```ts
// app/game/_shared/storage.test.ts
import { describe, expect, it } from "vitest";
import { readJson, writeJson, type StorageLike } from "./storage";

function memStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
};

describe("readJson", () => {
  it("parses a stored payload", () => {
    expect(readJson(memStorage({ k: '{"a":1}' }), "k")).toEqual({ a: 1 });
  });

  it("returns null for a missing key", () => {
    expect(readJson(memStorage(), "k")).toBeNull();
  });

  it("returns null for malformed JSON rather than throwing", () => {
    expect(readJson(memStorage({ k: "{oops" }), "k")).toBeNull();
  });

  it("returns null when storage itself throws", () => {
    expect(readJson(throwingStorage, "k")).toBeNull();
  });
});

describe("writeJson", () => {
  it("round-trips through readJson", () => {
    const s = memStorage();
    writeJson(s, "k", { a: 1 });
    expect(readJson(s, "k")).toEqual({ a: 1 });
  });

  it("swallows storage failures", () => {
    expect(() => writeJson(throwingStorage, "k", { a: 1 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/game/_shared/storage.test.ts`
Expected: FAIL — cannot resolve `./storage`

- [ ] **Step 3: Write the implementation**

```ts
// app/game/_shared/storage.ts
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Read and parse a stored payload. Every failure mode — storage blocked by
 * private browsing, key absent, payload corrupt — collapses to null, because
 * the worst acceptable outcome for a save is starting fresh, never a crash.
 */
export function readJson(storage: StorageLike, key: string): unknown | null {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Persist a payload. Losing a save is bad; crashing mid-game is worse. */
export function writeJson(storage: StorageLike, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or quota exhaustion.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/game/_shared/storage.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Rewrite bouncedex save.ts onto the shared plumbing**

In `app/bounce/bouncedex/save.ts`, delete the local `StorageLike` interface and the try/catch bodies of `loadSave`/`writeSave`, replacing them with:

```ts
import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";

export type { StorageLike };

export function loadSave(storage: StorageLike): BouncedexSave {
  const raw = readJson(storage, SAVE_KEY);
  return raw === null ? defaultSave() : migrate(raw);
}

export function writeSave(storage: StorageLike, save: BouncedexSave): void {
  writeJson(storage, SAVE_KEY, { ...save, version: SAVE_VERSION });
}
```

Keep `SAVE_VERSION`, `SAVE_KEY`, `BouncedexSave`, `defaultSave`, and `migrate` exactly as they are.

- [ ] **Step 6: Run the full suite**

Run: `pnpm test`
Expected: `Tests 173 passed` — 167 existing plus 6 new. The existing `save.test.ts` must pass unchanged.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: extract shared storage plumbing from bouncedex save"
```

---

### Task 3: `/game` dashboard and `/bounce` redirect

**Files:**
- Modify: `app/game/_shared/registry.ts`
- Create: `app/game/page.tsx`
- Rewrite: `app/bounce/page.tsx`
- Modify: `app/bounce/error.tsx:44` (the "Back to arcade" href)
- Modify: `public/sw.js` (precache list)

**Interfaces:**
- Consumes: `PixelPanel` from `@/app/game/_shared/pixel-ui`
- Produces: `ArcadeGame { slug: string; title: string; tagline: string; href: string; accent: string; available: boolean }` and `GAMES: readonly ArcadeGame[]` from `@/app/game/_shared/registry`

- [ ] **Step 1: Rewrite the registry**

```ts
// app/game/_shared/registry.ts
export interface ArcadeGame {
  /** Stable id — used as a React key, never as a route fragment. */
  slug: string;
  title: string;
  tagline: string;
  /** Absolute route. Games are not confined to any one URL prefix. */
  href: string;
  /** Hex colour for the cabinet accent. */
  accent: string;
  available: boolean;
}

/** Adding a game here is all it takes to list it on the dashboard. */
export const GAMES: readonly ArcadeGame[] = [
  {
    slug: "bouncedex",
    title: "BOUNCEDEX",
    tagline: "Launch critters. Chain bounces. Defend the nest.",
    href: "/bounce/bouncedex",
    accent: "#F8D030",
    available: true,
  },
  {
    slug: "potion-sort",
    title: "POTION SORT",
    tagline: "Pour the potions. One colour per flask.",
    href: "/sort",
    accent: "#6890F0",
    available: true,
  },
  {
    slug: "traffic",
    title: "TRAFFIC JAM",
    tagline: "Clear the lot. Nobody parks forever.",
    href: "/traffic",
    accent: "#F08030",
    available: false,
  },
  {
    slug: "shelf",
    title: "SHELF SORT",
    tagline: "Stock the shelves. Match the goods.",
    href: "/shelf",
    accent: "#78C850",
    available: false,
  },
];
```

- [ ] **Step 2: Create the dashboard**

```tsx
// app/game/page.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GAMES, type ArcadeGame } from "./_shared/registry";
import { PixelPanel } from "./_shared/pixel-ui";

export default function ArcadePage() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is a bonus; failing to register must not break the page.
    });
  }, []);

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
                <Link href={game.href} className="block">
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

        <p className="mt-8 text-center text-[10px] uppercase tracking-widest opacity-40">
          More cabinets arriving
        </p>
      </div>
    </main>
  );
}

function Cabinet({ game }: { game: ArcadeGame }) {
  return (
    <PixelPanel className="transition-transform active:translate-x-[2px] active:translate-y-[2px]">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-10 shrink-0 border-4 border-black"
          style={{ background: game.accent }}
        />
        <div className="min-w-0">
          <h2 className="text-base font-bold uppercase tracking-widest">
            {game.title}
          </h2>
          <p className="truncate text-xs opacity-70">{game.tagline}</p>
        </div>
        {!game.available && (
          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-widest opacity-60">
            Soon
          </span>
        )}
      </div>
    </PixelPanel>
  );
}
```

- [ ] **Step 3: Replace `/bounce` with a redirect**

```tsx
// app/bounce/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The arcade hub moved to /game. Static export rules out a server redirect,
 * so this replaces the history entry client-side and still renders a usable
 * link for the no-JS case.
 */
export default function BounceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/game");
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0d0a15] p-6 text-[#f8f0e0]">
      <p className="text-xs uppercase tracking-widest opacity-60">
        The arcade moved
      </p>
      <Link
        href="/game"
        className="border-4 border-[#f8f0e0] px-4 py-3 text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000]"
      >
        Go to /game
      </Link>
    </main>
  );
}
```

- [ ] **Step 4: Point the error boundary at the new hub**

In `app/bounce/error.tsx`, change the `Link` `href` from `"/bounce"` to `"/game"`.

- [ ] **Step 5: Add the new routes to the service worker precache**

Open `public/sw.js`. Find the array of precached paths. Add `"/game"` and `"/sort"`, and bump the cache-name version constant so returning visitors do not serve a stale shell. If the file caches by runtime fetch rather than an explicit list, no change is needed — note that and move on.

- [ ] **Step 6: Typecheck, test, build**

Run: `npx tsc --noEmit && pnpm test && pnpm build`
Expected: no type errors; `Tests 173 passed`; build emits `out/game/index.html` and `out/bounce/index.html`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(game): add /game dashboard and redirect /bounce to it"
```

---

### Task 4: Potion Sort types, palette, and rules

**Files:**
- Create: `app/sort/engine/types.ts`
- Create: `app/sort/engine/palette.ts`
- Create: `app/sort/engine/rules.ts`
- Create: `app/sort/engine/rules.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  // types.ts
  export type Bottle = number[];            // index 0 = bottom
  export interface Puzzle { bottles: Bottle[]; capacity: number; colors: number }
  export interface Move { from: number; to: number }
  export interface LevelParams { colors: number; free: number; capacity: number }

  // palette.ts
  export interface Potion { name: string; hex: string; glyph: string }
  export const PALETTE: readonly Potion[];   // length 12
  export const MAX_COLORS = 12;
  export const CAPACITY = 4;

  // rules.ts
  export function topRun(bottle: Bottle): { color: number; count: number } | null;
  export function canPour(p: Puzzle, from: number, to: number): boolean;
  export function pourCount(p: Puzzle, from: number, to: number): number;
  export function applyMove(p: Puzzle, move: Move): Puzzle;
  export function isSolved(p: Puzzle): boolean;
  export function legalMoves(p: Puzzle): Move[];
  export function isComplete(bottle: Bottle, capacity: number): boolean;
  export function clonePuzzle(p: Puzzle): Puzzle;
  ```

- [ ] **Step 1: Write the types and palette**

```ts
// app/sort/engine/types.ts
/** A bottle's contents, bottom-first. Values are indices into PALETTE. */
export type Bottle = number[];

export interface Puzzle {
  bottles: Bottle[];
  /** Units a bottle holds when full. */
  capacity: number;
  /** Distinct colours in play. Each contributes exactly `capacity` units. */
  colors: number;
}

export interface Move {
  from: number;
  to: number;
}

export interface LevelParams {
  colors: number;
  /** Empty bottles beyond the one-per-colour minimum. */
  free: number;
  capacity: number;
}
```

```ts
// app/sort/engine/palette.ts
export interface Potion {
  name: string;
  hex: string;
  /** Single character drawn on each unit so colour is never the only cue. */
  glyph: string;
}

/**
 * Pokemon type colours. At twelve, several read similarly and colour alone is
 * not a usable distinction for a colourblind player — hence the glyphs.
 */
export const PALETTE: readonly Potion[] = [
  { name: "fire", hex: "#F08030", glyph: "F" },
  { name: "water", hex: "#6890F0", glyph: "W" },
  { name: "grass", hex: "#78C850", glyph: "G" },
  { name: "electric", hex: "#F8D030", glyph: "E" },
  { name: "psychic", hex: "#F85888", glyph: "P" },
  { name: "poison", hex: "#A040A0", glyph: "K" },
  { name: "ice", hex: "#98D8D8", glyph: "I" },
  { name: "dragon", hex: "#7038F8", glyph: "D" },
  { name: "fighting", hex: "#C03028", glyph: "H" },
  { name: "ground", hex: "#E0C068", glyph: "R" },
  { name: "ghost", hex: "#705898", glyph: "S" },
  { name: "steel", hex: "#B8B8D0", glyph: "M" },
];

export const MAX_COLORS = PALETTE.length;
export const CAPACITY = 4;
```

- [ ] **Step 2: Write the failing rules test**

```ts
// app/sort/engine/rules.test.ts
import { describe, expect, it } from "vitest";
import {
  applyMove,
  canPour,
  clonePuzzle,
  isComplete,
  isSolved,
  legalMoves,
  pourCount,
  topRun,
} from "./rules";
import type { Puzzle } from "./types";

const puzzle = (bottles: number[][], colors = 2, capacity = 4): Puzzle => ({
  bottles: bottles.map((b) => [...b]),
  capacity,
  colors,
});

describe("topRun", () => {
  it("returns null for an empty bottle", () => {
    expect(topRun([])).toBeNull();
  });

  it("counts only the contiguous run at the top", () => {
    expect(topRun([0, 1, 1])).toEqual({ color: 1, count: 2 });
  });

  it("counts a full monochrome bottle as one run", () => {
    expect(topRun([3, 3, 3, 3])).toEqual({ color: 3, count: 4 });
  });
});

describe("canPour", () => {
  it("rejects pouring from an empty bottle", () => {
    expect(canPour(puzzle([[], [0]]), 0, 1)).toBe(false);
  });

  it("rejects pouring into itself", () => {
    expect(canPour(puzzle([[0]]), 0, 0)).toBe(false);
  });

  it("rejects pouring into a full bottle", () => {
    expect(canPour(puzzle([[0], [0, 0, 0, 0]]), 0, 1)).toBe(false);
  });

  it("rejects a colour mismatch", () => {
    expect(canPour(puzzle([[0], [1]]), 0, 1)).toBe(false);
  });

  it("allows pouring onto a matching top", () => {
    expect(canPour(puzzle([[0], [0]]), 0, 1)).toBe(true);
  });

  it("allows pouring into an empty bottle", () => {
    expect(canPour(puzzle([[0], []]), 0, 1)).toBe(true);
  });
});

describe("pourCount", () => {
  it("moves the whole top run when there is room", () => {
    expect(pourCount(puzzle([[1, 0, 0], []]), 0, 1)).toBe(2);
  });

  it("clamps to the destination's free space", () => {
    expect(pourCount(puzzle([[0, 0, 0], [0, 0, 0]]), 0, 1)).toBe(1);
  });

  it("is zero for an illegal move", () => {
    expect(pourCount(puzzle([[0], [1]]), 0, 1)).toBe(0);
  });
});

describe("applyMove", () => {
  it("transfers the clamped run", () => {
    const before = puzzle([[1, 0, 0], [0]]);
    const after = applyMove(before, { from: 0, to: 1 });
    expect(after.bottles).toEqual([[1], [0, 0, 0]]);
  });

  it("does not mutate its input", () => {
    const before = puzzle([[1, 0, 0], [0]]);
    const snapshot = JSON.stringify(before);
    applyMove(before, { from: 0, to: 1 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("conserves total units", () => {
    const before = puzzle([[1, 0, 0], [0], []]);
    const after = applyMove(before, { from: 0, to: 2 });
    const count = (p: typeof before) =>
      p.bottles.reduce((n, b) => n + b.length, 0);
    expect(count(after)).toBe(count(before));
  });

  it("throws on an illegal move rather than corrupting state", () => {
    expect(() => applyMove(puzzle([[0], [1]]), { from: 0, to: 1 })).toThrow();
  });
});

describe("isComplete", () => {
  it("is true for a full monochrome bottle", () => {
    expect(isComplete([2, 2, 2, 2], 4)).toBe(true);
  });

  it("is false when not full", () => {
    expect(isComplete([2, 2, 2], 4)).toBe(false);
  });

  it("is false when mixed", () => {
    expect(isComplete([2, 2, 2, 1], 4)).toBe(false);
  });

  it("is false for empty", () => {
    expect(isComplete([], 4)).toBe(false);
  });
});

describe("isSolved", () => {
  it("accepts every colour gathered and full", () => {
    expect(isSolved(puzzle([[0, 0, 0, 0], [1, 1, 1, 1], []]))).toBe(true);
  });

  it("rejects a partially filled monochrome bottle", () => {
    expect(isSolved(puzzle([[0, 0, 0], [1, 1, 1, 1], [0]]))).toBe(false);
  });

  it("rejects a mixed bottle", () => {
    expect(isSolved(puzzle([[0, 1, 0, 1], [1, 0, 1, 0], []]))).toBe(false);
  });
});

describe("legalMoves", () => {
  it("never pours out of a completed bottle", () => {
    const moves = legalMoves(puzzle([[0, 0, 0, 0], []]));
    expect(moves.every((m) => m.from !== 0)).toBe(true);
  });

  it("offers only one destination when several bottles are empty", () => {
    const moves = legalMoves(puzzle([[0, 1], [], [], []]));
    const fromZero = moves.filter((m) => m.from === 0);
    expect(fromZero).toHaveLength(1);
  });

  it("never moves a monochrome bottle into an empty bottle", () => {
    const moves = legalMoves(puzzle([[0, 0], []]));
    expect(moves).toHaveLength(0);
  });

  it("finds the consolidating move", () => {
    expect(legalMoves(puzzle([[1, 0], [0]]))).toEqual([{ from: 0, to: 1 }]);
  });
});

describe("clonePuzzle", () => {
  it("produces an independent copy", () => {
    const p = puzzle([[0, 1], []]);
    const c = clonePuzzle(p);
    c.bottles[0].push(2);
    expect(p.bottles[0]).toEqual([0, 1]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run app/sort/engine/rules.test.ts`
Expected: FAIL — cannot resolve `./rules`

- [ ] **Step 4: Implement rules.ts**

```ts
// app/sort/engine/rules.ts
import type { Bottle, Move, Puzzle } from "./types";

/** The contiguous same-colour run at the top of a bottle, or null if empty. */
export function topRun(bottle: Bottle): { color: number; count: number } | null {
  if (bottle.length === 0) return null;
  const color = bottle[bottle.length - 1];
  let count = 1;
  for (let i = bottle.length - 2; i >= 0 && bottle[i] === color; i--) count++;
  return { color, count };
}

/** A bottle that is full and single-coloured — a finished colour. */
export function isComplete(bottle: Bottle, capacity: number): boolean {
  return bottle.length === capacity && topRun(bottle)?.count === capacity;
}

export function canPour(p: Puzzle, from: number, to: number): boolean {
  if (from === to) return false;
  const src = p.bottles[from];
  const dst = p.bottles[to];
  if (src === undefined || dst === undefined) return false;
  const run = topRun(src);
  if (run === null) return false;
  if (dst.length >= p.capacity) return false;
  return dst.length === 0 || dst[dst.length - 1] === run.color;
}

/** Units actually transferred: the whole top run, clamped by free space. */
export function pourCount(p: Puzzle, from: number, to: number): number {
  if (!canPour(p, from, to)) return 0;
  const run = topRun(p.bottles[from]);
  if (run === null) return 0;
  return Math.min(run.count, p.capacity - p.bottles[to].length);
}

export function clonePuzzle(p: Puzzle): Puzzle {
  return { ...p, bottles: p.bottles.map((b) => [...b]) };
}

/**
 * Returns a NEW puzzle. Undo and the solver both lean on cheap snapshots, so
 * mutation here would be a correctness bug, not a style question.
 */
export function applyMove(p: Puzzle, move: Move): Puzzle {
  const n = pourCount(p, move.from, move.to);
  if (n === 0) {
    throw new Error(`illegal move ${move.from} -> ${move.to}`);
  }
  const next = clonePuzzle(p);
  const moved = next.bottles[move.from].splice(-n, n);
  next.bottles[move.to].push(...moved);
  return next;
}

export function isSolved(p: Puzzle): boolean {
  return p.bottles.every((b) => b.length === 0 || isComplete(b, p.capacity));
}

/**
 * Legal moves, pruned of the ones that cannot lead anywhere new:
 *  - never disturb a completed bottle;
 *  - empty bottles are interchangeable, so offer only the first;
 *  - relocating an already-monochrome bottle into an empty one is a no-op.
 */
export function legalMoves(p: Puzzle): Move[] {
  const moves: Move[] = [];
  const firstEmpty = p.bottles.findIndex((b) => b.length === 0);

  for (let from = 0; from < p.bottles.length; from++) {
    const src = p.bottles[from];
    if (src.length === 0) continue;
    if (isComplete(src, p.capacity)) continue;

    const run = topRun(src);
    if (run === null) continue;
    const wholeBottle = run.count === src.length;

    for (let to = 0; to < p.bottles.length; to++) {
      if (from === to) continue;
      const dst = p.bottles[to];
      if (dst.length === 0) {
        if (to !== firstEmpty) continue;
        if (wholeBottle) continue;
      }
      if (!canPour(p, from, to)) continue;
      moves.push({ from, to });
    }
  }

  return moves;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run app/sort/engine/rules.test.ts`
Expected: PASS, 26 tests

- [ ] **Step 6: Commit**

```bash
git add app/sort/engine
git commit -m "feat(sort): add potion sort types, palette, and move rules"
```

---

### Task 5: Solver

**Files:**
- Create: `app/sort/engine/solve.ts`
- Create: `app/sort/engine/solve.test.ts`

**Interfaces:**
- Consumes: `legalMoves`, `applyMove`, `isSolved` from `./rules`; `Puzzle`, `Move` from `./types`
- Produces:
  ```ts
  export type SolveResult =
    | { status: "solved"; moves: Move[] }
    | { status: "unsolvable" }
    | { status: "unknown" };
  export const DEFAULT_NODE_CAP = 200_000;
  export function canonicalKey(p: Puzzle): string;
  export function solve(p: Puzzle, nodeCap?: number): SolveResult;
  export function hint(p: Puzzle): Move | null;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app/sort/engine/solve.test.ts
import { describe, expect, it } from "vitest";
import { applyMove, isSolved } from "./rules";
import { canonicalKey, hint, solve } from "./solve";
import type { Puzzle } from "./types";

const puzzle = (bottles: number[][], colors: number, capacity = 4): Puzzle => ({
  bottles: bottles.map((b) => [...b]),
  capacity,
  colors,
});

describe("canonicalKey", () => {
  it("ignores bottle order", () => {
    const a = puzzle([[0, 1], [1, 0], []], 2);
    const b = puzzle([[], [1, 0], [0, 1]], 2);
    expect(canonicalKey(a)).toBe(canonicalKey(b));
  });

  it("distinguishes genuinely different states", () => {
    const a = puzzle([[0, 1], []], 2);
    const b = puzzle([[1, 0], []], 2);
    expect(canonicalKey(a)).not.toBe(canonicalKey(b));
  });
});

describe("solve", () => {
  it("reports an already-solved puzzle with no moves", () => {
    const p = puzzle([[0, 0, 0, 0], [1, 1, 1, 1], []], 2);
    const r = solve(p);
    expect(r.status).toBe("solved");
    if (r.status === "solved") expect(r.moves).toHaveLength(0);
  });

  it("solves a one-move puzzle", () => {
    const p = puzzle([[0, 0, 0], [0], [1, 1, 1, 1]], 2);
    const r = solve(p);
    expect(r.status).toBe("solved");
    if (r.status === "solved") expect(r.moves).toEqual([{ from: 1, to: 0 }]);
  });

  it("returns a move sequence that actually reaches a solved state", () => {
    const p = puzzle(
      [
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [],
        [],
      ],
      2,
    );
    const r = solve(p);
    expect(r.status).toBe("solved");
    if (r.status !== "solved") return;
    let state = p;
    for (const m of r.moves) state = applyMove(state, m);
    expect(isSolved(state)).toBe(true);
  });

  it("reports an unsolvable puzzle", () => {
    // Two colours, no spare space, and every bottle mixed and full: no legal
    // move exists, so the search exhausts immediately.
    const p = puzzle(
      [
        [0, 1, 0, 1],
        [1, 0, 1, 0],
      ],
      2,
    );
    expect(solve(p).status).toBe("unsolvable");
  });

  it("returns unknown rather than lying when the node cap is hit", () => {
    const p = puzzle(
      [
        [0, 1, 2, 3],
        [3, 2, 1, 0],
        [1, 0, 3, 2],
        [2, 3, 0, 1],
        [],
        [],
      ],
      4,
    );
    expect(solve(p, 1).status).toBe("unknown");
  });
});

describe("hint", () => {
  it("returns the first move of a solution", () => {
    const p = puzzle([[0, 0, 0], [0], [1, 1, 1, 1]], 2);
    expect(hint(p)).toEqual({ from: 1, to: 0 });
  });

  it("returns null when there is nothing to suggest", () => {
    const p = puzzle([[0, 0, 0, 0], [1, 1, 1, 1]], 2);
    expect(hint(p)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/sort/engine/solve.test.ts`
Expected: FAIL — cannot resolve `./solve`

- [ ] **Step 3: Implement solve.ts**

```ts
// app/sort/engine/solve.ts
import { applyMove, isComplete, isSolved, legalMoves, topRun } from "./rules";
import type { Move, Puzzle } from "./types";

export type SolveResult =
  | { status: "solved"; moves: Move[] }
  | { status: "unsolvable" }
  | { status: "unknown" };

/** Expansion budget. Beyond this the solver admits ignorance rather than lying. */
export const DEFAULT_NODE_CAP = 200_000;

/**
 * Bottle order carries no meaning, so sorting the per-bottle encodings collapses
 * every permutation of the same arrangement onto one key. This is the single
 * biggest win in the search — without it the visited set barely prunes.
 */
export function canonicalKey(p: Puzzle): string {
  return p.bottles
    .map((b) => b.join(","))
    .sort()
    .join("|");
}

/** Prefer moves that finish a colour, then ones that free a bottle entirely. */
function scoreMove(p: Puzzle, m: Move): number {
  const src = p.bottles[m.from];
  const dst = p.bottles[m.to];
  const run = topRun(src);
  if (run === null) return 0;
  const moved = Math.min(run.count, p.capacity - dst.length);

  let score = 0;
  if (dst.length + moved === p.capacity && (dst.length === 0 || dst[0] === run.color)) {
    if (isComplete([...dst, ...Array(moved).fill(run.color)], p.capacity)) score += 100;
  }
  if (moved === src.length) score += 50;
  score += moved;
  return score;
}

interface Frame {
  puzzle: Puzzle;
  moves: Move[];
}

/**
 * Iterative DFS — explicit stack, not recursion, so a deep search cannot blow
 * the JS stack. Finds *a* solution, and makes no claim of optimality.
 */
export function solve(p: Puzzle, nodeCap: number = DEFAULT_NODE_CAP): SolveResult {
  if (isSolved(p)) return { status: "solved", moves: [] };

  const visited = new Set<string>([canonicalKey(p)]);
  const stack: Frame[] = [{ puzzle: p, moves: [] }];
  let expansions = 0;

  while (stack.length > 0) {
    if (expansions >= nodeCap) return { status: "unknown" };
    const frame = stack.pop();
    if (frame === undefined) break;
    expansions++;

    const moves = legalMoves(frame.puzzle);
    // Sorted ascending because the stack pops from the end — best explored first.
    moves.sort((a, b) => scoreMove(frame.puzzle, a) - scoreMove(frame.puzzle, b));

    for (const move of moves) {
      const next = applyMove(frame.puzzle, move);
      const key = canonicalKey(next);
      if (visited.has(key)) continue;
      const path = [...frame.moves, move];
      if (isSolved(next)) return { status: "solved", moves: path };
      visited.add(key);
      stack.push({ puzzle: next, moves: path });
    }
  }

  return { status: "unsolvable" };
}

/** The next move a solver would make from here, or null if there is none. */
export function hint(p: Puzzle): Move | null {
  const r = solve(p);
  return r.status === "solved" && r.moves.length > 0 ? r.moves[0] : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/sort/engine/solve.test.ts`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add app/sort/engine
git commit -m "feat(sort): add canonical-dedup DFS solver with node cap"
```

---

### Task 6: Seeded generation and difficulty curve

**Files:**
- Create: `app/sort/engine/generate.ts`
- Create: `app/sort/engine/generate.test.ts`
- Create: `app/sort/engine/level.ts`
- Create: `app/sort/engine/level.test.ts`

**Interfaces:**
- Consumes: `makeRng` from `@/app/game/_shared/rng`; `solve` from `./solve`; `isComplete` from `./rules`; `CAPACITY`, `MAX_COLORS` from `./palette`
- Produces:
  ```ts
  // generate.ts
  export function shuffled<T>(items: readonly T[], rng: Rng): T[];
  export function deal(params: LevelParams, rng: Rng): Puzzle;
  export function isTrivial(p: Puzzle): boolean;
  export function generate(params: LevelParams, seed: number): Puzzle;

  // level.ts
  export function paramsForLevel(level: number): LevelParams;
  export function seedForLevel(level: number): number;
  export function levelFor(level: number): Puzzle;
  ```

- [ ] **Step 1: Write the failing generate test**

```ts
// app/sort/engine/generate.test.ts
import { describe, expect, it } from "vitest";
import { makeRng } from "@/app/game/_shared/rng";
import { deal, generate, isTrivial, shuffled } from "./generate";
import { isComplete } from "./rules";
import { solve } from "./solve";
import type { LevelParams } from "./types";

const params: LevelParams = { colors: 4, free: 2, capacity: 4 };

describe("shuffled", () => {
  it("preserves the multiset", () => {
    const input = [0, 0, 1, 1, 2, 2];
    const out = shuffled(input, makeRng(7));
    expect([...out].sort()).toEqual([...input].sort());
  });

  it("is deterministic for a given seed", () => {
    expect(shuffled([1, 2, 3, 4, 5], makeRng(9))).toEqual(
      shuffled([1, 2, 3, 4, 5], makeRng(9)),
    );
  });

  it("does not mutate its input", () => {
    const input = [1, 2, 3];
    shuffled(input, makeRng(1));
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("deal", () => {
  it("creates one bottle per colour plus the free bottles", () => {
    const p = deal(params, makeRng(3));
    expect(p.bottles).toHaveLength(params.colors + params.free);
  });

  it("leaves the free bottles empty", () => {
    const p = deal(params, makeRng(3));
    const empties = p.bottles.filter((b) => b.length === 0);
    expect(empties).toHaveLength(params.free);
  });

  it("gives every colour exactly `capacity` units", () => {
    const p = deal(params, makeRng(11));
    const counts = new Map<number, number>();
    for (const b of p.bottles) {
      for (const c of b) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    expect([...counts.values()]).toEqual(
      Array(params.colors).fill(params.capacity),
    );
  });
});

describe("isTrivial", () => {
  it("flags a deal containing an already-finished bottle", () => {
    expect(
      isTrivial({ bottles: [[0, 0, 0, 0], [1, 1, 0, 1]], capacity: 4, colors: 2 }),
    ).toBe(true);
  });

  it("accepts a properly mixed deal", () => {
    expect(
      isTrivial({ bottles: [[0, 1, 0, 1], [1, 0, 1, 0]], capacity: 4, colors: 2 }),
    ).toBe(false);
  });
});

describe("generate", () => {
  it("is deterministic for a given seed", () => {
    expect(generate(params, 42)).toEqual(generate(params, 42));
  });

  it("produces a solvable puzzle", () => {
    expect(solve(generate(params, 42)).status).toBe("solved");
  });

  it("never starts with a completed bottle", () => {
    for (let seed = 0; seed < 20; seed++) {
      const p = generate(params, seed);
      expect(p.bottles.some((b) => isComplete(b, p.capacity))).toBe(false);
    }
  });

  it("different seeds give different puzzles", () => {
    expect(generate(params, 1)).not.toEqual(generate(params, 2));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/sort/engine/generate.test.ts`
Expected: FAIL — cannot resolve `./generate`

- [ ] **Step 3: Implement generate.ts**

```ts
// app/sort/engine/generate.ts
import { makeRng, type Rng } from "@/app/game/_shared/rng";
import { isComplete } from "./rules";
import { solve } from "./solve";
import type { LevelParams, Puzzle } from "./types";

/** Attempts before falling back to a construction that cannot fail. */
const MAX_ATTEMPTS = 200;

/** Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle all units, then deal them into full bottles plus the spares. */
export function deal(params: LevelParams, rng: Rng): Puzzle {
  const units: number[] = [];
  for (let c = 0; c < params.colors; c++) {
    for (let i = 0; i < params.capacity; i++) units.push(c);
  }

  const mixed = shuffled(units, rng);
  const bottles: number[][] = [];
  for (let i = 0; i < params.colors; i++) {
    bottles.push(mixed.slice(i * params.capacity, (i + 1) * params.capacity));
  }
  for (let i = 0; i < params.free; i++) bottles.push([]);

  return { bottles, capacity: params.capacity, colors: params.colors };
}

/** A deal that hands the player a finished colour for free is not a puzzle. */
export function isTrivial(p: Puzzle): boolean {
  return p.bottles.some((b) => isComplete(b, p.capacity));
}

/**
 * Deal forward, then verify — a forward deal has the statistical character of a
 * real puzzle, where reverse-shuffling from a solved state tends to leave
 * giveaway structure.
 *
 * The fallback exists so this function can never fail: reverse-shuffling from
 * the solved state is solvable by construction. In practice it should never
 * fire, because random deals with a spare bottle are almost always solvable.
 */
export function generate(params: LevelParams, seed: number): Puzzle {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = deal(params, rng);
    if (isTrivial(candidate)) continue;
    if (solve(candidate).status === "solved") return candidate;
  }

  return reverseShuffle(params, rng);
}

/**
 * Walk backwards from the solved state by splitting runs between bottles. Every
 * state reached this way is solvable, because the path back is exactly the
 * sequence of splits reversed.
 */
function reverseShuffle(params: LevelParams, rng: Rng): Puzzle {
  const bottles: number[][] = [];
  for (let c = 0; c < params.colors; c++) {
    bottles.push(Array(params.capacity).fill(c));
  }
  for (let i = 0; i < params.free; i++) bottles.push([]);

  const steps = params.colors * params.capacity * 3;
  for (let i = 0; i < steps; i++) {
    const fromCandidates = bottles
      .map((b, idx) => ({ b, idx }))
      .filter(({ b }) => b.length > 0);
    if (fromCandidates.length === 0) break;
    const from = rng.pick(fromCandidates);

    const toCandidates = bottles
      .map((b, idx) => ({ b, idx }))
      .filter(({ b, idx }) => idx !== from.idx && b.length < params.capacity);
    if (toCandidates.length === 0) continue;
    const to = rng.pick(toCandidates);

    const moved = from.b.pop();
    if (moved !== undefined) to.b.push(moved);
  }

  return { bottles, capacity: params.capacity, colors: params.colors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/sort/engine/generate.test.ts`
Expected: PASS, 12 tests

- [ ] **Step 5: Write the failing level test**

```ts
// app/sort/engine/level.test.ts
import { describe, expect, it } from "vitest";
import { levelFor, paramsForLevel, seedForLevel } from "./level";
import { isComplete } from "./rules";
import { solve } from "./solve";

describe("paramsForLevel", () => {
  it("starts at three colours with two spares", () => {
    expect(paramsForLevel(1)).toEqual({ colors: 3, free: 2, capacity: 4 });
  });

  it("adds a colour every five levels", () => {
    expect(paramsForLevel(6).colors).toBe(4);
    expect(paramsForLevel(11).colors).toBe(5);
  });

  it("caps at twelve colours", () => {
    expect(paramsForLevel(46).colors).toBe(12);
    expect(paramsForLevel(500).colors).toBe(12);
  });

  it("never drops below three colours for level zero or negative input", () => {
    expect(paramsForLevel(0).colors).toBe(3);
    expect(paramsForLevel(-5).colors).toBe(3);
  });

  it("squeezes to one spare on every tenth level from thirty", () => {
    expect(paramsForLevel(30).free).toBe(1);
    expect(paramsForLevel(40).free).toBe(1);
    expect(paramsForLevel(31).free).toBe(2);
    expect(paramsForLevel(20).free).toBe(2);
  });
});

describe("seedForLevel", () => {
  it("is stable", () => {
    expect(seedForLevel(7)).toBe(seedForLevel(7));
  });

  it("differs between levels", () => {
    expect(seedForLevel(7)).not.toBe(seedForLevel(8));
  });
});

describe("levelFor", () => {
  it("returns the identical puzzle every call", () => {
    expect(levelFor(3)).toEqual(levelFor(3));
  });

  it("has the right bottle count for its params", () => {
    const p = levelFor(12);
    const params = paramsForLevel(12);
    expect(p.bottles).toHaveLength(params.colors + params.free);
  });

  it("produces solvable, non-trivial puzzles across the early curve", () => {
    for (let level = 1; level <= 25; level++) {
      const p = levelFor(level);
      expect(p.bottles.some((b) => isComplete(b, p.capacity))).toBe(false);
      expect(solve(p).status).toBe("solved");
    }
  }, 60_000);
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run app/sort/engine/level.test.ts`
Expected: FAIL — cannot resolve `./level`

- [ ] **Step 7: Implement level.ts**

```ts
// app/sort/engine/level.ts
import { generate } from "./generate";
import { CAPACITY, MAX_COLORS } from "./palette";
import type { LevelParams, Puzzle } from "./types";

const MIN_COLORS = 3;

/**
 * Three colours and two spare bottles at level one, widening to twelve colours
 * by level 46 and flat thereafter. From level 30 every tenth level is a squeeze
 * with a single spare — still verified solvable, just tighter.
 */
export function paramsForLevel(level: number): LevelParams {
  const n = Math.max(1, Math.floor(level));
  const colors = Math.min(MAX_COLORS, MIN_COLORS + Math.floor((n - 1) / 5));
  const free = n >= 30 && n % 10 === 0 ? 1 : 2;
  return { colors, free, capacity: CAPACITY };
}

/**
 * Spread consecutive level numbers across the seed space, so level 8 bears no
 * resemblance to level 9 despite the inputs differing by one.
 */
export function seedForLevel(level: number): number {
  let h = Math.max(1, Math.floor(level)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Generation is the one expensive call, so each level is built at most once. */
const cache = new Map<number, Puzzle>();

export function levelFor(level: number): Puzzle {
  const n = Math.max(1, Math.floor(level));
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const puzzle = generate(paramsForLevel(n), seedForLevel(n));
  cache.set(n, puzzle);
  return puzzle;
}
```

- [ ] **Step 8: Run the tests**

Run: `npx vitest run app/sort/engine/level.test.ts`
Expected: PASS, 11 tests. If the 25-level sweep is slow, note the wall-clock time — it is the early warning for the solver-cost risk in the spec.

- [ ] **Step 9: Commit**

```bash
git add app/sort/engine
git commit -m "feat(sort): add seeded level generation and difficulty curve"
```

---

### Task 7: Pour animation phase machine

**Files:**
- Create: `app/sort/engine/anim.ts`
- Create: `app/sort/engine/anim.test.ts`

**Interfaces:**
- Consumes: `Move` from `./types`
- Produces:
  ```ts
  export type PhaseName = "lift" | "travel" | "tilt" | "pour" | "untilt" | "return";
  export interface Pour { move: Move; units: number; color: number; t: number }
  export interface PhaseAt { name: PhaseName; u: number }   // u in [0,1]
  export function phaseDurations(units: number): { name: PhaseName; dur: number }[];
  export function totalDuration(units: number): number;
  export function phaseAt(t: number, units: number): PhaseAt;
  export function isDone(pour: Pour): boolean;
  export function pouredUnits(pour: Pour): number;   // fractional, 0..units
  export function tiltAngle(remaining: number, capacity: number): number;
  export function startPour(move: Move, units: number, color: number): Pour;
  export function advance(pour: Pour, dt: number): Pour;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app/sort/engine/anim.test.ts
import { describe, expect, it } from "vitest";
import {
  advance,
  isDone,
  phaseAt,
  phaseDurations,
  pouredUnits,
  startPour,
  tiltAngle,
  totalDuration,
} from "./anim";

describe("phaseDurations", () => {
  it("runs the six phases in order", () => {
    expect(phaseDurations(2).map((p) => p.name)).toEqual([
      "lift",
      "travel",
      "tilt",
      "pour",
      "untilt",
      "return",
    ]);
  });

  it("scales only the pour phase with unit count", () => {
    const one = phaseDurations(1);
    const three = phaseDurations(3);
    const pourOf = (ps: typeof one) =>
      ps.find((p) => p.name === "pour")?.dur ?? 0;
    expect(pourOf(three)).toBeCloseTo(pourOf(one) * 3);
    expect(one.find((p) => p.name === "lift")?.dur).toBe(
      three.find((p) => p.name === "lift")?.dur,
    );
  });
});

describe("totalDuration", () => {
  it("sums the phases", () => {
    const sum = phaseDurations(2).reduce((n, p) => n + p.dur, 0);
    expect(totalDuration(2)).toBeCloseTo(sum);
  });

  it("grows with unit count", () => {
    expect(totalDuration(4)).toBeGreaterThan(totalDuration(1));
  });
});

describe("phaseAt", () => {
  it("starts in lift at zero progress", () => {
    expect(phaseAt(0, 2)).toEqual({ name: "lift", u: 0 });
  });

  it("clamps past the end to the final phase complete", () => {
    expect(phaseAt(totalDuration(2) + 5, 2)).toEqual({ name: "return", u: 1 });
  });

  it("reports progress within the current phase", () => {
    const lift = phaseDurations(2)[0].dur;
    const at = phaseAt(lift / 2, 2);
    expect(at.name).toBe("lift");
    expect(at.u).toBeCloseTo(0.5);
  });

  it("crosses phase boundaries in order as time advances", () => {
    const seen: string[] = [];
    const total = totalDuration(2);
    for (let t = 0; t <= total; t += total / 60) {
      const name = phaseAt(t, 2).name;
      if (seen[seen.length - 1] !== name) seen.push(name);
    }
    expect(seen).toEqual(["lift", "travel", "tilt", "pour", "untilt", "return"]);
  });
});

describe("pouredUnits", () => {
  it("is zero before the pour phase", () => {
    const pour = startPour({ from: 0, to: 1 }, 3, 0);
    expect(pouredUnits(pour)).toBe(0);
  });

  it("is the full count after the pour phase", () => {
    const pour = advance(startPour({ from: 0, to: 1 }, 3, 0), totalDuration(3));
    expect(pouredUnits(pour)).toBe(3);
  });

  it("is fractional mid-pour, so flow reads as continuous", () => {
    const phases = phaseDurations(2);
    const beforePour = phases
      .slice(0, 3)
      .reduce((n, p) => n + p.dur, 0);
    const pourDur = phases[3].dur;
    const pour = advance(startPour({ from: 0, to: 1 }, 2, 0), beforePour + pourDur / 2);
    expect(pouredUnits(pour)).toBeCloseTo(1);
  });
});

describe("tiltAngle", () => {
  it("tips a nearly empty bottle further than a full one", () => {
    expect(Math.abs(tiltAngle(1, 4))).toBeGreaterThan(Math.abs(tiltAngle(4, 4)));
  });

  it("is monotonic in remaining fill", () => {
    const angles = [1, 2, 3, 4].map((r) => Math.abs(tiltAngle(r, 4)));
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeLessThanOrEqual(angles[i - 1]);
    }
  });
});

describe("advance / isDone", () => {
  it("is not done at the start", () => {
    expect(isDone(startPour({ from: 0, to: 1 }, 1, 0))).toBe(false);
  });

  it("is done once the total duration has elapsed", () => {
    const p = advance(startPour({ from: 0, to: 1 }, 1, 0), totalDuration(1));
    expect(isDone(p)).toBe(true);
  });

  it("does not mutate the pour it advances", () => {
    const p = startPour({ from: 0, to: 1 }, 1, 0);
    advance(p, 0.5);
    expect(p.t).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/sort/engine/anim.test.ts`
Expected: FAIL — cannot resolve `./anim`

- [ ] **Step 3: Implement anim.ts**

```ts
// app/sort/engine/anim.ts
import type { Move } from "./types";

export type PhaseName = "lift" | "travel" | "tilt" | "pour" | "untilt" | "return";

export interface Pour {
  move: Move;
  /** Units being transferred — drives the pour phase's length. */
  units: number;
  /** Palette index of the liquid in flight. */
  color: number;
  /** Elapsed animation time, seconds. */
  t: number;
}

export interface PhaseAt {
  name: PhaseName;
  /** Progress within the phase, 0..1. */
  u: number;
}

const LIFT = 0.12;
const TRAVEL = 0.18;
const TILT = 0.14;
const PER_UNIT = 0.1;
const UNTILT = 0.12;
const RETURN = 0.14;

/** Maximum tilt, radians. Reached when the bottle is nearly empty. */
const MAX_TILT = -1.15;
const MIN_TILT = -0.7;

export function phaseDurations(units: number): { name: PhaseName; dur: number }[] {
  return [
    { name: "lift", dur: LIFT },
    { name: "travel", dur: TRAVEL },
    { name: "tilt", dur: TILT },
    { name: "pour", dur: PER_UNIT * Math.max(1, units) },
    { name: "untilt", dur: UNTILT },
    { name: "return", dur: RETURN },
  ];
}

export function totalDuration(units: number): number {
  return phaseDurations(units).reduce((n, p) => n + p.dur, 0);
}

export function phaseAt(t: number, units: number): PhaseAt {
  const phases = phaseDurations(units);
  let remaining = Math.max(0, t);

  for (const phase of phases) {
    if (remaining < phase.dur) {
      return { name: phase.name, u: phase.dur === 0 ? 1 : remaining / phase.dur };
    }
    remaining -= phase.dur;
  }

  return { name: "return", u: 1 };
}

export function startPour(move: Move, units: number, color: number): Pour {
  return { move, units, color, t: 0 };
}

/** Returns a new Pour; the caller's copy is left alone. */
export function advance(pour: Pour, dt: number): Pour {
  return { ...pour, t: pour.t + dt };
}

export function isDone(pour: Pour): boolean {
  return pour.t >= totalDuration(pour.units);
}

/**
 * Fractional units transferred so far. Fractional rather than stepped is what
 * makes the liquid read as flowing instead of teleporting.
 */
export function pouredUnits(pour: Pour): number {
  const at = phaseAt(pour.t, pour.units);
  switch (at.name) {
    case "lift":
    case "travel":
    case "tilt":
      return 0;
    case "pour":
      return at.u * pour.units;
    default:
      return pour.units;
  }
}

/**
 * A fuller bottle needs less tilt before liquid reaches the lip — the same
 * reason you barely tip a full glass and upend an almost-empty one.
 */
export function tiltAngle(remaining: number, capacity: number): number {
  const fill = Math.max(0, Math.min(1, remaining / Math.max(1, capacity)));
  return MAX_TILT + (MIN_TILT - MAX_TILT) * fill;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/sort/engine/anim.test.ts`
Expected: PASS, 15 tests

- [ ] **Step 5: Commit**

```bash
git add app/sort/engine
git commit -m "feat(sort): add pure pour-animation phase machine"
```

---

### Task 8: Save schema

**Files:**
- Create: `app/sort/engine/save.ts`
- Create: `app/sort/engine/save.test.ts`

**Interfaces:**
- Consumes: `readJson`, `writeJson`, `StorageLike` from `@/app/game/_shared/storage`; `coerceSpeed`, `DEFAULT_SPEED`, `type Speed` from `@/app/game/_shared/speed`
- Produces:
  ```ts
  export const SORT_SAVE_VERSION = 1;
  export const SORT_SAVE_KEY = "game:sort";
  export interface SortSave {
    version: number;
    level: number;
    best: number;
    movesByLevel: Record<number, number>;
    symbols: boolean;
    speed: Speed;
  }
  export function defaultSortSave(): SortSave;
  export function migrateSortSave(raw: unknown): SortSave;
  export function loadSortSave(storage: StorageLike): SortSave;
  export function writeSortSave(storage: StorageLike, save: SortSave): void;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app/sort/engine/save.test.ts
import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/app/game/_shared/storage";
import {
  defaultSortSave,
  loadSortSave,
  migrateSortSave,
  writeSortSave,
} from "./save";

const memStorage = (seed: Record<string, string> = {}): StorageLike => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
};

describe("defaultSortSave", () => {
  it("starts on level one with nothing beaten", () => {
    const s = defaultSortSave();
    expect(s.level).toBe(1);
    expect(s.best).toBe(1);
    expect(s.movesByLevel).toEqual({});
  });

  it("enables glyphs by default", () => {
    expect(defaultSortSave().symbols).toBe(true);
  });
});

describe("migrateSortSave", () => {
  it("coerces null to defaults", () => {
    expect(migrateSortSave(null)).toEqual(defaultSortSave());
  });

  it("coerces an array to defaults", () => {
    expect(migrateSortSave([1, 2, 3])).toEqual(defaultSortSave());
  });

  it("keeps valid fields", () => {
    const s = migrateSortSave({
      version: 1,
      level: 12,
      best: 14,
      movesByLevel: { 1: 9 },
      symbols: false,
      speed: 2,
    });
    expect(s.level).toBe(12);
    expect(s.best).toBe(14);
    expect(s.movesByLevel).toEqual({ 1: 9 });
    expect(s.symbols).toBe(false);
    expect(s.speed).toBe(2);
  });

  it("repairs a level below one", () => {
    expect(migrateSortSave({ level: 0 }).level).toBe(1);
    expect(migrateSortSave({ level: -3 }).level).toBe(1);
  });

  it("never reports best below level", () => {
    expect(migrateSortSave({ level: 20, best: 3 }).best).toBe(20);
  });

  it("drops non-numeric move counts", () => {
    expect(migrateSortSave({ movesByLevel: { 1: "nope", 2: 5 } }).movesByLevel).toEqual({
      2: 5,
    });
  });

  it("falls back on a bogus speed", () => {
    expect(migrateSortSave({ speed: 99 }).speed).toBe(defaultSortSave().speed);
  });
});

describe("loadSortSave / writeSortSave", () => {
  it("round-trips", () => {
    const storage = memStorage();
    const save = { ...defaultSortSave(), level: 7, best: 9 };
    writeSortSave(storage, save);
    expect(loadSortSave(storage)).toEqual(save);
  });

  it("returns defaults for an empty store", () => {
    expect(loadSortSave(memStorage())).toEqual(defaultSortSave());
  });

  it("returns defaults for a corrupt payload", () => {
    expect(loadSortSave(memStorage({ "game:sort": "{broken" }))).toEqual(
      defaultSortSave(),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/sort/engine/save.test.ts`
Expected: FAIL — cannot resolve `./save`

- [ ] **Step 3: Implement save.ts**

```ts
// app/sort/engine/save.ts
import { coerceSpeed, DEFAULT_SPEED, type Speed } from "@/app/game/_shared/speed";
import { readJson, writeJson, type StorageLike } from "@/app/game/_shared/storage";

export const SORT_SAVE_VERSION = 1;
export const SORT_SAVE_KEY = "game:sort";

export interface SortSave {
  version: number;
  /** Level currently being played. */
  level: number;
  /** Highest level ever reached — the ceiling for level select. */
  best: number;
  /** Best move count per beaten level. */
  movesByLevel: Record<number, number>;
  /** Glyph overlay, on by default so colour is never the only cue. */
  symbols: boolean;
  speed: Speed;
}

export function defaultSortSave(): SortSave {
  return {
    version: SORT_SAVE_VERSION,
    level: 1,
    best: 1,
    movesByLevel: {},
    symbols: true,
    speed: DEFAULT_SPEED,
  };
}

const posInt = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.floor(v) : fallback;

function moveMap(v: unknown): Record<number, number> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: Record<number, number> = {};
  for (const [k, value] of Object.entries(v as Record<string, unknown>)) {
    const level = Number(k);
    if (!Number.isInteger(level) || level < 1) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    out[level] = Math.floor(value);
  }
  return out;
}

/**
 * Coerce any stored payload into a valid save. A corrupt or partial save must
 * never crash the route — the worst acceptable outcome is starting fresh.
 */
export function migrateSortSave(raw: unknown): SortSave {
  const base = defaultSortSave();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return base;

  const r = raw as Record<string, unknown>;
  const level = posInt(r.level, base.level);

  return {
    version: SORT_SAVE_VERSION,
    level,
    // best can never sit below the level in progress, however the save got here.
    best: Math.max(level, posInt(r.best, base.best)),
    movesByLevel: moveMap(r.movesByLevel),
    symbols: typeof r.symbols === "boolean" ? r.symbols : base.symbols,
    speed: coerceSpeed(r.speed),
  };
}

export function loadSortSave(storage: StorageLike): SortSave {
  const raw = readJson(storage, SORT_SAVE_KEY);
  return raw === null ? defaultSortSave() : migrateSortSave(raw);
}

export function writeSortSave(storage: StorageLike, save: SortSave): void {
  writeJson(storage, SORT_SAVE_KEY, { ...save, version: SORT_SAVE_VERSION });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/sort/engine/save.test.ts`
Expected: PASS, 13 tests

- [ ] **Step 5: Commit**

```bash
git add app/sort/engine
git commit -m "feat(sort): add potion sort save schema"
```

---

### Task 9: Layout and hit-testing

**Files:**
- Create: `app/sort/render/layout.ts`
- Create: `app/sort/render/layout.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  ```ts
  export interface Rect { x: number; y: number; w: number; h: number }
  export interface BottleLayout extends Rect { index: number; unitH: number }
  export interface Layout {
    bottles: BottleLayout[];
    rows: number;
    unitH: number;
  }
  export function layoutBottles(
    count: number,
    capacity: number,
    canvasW: number,
    canvasH: number,
  ): Layout;
  export function hitTest(layout: Layout, x: number, y: number): number | null;
  ```
  `hitTest` returns the bottle index under the point, or `null`. Hit rectangles are padded outward for comfortable touch targets.

- [ ] **Step 1: Write the failing test**

```ts
// app/sort/render/layout.test.ts
import { describe, expect, it } from "vitest";
import { hitTest, layoutBottles, type Layout } from "./layout";

const W = 400;
const H = 500;

const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("layoutBottles", () => {
  it("returns one entry per bottle, indexed in order", () => {
    const l = layoutBottles(7, 4, W, H);
    expect(l.bottles).toHaveLength(7);
    expect(l.bottles.map((b) => b.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("keeps every bottle inside the canvas", () => {
    for (const count of [3, 5, 8, 12, 14]) {
      const l = layoutBottles(count, 4, W, H);
      for (const b of l.bottles) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(W);
        expect(b.y + b.h).toBeLessThanOrEqual(H);
      }
    }
  });

  it("never overlaps two bottles", () => {
    for (const count of [3, 5, 8, 12, 14]) {
      const l = layoutBottles(count, 4, W, H);
      for (let i = 0; i < l.bottles.length; i++) {
        for (let j = i + 1; j < l.bottles.length; j++) {
          expect(overlaps(l.bottles[i], l.bottles[j])).toBe(false);
        }
      }
    }
  });

  it("uses a single row for small counts and wraps for large ones", () => {
    expect(layoutBottles(4, 4, W, H).rows).toBe(1);
    expect(layoutBottles(14, 4, W, H).rows).toBeGreaterThan(1);
  });

  it("sizes a unit to the bottle height divided by capacity", () => {
    const l = layoutBottles(5, 4, W, H);
    expect(l.bottles[0].unitH).toBeCloseTo(l.bottles[0].h / 4);
  });

  it("gives every bottle positive dimensions even when cramped", () => {
    const l = layoutBottles(14, 4, 200, 200);
    for (const b of l.bottles) {
      expect(b.w).toBeGreaterThan(0);
      expect(b.h).toBeGreaterThan(0);
    }
  });
});

describe("hitTest", () => {
  const centreOf = (l: Layout, i: number) => ({
    x: l.bottles[i].x + l.bottles[i].w / 2,
    y: l.bottles[i].y + l.bottles[i].h / 2,
  });

  it("round-trips the centre of every bottle", () => {
    const l = layoutBottles(9, 4, W, H);
    for (let i = 0; i < l.bottles.length; i++) {
      const c = centreOf(l, i);
      expect(hitTest(l, c.x, c.y)).toBe(i);
    }
  });

  it("returns null well outside every bottle", () => {
    const l = layoutBottles(4, 4, W, H);
    expect(hitTest(l, -100, -100)).toBeNull();
    expect(hitTest(l, W + 100, H + 100)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/sort/render/layout.test.ts`
Expected: FAIL — cannot resolve `./layout`

- [ ] **Step 3: Implement layout.ts**

```ts
// app/sort/render/layout.ts
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BottleLayout extends Rect {
  index: number;
  /** Height of one liquid unit. */
  unitH: number;
}

export interface Layout {
  bottles: BottleLayout[];
  rows: number;
  unitH: number;
}

const MAX_PER_ROW = 7;
const GAP_RATIO = 0.35;
/** Vertical headroom above each row so a lifted bottle has somewhere to go. */
const LIFT_HEADROOM = 0.28;
/** Outward padding on hit rectangles, as a fraction of bottle width. */
const TOUCH_PAD = 0.15;

/**
 * Arrange bottles in up to two rows, sized to whichever of width or height is
 * the binding constraint. Pure — no canvas, no DOM — so it can be asserted on.
 */
export function layoutBottles(
  count: number,
  capacity: number,
  canvasW: number,
  canvasH: number,
): Layout {
  const n = Math.max(1, count);
  const rows = Math.ceil(n / MAX_PER_ROW);
  const perRow = Math.ceil(n / rows);

  // Width available per column, then split between bottle and gap.
  const colW = canvasW / (perRow + (perRow + 1) * GAP_RATIO * 0.5);
  const gap = colW * GAP_RATIO;

  const rowH = canvasH / rows;
  const maxBottleH = rowH / (1 + LIFT_HEADROOM);

  // A bottle is roughly 1:3, but never wider than its column allows.
  const bottleW = Math.min(colW, maxBottleH / 2.6);
  const bottleH = Math.min(maxBottleH, bottleW * 2.6);
  const unitH = bottleH / capacity;

  const bottles: BottleLayout[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inThisRow = Math.min(perRow, n - row * perRow);
    const rowWidth = inThisRow * bottleW + (inThisRow - 1) * gap;
    const startX = (canvasW - rowWidth) / 2;

    bottles.push({
      index: i,
      x: startX + col * (bottleW + gap),
      y: row * rowH + (rowH - bottleH) / 2 + rowH * LIFT_HEADROOM * 0.25,
      w: bottleW,
      h: bottleH,
      unitH,
    });
  }

  return { bottles, rows, unitH };
}

/** Index of the bottle under a point, with padding so touch targets are kind. */
export function hitTest(layout: Layout, x: number, y: number): number | null {
  for (const b of layout.bottles) {
    const pad = b.w * TOUCH_PAD;
    if (
      x >= b.x - pad &&
      x <= b.x + b.w + pad &&
      y >= b.y - pad &&
      y <= b.y + b.h + pad
    ) {
      return b.index;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/sort/render/layout.test.ts`
Expected: PASS, 8 tests. If the "keeps every bottle inside the canvas" case fails at 14 bottles, the row-height maths is the culprit — tighten `LIFT_HEADROOM` rather than loosening the assertion.

- [ ] **Step 5: Commit**

```bash
git add app/sort/render
git commit -m "feat(sort): add bottle layout and hit-testing"
```

---

### Task 10: Canvas renderer

**Files:**
- Create: `app/sort/render/draw.ts`

**Interfaces:**
- Consumes: `Layout`, `BottleLayout` from `./layout`; `Puzzle` from `../engine/types`; `Pour`, `phaseAt`, `pouredUnits`, `tiltAngle` from `../engine/anim`; `PALETTE` from `../engine/palette`
- Produces:
  ```ts
  export interface DrawState {
    puzzle: Puzzle;          // committed state (post-move during a pour)
    before: Puzzle | null;   // pre-move snapshot, non-null only during a pour
    pour: Pour | null;
    selected: number | null;
    hinted: { from: number; to: number } | null;
    symbols: boolean;
    shake: { index: number; t: number } | null;
  }
  export function drawScene(
    ctx: CanvasRenderingContext2D,
    layout: Layout,
    state: DrawState,
    canvasW: number,
    canvasH: number,
  ): void;
  ```

This task has no unit test by design — canvas painting is verified by playing the game in Task 12. Keep all geometry decisions that *could* be asserted in `layout.ts` or `anim.ts` instead.

- [ ] **Step 1: Implement draw.ts**

```ts
// app/sort/render/draw.ts
import { phaseAt, pouredUnits, tiltAngle, type Pour } from "../engine/anim";
import { PALETTE } from "../engine/palette";
import type { Puzzle } from "../engine/types";
import type { BottleLayout, Layout } from "./layout";

export interface DrawState {
  /** Committed state. During a pour this is already the post-move puzzle. */
  puzzle: Puzzle;
  /** Pre-move snapshot; non-null only while a pour is animating. */
  before: Puzzle | null;
  pour: Pour | null;
  selected: number | null;
  hinted: { from: number; to: number } | null;
  symbols: boolean;
  shake: { index: number; t: number } | null;
}

const BG = "#0d0a15";
const GLASS = "#f8f0e0";
const GLASS_DIM = "rgba(248, 240, 224, 0.35)";
const OUTLINE = "#000000";
const BORDER = 4;
const LIFT_PX = 22;
const SHAKE_DURATION = 0.3;

/** How full each bottle appears right now, accounting for liquid in flight. */
function displayBottles(state: DrawState): number[][] {
  const { pour, before, puzzle } = state;
  if (pour === null || before === null) return puzzle.bottles.map((b) => [...b]);

  const bottles = before.bottles.map((b) => [...b]);
  const moved = Math.floor(pouredUnits(pour) + 1e-6);
  for (let i = 0; i < moved; i++) {
    const unit = bottles[pour.move.from].pop();
    if (unit !== undefined) bottles[pour.move.to].push(unit);
  }
  return bottles;
}

function bottleOffset(state: DrawState, index: number, layout: Layout): {
  dx: number;
  dy: number;
  angle: number;
} {
  const { pour } = state;
  if (pour === null || pour.move.from !== index) {
    const lifted = state.selected === index ? -LIFT_PX * 0.5 : 0;
    return { dx: 0, dy: lifted, angle: 0 };
  }

  const src = layout.bottles[pour.move.from];
  const dst = layout.bottles[pour.move.to];
  const at = phaseAt(pour.t, pour.units);

  // Park to the destination's upper-left so the lip sits over its rim.
  const targetDx = dst.x - src.x - src.w * 0.55;
  const targetDy = dst.y - src.y - src.h * 0.45;

  const ease = (u: number) => u * u * (3 - 2 * u);
  const remaining = Math.max(
    0,
    (state.before?.bottles[pour.move.from].length ?? 0) - pouredUnits(pour),
  );
  const fullTilt = tiltAngle(remaining, state.puzzle.capacity);

  switch (at.name) {
    case "lift":
      return { dx: 0, dy: -LIFT_PX * ease(at.u), angle: 0 };
    case "travel":
      return {
        dx: targetDx * ease(at.u),
        dy: -LIFT_PX + (targetDy + LIFT_PX) * ease(at.u),
        angle: 0,
      };
    case "tilt":
      return { dx: targetDx, dy: targetDy, angle: fullTilt * ease(at.u) };
    case "pour":
      return { dx: targetDx, dy: targetDy, angle: fullTilt };
    case "untilt":
      return { dx: targetDx, dy: targetDy, angle: fullTilt * (1 - ease(at.u)) };
    default:
      return {
        dx: targetDx * (1 - ease(at.u)),
        dy: targetDy * (1 - ease(at.u)),
        angle: 0,
      };
  }
}

function drawBottle(
  ctx: CanvasRenderingContext2D,
  box: BottleLayout,
  contents: number[],
  capacity: number,
  state: DrawState,
  highlight: boolean,
): void {
  const { x, y, w, h, unitH } = box;

  ctx.fillStyle = "rgba(27, 20, 40, 0.9)";
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < contents.length; i++) {
    const potion = PALETTE[contents[i] % PALETTE.length];
    const unitY = y + h - (i + 1) * unitH;
    ctx.fillStyle = potion.hex;
    ctx.fillRect(x + BORDER, unitY, w - BORDER * 2, unitH);

    if (state.symbols) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.font = `bold ${Math.max(9, Math.floor(unitH * 0.5))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(potion.glyph, x + w / 2, unitY + unitH / 2);
    }
  }

  ctx.lineWidth = BORDER;
  ctx.strokeStyle = highlight ? GLASS : GLASS_DIM;
  ctx.strokeRect(x + BORDER / 2, y + BORDER / 2, w - BORDER, h - BORDER);

  // Neck notch, so a bottle reads as a bottle rather than a bar.
  ctx.fillStyle = BG;
  ctx.fillRect(x - BORDER, y - BORDER, BORDER * 2, BORDER * 2);
  ctx.fillRect(x + w - BORDER, y - BORDER, BORDER * 2, BORDER * 2);
  void capacity;
}

function drawStream(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
): void {
  const { pour } = state;
  if (pour === null) return;
  const at = phaseAt(pour.t, pour.units);
  if (at.name !== "pour") return;

  const dst = layout.bottles[pour.move.to];
  const potion = PALETTE[pour.color % PALETTE.length];
  const lipX = dst.x + dst.w * 0.5;
  const lipY = dst.y - dst.h * 0.35;
  const rimY = dst.y + BORDER;

  ctx.fillStyle = potion.hex;
  const width = Math.max(3, dst.w * 0.12);
  ctx.fillRect(lipX - width / 2, lipY, width, rimY - lipY);
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const bottles = displayBottles(state);
  const pouringIndex = state.pour?.move.from ?? -1;

  for (const box of layout.bottles) {
    const contents = bottles[box.index] ?? [];
    const { dx, dy, angle } = bottleOffset(state, box.index, layout);

    const shaking =
      state.shake !== null &&
      state.shake.index === box.index &&
      state.shake.t < SHAKE_DURATION;
    const shakeX = shaking
      ? Math.sin((state.shake?.t ?? 0) * 60) * 5
      : 0;

    const highlight =
      state.selected === box.index ||
      state.hinted?.from === box.index ||
      state.hinted?.to === box.index ||
      box.index === pouringIndex;

    ctx.save();
    if (angle !== 0) {
      // Rotate about the bottle's lower lip, which is what actually pivots.
      const px = box.x + dx + box.w;
      const py = box.y + dy + box.h;
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.translate(-px, -py);
    }
    ctx.translate(dx + shakeX, dy);
    drawBottle(ctx, box, contents, state.puzzle.capacity, state, highlight);
    ctx.restore();
  }

  drawStream(ctx, layout, state);
  void OUTLINE;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/sort/render
git commit -m "feat(sort): add canvas renderer with tilt and pour stream"
```

---

### Task 11: Page, HUD, and level select

**Files:**
- Create: `app/sort/ui/Hud.tsx`
- Create: `app/sort/ui/WinBanner.tsx`
- Create: `app/sort/ui/LevelSelect.tsx`
- Create: `app/sort/page.tsx`

**Interfaces:**
- Consumes: everything produced by Tasks 4–10; `useGameLoop` from `@/app/game/_shared/useGameLoop`; `PixelButton`, `PixelPanel` from `@/app/game/_shared/pixel-ui`; `nextSpeed`, `type Speed` from `@/app/game/_shared/speed`
- Produces: the `/sort` route

- [ ] **Step 1: Write the HUD**

```tsx
// app/sort/ui/Hud.tsx
"use client";

import { PixelButton } from "@/app/game/_shared/pixel-ui";
import type { Speed } from "@/app/game/_shared/speed";

export interface HudProps {
  level: number;
  moves: number;
  best: number;
  speed: Speed;
  symbols: boolean;
  canUndo: boolean;
  canAddBottle: boolean;
  busy: boolean;
  onUndo: () => void;
  onReset: () => void;
  onHint: () => void;
  onAddBottle: () => void;
  onToggleSpeed: () => void;
  onToggleSymbols: () => void;
  onOpenLevels: () => void;
}

export function Hud(props: HudProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest">
        <button
          type="button"
          onClick={props.onOpenLevels}
          className="underline decoration-dotted underline-offset-4"
        >
          Level {props.level}
        </button>
        <span className="opacity-60">Moves {props.moves}</span>
        <span className="opacity-60">Best {props.best}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <PixelButton
          onClick={props.onUndo}
          disabled={!props.canUndo || props.busy}
          className="!px-2 !py-2 text-[10px]"
        >
          Undo
        </PixelButton>
        <PixelButton
          onClick={props.onReset}
          disabled={props.busy}
          className="!px-2 !py-2 text-[10px]"
        >
          Reset
        </PixelButton>
        <PixelButton
          onClick={props.onHint}
          disabled={props.busy}
          className="!px-2 !py-2 text-[10px]"
        >
          Hint
        </PixelButton>
        <PixelButton
          onClick={props.onAddBottle}
          disabled={!props.canAddBottle || props.busy}
          className="!px-2 !py-2 text-[10px]"
        >
          +Flask
        </PixelButton>
      </div>

      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
        <button type="button" onClick={props.onToggleSpeed} className="opacity-70">
          Speed {props.speed}x
        </button>
        <button type="button" onClick={props.onToggleSymbols} className="opacity-70">
          Glyphs {props.symbols ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the win banner**

```tsx
// app/sort/ui/WinBanner.tsx
"use client";

import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";

export function WinBanner({
  level,
  moves,
  bestMoves,
  onNext,
  onReplay,
}: {
  level: number;
  moves: number;
  bestMoves: number | null;
  onNext: () => void;
  onReplay: () => void;
}) {
  const beatRecord = bestMoves !== null && moves < bestMoves;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
      <PixelPanel className="w-full max-w-xs text-center">
        <h2 className="mb-1 text-lg font-bold uppercase tracking-widest">
          Level {level} clear
        </h2>
        <p className="mb-4 text-xs uppercase tracking-widest opacity-70">
          {moves} moves{beatRecord ? " — new record" : ""}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <PixelButton onClick={onReplay} className="!px-2 !py-2 text-[10px]">
            Replay
          </PixelButton>
          <PixelButton onClick={onNext} className="!px-2 !py-2 text-[10px]">
            Next
          </PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
```

- [ ] **Step 3: Write the level select**

```tsx
// app/sort/ui/LevelSelect.tsx
"use client";

import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";

export function LevelSelect({
  best,
  current,
  movesByLevel,
  onPick,
  onClose,
}: {
  best: number;
  current: number;
  movesByLevel: Record<number, number>;
  onPick: (level: number) => void;
  onClose: () => void;
}) {
  const levels = Array.from({ length: best }, (_, i) => i + 1);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
      <PixelPanel className="max-h-[80vh] w-full max-w-xs overflow-y-auto">
        <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-widest">
          Levels
        </h2>
        <div className="mb-3 grid grid-cols-5 gap-1">
          {levels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onPick(level)}
              className={`border-2 py-2 text-[10px] font-bold ${
                level === current
                  ? "border-[#f8f0e0] bg-[#2f2447]"
                  : "border-[#f8f0e0]/40"
              }`}
            >
              {level}
              {movesByLevel[level] !== undefined && (
                <span className="block text-[8px] opacity-60">
                  {movesByLevel[level]}
                </span>
              )}
            </button>
          ))}
        </div>
        <PixelButton onClick={onClose} className="w-full !px-2 !py-2 text-[10px]">
          Close
        </PixelButton>
      </PixelPanel>
    </div>
  );
}
```

- [ ] **Step 4: Write the page**

```tsx
// app/sort/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import { nextSpeed, type Speed } from "@/app/game/_shared/speed";
import {
  advance,
  isDone,
  startPour,
  totalDuration,
  type Pour,
} from "./engine/anim";
import { levelFor } from "./engine/level";
import { applyMove, canPour, clonePuzzle, isSolved, pourCount, topRun } from "./engine/rules";
import {
  defaultSortSave,
  loadSortSave,
  writeSortSave,
  type SortSave,
} from "./engine/save";
import { hint as solveHint } from "./engine/solve";
import type { Move, Puzzle } from "./engine/types";
import { drawScene, type DrawState } from "./render/draw";
import { hitTest, layoutBottles } from "./render/layout";
import { Hud } from "./ui/Hud";
import { LevelSelect } from "./ui/LevelSelect";
import { WinBanner } from "./ui/WinBanner";

const FIXED_DT = 1 / 60;
const HINT_DURATION = 1.6;

export default function SortPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [save, setSave] = useState<SortSave>(defaultSortSave);
  const [loaded, setLoaded] = useState(false);

  const [puzzle, setPuzzle] = useState<Puzzle>(() => clonePuzzle(levelFor(1)));
  const [history, setHistory] = useState<Puzzle[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [addedBottle, setAddedBottle] = useState(false);
  const [won, setWon] = useState(false);
  const [showLevels, setShowLevels] = useState(false);

  // Animation state lives in refs: the game loop mutates it every frame and
  // must not trigger a React render to do so.
  const pourRef = useRef<Pour | null>(null);
  const beforeRef = useRef<Puzzle | null>(null);
  const hintRef = useRef<{ move: Move; t: number } | null>(null);
  const shakeRef = useRef<{ index: number; t: number } | null>(null);
  const puzzleRef = useRef(puzzle);
  const selectedRef = useRef(selected);
  const symbolsRef = useRef(save.symbols);
  const [busy, setBusy] = useState(false);

  puzzleRef.current = puzzle;
  selectedRef.current = selected;
  symbolsRef.current = save.symbols;

  // Load the save once on mount; localStorage does not exist during export.
  useEffect(() => {
    const restored = loadSortSave(window.localStorage);
    setSave(restored);
    setPuzzle(clonePuzzle(levelFor(restored.level)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeSortSave(window.localStorage, save);
  }, [save, loaded]);

  const loadLevel = useCallback((level: number) => {
    pourRef.current = null;
    beforeRef.current = null;
    hintRef.current = null;
    setBusy(false);
    setPuzzle(clonePuzzle(levelFor(level)));
    setHistory([]);
    setSelected(null);
    setMoves(0);
    setAddedBottle(false);
    setWon(false);
    setSave((s) => ({ ...s, level, best: Math.max(s.best, level) }));
  }, []);

  const commitMove = useCallback(
    (move: Move) => {
      const current = puzzleRef.current;
      const units = pourCount(current, move.from, move.to);
      if (units === 0) return;

      const run = topRun(current.bottles[move.from]);
      const before = clonePuzzle(current);
      const after = applyMove(current, move);

      // Logic commits now; the animation is pure presentation catching up.
      beforeRef.current = before;
      pourRef.current = startPour(move, units, run?.color ?? 0);
      hintRef.current = null;
      setBusy(true);
      setHistory((h) => [...h, before]);
      setPuzzle(after);
      setMoves((m) => m + 1);
      setSelected(null);
    },
    [],
  );

  const onCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (pourRef.current !== null || won || showLevels) return;
      const canvas = canvasRef.current;
      if (canvas === null) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

      const current = puzzleRef.current;
      const layout = layoutBottles(
        current.bottles.length,
        current.capacity,
        canvas.width,
        canvas.height,
      );
      const index = hitTest(layout, x, y);
      if (index === null) return;

      const chosen = selectedRef.current;
      if (chosen === null) {
        if (current.bottles[index].length > 0) setSelected(index);
        return;
      }
      if (chosen === index) {
        setSelected(null);
        return;
      }
      if (canPour(current, chosen, index)) {
        commitMove({ from: chosen, to: index });
      } else {
        shakeRef.current = { index, t: 0 };
        setSelected(current.bottles[index].length > 0 ? index : null);
      }
    },
    [commitMove, showLevels, won],
  );

  const step = useCallback(() => {
    const pour = pourRef.current;
    if (pour !== null) {
      const next = advance(pour, FIXED_DT);
      if (isDone(next)) {
        pourRef.current = null;
        beforeRef.current = null;
        setBusy(false);
        if (isSolved(puzzleRef.current)) setWon(true);
      } else {
        pourRef.current = next;
      }
    }

    const hinted = hintRef.current;
    if (hinted !== null) {
      const t = hinted.t + FIXED_DT;
      hintRef.current = t > HINT_DURATION ? null : { ...hinted, t };
    }

    const shake = shakeRef.current;
    if (shake !== null) {
      const t = shake.t + FIXED_DT;
      shakeRef.current = t > 0.35 ? null : { ...shake, t };
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const current = puzzleRef.current;
    const layout = layoutBottles(
      current.bottles.length,
      current.capacity,
      canvas.width,
      canvas.height,
    );

    const state: DrawState = {
      puzzle: current,
      before: beforeRef.current,
      pour: pourRef.current,
      selected: selectedRef.current,
      hinted:
        hintRef.current === null
          ? null
          : { from: hintRef.current.move.from, to: hintRef.current.move.to },
      symbols: symbolsRef.current,
      shake: shakeRef.current,
    };

    drawScene(ctx, layout, state, canvas.width, canvas.height);
  }, []);

  useGameLoop({ step, draw, fixedDt: FIXED_DT, running: true, speed: save.speed });

  // Size the backing store to the element's CSS box at device resolution.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Record the score once, when the level is first cleared.
  useEffect(() => {
    if (!won) return;
    setSave((s) => {
      const prev = s.movesByLevel[s.level];
      if (prev !== undefined && prev <= moves) return s;
      return { ...s, movesByLevel: { ...s.movesByLevel, [s.level]: moves } };
    });
  }, [won, moves]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1];
      setPuzzle(clonePuzzle(previous));
      setMoves((m) => Math.max(0, m - 1));
      setSelected(null);
      setWon(false);
      return h.slice(0, -1);
    });
  }, []);

  const showHint = useCallback(() => {
    const move = solveHint(puzzleRef.current);
    hintRef.current = move === null ? null : { move, t: 0 };
  }, []);

  const addBottle = useCallback(() => {
    setPuzzle((p) => ({ ...p, bottles: [...p.bottles.map((b) => [...b]), []] }));
    setAddedBottle(true);
    setSelected(null);
  }, []);

  const bestMoves = useMemo(
    () => save.movesByLevel[save.level] ?? null,
    [save.movesByLevel, save.level],
  );

  return (
    <main className="min-h-dvh bg-[#0d0a15] px-4 py-6 text-[#f8f0e0]">
      <div className="relative mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link
            href="/game"
            className="text-[10px] uppercase tracking-widest opacity-60"
          >
            &larr; Arcade
          </Link>
          <h1 className="text-sm font-bold uppercase tracking-[0.3em]">
            Potion Sort
          </h1>
          <span className="w-14" />
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={onCanvasPointerDown}
          className="h-[60vh] w-full touch-none border-4 border-[#f8f0e0] bg-[#0d0a15] shadow-[4px_4px_0_0_#000]"
          style={{ imageRendering: "pixelated" }}
        />

        <Hud
          level={save.level}
          moves={moves}
          best={save.best}
          speed={save.speed}
          symbols={save.symbols}
          canUndo={history.length > 0}
          canAddBottle={!addedBottle}
          busy={busy}
          onUndo={undo}
          onReset={() => loadLevel(save.level)}
          onHint={showHint}
          onAddBottle={addBottle}
          onToggleSpeed={() =>
            setSave((s) => ({ ...s, speed: nextSpeed(s.speed) as Speed }))
          }
          onToggleSymbols={() => setSave((s) => ({ ...s, symbols: !s.symbols }))}
          onOpenLevels={() => setShowLevels(true)}
        />

        {won && (
          <WinBanner
            level={save.level}
            moves={moves}
            bestMoves={bestMoves}
            onNext={() => loadLevel(save.level + 1)}
            onReplay={() => loadLevel(save.level)}
          />
        )}

        {showLevels && (
          <LevelSelect
            best={save.best}
            current={save.level}
            movesByLevel={save.movesByLevel}
            onPick={(level) => {
              setShowLevels(false);
              loadLevel(level);
            }}
            onClose={() => setShowLevels(false)}
          />
        )}
      </div>
    </main>
  );
}

void totalDuration;
```

- [ ] **Step 5: Typecheck and test**

Run: `npx tsc --noEmit && pnpm test`
Expected: no type errors; every suite green

- [ ] **Step 6: Commit**

```bash
git add app/sort
git commit -m "feat(sort): wire potion sort page, hud, and level select"
```

---

### Task 12: Verify end to end

**Files:** none created — this task is verification.

- [ ] **Step 1: Full suite**

Run: `pnpm test`
Expected: all suites pass. Record the total count; it should be roughly 167 baseline + ~94 new.

- [ ] **Step 2: Production build**

Run: `pnpm build`
Expected: success, and `out/game/index.html`, `out/sort/index.html`, `out/bounce/index.html` all exist. Confirm with `ls out/game/index.html out/sort/index.html out/bounce/index.html`.

- [ ] **Step 3: Play it**

Run: `pnpm dev` and open `http://localhost:1315/game`.

Check each of these by hand:
1. Dashboard shows four cabinets; Bouncedex and Potion Sort are live, Traffic Jam and Shelf Sort are dimmed with a "Soon" tag.
2. `/bounce` bounces to `/game`.
3. `/sort` renders bottles with coloured liquid and glyphs.
4. Tapping a bottle lifts it; tapping a legal target plays the full lift → travel → tilt → stream → untilt → return sequence and the liquid transfers.
5. Tapping an illegal target shakes it instead of pouring.
6. Input is ignored mid-animation.
7. UNDO reverses a pour; RESET restarts the level; HINT flashes two bottles; +FLASK adds an empty bottle once.
8. Clearing a level shows the banner; NEXT advances and the level number persists across a page reload.
9. Level select opens from the level number and lists every beaten level.

- [ ] **Step 4: Fix what the play-test finds, then commit**

```bash
git add -A
git commit -m "fix(sort): address play-test findings"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Routes, `/bounce` redirect | 3 |
| File moves (`_shared`, `rng`, `save`) | 1 |
| `storage.ts` extraction | 2 |
| Registry with `href` | 3 |
| Service worker precache | 3 |
| Core state and rules | 4 |
| Palette + glyphs | 4 |
| Solver, canonical key, node cap, hint | 5 |
| Generation, triviality rejection, fallback | 6 |
| Difficulty curve | 6 |
| Pour animation phase machine | 7 |
| Commit-on-click, input lock, fractional fill | 7, 10, 11 |
| Interaction (tap-select, shake) | 11 |
| Assists (undo, reset, hint, +bottle) | 11 |
| Persistence | 8, 11 |
| Layout + hit-testing | 9 |
| Canvas painting | 10 |
| Testing table | 4–9 |
| Manual verification gate | 12 |

No gaps.

**Placeholder scan:** none — every step carries runnable code or an exact command.

**Type consistency:** `Puzzle`, `Move`, `Bottle`, `LevelParams` are defined once in Task 4 and used unchanged thereafter. `Pour` and `PhaseName` come from Task 7 and are consumed by Tasks 10 and 11 with matching shapes. `Layout`/`BottleLayout` from Task 9 match `drawScene`'s parameters in Task 10. `SortSave` from Task 8 matches the state shape in Task 11. `StorageLike` is defined once in Task 2 and re-exported by bouncedex's `save.ts` for compatibility with its existing tests.
