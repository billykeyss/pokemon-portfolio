# CRITTER KNIGHT — Design Spec

**Date:** 2026-08-01
**Status:** Approved, ready for implementation planning
**Route:** `/knight`

## Overview

CRITTER KNIGHT is a top-down hack-and-slash roguelite for the `/game` arcade:
offline, frontend-only, portrait mobile, one thumb. You play as a critter from
the arcade's shared roster, fight room to room through a procedurally generated
dungeon, and evolve mid-run. It stands alone: its own save, its own progression.

Reference point: Supercell-adjacent mobile roguelite *Soul Knight* — room-by-room
dungeons where clearing every enemy unlocks the doors, auto-aim so the player
never fights the controls, per-run weapon pickups, and meta-progression kept
across runs. Two things about Soul Knight deliberately do **not** transfer: it is
a landscape twin-stick game, and it ships 300+ weapons. This is portrait,
one-thumb, and carries ~12 hand-tuned weapons instead.

## Goals

- Playable one-handed in portrait, offline, on a phone.
- Reads as hack-and-slash: closing distance, swinging, getting hit, killing
  things in a satisfying way.
- Graphics and animation are a first-class requirement, not a finishing pass.
- Reuses the existing critter roster, evolution lines, sprite pipeline and
  `_shared` arcade modules rather than duplicating them, while keeping its own
  save so it stands alone.
- Runs of roughly 5–8 minutes.

## Non-Goals

- No backend, no network at runtime, no accounts.
- No multiple playable heroes (your critter *is* the hero).
- No weapon merging, no lobby/furniture meta-progression.
- No landscape support, no gamepad.
- No frame-by-frame authored sprite animation (see "Animation").

## Standalone, but the same cast

CRITTER KNIGHT is **its own game with its own save**. It does not read or write
BOUNCEDEX's progress, and neither game can corrupt or gate the other. A player
who never touches BOUNCEDEX is missing nothing here.

What the two share is *cast*, not *state*: the critter roster — names, colours,
behavior tags, and evolution lines — is reference data both games read. To keep
that from becoming a hidden dependency between two games, the roster moves to
`app/game/_shared/critters.ts`, and BOUNCEDEX imports it from there. Neither
game owns the other's data, and a balance change in one cannot silently reshape
the other's save.

Each game keeps its own Dex under its own storage key.

## Controls

**Drag anywhere to move.** The hero tracks the thumb with a short smoothing
delay so movement feels weighty rather than teleporting.

**Stop moving and you attack**, automatically, at the nearest enemy in range.

That single rule is the whole skill: spacing. When to close, when to retreat,
and — critically — when to stand still long enough to actually land a swing
while something is winding up to hit you. There is no attack button, no
joystick, and nothing to learn.

## Combat

### Your critter's behavior is its fighting style

The roster already tags every critter with a `BehaviorTag`. Those tags become
combat styles, so 42 critters carry real variety with no new content authoring:

| Tag | Fighting style |
| --- | --- |
| `standard` | Balanced swing |
| `heavy` | Slow, wide, high knockback |
| `light` | Fast flurry, low damage per hit |
| `sticky` | Applies a burn that ticks after the hit |
| `splitter` | Every swing hits twice |
| `ghost` | Brief invulnerability on the dodge window after a swing |
| `magnet` | Pulls enemies toward you before striking |
| `bomb` | Kills detonate for area damage |

### Weapons

~12 hand-tuned weapons, dropped by rooms and swapped on pickup, kept for the
run. A weapon changes the *shape* of an attack, never just its numbers: reach,
arc width, wind-up, recovery, knockback, and hit count. Examples: broad sweep,
fast dagger, heavy hammer, spear thrust, boomerang.

Weapon and behavior compose. A `heavy` critter with a dagger is a different
animal from a `light` critter with a hammer.

### Health and damage

The hero has hearts. Enemy contact and enemy projectiles cost one. Brief
invulnerability follows a hit so a crowd cannot chain-delete you. Death ends the
run.

## Rooms

Clear every enemy in a room to unlock its doors, then choose an exit. Rooms are
procedurally generated per run: layout, obstacles, and enemy mix. Every fifth
room is a boss.

Between rooms, the run offers a **1-of-3 upgrade choice** — the same system
already proven in BOUNCEDEX, and the same `RunMods`-style pattern where every
modifier must be read by the simulation or a test fails.

## Evolution

Land enough hits and your critter evolves **mid-fight**, with the two-way
branching choice from its line. The branch is asked **once per critter line per
run**; any later evolution down a decided line happens silently. This is not a
guess — it is the fix BOUNCEDEX needed after prompting on every evolution buried
the player in identical dialogs.

Evolving heals a little, changes your sprite, and shifts your fighting style if
the evolved form carries a different behavior tag. It is the mid-run power spike.

## Animation

**This is a first-class requirement.** Two approaches were considered:

1. **AI-generated animation frames.** Rejected. Diffusion models are unreliable
   at frame-to-frame consistency — four requested walk frames typically return
   four subtly different characters (proportions, armor, palette drift). That is
   tolerable for static sprites and fatal for a character the eye tracks
   continuously. *This was not empirically tested; the image-model quota was
   exhausted at design time. If it is retested later and proves consistent, the
   renderer can adopt real frames without touching the simulation.*

2. **One AI sprite per entity, animated procedurally.** Chosen. Guaranteed
   consistent (it is the same sprite being transformed), cheap to retune, and
   testable as pure functions of time.

### The animation vocabulary

| State | Treatment |
| --- | --- |
| Idle | Slow vertical bob, slight breathing squash |
| Walk | Faster bob, horizontal squash-and-stretch, tilt into travel direction |
| Attack | Wind-up pull-back, lunge along the swing, recovery ease-out |
| Hit | White flash, knockback impulse, brief hit-stop |
| Death | Squash then pop into shards |

Effects — slash arcs, impact bursts, dust puffs, screen shake — are drawn in
code, where they are sharper and more controllable than generated art.

Animation state is derived from simulation state (velocity, attack phase, tick
of last hit), not stored separately, so it cannot desynchronise from the game.

## Architecture

The split that made BOUNCEDEX debuggable, repeated deliberately:

```
app/knight/
├─ page.tsx                route entry + React shell
├─ engine/                 pure: no React, no DOM, no canvas
│  ├─ types.ts             Entity, Room, Weapon
│  ├─ world.ts             world state + fixed-step advance
│  ├─ combat.ts            swings, damage, knockback, evolution triggers
│  ├─ ai.ts                enemy steering and attack decisions
│  ├─ rooms.ts             procedural room generation
│  └─ balance.test.ts      headless harness: plays full runs
├─ data/
│  ├─ weapons.ts           the ~12 weapons
│  ├─ enemies.ts           enemy archetypes
│  └─ upgrades.ts          the upgrade pool
├─ render/
│  ├─ draw.ts              canvas painting from world state
│  └─ anim.ts              pure pose functions: (state, tick) -> transform
└─ ui/                     HUD, choice modals, run summary
```

Reused from `app/game/_shared`: `rng`, `storage`, `speed`, `useGameLoop`,
`useSprites`, `pixel-ui`, `pixelGrid`, `registry`, and `critters` — the roster,
behavior tags, and evolution lines, promoted out of BOUNCEDEX so both games
read it as shared reference data and neither depends on the other.

Moving the roster is a required first step, not an optional tidy-up: leaving it
under `app/bounce/bouncedex/data/` would make every CRITTER KNIGHT balance change
a change to BOUNCEDEX's source tree.

**The engine boundary is the point.** A pure fixed-timestep simulation is what
let a headless harness play thousands of BOUNCEDEX runs and catch the
enemy-resurrection bug, the combo runaway, and the empty-arena balance failure —
none of which typechecking or unit tests on their own would have found. The same
harness pattern applies here: run generation, enemy AI, and difficulty pacing are
exactly the kind of thing that looks fine in isolation and is broken in motion.

`anim.ts` is pure for the same reason: a pose is a function of state and time, so
it can be tested without a browser.

## Error handling

- Corrupt or unreadable save: fall back to a fresh default rather than crashing.
  Never let a bad save brick the route.
- Canvas context unavailable: render a message instead of throwing.
- Simulation guard: clamp velocities and positions; an entity that escapes the
  room bounds is repositioned, not allowed to corrupt the world.
- React error boundary around the route.

## Testing

Vitest, as in the rest of the arcade. Priority targets, all pure by design:

- `world.ts` — fixed-step advance is deterministic: same seed and inputs produce
  identical state.
- `combat.ts` — damage, knockback, invulnerability windows, evolution triggers,
  and the once-per-line branch rule.
- `ai.ts` — enemies approach, keep spacing, and never leave the room.
- `rooms.ts` — generated rooms are always completable: reachable exits, no enemy
  spawned inside an obstacle, deterministic per seed.
- `weapons.ts` / `upgrades.ts` — every field is read by the simulation, enforced
  by a source scan as in BOUNCEDEX.
- `anim.ts` — poses are continuous and bounded at every phase of every state.
- `balance.test.ts` — full auto-played runs land in the target length, rooms stay
  clearable, and the hero neither dies instantly nor becomes untouchable.

Canvas output is verified by eye, which is acceptable precisely because `draw.ts`
decides nothing.

## Open implementation-time decisions

Tuning values, deliberately deferred: the exact weapon stats, enemy archetype
stats, the upgrade pool contents, and the difficulty curve. These are knobs to be
played and retuned against the harness, not unknowns.

## Out of scope for v1

- Sound.
- Any shared progression between the two games. They stay independent saves; a
  combined collection view could come later if it is ever wanted.
- A link from the resume page.
- Any game beyond CRITTER KNIGHT (the arcade registry already accepts new
  entries).
