# CRITTER KNIGHT — carry-over into slice 2

Findings deliberately deferred during slice 1, preserved here because the SDD
workspace is scratch. Each was reviewed and ruled "can wait" by the final
whole-branch review; several must head the slice-2 plan.

## Must be addressed early in slice 2

- **`World.rngSeed` is inert.** `makeRng` is never imported or called in
  `app/knight/engine/`. Slice 2's procedural room generation must wire it
  rather than assume it already is.
- **`Entity` has no archetype reference.** `stepWorld` hardcodes `GRUNT` when
  steering enemies and applying touch damage, and `draw.ts` hardcodes its
  colour. Add `Entity.defId` and look the def up, or every new archetype will
  move, hit and look like a grunt.
- **Enemies cannot attack.** Slice 1 scoped `updateAttack` to the hero, because
  enemy swings used the hero's `SWING_DAMAGE` (10) against 5 hearts and
  one-shot the player. Giving enemies real attacks needs its own damage units —
  natural to do alongside weapons and armor in slice 3.

## Worth folding in opportunistically

- `world.hits` is populated every tick and read by nothing. Drain it in the
  renderer or delete it.
- `world.over` short-circuits `stepWorld`, so the hero's death animation never
  advances a frame. The same freeze truncates the last enemy's death effect
  when `hud.cleared` flips.
- Simultaneous hero-and-last-enemy death shows "Room cleared", never "You fell".
- `heroOf` is scanned 2+N times per tick. Irrelevant at 5 entities, not at room
  scale.
- `restart()` seeds from `tick + 1`, which stops being reproducible once the
  RNG is wired.
- `drawFloor` paints its surround colour outside a canvas sized exactly to the
  arena, so `BG` is never visible. Either size the canvas to show a surround or
  drop the constant.
- `combat.test.ts`'s "lets a stationary enemy alone" guard is now trivially true
  (enemies never call `updateAttack`). Re-point it if enemies regain attacks.

## The lesson worth keeping

Every slice-1 combat test disabled the dynamics that broke the game — both
sides given 100000 HP, AI tests stepping once — and 57 green tests hid two
critical defects. `loop.test.ts` now plays engagements to a conclusion at real
health values. **Keep that: any new mechanic needs a whole-loop test, not only
unit coverage.**
