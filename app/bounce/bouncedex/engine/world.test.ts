import { describe, it, expect } from "vitest";
import {
  createWorld,
  spawnProjectile,
  spawnEnemy,
  stepWorld,
  FIXED_DT,
  HIT_COOLDOWN_TICKS,
  PLINK_INTERVAL_TICKS,
} from "./world";

const arena = { width: 400, height: 700 };

describe("createWorld", () => {
  it("starts empty, alive, and at tick 0", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(w.tick).toBe(0);
    expect(w.bodies).toHaveLength(0);
    expect(w.over).toBe(false);
    expect(w.nestHp).toBe(w.maxNestHp);
  });
});

describe("spawning", () => {
  it("assigns unique ids", () => {
    const w = createWorld({ arena, seed: 1 });
    const a = spawnProjectile(w, "ember", { x: 200, y: 600 }, { x: 0, y: -300 });
    const b = spawnProjectile(w, "ember", { x: 200, y: 600 }, { x: 0, y: -300 });
    expect(a.id).not.toBe(b.id);
    expect(w.bodies).toHaveLength(2);
  });

  it("gives a projectile the physical properties of its critter", () => {
    const w = createWorld({ arena, seed: 1 });
    const b = spawnProjectile(w, "boulder", { x: 200, y: 600 }, { x: 0, y: -300 });
    expect(b.mass).toBe(3.2);
    expect(b.radius).toBe(17);
    expect(b.critterId).toBe("boulder");
    expect(b.kind).toBe("projectile");
  });

  it("rejects unknown critter ids", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(() => spawnProjectile(w, "bogus", { x: 0, y: 0 }, { x: 0, y: 0 })).toThrow();
  });
});

describe("stepWorld", () => {
  it("advances the tick counter by exactly one", () => {
    const w = createWorld({ arena, seed: 1 });
    stepWorld(w);
    expect(w.tick).toBe(1);
  });

  it("moves a projectile according to its velocity", () => {
    const w = createWorld({ arena, seed: 1 });
    const b = spawnProjectile(w, "ember", { x: 200, y: 600 }, { x: 0, y: -240 });
    stepWorld(w);
    expect(b.pos.y).toBeLessThan(600);
  });

  it("settles a slow projectile and marks it as a bumper", () => {
    const w = createWorld({ arena, seed: 1 });
    const b = spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 1, y: 1 });
    stepWorld(w);
    expect(b.settled).toBe(true);
    expect(b.kind).toBe("settled");
  });

  it("bounces a projectile off the left wall", () => {
    const w = createWorld({ arena, seed: 1 });
    const b = spawnProjectile(w, "ember", { x: 20, y: 300 }, { x: -600, y: 0 });
    for (let i = 0; i < 20; i++) stepWorld(w);
    expect(b.vel.x).toBeGreaterThan(0);
  });

  it("is deterministic: identical seeds and inputs give identical state", () => {
    const run = () => {
      const w = createWorld({ arena, seed: 777 });
      spawnProjectile(w, "pip", { x: 200, y: 650 }, { x: 137, y: -520 });
      spawnEnemy(w, { x: 180, y: 120 }, 20, 14);
      spawnEnemy(w, { x: 260, y: 90 }, 20, 14);
      for (let i = 0; i < 600; i++) stepWorld(w);
      return JSON.stringify(w);
    };
    expect(run()).toEqual(run());
  });

  it("removes a projectile that falls past the bottom of the arena", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnProjectile(w, "ember", { x: 200, y: 690 }, { x: 0, y: 900 });
    for (let i = 0; i < 30; i++) stepWorld(w);
    expect(w.bodies.filter((b) => b.kind === "projectile")).toHaveLength(0);
  });

  it("costs nest HP when an enemy reaches the bottom, and removes it", () => {
    const w = createWorld({ arena, seed: 1 });
    const before = w.nestHp;
    spawnEnemy(w, { x: 200, y: 690 }, 20, 14);
    for (let i = 0; i < 300; i++) stepWorld(w);
    expect(w.nestHp).toBeLessThan(before);
    expect(w.bodies.filter((b) => b.kind === "enemy")).toHaveLength(0);
  });

  it("ends the run when nest HP is exhausted", () => {
    const w = createWorld({ arena, seed: 1 });
    w.nestHp = 1;
    spawnEnemy(w, { x: 200, y: 690 }, 20, 14);
    for (let i = 0; i < 300; i++) stepWorld(w);
    expect(w.over).toBe(true);
  });

  it("stops simulating once the run is over", () => {
    const w = createWorld({ arena, seed: 1 });
    w.over = true;
    stepWorld(w);
    expect(w.tick).toBe(0);
  });

  it("uses a fixed timestep of 1/120s", () => {
    expect(FIXED_DT).toBeCloseTo(1 / 120);
  });
});

describe("combo lifecycle", () => {
  it("resets the combo once nothing is airborne", () => {
    const w = createWorld({ arena, seed: 1 });
    w.combo = 5;
    stepWorld(w);
    expect(w.combo).toBe(0);
  });

  it("mirrors the chain of the projectile currently in flight", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 0, y: -400 });
    p.chain = 5;
    stepWorld(w);
    expect(w.combo).toBe(5);
  });

  it("keeps two airborne chains separate rather than merging them", () => {
    const w = createWorld({ arena, seed: 1 });
    const a = spawnProjectile(w, "ember", { x: 150, y: 300 }, { x: 0, y: -400 });
    const b = spawnProjectile(w, "ember", { x: 250, y: 300 }, { x: 0, y: -400 });
    a.chain = 7;
    b.chain = 2;
    stepWorld(w);
    // The HUD shows the best chain in flight, and the smaller one is untouched.
    expect(w.combo).toBe(7);
    expect(b.chain).toBe(2);
  });

  it("damages an enemy when a launched critter collides with it", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnProjectile(w, "boulder", { x: 200, y: 400 }, { x: 0, y: -600 });
    const e = spawnEnemy(w, { x: 200, y: 340 }, 500, 16);
    for (let i = 0; i < 30; i++) stepWorld(w);
    expect(e.hp).toBeLessThan(500);
  });
});

describe("settled bumper plinking", () => {
  it("damages an enemy within range without any physical contact", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    // Far enough away that the circles never touch, but inside plink range.
    const e = spawnEnemy(w, { x: 200, y: 360 }, 1000, 14);

    for (let i = 0; i < PLINK_INTERVAL_TICKS * 2; i++) stepWorld(w);
    expect(e.hp).toBeLessThan(1000);
  });

  it("ignores enemies beyond plink range", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 40, y: 60 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    const e = spawnEnemy(w, { x: 360, y: 60 }, 1000, 14);

    for (let i = 0; i < PLINK_INTERVAL_TICKS * 2; i++) stepWorld(w);
    expect(e.hp).toBe(1000);
  });

  it("does not plink from airborne projectiles", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 0, y: -400 });
    const e = spawnEnemy(w, { x: 40, y: 40 }, 1000, 14);
    for (let i = 0; i < PLINK_INTERVAL_TICKS; i++) stepWorld(w);
    expect(e.hp).toBe(1000);
  });

  it("does not let plinking build combo", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    spawnEnemy(w, { x: 200, y: 360 }, 100000, 14);
    for (let i = 0; i < PLINK_INTERVAL_TICKS * 5; i++) stepWorld(w);
    expect(w.bestCombo).toBe(0);
  });
});

describe("hit cooldown", () => {
  it("does not re-damage a pair that stays in contact every step", () => {
    const w = createWorld({ arena, seed: 1 });
    // A settled bumper with an enemy parked on top of it: permanent overlap.
    const p = spawnProjectile(w, "boulder", { x: 200, y: 300 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    const e = spawnEnemy(w, { x: 200, y: 305 }, 100000, 16);

    stepWorld(w);
    const afterFirst = e.hp;
    expect(afterFirst).toBeLessThan(100000);

    // Well inside the cooldown window: no further damage.
    for (let i = 0; i < HIT_COOLDOWN_TICKS - 2; i++) stepWorld(w);
    expect(e.hp).toBe(afterFirst);
  });

  it("bounds sustained-contact damage far below once-per-step", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "boulder", { x: 200, y: 300 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    const e = spawnEnemy(w, { x: 200, y: 305 }, 100000, 16);

    for (let i = 0; i < 300; i++) stepWorld(w);
    // 300 steps at 1 hit/step would be ~300 hits; the cooldown caps it near 10.
    expect(p.hitsDealt).toBeLessThanOrEqual(12);
  });

  it("keeps the combo from ratcheting up off settled bumpers", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "boulder", { x: 200, y: 300 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    spawnEnemy(w, { x: 200, y: 305 }, 100000, 16);

    for (let i = 0; i < 600; i++) stepWorld(w);
    expect(w.bestCombo).toBe(0);
  });
});
