import { describe, it, expect } from "vitest";
import { createWorld, spawnProjectile, spawnEnemy, stepWorld, FIXED_DT } from "./world";
import { autoAim, LAUNCH_SPEED } from "./aim";
import { buildWave, laneX } from "./waves";
import { makeRng } from "@/app/game/_shared/rng";
import { BASE_CRITTERS } from "@/app/game/_shared/critters";
import { UPGRADE_EVERY_WAVES, rollUpgrades } from "../data/upgrades";

const ARENA = { width: 400, height: 700 };
const ORIGIN = { x: ARENA.width / 2, y: ARENA.height - 30 };
const WAVE_INTERVAL_TICKS = 120 * 6;
const STARTERS = BASE_CRITTERS.slice(0, 3).map((c) => c.id);

/**
 * Play a full run on pure auto-fire — the weakest way to play, since the
 * auto-aimer never plans bank shots. A run that survives on auto is the floor;
 * a human aiming should do better.
 */
function simulateAutoRun(seed: number) {
  const world = createWorld({ arena: ARENA, seed });
  const rng = makeRng(seed);
  let autoTimer = 0;
  let lastUpgradeWave = 0;
  const queue: string[] = [];

  const MAX_TICKS = 120 * 60 * 20; // 20 minutes of simulated time
  let enemiesSpawned = 0;

  let kills = 0;
  let enemySamples = 0;
  let enemyTotal = 0;
  let enemyPeak = 0;
  let earlySamples = 0;
  let earlyTotal = 0;

  while (!world.over && world.tick < MAX_TICKS) {
    stepWorld(world);

    for (const ev of world.impacts) {
      if (ev.killed) kills += 1;
    }

    // Sample how many enemies are actually on screen — if the board shreds
    // them at the spawn line the player never sees a threat.
    if (world.tick % 60 === 0) {
      const alive = world.bodies.reduce((n, b) => n + (b.kind === "enemy" ? 1 : 0), 0);
      enemySamples += 1;
      enemyTotal += alive;
      if (alive > enemyPeak) enemyPeak = alive;
      if (world.wave <= 12) { earlySamples += 1; earlyTotal += alive; }
    }

    if (world.tick > 0 && world.tick % WAVE_INTERVAL_TICKS === 0) {
      world.wave += 1;
      for (const s of buildWave(world.wave, rng)) {
        spawnEnemy(
          world,
          { x: laneX(s.lane, ARENA.width) + s.xJitter, y: -s.radius - s.yOffset },
          s.hp,
          s.radius,
        );
        enemiesSpawned += 1;
      }

      if (world.wave % UPGRADE_EVERY_WAVES === 0 && world.wave !== lastUpgradeWave) {
        lastUpgradeWave = world.wave;
        // Auto mode picks the first offered upgrade.
        world.mods = rollUpgrades(rng)[0].apply(world.mods);
      }
    }

    autoTimer += FIXED_DT;
    if (autoTimer >= world.mods.autoFireInterval) {
      autoTimer = 0;
      while (queue.length < world.mods.queueSize) queue.push(rng.pick(STARTERS));
      const id = queue.shift()!;
      const dir = autoAim(world, ORIGIN);
      const power = LAUNCH_SPEED * world.mods.launchPower;
      spawnProjectile(world, id, ORIGIN, { x: dir.x * power, y: dir.y * power });
    }
  }

  const settled = world.bodies.filter((b) => b.settled);
  const xs = settled.map((b) => b.pos.x).sort((a, b) => a - b);
  const ys = settled.map((b) => b.pos.y).sort((a, b) => a - b);
  const q = (arr: number[], f: number) =>
    arr.length ? Math.round(arr[Math.floor((arr.length - 1) * f)]) : -1;

  return {
    wave: world.wave,
    seconds: Math.round(world.tick * FIXED_DT),
    settled: settled.length,
    bestCombo: world.bestCombo,
    died: world.over,
    bumperX: [q(xs, 0), q(xs, 0.5), q(xs, 1)],
    bumperY: [q(ys, 0), q(ys, 0.5), q(ys, 1)],
    /** Lanes (of 5) with at least one bumper covering them. */
    lanesCovered: [0, 1, 2, 3, 4].filter((lane) => {
      const lx = laneX(lane, ARENA.width);
      return settled.some((b) => Math.abs(b.pos.x - lx) < 95);
    }).length,
    enemiesSpawned,
    kills,
    avgAlive: enemySamples ? Math.round(enemyTotal / enemySamples) : 0,
    avgAliveEarly: earlySamples ? Math.round(earlyTotal / earlySamples) : 0,
    peakAlive: enemyPeak,
  };
}

describe("run pacing on pure auto-play", () => {
  const seeds = [1, 7, 42, 1234, 99999];
  const runs = seeds.map(simulateAutoRun);

  it("lasts long enough to feel like a run, not a loss screen", () => {
    for (const r of runs) {
      expect(r.seconds, `run ended after ${r.seconds.toFixed(0)}s at wave ${r.wave}`)
        .toBeGreaterThan(120);
    }
  });

  it("still ends rather than running forever", () => {
    for (const r of runs) {
      expect(r.seconds).toBeLessThan(15 * 60);
    }
  });

  it("reaches at least the first upgrade choice", () => {
    for (const r of runs) {
      expect(r.wave).toBeGreaterThanOrEqual(UPGRADE_EVERY_WAVES);
    }
  });

  it("fills the board with bumpers, which is the escalation curve", () => {
    for (const r of runs) {
      expect(r.settled).toBeGreaterThan(3);
    }
  });

  it("produces chains worth watching without letting them run away", () => {
    // bestCombo is a display stat: long chains are the spectacle, and damage
    // is bounded separately by COMBO_DAMAGE_CAP (see combat.test.ts). This
    // only guards against a chain that never resets at all.
    for (const r of runs) {
      expect(r.bestCombo).toBeGreaterThan(0);
      expect(r.bestCombo).toBeLessThan(400);
    }
  });

  it("never kills more enemies than it spawned", () => {
    // Regression guard: stepWorld once rebuilt world.bodies from a stale array
    // captured before applyImpact removed the dead, resurrecting every enemy
    // killed that step. It showed up here as thousands of kills for ~35 spawns.
    for (const r of runs) {
      expect(r.kills).toBeLessThanOrEqual(r.enemiesSpawned);
    }
  });

  it("keeps enemies on screen from the very first waves", () => {
    // The board once out-damaged the spawn rate so completely that the first
    // two minutes averaged 2 live enemies — the player saw an empty arena.
    for (const r of runs) {
      expect(r.avgAliveEarly, "early game looks empty").toBeGreaterThanOrEqual(5);
    }
  });

  it("keeps the arena busy for the whole run", () => {
    for (const r of runs) {
      expect(r.avgAlive).toBeGreaterThanOrEqual(15);
    }
  });

  it("covers every lane with bumpers by the end of a run", () => {
    for (const r of runs) {
      expect(r.lanesCovered).toBeGreaterThanOrEqual(4);
    }
  });
});
