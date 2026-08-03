import { describe, it, expect } from "vitest";
import type { World } from "./world";
import { createWorld, spawnHero, spawnEnemy, heroOf, stepWorld } from "./world";
import type { Entity } from "./types";
import { SWING_REACH, IFRAME_TICKS } from "./combat";
import { levelFor } from "./level";
import { GRUNT } from "../data/enemies";

const arena = { width: 360, height: 560 };

/**
 * A deliberately tiny "ideal player": every tick, walk toward the nearest
 * living enemy until just inside swing reach, then hold that standoff point
 * so the hero can stand still and auto-swing. This is not clever play — no
 * kiting, no retreat — it is the minimum a human thumb does: drag toward the
 * threat, let go once close. That is enough to exercise real contact, real
 * knockback and real facing, which is exactly what the unit tests (100000
 * HP, single steps) were built to avoid.
 *
 * The standoff point is offset from the enemy's centre, not the centre
 * itself: aiming straight at the enemy's position lets momentum carry the
 * hero past swing reach and into touch range before it can stop, trading a
 * clean swing for a free hit. Stopping a full SWING_REACH short leaves a
 * margin that survives a tick or two of overshoot.
 */
function idealBotStep(world: World): void {
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
    // Deterministic tie-break, same convention as combat.ts's foeInReach.
    if (dist < bestDist || (dist === bestDist && target && e.id < target.id)) {
      bestDist = dist;
      target = e;
    }
  }

  if (!target) {
    world.moveTarget = null;
    return;
  }

  const standoff = SWING_REACH;
  if (bestDist <= standoff) {
    world.moveTarget = null;
    return;
  }
  const ux = (target.pos.x - hero.pos.x) / bestDist;
  const uy = (target.pos.y - hero.pos.y) / bestDist;
  world.moveTarget = { x: target.pos.x - ux * standoff, y: target.pos.y - uy * standoff };
}

describe("whole-loop: an ideal player", () => {
  it("clears the opening room at real HP without dying", () => {
    // The real level 1, not a hand-picked wave. A room the shipping game hands
    // a new player has to be winnable by a bot with no kiting and no tactics —
    // if this fails, level 1 is mistuned, which is exactly what this should
    // catch. (Verified: with the auto-aim fix reverted, the hero dies here
    // with enemies still standing — see final-fix-report.md.)
    const room = levelFor(1);
    const w = createWorld({ arena: room.arena, seed: 1 });
    const hero = spawnHero(w, room.heroStart);
    for (const pos of room.spawns) spawnEnemy(w, pos, room.enemyHp);

    const TICK_CAP = 120 * 60; // 60s at 120Hz — generous.
    let ticks = 0;
    const livingEnemies = () => w.entities.filter((e) => e.kind === "enemy" && e.deadAtTick < 0);

    while (!w.over && livingEnemies().length > 0 && ticks < TICK_CAP) {
      idealBotStep(w);
      stepWorld(w);
      ticks++;
    }

    expect(ticks).toBeLessThan(TICK_CAP);
    expect(livingEnemies()).toHaveLength(0);
    expect(hero.deadAtTick).toBe(-1);
    expect(w.over).toBe(false);
  });
});

describe("whole-loop: a passive hero", () => {
  it("never moving eventually dies to contact damage", () => {
    const w = createWorld({ arena, seed: 1 });
    const hero = spawnHero(w, { x: 180, y: 300 });
    // Surrounded from every direction: SWING_ARC covers roughly a third of
    // the circle, so a hero that only ever fights whatever it is currently
    // facing cannot fend off attackers approaching from the other two
    // thirds. A single attacker, by contrast, a stationary hero can
    // punch back forever (see the ideal-player test) — this scenario proves
    // that isn't a wall of invulnerability, it's a gap in the swing arc.
    const N = 8;
    const R = 70;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      spawnEnemy(w, { x: 180 + Math.cos(a) * R, y: 300 + Math.sin(a) * R }, GRUNT.hp);
    }
    w.moveTarget = null; // the thumb never touches the screen

    const TICK_CAP = 120 * 20; // 20s — many i-frame windows' worth.
    let ticks = 0;
    while (!w.over && ticks < TICK_CAP) {
      stepWorld(w);
      ticks++;
    }

    expect(ticks).toBeLessThan(TICK_CAP);
    expect(w.over).toBe(true);
    expect(hero.deadAtTick).toBeGreaterThanOrEqual(0);
    expect(hero.hp).toBeLessThanOrEqual(0);
  });
});

describe("whole-loop: contact damage", () => {
  it("costs exactly one heart per i-frame window, not one per overlapping enemy", () => {
    const w = createWorld({ arena, seed: 1 });
    const hero = spawnHero(w, { x: 180, y: 300 });
    // Several grunts stacked on the hero from tick 0, so every window has
    // more than one enemy touching it at once.
    for (let i = 0; i < 4; i++) spawnEnemy(w, { x: 180, y: 300 }, GRUNT.hp);

    const WINDOWS = 3;
    for (let win = 0; win < WINDOWS; win++) {
      const hpBefore = hero.hp;
      for (let t = 0; t < IFRAME_TICKS; t++) stepWorld(w);
      expect(hero.hp).toBe(hpBefore - GRUNT.touchDamage);
    }
  });
});

describe("whole-loop: fx wiring", () => {
  it("queues slash+impact on a landing swing, and slash+death on the killing one", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnHero(w, { x: 180, y: 300 });
    // GRUNT.hp (30) is an exact multiple of SWING_DAMAGE (10): three clean
    // swings, no overkill remainder to reason about.
    const enemy = spawnEnemy(w, { x: 180, y: 330 }, GRUNT.hp);

    let sawSlashWithImpact = false;
    let sawSlashWithDeath = false;

    const TICK_CAP = 600;
    let ticks = 0;
    while (enemy.deadAtTick < 0 && ticks < TICK_CAP) {
      stepWorld(w);
      ticks++;
      // Effects expire after FX_TICKS, so they must be sampled as we step —
      // checking only at the end would miss ones already gone.
      if (w.hits.length > 0) {
        const kindsThisTick = w.fx.filter((f) => f.tick === w.tick - 1).map((f) => f.kind);
        if (kindsThisTick.includes("slash") && kindsThisTick.includes("impact")) {
          sawSlashWithImpact = true;
        }
        if (kindsThisTick.includes("slash") && kindsThisTick.includes("death")) {
          sawSlashWithDeath = true;
        }
      }
    }

    expect(ticks).toBeLessThan(TICK_CAP);
    expect(enemy.deadAtTick).toBeGreaterThanOrEqual(0);
    expect(sawSlashWithImpact).toBe(true);
    expect(sawSlashWithDeath).toBe(true);
    expect(w.lastHitTick).toBeGreaterThanOrEqual(0);
  });
});

describe("taking a hit is visible", () => {
  it("queues an impact burst and kicks the screen when the hero is touched", () => {
    const w = createWorld({ arena, seed: 1 });
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 180, y: 300 }, GRUNT.hp);

    let sawImpact = false;
    for (let i = 0; i < 30 && !sawImpact; i++) {
      stepWorld(w);
      if (w.fx.some((f) => f.kind === "impact")) sawImpact = true;
    }

    expect(h.hp).toBeLessThan(h.maxHp);
    expect(sawImpact, "contact damage produced no impact fx").toBe(true);
    expect(w.lastHitTick).toBeGreaterThanOrEqual(0);
  });

  it("does not queue an impact for a hit that i-frames refused", () => {
    const w = createWorld({ arena, seed: 1 });
    const h = spawnHero(w, { x: 180, y: 300 });
    for (let i = 0; i < 4; i++) spawnEnemy(w, { x: 180, y: 300 }, GRUNT.hp);

    stepWorld(w);
    const impacts = w.fx.filter((f) => f.kind === "impact").length;
    // Four overlapping grunts, one heart, one burst.
    expect(h.hp).toBe(h.maxHp - GRUNT.touchDamage);
    expect(impacts).toBe(1);
  });
});

describe("attacking while the thumb stays down (real play)", () => {
  // The other loop tests release the drag (moveTarget = null) to stop. A real
  // player holds their thumb on the enemy, so the hero keeps steering — and
  // contact knockback keeps slamming its speed far above STOP_SPEED.
  it("swings at an enemy while the player holds the thumb on it", () => {
    const w = createWorld({ arena, seed: 1 });
    const h = spawnHero(w, { x: 180, y: 320 });
    const e = spawnEnemy(w, { x: 180, y: 250 }, GRUNT.hp);

    // Thumb parked on the enemy and never lifted.
    let swung = false;
    for (let i = 0; i < 600 && !swung; i++) {
      w.moveTarget = { x: e.pos.x, y: e.pos.y };
      stepWorld(w);
      if (h.attack.phase !== "idle") swung = true;
    }

    expect(swung, "hero never entered a swing while holding the thumb down").toBe(true);
  });

  it("kills the enemy it is held against", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnHero(w, { x: 180, y: 320 });
    const e = spawnEnemy(w, { x: 180, y: 250 }, GRUNT.hp);

    for (let i = 0; i < 1800 && e.deadAtTick < 0; i++) {
      w.moveTarget = { x: e.pos.x, y: e.pos.y };
      stepWorld(w);
    }
    expect(e.deadAtTick).toBeGreaterThanOrEqual(0);
  });

  it("keeps swinging even while being knocked about by contact", () => {
    const w = createWorld({ arena, seed: 1 });
    const h = spawnHero(w, { x: 180, y: 300 });
    // Sat right on top of the hero, so knockback fires every i-frame window.
    const e = spawnEnemy(w, { x: 180, y: 300 }, 100000);

    let swings = 0;
    let phase = h.attack.phase;
    for (let i = 0; i < 900; i++) {
      w.moveTarget = { x: e.pos.x, y: e.pos.y };
      stepWorld(w);
      if (phase === "idle" && h.attack.phase === "windup") swings += 1;
      phase = h.attack.phase;
      if (h.deadAtTick >= 0) break;
    }
    expect(swings, "knockback locked the hero out of attacking").toBeGreaterThan(1);
  });
});
