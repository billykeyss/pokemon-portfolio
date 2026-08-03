# CRITTER KNIGHT — Economy, Gear, Terrain, Monsters, Evolution

**Date:** 2026-08-02
**Status:** approved design, ready for an implementation plan
**Supersedes parts of:** `2026-08-01-critter-knight-slice-2-carryover.md` (slices 2–4 are absorbed here)

## Goal

Turn the level ladder into a run: kill things for coins, spend coins between
rooms on upgrades and gear, bank shards toward a three-stage evolution that
outlives any single run, and fight through rooms that have terrain and more
than one kind of monster in them.

## Non-goals

Sound, online play, and anything requiring a network. The game stays offline,
frontend-only, portrait mobile, one-thumb.

---

## Global Constraints

- `engine/` imports nothing from React, the DOM, or canvas. The balance
  harness depends on this and is the only reason the game's real bugs have
  been findable.
- No `Math.random()` or `Date.now()` in `engine/` or `data/`. All randomness
  comes from `makeRng` (`@/app/game/_shared/rng`), seeded per level.
- Fixed timestep `FIXED_DT = 1/120`. All tick counts are integers at 120Hz.
- `_shared/critters.ts` is NOT modified. BOUNCEDEX's evolve-once rule is built
  on that model; knight owns its own evolution table.
- Every `RunMods` field must be read by the simulation. Enforced by a guard
  test, because an upgrade that silently does nothing is worse than no
  upgrade — the player paid for it.
- Save changes are versioned and migrate losslessly. Progress never walks
  backwards.
- Arena stays `360 × 560`.

---

## Build phases

One spec, but built in an order where each phase leaves the game playable.
A plan should not begin phase N+1 while phase N is unplayable.

1. **Economy core** — coins, purse, shop, stat upgrades, `statsOf`.
2. **Gear** — weapons and armour as a second shop shelf.
3. **Monsters** — archetypes, enemy mix, projectiles.
4. **Terrain** — obstacles, collision, hazards, reachability guard.
5. **Meta** — shards, three-stage branching evolution, checkpoint starts.
6. **Balance** — the multi-personality shopper harness and its re-tune.

Phase 6 is not a cleanup pass. Reach becomes purchasable in phase 1, which
removes the guaranteed floor the current ladder relies on; phase 6 is where
the game is proved winnable again.

---

## Architecture

```
app/knight/
  data/
    enemies.ts      archetype table (expanded)
    upgrades.ts     RunMods, UPGRADES, rollOffers
    gear.ts         WEAPONS, ARMOUR
    evolution.ts    three-stage branching lines (knight-owned)
    terrain.ts      obstacle kinds and their properties
  engine/
    world.ts        World, RunMods on the world, statsOf
    level.ts        RoomSpec: spawns + mix + obstacles; checkpoints
    combat.ts       swing shapes, damage, reach
    ai.ts           chase, standoff, projectile fire
    move.ts         steering, obstacle collision
    terrain.ts      circle-vs-AABB, hazard ticks, reachability
    coins.ts        drops, magnet, purse
    shop.ts         offer rolling, pricing, purchase
    save.ts         v2 payload + migration
  ui/
    Hud.tsx         hearts, purse, level
    Shop.tsx        between-level shop
    Evolve.tsx      shard spending
  render/
    draw.ts         terrain, coins, monsters, gear
```

### The one place stats are computed

Base values, `RunMods`, gear, and the current evolution form all modify the
same handful of numbers. Rather than scatter that arithmetic, one function
owns it:

```ts
export interface Stats {
  reach: number;        // px
  arc: number;          // radians, full width of the swing wedge
  damage: number;
  maxHp: number;
  moveSpeed: number;    // px/sec
  knockback: number;
  windupTicks: number;
  activeTicks: number;
  recoverTicks: number;
  iframeTicks: number;
  coinMult: number;
}

/** Final numbers for the hero: form → gear → mods, in that order. */
export function statsOf(world: World): Stats;
```

Everything in `engine/` reads `statsOf`. Nothing re-derives a stat locally.

---

## Economy

### Coins

Every enemy drops coins on death as physical pickups with a small outward
impulse. They magnet toward the hero within 70px, and **any coin still on
the floor is collected automatically when the room clears** — so a coin can
never be stranded behind terrain or lost to a pit.

| Archetype | Coins |
|---|---|
| grunt | 2 |
| runner | 2 |
| archer | 3 |
| brute | 5 |
| elite | 20 |

Drops are multiplied by `stats.coinMult` and floored, minimum 1.

### Shards

Earned **only for raising your high-water mark**. Clearing level `N`:

```
if (N > save.best) { save.shards += N - save.best; save.best = N; }
```

`best` is monotonic, so replaying cleared levels yields nothing and grinding
level 1 is not a strategy. Shards buy evolution and nothing else.

### Purse lifetime

Coins live on the run. Death wipes them along with every upgrade and every
piece of gear. Shards and evolution survive.

---

## The shop

Appears after each cleared room, replacing today's "+9 reach" modal.

Offers **three upgrade cards and one gear card**, drawn from a per-level seed
so the same room always offers the same shop. A reroll costs 5 coins, rising
by 3 for each further reroll in the same visit. Cards you cannot afford are
shown priced but disabled — seeing what you cannot yet buy is what makes the
next room worth clearing.

### RunMods

Nine fields, each with exactly one consumer:

| Field | Consumer |
|---|---|
| `reachBonus` | `statsOf` → `combat.reachOf` |
| `damageBonus` | `statsOf` → damage application |
| `maxHpBonus` | `statsOf` → `spawnHero` |
| `swingSpeedMult` | `statsOf` → windup/active/recover ticks |
| `moveSpeedMult` | `statsOf` → `move.ts` |
| `knockbackMult` | `statsOf` → knockback impulse |
| `iframeBonus` | `statsOf` → invulnerability window |
| `coinMult` | `coins.ts` drop value |
| `healOnClear` | hearts restored when a room clears, stacked on top of the `BASE_ROOM_HEAL` floor (see "Room-clear healing" below) |

```ts
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Relative draw weight. Reach is the commonest card on purpose. */
  weight: number;
  apply(mods: RunMods): RunMods;
}
```

### Catalogue

| id | name | price | weight | effect |
|---|---|---|---|---|
| `reach` | Long Arm | 10 | 5 | `reachBonus += 8` |
| `damage` | Sharpened | 18 | 3 | `damageBonus += 4` |
| `heart` | Stout | 26 | 3 | `maxHpBonus += 1` |
| `swift` | Quickstep | 20 | 3 | `moveSpeedMult × 1.12` |
| `flurry` | Flurry | 30 | 2 | `swingSpeedMult × 0.85` |
| `heavy` | Heavy Hands | 16 | 2 | `knockbackMult × 1.4` |
| `greed` | Coin Sense | 22 | 2 | `coinMult × 1.35` |
| `ward` | Warded | 24 | 2 | `iframeBonus += 8` |
| `mend` | Mending | 26 | 2 | `healOnClear += 1` |

Reach is cheapest and heaviest-weighted deliberately: with the guaranteed
grant gone, a player who buys without a plan must still drift toward the stat
that keeps the ladder winnable. Phase 6 proves that they do.

**Balance note (set during implementation, not chosen up front):** `reach`
was originally priced 12 and `mend` 34. The level-9 balance harness
(`ladder.test.ts`) retuned `reach` down to 10 so that clearing level one (2
grunts at `COIN_VALUE` 5 each) yields exactly enough for one Long Arm — the
first shop is a decision, not a shrug — and `mend` down to 26 once it stopped
being the run's only source of healing (see "Room-clear healing" below).

### Room-clear healing

**Added during implementation; not in the original design.** Rooms used to
refill the hero to full on every clear, and the ladder's difficulty curve was
tuned against that guarantee. Carrying hp forward between rooms (so
`healOnClear`/Mending could mean anything at all) removed that automatic
refill, and nothing replaced it — the level-9 balance harness found every
shopper personality dying by level 4-5 as a direct result. The fix is a flat
floor, applied at every clear on top of whatever Mending has bought:

```ts
export const BASE_ROOM_HEAL = 1;
```

A cleared room heals `BASE_ROOM_HEAL + mods.healOnClear`, so a run always
recovers at least one heart even with no Mending purchased, and each stack of
Mending adds on top of that floor rather than replacing it.

---

## Gear

Bought with coins, lost at run end. One weapon slot, one armour slot.

```ts
export interface WeaponDef {
  id: string; name: string; price: number;
  reachMult: number; arc: number; damage: number;
  cadenceMult: number;     // scales windup/active/recover
  knockbackMult: number;
}
```

| id | price | reach× | arc | dmg | cadence× | knock× |
|---|---|---|---|---|---|---|
| `sword` | — (starting) | 1.00 | 0.70π | 10 | 1.00 | 1.0 |
| `dagger` | 25 | 0.75 | 0.60π | 6 | 0.60 | 0.7 |
| `spear` | 35 | 1.45 | 0.28π | 11 | 1.05 | 1.1 |
| `hammer` | 45 | 1.15 | 1.00π | 20 | 1.80 | 2.0 |

| armour | price | hearts | move× |
|---|---|---|---|
| `cloth` | — (starting) | +0 | 1.15 |
| `leather` | 30 | +1 | 1.00 |
| `plate` | 50 | +3 | 0.78 |

The spear's narrow arc is the interesting one: it out-ranges everything but
punishes loose aim, which only matters because facing is already simulated.

---

## Monsters

```ts
export interface EnemyDef {
  id: string; name: string;
  hp: number; speed: number; color: string;
  touchDamage: number;
  coins: number;
  /** 0 = full knockback, 1 = immovable. */
  knockbackResist: number;
  ranged: RangedSpec | null;
}

export interface RangedSpec {
  standoff: number;        // px it tries to keep
  intervalTicks: number;
  projectileSpeed: number; // px/sec
  damage: number;
}
```

| id | hp | speed | touch | coins | resist | ranged |
|---|---|---|---|---|---|---|
| `grunt` | 20 | 74 | 1 | 2 | 0 | — |
| `runner` | 12 | 118 | 1 | 2 | 0 | — |
| `brute` | 55 | 46 | 2 | 5 | 0.55 | — |
| `archer` | 16 | 60 | 1 | 3 | 0 | standoff 150, every 264 ticks, 150px/s, 1 |
| `elite` | 140 | 62 | 2 | 20 | 0.35 | — |

These are level-1 values. HP scales per archetype rather than per room:
`def.hp + (level - 1) * 5`. A brute at level 10 is a brute, not a grunt with a
brute's name.

**Balance note (set during implementation, not chosen up front):** phase 1
("economy core") shipped before this archetype table existed, so its interim
room generator (`engine/level.ts`) uses a single grunt-only curve rather than
per-archetype scaling — enemy count `min(14, 1 + ceil(level * 0.55))`, HP
`20 + floor((level - 1) * 3)`. Both started steeper (`1 + ceil(level * 0.9)`
and `(level - 1) * 5` — this table's own number, reused as the interim curve's
starting point) and were retuned down by the level-9 balance harness after a
careless shopper was found dying by level 4-5. The interim generator also
holds its most dangerous spawn shape — a full encirclement (`ring`) — out of
rotation until level 8, so the first surround room lands only once a purse
has had a real chance to grow. When phase 3 replaces this interim curve with
real per-archetype scaling, these tuned numbers are the starting point, not
this section's original `(level - 1) * 5`.

**This changes `RoomSpec`.** A room can no longer carry one `enemyHp`, because
its enemies are no longer one kind:

```ts
export interface Spawn { pos: Vec2; defId: string; hp: number; }

export interface RoomSpec {
  level: number;
  arena: Arena;
  heroStart: Vec2;
  spawns: Spawn[];          // was: Vec2[] plus a single enemyHp
  obstacles: Obstacle[];
}
```

**Mix by level.** Types arrive gradually so each is legible when it appears:

- levels 1–2: grunt only
- 3+: grunt, runner
- 5+: + brute
- 7+: + archer
- every 5th level: + one elite

Elites land on levels 5, 10, 15 while checkpoints sit at 6, 11, 16 — so an
elite is always the gate immediately before a checkpoint. That is deliberate:
the fight you have to win to bank a checkpoint is the memorable one.

Projectiles are a new engine concern: they travel, collide with entities and
pillars, and expire. They are the first thing in this game that damages the
hero from off-contact, which is what makes terrain matter.

---

## Terrain

Introduced from level 4, so the opening rooms teach combat on an empty floor.

| kind | size | movement | projectiles | effect |
|---|---|---|---|---|
| `pillar` | 28×28 | blocks | blocks | breaks line of sight |
| `pit` | 40×24 | blocks | passes over | — |
| `spikes` | 24×24 | passes | passes | 1 heart, 90-tick per-entity cooldown |

```ts
export type ObstacleKind = "pillar" | "pit" | "spikes";

/** Axis-aligned; `pos` is the centre, matching how entities are positioned. */
export interface Obstacle {
  kind: ObstacleKind;
  pos: Vec2;
  w: number;
  h: number;
}

export const SOLID: readonly ObstacleKind[] = ["pillar", "pit"];
export const BLOCKS_SHOTS: readonly ObstacleKind[] = ["pillar"];
export const SPIKE_DAMAGE = 1;
export const SPIKE_COOLDOWN_TICKS = 90;
```

Count grows as `min(6, floor(level / 4))`, laid out deterministically from the
level seed and never overlapping a spawn or the hero start.

Collision is circle-vs-AABB with slide-along-the-normal resolution, used
identically by the hero and by enemies — enemies get obstacle avoidance for
free rather than needing pathfinding.

### The reachability guard

Terrain can wall an enemy off and make a room impossible to clear. Generation
therefore ends with a repair step:

1. Flood-fill the room from the hero start on an 8px grid, treating `pillar`
   and `pit` as solid.
2. Any spawn in an unreached cell means the layout is broken. Remove the
   obstacle nearest that spawn and re-flood.
3. Repeat until every spawn is reachable. Deterministic, so a level's repaired
   layout is stable.

A test asserts post-repair reachability for levels 1–100. This runs before
terrain ships, not after.

---

## Checkpoints and starting position

Checkpoints sit at levels `5k + 1`: 1, 6, 11, 16, …

```ts
/** Highest checkpoint unlocked by a given high-water mark. */
export function startLevelFor(best: number): number;
// best 0 → 1 | best 5 → 6 | best 7 → 6 | best 10 → 11
```

A run begins at `startLevelFor(save.best)` automatically — no menu.

### The stake

Dropping into level 11 with an empty purse and no upgrades is an unwinnable
run, because level 11 assumes a built character. So a checkpoint start grants
a **starting purse** and opens with a shop before the first room:

```
stake(C) = 16 * (C - 1)      // C = start level; 0 at level 1, 80 at 6, 160 at 11
```

The multiplier is a starting point for phase 6, not a proven number. The
harness decides it.

---

## Save

```ts
export const KNIGHT_SAVE_VERSION = 2;

export interface KnightSave {
  version: number;
  best: number;        // highest level cleared
  shards: number;      // spendable
  formId: string;      // form you fight as
  unlocked: string[];  // every form ever evolved into, formId included
}
```

`level` is gone from the payload; the start level derives from `best`.

**Migration from v1** (`{version: 1, level, best}`):

```
best     = max(v1.best ?? 0, (v1.level ?? 1) - 1, 0)
shards   = 0
formId   = "sparkpup"
unlocked = ["sparkpup"]
```

A `formId` naming a form that no longer exists, or absent from `unlocked`,
falls back to `sparkpup` rather than throwing.

Any failure — storage blocked, key absent, payload corrupt, unknown version —
yields a default save rather than throwing. A broken save must never stop the
game from starting.

---

## Evolution

Knight's own table, in `data/evolution.ts`, referencing no shared critter
model. Three stages, branching at each step: one base, two stage-2 forms,
four stage-3 forms.

```ts
export interface Form {
  id: string;
  name: string;
  stage: 1 | 2 | 3;
  /** Ids of the forms this may become. Empty at stage 3. */
  evolvesTo: readonly string[];
  shardCost: number;      // to evolve INTO this form
  sprite: string;         // /knight/sprites/<id>.png
  bonus: Partial<Stats>;  // permanent, applied before gear and mods
  power: PowerId;
}
```

Costs: stage 2 = 3 shards, stage 3 = 8 shards.

### The tree

Seven forms, each with exactly one power. Naming follows the site's
Pokémon-adjacent register without borrowing any actual name.

```
                                  ┌── Stormcrest  (bolt, two projectiles)
              ┌── Voltling ───────┤
              │      (bolt)       └── Thundermaw  (shock, wider ring)
Sparkpup ─────┤
  (none)      │                   ┌── Emberfang   (dash)
              └── Cinderpup ──────┤
                     (shock)      └── Ashenhide   (thorns)

  stage 1              stage 2                stage 3
  free                 3 shards               8 shards
```

| form | stage | power |
|---|---|---|
| `sparkpup` | 1 | `none` |
| `voltling` | 2 | `bolt` |
| `cinderpup` | 2 | `shock` |
| `stormcrest` | 3 | `bolt` (two projectiles) |
| `thundermaw` | 3 | `shock` (larger ring) |
| `emberfang` | 3 | `dash` |
| `ashenhide` | 3 | `thorns` |

Powers are where player-side ranged attacks land — the request from earlier in
this session that has been open since before the level ladder:

| power | effect |
|---|---|
| `none` | base form |
| `bolt` | every 3rd swing looses a projectile along the facing |
| `shock` | a kill emits a small damaging ring |
| `dash` | movement above a speed threshold damages what you pass through |
| `thorns` | contact damage reflects a share back to the attacker |

**Forms are collected, not consumed.** The save records every form you have
ever evolved into. Switching between forms you already own is free; evolving
into a new one costs its shard price. From a stage-3 form you may branch back
down and buy the other stage-2, opening its half of the tree.

So the branch is a real fork *for a run* — you fight as one form — without any
choice being permanently wasted. Collecting all seven costs 38 shards, which
is what gives shards somewhere to go long after the first evolution.

### Sprites

Generated with the existing pipeline: `mcp__huggingface__gr1_z_image_turbo_generate`
produces a 3×4 sheet of creatures on a flat magenta field;
`tools/build-sprites.py` floods the background from the edges, crops each
creature to its bounding box, and downsamples with NEAREST. The script's `OUT`
is parameterised so knight writes to `public/knight/sprites` instead of
BOUNCEDEX's directory.

`useSprites` already falls back to drawing the shape when art is missing, so
every form is playable before its sprite exists. Art is never on the critical
path.

---

## Testing

The lesson this codebase keeps re-teaching: tests that disable the dynamics
hide the bugs that matter. Every claim below is settled by playing, not by
asserting over constants.

**Balance harness** (extends `ladder.test.ts`). Plays complete runs with four
shopper personalities:

| shopper | bar |
|---|---|
| greedy-reach | clears to level 20 |
| damage-only | clears to level 12 |
| random | **clears to level 15** |
| never-buy | allowed to fail — that is a real choice with real consequences |

The random shopper is the load-bearing one. With the guaranteed reach grant
gone, a player who buys without a plan must still survive, or the shop has
made the game worse.

**Checkpoint harness.** A fresh run starting at level 11 with `stake(11)` and
one opening shop must be clearable. This is the test that stops checkpoint
starts from being a trap.

**Reachability guard.** Every spawn reachable from the hero start, levels
1–100, after repair.

**Mod-consumption guard.** Greps `engine/` and `page.tsx` and fails if any
`RunMods` field is never read. Copied from BOUNCEDEX's `upgrades.test.ts`.

**Economy guard.** No card is priced beyond what the ladder can plausibly
yield by the level it first appears; no card is unbuyable.

**Save tests.** v1 → v2 migration is lossless; corrupt and absent payloads
yield defaults; progress never walks backwards; shards cannot be farmed by
replaying a cleared level.

**Determinism.** Same seed yields the same room, the same obstacle layout
after repair, the same shop offers, and the same coin drops.

---

## Risks

**Reach is purchasable now.** The current ladder is winnable because reach is
given. Phase 6 has to re-establish that guarantee against a player who shops
badly. If the random shopper cannot clear level 15, the answer is to make
reach cheaper or heavier-weighted — not to lower the bar.

**One spec, six phases.** Built in the stated order, each phase leaves a
playable game. Built out of order, the middle of this plan has no working
build to test against.

**Terrain plus ranged enemies is the riskiest interaction.** Archers shooting
past pillars, or projectiles trapped inside geometry, will not show up in unit
tests. The balance harness must play levels containing both before that
combination is called done.
