import { describe, it, expect } from "vitest";
import type { World } from "./world";
import { createWorld, spawnHero, spawnEnemy, heroOf, stepWorld } from "./world";
import type { Entity } from "./types";
import { reachOf } from "./combat";
import { levelFor, REACH_PER_BONUS, paramsForLevel } from "./level";

/**
 * Plays the level ladder the way the page does.
 *
 * loop.test.ts asks whether combat works at all in one room. This asks the
 * question that only appears once rooms are strung together: does the
 * difficulty curve stay ahead of the player without outrunning them, and does
 * the reach powerup actually pay for itself? Both are tuning claims, and
 * tuning claims are only worth what a played run says about them.
 */

/**
 * Walks to swing distance and stays there. Deliberately no kiting.
 *
 * `closeness` scales how far inside its own reach the bot stands: 1 sits at
 * the very edge, lower values step in. Standing at the edge is not the safer
 * option it looks like — an enemy that drifts a pixel leaves the arc and the
 * swing whiffs — so the interesting runs are the ones that close in.
 */
function botStep(world: World, closeness: number): void {
  const hero = heroOf(world);
  if (!hero || hero.deadAtTick >= 0) {
    world.moveTarget = null;
    return;
  }

  let target: Entity | null = null;
  let bestDist = Infinity;
  for (const e of world.entities) {
    if (e.kind !== "enemy" || e.deadAtTick >= 0) continue;
    const dist = Math.hypot(e.pos.x - hero.pos.x, e.pos.y - hero.pos.y);
    if (dist < bestDist || (dist === bestDist && target && e.id < target.id)) {
      bestDist = dist;
      target = e;
    }
  }

  if (!target) {
    world.moveTarget = null;
    return;
  }

  // Stand off relative to the reach the run has actually earned, not the base
  // value — otherwise the bot walks past its own powerup and measures nothing.
  const standoff = reachOf(world) * closeness;
  if (bestDist <= standoff) {
    world.moveTarget = null;
    return;
  }
  const ux = (target.pos.x - hero.pos.x) / bestDist;
  const uy = (target.pos.y - hero.pos.y) / bestDist;
  world.moveTarget = { x: target.pos.x - ux * standoff, y: target.pos.y - uy * standoff };
}

interface Outcome {
  cleared: boolean;
  died: boolean;
  ticks: number;
  hpLeft: number;
}

const TICK_CAP = 120 * 90; // 90s at 120Hz.

/** Plays one room to conclusion with `reachBonus` pixels of earned reach. */
function playLevel(level: number, reachBonus: number, closeness = 1): Outcome {
  const room = levelFor(level);
  const world = createWorld({ arena: room.arena, seed: level });
  world.mods.reachBonus = reachBonus;
  const hero = spawnHero(world, room.heroStart);
  for (const spawn of room.spawns) spawnEnemy(world, spawn, room.enemyHp);

  const living = () =>
    world.entities.filter((e) => e.kind === "enemy" && e.deadAtTick < 0).length;

  let ticks = 0;
  while (!world.over && living() > 0 && ticks < TICK_CAP) {
    botStep(world, closeness);
    stepWorld(world);
    ticks++;
  }

  return {
    cleared: living() === 0 && hero.deadAtTick < 0,
    died: hero.deadAtTick >= 0,
    ticks,
    hpLeft: hero.hp,
  };
}

describe("the level ladder", () => {
  it("lets a run that banks its powerups climb the opening levels", () => {
    // The actual loop the page runs: clear, bank +9 reach, next room.
    let reach = 0;
    const reached: number[] = [];

    for (let level = 1; level <= 5; level++) {
      const out = playLevel(level, reach);
      if (!out.cleared) break;
      reached.push(level);
      reach += REACH_PER_BONUS;
    }

    expect(reached).toEqual([1, 2, 3, 4, 5]);
  });

  it("gets harder as it goes", () => {
    // Not a stopwatch claim — a room with more, tougher enemies must take a
    // committed player longer to clear than the opening one.
    const early = playLevel(1, 0);
    const later = playLevel(6, REACH_PER_BONUS * 5);

    expect(early.cleared).toBe(true);
    expect(later.ticks).toBeGreaterThan(early.ticks);
  });

  it("makes the reach powerup the difference between living and dying", () => {
    // Same room, same seed, same bot — the only variable is earned reach.
    //
    // Reach buys safety, not speed: a longer swing does not raise damage or
    // quicken the swing cycle, so a powered run is not faster. What it does is
    // let you land the hit from outside the enemy's own contact range, which
    // is the entire difference between clearing level six and dying in it.
    const IN_CLOSE = 0.6;
    const bare = playLevel(6, 0, IN_CLOSE);
    const banked = playLevel(6, REACH_PER_BONUS * 5, IN_CLOSE);

    expect(bare.died).toBe(true);
    expect(banked.cleared).toBe(true);
    expect(banked.hpLeft).toBeGreaterThan(0);
  });

  it("never opens a room with an enemy already on top of the hero", () => {
    for (let level = 1; level <= 30; level++) {
      const room = levelFor(level);
      for (const spawn of room.spawns) {
        const gap = Math.hypot(spawn.x - room.heroStart.x, spawn.y - room.heroStart.y);
        expect(gap, `level ${level} spawn at ${spawn.x},${spawn.y}`).toBeGreaterThan(60);
      }
    }
  });

  it("keeps room size readable at high levels", () => {
    // The count dial is capped so a late room is a fight, not a wall of bodies.
    expect(paramsForLevel(99).enemies).toBeLessThanOrEqual(14);
    expect(paramsForLevel(99).enemyHp).toBeGreaterThan(paramsForLevel(10).enemyHp);
  });
});
