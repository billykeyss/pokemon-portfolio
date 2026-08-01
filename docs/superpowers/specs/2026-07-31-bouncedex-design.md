# BOUNCEDEX — Design Spec

**Date:** 2026-07-31
**Status:** Approved, ready for implementation planning

## Overview

BOUNCEDEX is an offline, frontend-only, portrait-mobile browser game: a physics
ricochet roguelite where you launch critters into an arena, chain damage off
bounces, and defend your nest from descending waves. It ships as a new route in
the existing `pokemon-resume` Next.js site, under a small arcade hub at
`/bounce` designed to host additional games later.

Reference point: Farlight Games' *Clash of Critters*, which hybridizes tower
defense, creature collection, and pinball physics. BOUNCEDEX borrows the
physics-launch combat and the creature collection, and deliberately discards the
free-to-play scaffolding (gacha currency, energy timers, daily quests, seasons,
duplicate-farming).

## Goals

- Playable one-handed in portrait, offline, on a phone.
- Fully automatic by default; manual aiming always available and always better.
- Three hooks, in priority order: **collecting critters**, **escalating power
  fantasy**, **spectacle of the fight**.
- Runs of 4–6 minutes with no session commitment.
- Structured so a second and third game cost dramatically less than the first.

## Non-Goals

- No backend, no network calls at runtime, no accounts, no leaderboards.
- No multiplayer.
- No monetization scaffolding of any kind.
- No permanent stat-upgrade tree (see "Progression philosophy").
- No landscape support.

## Progression philosophy

The single most important constraint: **losing must not be progress.** Eggs earned
from runs buy *critters only* — never stats. A permanent stat tree would turn a
game played by one person into a treadmill where the optimal move is to lose
quickly and repeatedly.

All snowballing lives *inside* a single run. Across runs, the only thing that
grows is variety: more critters, more evolution branches, more ways a run can go.

## Gameplay

### Screen layout (portrait)

```
┌──────────────────────┐
│ WAVE 7    ♥♥♥♡♡  ×12 │  status bar: wave, nest HP, combo
│──────────────────────│
│  🧟   🧟🧟    🧟     │  enemies descend
│     🧟      🧟       │
│ ·  ·  ·  ·  ·  ·  ·  │
│   🔥      💧         │  settled critters act as bumpers
│ ·  ·  ·  ·  ·  ·  ·  │
│        🌿            │
│      ╱               │  aim arc with predicted bounces
│    ╱                 │
│ ▔▔▔▔[⚡]▔▔▔▔▔▔ │  launcher + nest
│ NEXT: 🌿 🔥 💧  AUTO●│  queue + auto toggle
└──────────────────────┘
```

### The launch mechanic

A critter is a physics body launched from the bottom launcher. It ricochets off
walls, off enemies, and off previously-settled critters, dealing damage on every
impact and losing energy with each bounce. When its velocity drops below a
threshold it **settles**, becoming a permanent bumper for the rest of the run: it
plinks at enemies in its lane, and future launches carom off it.

This single mechanic produces the whole escalation curve. The arena densifies as
a run progresses, so late-run shots pinball off a dozen of the player's own
critters for large chains. Power fantasy and spectacle share one curve and do not
need separate balancing.

### Auto and manual

- **Auto is the default.** A timer fires the front-of-queue critter roughly every
  2.5s at an angle chosen by a simple aiming heuristic.
- **Touching the lower screen takes over.** An aim arc appears showing the launch
  vector and 1–2 predicted bounces. Release fires. Taking manual control cancels
  the pending auto shot.
- **Releasing control returns to auto** after ~3s of no touch.
- An explicit `AUTO` toggle pins the mode on or off.

The aiming heuristic must be deliberately mediocre: it targets the nearest
threatening enemy with a direct-ish shot and never plans bank shots. This makes
idle play viable and deliberate play meaningfully better, with no obligation
either way. This is a design requirement, not an implementation shortcut.

### Combo

Each enemy struck within a single launch increments a combo multiplier applied to
that launch's damage. Chains of 5+ escalate feedback: screen shake, brief
slow-motion, larger damage numerals. The combo resets when the critter settles.

### Enemies

Descend through five lanes toward the nest; reaching the nest costs nest HP.

| Type | Behavior |
| --- | --- |
| Basic | straightforward descent |
| Armored | requires multiple impacts; shrugs off low-energy hits |
| Fast | descends quickly, low HP |
| Splitter | divides into two smaller enemies when killed |
| Boss | every 10 waves; large, multi-phase HP bar |

### Run structure

Waves escalate in count and mix. Every 5 waves the run pauses for a **1-of-3
upgrade choice** (launch power, extra queue slot, faster auto-fire, higher wall
restitution, critters detonate on settle, etc.). When nest HP reaches zero the
run ends with a summary: waves cleared, best combo, eggs earned.

Under `AUTO`, an unanswered upgrade choice auto-selects after a few seconds.

### Critters

~14 critters at launch. Each is defined by a **physics behavior**, not a stat
line — this is what makes collection change how the game plays.

| Critter | Behavior |
| --- | --- |
| Heavy | high mass, low restitution, bulldozes through clusters |
| Light | hyper-elastic, many ricochets |
| Sticky | latches onto first enemy, applies damage over time |
| Splitter | bursts into three bodies on first impact |
| Ghost | phases through the first body it contacts |
| Magnet | curves mid-flight toward the nearest enemy |
| Bomb | detonates in a radius when it settles |

(Remaining critters follow the same pattern; the full roster is an
implementation-time data authoring task, not a design blocker.)

Before a run the player picks three unlocked critters for the queue; remaining
queue slots fill randomly from the unlocked set.

### Evolution

A **settled** critter that has *dealt* ~8 hits (via its lane plinking and via
enemies caroming off it) evolves in place: white flash, silhouette morph, jingle.
It becomes a larger, stronger bumper with an upgraded behavior. Damage taken is
irrelevant — only damage dealt counts toward the threshold.

Each critter evolves **once per run**, at a single branching step. There is no
third stage; a two-step line would multiply the Dex to ~98 entries and require
authoring four distinct forms per critter, which is not worth the content cost
for v1.

Evolution rewards deliberate placement — a critter only evolves if it was landed
somewhere busy. Auto-fire reaches evolutions eventually; aimed play reaches them
much faster.

**Branching.** The evolution presents a choice of two forms. Like the upgrade
choice, it briefly pauses the run:

```
        ┌─ BLAZE     +damage, ignites on hit
   EMBER ┤
        └─ CINDER    splits into 2 on every bounce
```

Under `AUTO`, an unanswered branch choice auto-selects after a few seconds.

**Dex entries unlock through play.** The first time a form is evolved into during
a run, it is permanently recorded in the Dex. A 14-critter roster therefore
yields ~42 entries — 14 base forms plus two branch forms each. Completion comes
from playing well and varying branch choices — never from farming duplicates.

Evolved forms **cannot** be selected as run starters. Discovery is the reward, and
starting evolved would flatten the run curve.

## Architecture

### Routes

```
/bounce                    arcade hub (cabinet-select screen)
/bounce/bouncedex          game #1
```

Both are static-exported. The existing `render.yaml` rewrite (`/*` →
`/:splat.html`) already serves nested extensionless routes correctly, so **no
deploy configuration changes are required.**

### File layout

```
app/bounce/
├─ page.tsx                 hub, renders itself from the registry
├─ _shared/                 written once, reused by every future game
│  ├─ registry.ts           game metadata list
│  ├─ save.ts               versioned localStorage read/write
│  ├─ useGameLoop.ts        fixed-timestep rAF loop, auto-pauses on blur
│  └─ pixel-ui.tsx          pixel buttons, dialog boxes, meters
└─ bouncedex/
   ├─ page.tsx              route entry, React shell
   ├─ engine/               pure, no React, no DOM
   │  ├─ physics.ts         integration + collision resolution
   │  ├─ sim.ts             world state, fixed-step advance
   │  ├─ combat.ts          damage, combo, evolution triggers
   │  └─ waves.ts           wave composition per index
   ├─ data/
   │  ├─ critters.ts        roster + behaviors + evolution branches
   │  └─ upgrades.ts        upgrade pool
   ├─ render/
   │  └─ draw.ts            canvas draw from world state
   └─ ui/                   HUD, choice modals, run summary, dex
```

The boundary that matters: **`engine/` is pure and knows nothing about React,
canvas, or the DOM.** It takes world state plus input and returns new world
state. `render/draw.ts` reads world state and paints. This makes the simulation
unit-testable without a browser, and keeps the files small enough to reason about
individually.

Deleting `app/bounce/bouncedex/` removes the game completely. Adding game #2
means a new sibling folder plus one entry in `registry.ts`; it inherits the hub
listing, save system, loop, and pixel UI.

### Rendering

**Canvas 2D for the arena, React for everything else** (HUD, modals, hub, dex).
DOM nodes cannot sustain 60fps with dozens of moving bodies; React is the right
tool for menus. The canvas is a single React-managed element that the engine
draws into imperatively.

Art is pixel-styled to match the existing site, using `image-rendering: pixelated`
(already present in `globals.css`). Critters render as chunky pixel sprites drawn
procedurally — no external art assets.

### Physics

**Hand-rolled, not a library.** Requirements are narrow: circle-vs-circle and
circle-vs-wall elastic collision with per-body restitution and mass. That is a
few hundred lines. A library like matter.js costs ~90kb gzipped on a route that
must load fast on mobile, and — more importantly — game feel here *is* the
bounce tuning, so direct control over restitution, damping, and settle thresholds
is worth more than generality.

**Fixed timestep** (e.g. 1/120s) with an accumulator, decoupled from render
frames. This keeps the simulation deterministic and frame-rate independent, which
matters both for fairness across devices and for testability.

Performance guard: cap total simultaneous bodies, and cull or merge settled
critters if the count exceeds budget. Target 60fps on a mid-range phone.

### Save and offline

`localStorage` under a single versioned key, holding: unlocked Dex entries, egg
count, best run stats, selected starters, and settings. The schema carries a
version integer and a migration path so a later format change does not wipe
existing progress.

**True offline** (airplane mode, not merely "no requests at runtime") requires a
service worker. Ship a minimal one in `public/` that precaches the `/bounce`
route assets, plus a web app manifest so the game can be added to the home screen
and launched fullscreen. Without this, loading the URL offline fails outright.

### Mobile input handling

Touch handlers must `preventDefault` to suppress page scroll, pull-to-refresh,
and double-tap zoom during play. Lock the play surface against text selection.
The game loop pauses on tab blur and on `visibilitychange`.

Respect `prefers-reduced-motion` by damping screen shake and slow-motion effects
while leaving gameplay identical.

## Error handling

- **Corrupt or unreadable save:** catch, log, fall back to a fresh default save
  rather than crashing the route. Never let a bad save brick the game.
- **Canvas context unavailable:** render a plain message instead of throwing.
- **Simulation guard:** clamp velocities and positions; a body that escapes the
  arena bounds is removed rather than allowed to corrupt the world.
- **React error boundary** around the game route so a crash shows a "return to
  arcade" screen instead of a blank page.

## Testing

The repo currently has **no test framework**; the implementation plan must add
one. Vitest is the fit — fast, TypeScript-native, no browser required for the
pure modules.

Priority targets, all of which are pure functions by design:

- `physics.ts` — collision resolution, restitution, settle threshold.
- `sim.ts` — fixed-step advance is deterministic: same seed and inputs produce
  identical world state.
- `combat.ts` — damage application, combo accumulation, evolution trigger at the
  hit threshold.
- `waves.ts` — wave composition is well-formed and escalates.
- `save.ts` — round-trip, and migration from an older schema version.

Rendering and React UI are verified manually on a phone; they are not worth
unit-testing here.

## Open implementation-time decisions

These are authoring tasks, deliberately deferred out of the design:

- The full 14-critter roster and their exact tuning values.
- The upgrade pool contents.
- Wave composition curve and boss design specifics.

## Out of scope for v1

- Games beyond BOUNCEDEX (the hub is built to accept them; none are designed).
- Sound, beyond the evolution jingle and basic impact blips.
- Any link or entry point from the resume page — added once the game is good.
