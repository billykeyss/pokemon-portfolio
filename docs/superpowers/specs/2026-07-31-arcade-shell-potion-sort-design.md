# Arcade Shell + Potion Sort — Design

Date: 2026-07-31
Status: approved
Scope: sub-projects **P0** (arcade shell) and **P1** (Potion Sort)

## Context

The site already ships one game: `/bounce/bouncedex`, fronted by a hub page at
`/bounce` that reads a registry. Three more games are wanted — a water-sort
puzzle, a traffic-jam puzzle, and a shelf organizer — plus a top-level `/game`
dashboard.

That is too much for one spec, so the work is decomposed:

| # | Sub-project | Route | Depends on |
|---|---|---|---|
| **P0** | Arcade shell | `/game`, `/bounce` → redirect | — |
| **P1** | Potion Sort | `/sort` | P0 |
| P2 | Sprite pipeline (AI-generated art) | — | — |
| P3 | Traffic Jam | `/traffic` | P0, P2 |
| P4 | Shelf Organizer | `/shelf` | P0, P2 |

**This document covers P0 and P1 only.** P2–P4 get their own spec → plan →
implementation cycles.

### Why P1 needs no art

Potion Sort is drawn procedurally on canvas — rectangles, a stream, chunky
borders. It exercises the engine-plus-animation pattern that P3 and P4 will
reuse, without blocking on the art pipeline. That is why it is sequenced first.

### On shared code

P1, P3, and P4 genuinely share structure: seeded RNG, an undo stack, a solver
harness, save plumbing, an animation phase machine. That shared core is **not**
built up front. P1 builds it concretely; the seam gets extracted when P3 is a
real second consumer. One consumer is guesswork, two is knowable.

## P0 — Arcade shell

### Routes

| Route | Behaviour |
|---|---|
| `/game` | Dashboard. Renders one cabinet per registry entry. |
| `/bounce` | Client-side redirect to `/game`, with a visible link as the no-JS fallback. |
| `/bounce/bouncedex` | Unchanged. Existing links keep working. |
| `/sort` | Potion Sort (P1). |

`output: "export"` is set in `next.config.js`, so there is no server to issue a
301. `/bounce` therefore calls `router.replace("/game")` in an effect and also
renders a plain link, so the page is not a dead end without JavaScript.

### File moves

`app/bounce/_shared/` becomes `app/game/_shared/`. A top-level `/sort` route
importing from `/bounce` would misrepresent ownership; the shared chrome belongs
to the arcade, not to the bounce family. `_shared` keeps its underscore prefix,
so Next's App Router excludes it from routing.

```
app/game/_shared/
  registry.ts      entries gain `href` and `blurb`
  pixel-ui.tsx     unchanged
  useGameLoop.ts   unchanged
  speed.ts         unchanged
  rng.ts           moved up from app/bounce/bouncedex/engine/rng.ts
  storage.ts       new — generic StorageLike + safe JSON load/write
```

Two further moves keep ownership honest:

- `rng.ts` moves **up** from `bouncedex/engine/` to `_shared/`. Two consumers now
  need seeded randomness. Its existing tests move with it.
- `save.ts` moves **down** from `_shared/` into `bouncedex/`. Its schema
  (`eggs`, `dex`, `starters`, `bestWave`…) is bouncedex-specific and was never
  shared. Only the generic plumbing — the try/catch around `getItem`, the
  JSON parse, the fall-back-to-defaults discipline — is extracted into
  `storage.ts`, which both bouncedex and Potion Sort then use.

`app/bounce/error.tsx` updates its "back to arcade" link to `/game`.

### Registry

```ts
export interface ArcadeGame {
  slug: string;      // stable id, used as a React key
  title: string;
  tagline: string;
  href: string;      // absolute route — games are no longer forced under /bounce
  accent: string;    // hex, drives the cabinet chip
  available: boolean;
}
```

The change from a `/bounce`-relative slug to an absolute `href` is what lets
games live at any top-level route.

Entries at the end of P1:

| slug | href | available |
|---|---|---|
| `bouncedex` | `/bounce/bouncedex` | true |
| `potion-sort` | `/sort` | true |
| `traffic` | `/traffic` | **false** |
| `shelf` | `/shelf` | **false** |

The two unbuilt games render as dimmed cabinets through the existing
`available: false` path, so the roadmap is visible from the dashboard.

### Service worker

`/bounce/page.tsx` currently registers `/sw.js`. That registration moves to
`/game/page.tsx`, and `public/sw.js`'s precache list gains the new routes.

## P1 — Potion Sort

### Concept

Classic water-sort. Bottles hold stacked units of coloured liquid. Pouring moves
the top run of one bottle onto a matching top in another, or into an empty
bottle. Win when every colour is gathered in a single full bottle.

Reskinned as Poké-Mart potions: liquids use Pokémon type colours, chrome reuses
the existing pixel panel and button components.

### File layout

```
app/sort/
  page.tsx
  engine/                 pure TypeScript — no React, no canvas, no DOM
    types.ts              Puzzle, Move, Bottle, LevelParams
    rules.ts              canPour, pourCount, applyMove, isSolved, legalMoves
    solve.ts              canonical-dedup DFS with a node cap
    generate.ts           seeded deal + solvability verification
    level.ts              levelFor(n), memoized; difficulty curve
    anim.ts               pour phase machine (pure timing math)
    palette.ts            12 type colours + glyphs
    save.ts               Potion Sort save schema
  render/
    layout.ts             bottle rects + hit-testing (pure)
    draw.ts               canvas painting
  ui/
    Hud.tsx  LevelSelect.tsx  WinBanner.tsx
```

The split matters: everything in `engine/` and `render/layout.ts` is pure and
unit-tested. Only `render/draw.ts` touches a canvas context, and it is verified
by playing the game rather than by assertion.

### Core state

```ts
type Bottle = number[];   // index 0 = bottom; values are palette indices
interface Puzzle {
  bottles: Bottle[];
  capacity: number;       // units per bottle; 4
  colors: number;         // distinct colours in play
}
interface Move { from: number; to: number }
```

Each colour contributes exactly `capacity` units, so a solved bottle is always
full.

### Rules

- `topRun(bottle)` → `{ color, count }` — the contiguous run at the top.
- `canPour(p, from, to)` — `from` non-empty, `from !== to`, `to` has space, and
  `to` is empty or its top colour matches `from`'s top run.
- `pourCount(p, from, to)` = `min(topRun(from).count, capacity - to.length)`.
  The top run is poured as a unit, clamped by available space.
- `applyMove(p, move)` returns a **new** `Puzzle`. Immutability is not a style
  preference here — undo and the solver both depend on cheap snapshots.
- `isSolved(p)` — every bottle is either empty or full and monochrome.
- `legalMoves(p)` — all legal moves, with three prunes: never pour out of a
  completed bottle; when several destination bottles are empty, offer only the
  first, since empty bottles are interchangeable; and never pour a bottle that
  is already monochrome into an empty bottle, which accomplishes nothing.

### Solver

Iterative depth-first search over the move graph.

- **Canonical key.** Bottle *order* carries no meaning, so a state is encoded by
  sorting the per-bottle encodings and joining them. This collapses large
  symmetric regions of the search space and is the single most important
  optimisation.
- **Visited set** keyed on that canonical string.
- **Move ordering.** Prefer moves that complete a bottle, then moves that empty
  one, then the rest. Finds a solution fast; makes no claim of optimality.
- **Node cap** (200 000 expansions). On exceeding it the solver returns
  `unknown` rather than lying about unsolvability.

```ts
type SolveResult =
  | { status: "solved"; moves: Move[] }
  | { status: "unsolvable" }
  | { status: "unknown" };   // node cap hit
```

An explicit stack is used rather than recursion, so deep searches cannot blow
the JS stack.

The same solver backs the HINT button, run from the live state.

### Generation

Forward deal, then verify — not reverse-shuffle-from-solved. A forward deal
produces states with the statistical character of a real puzzle; reverse
shuffling tends to leave giveaway structure.

1. Build `colors × capacity` units and shuffle with seeded Fisher–Yates.
2. Deal into `colors` full bottles, then append `free` empty bottles.
3. **Reject if trivial**: any starting bottle already monochrome.
4. **Verify**: run the solver. `solved` → accept. `unsolvable` or `unknown` →
   redraw from the next RNG state.
5. After 200 rejected attempts, fall back to reverse-shuffling from a solved
   state, which is solvable by construction. This is a safety valve that should
   effectively never fire; it exists so `levelFor` can never fail.

`seed = hash(level)`, so level N is identical for every player and on every
device. `levelFor(n)` memoizes, because generation is the one expensive call.

### Difficulty curve

```
capacity = 4  (always)
colors   = clamp(3 + floor((level - 1) / 5), 3, 12)
free     = level >= 30 && level % 10 === 0 ? 1 : 2
```

Three colours and two spare bottles at level 1, widening to twelve colours by
level 46 and flat thereafter. From level 30, every tenth level is a squeeze
level with a single spare bottle — still verified solvable, just tighter.

### Pour animation

The animation is a first-class requirement, so its timing lives in a pure,
tested module and the canvas merely reads it.

| Phase | Duration | What happens |
|---|---|---|
| `lift` | 0.12 s | Source rises out of its slot |
| `travel` | 0.18 s | Arcs across to sit above and beside the destination |
| `tilt` | 0.14 s | Rotates to its pouring angle |
| `pour` | 0.10 s × units | Stream draws; fill levels transfer |
| `untilt` | 0.12 s | Rotates upright |
| `return` | 0.14 s | Drops back into its slot |

Key decisions:

- **Logical state commits on click.** The animator interpolates between the
  pre-move snapshot and the already-committed state. Undo, the win check, and
  hints therefore never depend on animation timing — a class of bug that is
  otherwise very easy to introduce and very annoying to find.
- **Input is locked** while an animation runs. Moves are not queued; a tap
  during an animation is ignored.
- **Fractional fill.** During `pour`, the source's top run shrinks and the
  destination's grows by `units × progress`, so flow reads as continuous rather
  than as a stepped jump.
- **Tilt angle is a function of remaining fill** — a fuller bottle tips less,
  matching how pouring actually works.
- The stream is drawn only during `pour`, as a narrow arced column from the
  source's lip to the destination's rim.

`useGameLoop` from `_shared` drives it: `step()` advances the animation clock by
the fixed timestep, `draw()` paints. The existing speed module supplies a 1x/2x
toggle.

### Interaction

Tap-to-select, the standard for this genre:

- Tap a bottle → it lifts slightly and is selected.
- Tap a second bottle → pour if legal; if illegal, the target shakes and the
  selection moves to the new bottle.
- Tap the selected bottle again → deselect.

Hit-testing uses padded rectangles so touch targets stay comfortable on a phone.

### Palette and accessibility

Twelve Pokémon type colours (fire, water, grass, electric, psychic, poison, ice,
dragon, fighting, ground, ghost, steel). At twelve, several read similarly — and
for a colourblind player, colour alone is not a usable distinction. Each liquid
unit therefore also carries a one-character glyph. The glyphs are toggleable and
**on by default**.

### Assists

- **UNDO** — unlimited, backed by a stack of prior `Puzzle` snapshots.
- **RESET** — regenerates the level from its seed and clears the undo stack.
- **HINT** — runs the solver from the current state and flashes the source and
  destination of the first move.
- **+BOTTLE** — appends one empty bottle. Once per level; consumed state resets
  on level change or reset.

### Persistence

Key `game:sort`:

```ts
interface SortSave {
  version: 1;
  level: number;                          // current level
  best: number;                           // highest level reached
  movesByLevel: Record<number, number>;   // best move count per beaten level
  symbols: boolean;                       // glyph overlay on/off
  speed: Speed;
}
```

Same discipline as bouncedex: any corrupt or partial payload coerces to a valid
save. A lost save is bad; a crashed route is worse.

Beating a level advances to the next and records the move count. A level-select
grid lets any beaten level be replayed.

## Testing

Vitest, node environment, tests colocated as `*.test.ts` — matching the existing
convention. The 167 existing tests must stay green through the P0 file moves.

| Module | What is asserted |
|---|---|
| `rules` | `canPour` truth table incl. empty/full/mismatch; `pourCount` clamping; `applyMove` does not mutate its input; `isSolved` edge cases; `legalMoves` pruning |
| `solve` | Solves known-solvable fixtures; reports `unsolvable` for a constructed dead state; respects the node cap; returned move sequence actually reaches a solved state when replayed |
| `generate` | Same level → byte-identical puzzle; levels 1–60 all verify as solvable; no level starts with a monochrome bottle; curve parameters match the formula |
| `anim` | Phase boundaries and total duration; duration scales with unit count; tilt angle is monotonic in fill; fractional transfer conserves total units |
| `layout` | Rects do not overlap and stay inside the canvas; hit-test round-trips the centre of every rect; layout adapts to bottle count |
| `save` | Garbage, partial, and null payloads all migrate to a valid save; round-trip preserves fields |

Not unit-tested: `render/draw.ts`. Canvas painting is verified by running the
game.

**Manual verification gate:** `pnpm dev`, then load `localhost:1315/game`,
open `/sort`, and play several levels — confirming the pour animation reads
correctly, undo/hint/reset behave, and progress survives a reload.

## Risks

**Solver cost at twelve colours.** This is the one thing that could bite.
Canonical dedup plus the node cap should contain it, and generation is memoized
per level so the cost is paid once. If level load stutters in practice, the
fallback is to precompute a table of verified seeds at build time and ship it as
data — moving the search out of the browser entirely.

**Generation blocking the main thread.** Level generation runs synchronously on
load. It should be milliseconds; if measurement says otherwise, a Web Worker is
the escape hatch. Not built pre-emptively.

## Out of scope

Sound. Multiplayer. Leaderboards. Daily challenges. The economy variant of the
assists (coins, shop). The three later sub-projects, P2–P4.
