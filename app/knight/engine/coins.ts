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
