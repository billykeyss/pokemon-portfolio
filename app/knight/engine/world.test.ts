import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, heroOf, stepWorld, FIXED_DT } from "./world";

const arena = { width: 360, height: 560 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("createWorld", () => {
  it("starts empty, alive and at tick 0", () => {
    const w = fresh();
    expect(w.tick).toBe(0);
    expect(w.entities).toHaveLength(0);
    expect(w.over).toBe(false);
    expect(w.moveTarget).toBeNull();
  });

  it("uses a fixed timestep of 1/120s", () => {
    expect(FIXED_DT).toBeCloseTo(1 / 120);
  });
});

describe("spawning", () => {
  it("assigns unique ids", () => {
    const w = fresh();
    const a = spawnHero(w, { x: 180, y: 400 });
    const b = spawnEnemy(w, { x: 100, y: 100 }, 30);
    expect(a.id).not.toBe(b.id);
    expect(w.entities).toHaveLength(2);
  });

  it("finds the hero", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 400 });
    expect(heroOf(w)?.id).toBe(h.id);
  });

  it("returns null when there is no hero", () => {
    const w = fresh();
    spawnEnemy(w, { x: 10, y: 10 }, 5);
    expect(heroOf(w)).toBeNull();
  });

  it("starts entities idle and unhurt", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 400 });
    expect(h.attack.phase).toBe("idle");
    expect(h.hitAtTick).toBe(-1);
    expect(h.deadAtTick).toBe(-1);
    expect(h.hp).toBe(h.maxHp);
  });
});

describe("stepWorld", () => {
  it("advances the tick counter by exactly one", () => {
    const w = fresh();
    stepWorld(w);
    expect(w.tick).toBe(1);
  });

  it("stops simulating once the run is over", () => {
    const w = fresh();
    w.over = true;
    stepWorld(w);
    expect(w.tick).toBe(0);
  });

  it("keeps entities inside the arena", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 5, y: 5 });
    h.vel = { x: -9999, y: -9999 };
    stepWorld(w);
    expect(h.pos.x).toBeGreaterThanOrEqual(h.radius);
    expect(h.pos.y).toBeGreaterThanOrEqual(h.radius);
  });

  it("clamps entities to the far edges too", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 350, y: 550 });
    h.vel = { x: 9999, y: 9999 };
    stepWorld(w);
    expect(h.pos.x).toBeLessThanOrEqual(arena.width - h.radius);
    expect(h.pos.y).toBeLessThanOrEqual(arena.height - h.radius);
  });

  it("is deterministic for a given seed", () => {
    const run = () => {
      const w = createWorld({ arena, seed: 99 });
      spawnHero(w, { x: 180, y: 400 });
      spawnEnemy(w, { x: 120, y: 120 }, 30);
      w.moveTarget = { x: 300, y: 200 };
      for (let i = 0; i < 400; i++) stepWorld(w);
      return JSON.stringify(w);
    };
    expect(run()).toEqual(run());
  });

  it("ends the run when the hero dies", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 400 });
    h.hp = 0;
    stepWorld(w);
    expect(w.over).toBe(true);
  });
});
