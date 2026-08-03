import type { World } from "./world";
import { createWorld, spawnEnemy, spawnHero, heroOf } from "./world";
import { levelFor } from "./level";
import { statsOf } from "./stats";
import { sweepCoins } from "./coins";
import { defaultMods, type RunMods } from "../data/upgrades";

/**
 * What a run carries from one room into the next: the build, the bank, and
 * the hero's health.
 *
 * This exists because the page used to keep its own `modsRef`/`purseRef`
 * copies, updated at mount and at death but never after a purchase — so
 * `purchase()`/`reroll()` mutated the live world while the refs quietly kept
 * pointing at the pre-shop snapshot, and every upgrade bought (and every
 * coin spent) was discarded the moment the run advanced. A cache is a second
 * copy of state that can drift from the thing it mirrors; the fix is to stop
 * keeping one. `carryForward` reads the live world at the moment of
 * transition instead, so there is exactly one source of truth.
 */
export interface Carry {
  mods: RunMods;
  purse: number;
  /** Hearts to start the next room with. The receiving room clamps this to
   *  its own max HP, so this value does not need to be pre-clamped against
   *  any particular room. */
  hp: number;
}

/**
 * Build the world for a level, seeded with what the run carries in.
 *
 * The one and only producer of a room's starting `World` — `page.tsx` and
 * the `ladder.test.ts` harness both call this rather than each assembling a
 * world by hand. That duplication is exactly how the original room-transition
 * bug hid from every test: the harness reimplemented this sequence instead of
 * importing it, so a page-only regression (mods reset instead of carried,
 * for instance) had nothing to catch it. Importing the same function means
 * the harness now walks the identical path the game does.
 */
export function beginRoom(level: number, carry: Carry): World {
  const room = levelFor(level);
  const world = createWorld({ arena: room.arena, seed: level });
  world.mods = carry.mods;
  world.purse = carry.purse;
  const hero = spawnHero(world, room.heroStart);
  hero.hp = Math.max(1, Math.min(statsOf(world).maxHp, carry.hp));
  for (const spawn of room.spawns) spawnEnemy(world, spawn, room.enemyHp);
  return world;
}

/**
 * What survives into the next room, read from the live world.
 *
 * `world.mods` is already the result of every `purchase()` applied so far —
 * each call reassigns it to a new object, so the current value is the whole
 * history, not something that needs replaying. `world.purse` is likewise
 * already net of every purchase and reroll spent. Hp is clamped here against
 * this world's own max HP (mods carry unchanged into the next room, so the
 * cap is the same number on either side of the transition) — defensive
 * against hp ever exceeding max, which combat itself should never allow, but
 * a carried value should not depend on that holding.
 */
export function carryForward(world: World): Carry {
  const maxHp = statsOf(world).maxHp;
  const hero = heroOf(world);
  const hp = hero ? Math.max(1, Math.min(maxHp, hero.hp)) : maxHp;
  return { mods: world.mods, purse: world.purse, hp };
}

/**
 * A fresh run: nothing carries. `hp: Infinity` reads as "as full as the next
 * room's max HP allows" — there is no room to compute an absolute number
 * against yet, and the receiving room clamps whatever it is given anyway, so
 * an unbounded value resolves to exactly that room's max.
 */
export function freshCarry(): Carry {
  return { mods: defaultMods(), purse: 0, hp: Number.POSITIVE_INFINITY };
}

/**
 * Hearts restored by clearing any room, before Mending is counted.
 *
 * Rooms used to refill the hero completely, and the difficulty curve was
 * tuned against that. Carrying HP forward so Mending could matter removed
 * the refill and made a run a single 5-heart budget across every level.
 * This is the floor that replaces it: attrition is still real, because one
 * heart back rarely covers one room's damage, but a run is no longer decided
 * by the first two rooms.
 */
export const BASE_ROOM_HEAL = 1;

/**
 * Hearts after a room's mending, never above the run's current maximum.
 *
 * Pulled out of the page's clear-transition effect so the arithmetic — the
 * one thing about "Mending" nobody could confirm by eye across roughly six
 * playthroughs — has a test that does not depend on watching a heart icon.
 * The call site stays in `page.tsx`, at the same point in the clear
 * transition it always fired from (before the shop opens, so the HUD shows
 * post-heal HP for the whole time the player is browsing).
 *
 * `healOnClear` here is the caller's whole heal amount for the room, not
 * just what Mending bought — the call site is expected to pass
 * `BASE_ROOM_HEAL + world.mods.healOnClear`, so the floor and any purchased
 * stacks add together as one heal rather than this function knowing about
 * either source individually.
 *
 * The outer `Math.max(hp, ...)` guards a case that should never arise —
 * combat clamps hp to max, and `carryForward` clamps it again on the way
 * into a room — but a hero somehow already above max must not have this
 * function make things worse. A plain `Math.min(maxHp, hp + healOnClear)`
 * would *reduce* such an hp down to maxHp, turning a defensive clamp into a
 * damage source. Wrapping it in `Math.max(hp, ...)` means healing can only
 * ever raise hp or leave it unchanged, never lower it.
 */
export function healedHp(hp: number, healOnClear: number, maxHp: number): number {
  return Math.max(hp, Math.min(maxHp, hp + healOnClear));
}

/**
 * Settle a cleared room: bank the coins, apply the room's mending.
 *
 * The other half of the pair with `beginRoom` — both `page.tsx` and the
 * `playRun` harness call this at the moment a room clears, rather than each
 * re-deriving "sweep the floor, then heal" locally. Encapsulates the same
 * sequencing the call site always used (sweep before heal, both before the
 * shop opens); it does not move *when* this fires — `page.tsx` still calls it
 * at the same point in its clear-transition effect, before `openShop`, so the
 * HUD shows post-heal HP for the whole time the player is browsing the shop.
 * A no-op on a world with no hero (should not happen at a real clear, but
 * this must not throw if it somehow does).
 */
export function settleClear(world: World): void {
  sweepCoins(world);
  const hero = heroOf(world);
  if (hero) {
    hero.hp = healedHp(hero.hp, BASE_ROOM_HEAL + world.mods.healOnClear, statsOf(world).maxHp);
  }
}
