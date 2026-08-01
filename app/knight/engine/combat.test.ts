import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, stepWorld } from "./world";
import {
  inSwingArc,
  damageEntity,
  IFRAME_TICKS,
  SWING_REACH,
  SWING_DAMAGE,
  KNOCKBACK,
} from "./combat";

const arena = { width: 360, height: 560 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("inSwingArc", () => {
  it("hits a target directly ahead and within reach", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180, y: 300 - SWING_REACH * 0.5 }, 30);
    expect(inSwingArc(h, e)).toBe(true);
  });

  it("misses a target behind the attacker", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180, y: 300 + SWING_REACH * 0.5 }, 30);
    expect(inSwingArc(h, e)).toBe(false);
  });

  it("misses a target beyond reach", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180, y: 300 - SWING_REACH * 4 }, 30);
    expect(inSwingArc(h, e)).toBe(false);
  });

  it("hits to the side, since the arc is wide", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    const e = spawnEnemy(w, { x: 180 + 26, y: 300 - 26 }, 30);
    expect(inSwingArc(h, e)).toBe(true);
  });
});

describe("damageEntity", () => {
  it("reduces hp and stamps the hit tick", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 30);
    w.tick = 50;
    expect(damageEntity(w, e, 10, 100, 120)).toBe(true);
    expect(e.hp).toBe(20);
    expect(e.hitAtTick).toBe(50);
  });

  it("knocks the target away from the damage source", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 30);
    damageEntity(w, e, 10, 100, 140);
    expect(e.vel.y).toBeLessThan(0);
    expect(Math.abs(e.vel.y)).toBeCloseTo(KNOCKBACK, 0);
  });

  it("refuses damage during invulnerability", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 30);
    w.tick = 10;
    damageEntity(w, e, 10, 100, 120);
    w.tick = 10 + IFRAME_TICKS - 1;
    expect(damageEntity(w, e, 10, 100, 120)).toBe(false);
    expect(e.hp).toBe(20);
  });

  it("allows damage again once invulnerability lapses", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 30);
    w.tick = 10;
    damageEntity(w, e, 10, 100, 120);
    w.tick = 10 + IFRAME_TICKS;
    expect(damageEntity(w, e, 10, 100, 120)).toBe(true);
    expect(e.hp).toBe(10);
  });

  it("marks a killed entity dead rather than deleting it mid-step", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 5);
    w.tick = 7;
    damageEntity(w, e, 10, 100, 120);
    expect(e.hp).toBeLessThanOrEqual(0);
    expect(e.deadAtTick).toBe(7);
    // Still present this step so the renderer can animate the death.
    expect(w.entities).toContain(e);
  });

  it("does not re-kill a corpse", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 100, y: 100 }, 5);
    damageEntity(w, e, 10, 100, 120);
    const deadAt = e.deadAtTick;
    w.tick += IFRAME_TICKS + 1;
    expect(damageEntity(w, e, 10, 100, 120)).toBe(false);
    expect(e.deadAtTick).toBe(deadAt);
  });
});

describe("swing lifecycle", () => {
  it("swings automatically when standing still near an enemy", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    spawnEnemy(w, { x: 180, y: 300 - 30 }, 300);
    for (let i = 0; i < 30; i++) stepWorld(w);
    expect(h.attack.phase).not.toBe("idle");
  });

  it("does not swing while moving", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 180, y: 260 }, 300);
    w.moveTarget = { x: 180, y: 540 };
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(h.attack.phase).toBe("idle");
  });

  it("does not swing with no enemy in range", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 20, y: 20 }, 300);
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(h.attack.phase).toBe("idle");
  });

  it("damages the enemy once per swing, not once per tick", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    h.facing = { x: 0, y: -1 };
    // The hero must survive the whole window, or its death truncates the loop
    // before a per-tick bug could multiply — which is exactly how an earlier
    // version of this test passed under the very regression it names.
    h.hp = 100000;
    h.maxHp = 100000;
    const e = spawnEnemy(w, { x: 180, y: 300 - 30 }, 100000);
    for (let i = 0; i < 60; i++) stepWorld(w);
    const dealt = 100000 - e.hp;
    // ACTIVE_TICKS is 7, so a per-tick bug deals ~7x a single swing.
    expect(dealt).toBeGreaterThan(0);
    expect(dealt).toBeLessThanOrEqual(SWING_DAMAGE * 2);
  });

  it("lets a stationary enemy alone when the hero is far away", () => {
    // Regression guard: a kind-based reach check made every enemy match
    // itself at zero distance and wind up forever.
    const w = fresh();
    spawnHero(w, { x: 180, y: 540 });
    const e = spawnEnemy(w, { x: 180, y: 60 }, 300);
    e.vel = { x: 0, y: 0 };
    stepWorld(w);
    expect(e.attack.phase).toBe("idle");
  });
});
