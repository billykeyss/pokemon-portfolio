import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, stepWorld } from "./world";
import { steerEnemy } from "./ai";
import { GRUNT } from "../data/enemies";

const arena = { width: 360, height: 560 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("steerEnemy", () => {
  it("closes on the hero", () => {
    const w = fresh();
    spawnHero(w, { x: 180, y: 500 });
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 120; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(e.vel.y).toBeGreaterThan(0);
  });

  it("stands still with no hero to chase", () => {
    const w = fresh();
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 60; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeLessThan(1);
  });

  it("ignores a dead hero", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 500 });
    h.deadAtTick = 0;
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 60; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeLessThan(1);
  });

  it("never exceeds its own speed", () => {
    const w = fresh();
    spawnHero(w, { x: 180, y: 500 });
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 600; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeLessThanOrEqual(GRUNT.speed + 1);
  });

  it("faces the hero", () => {
    const w = fresh();
    spawnHero(w, { x: 180, y: 500 });
    const e = spawnEnemy(w, { x: 180, y: 100 }, GRUNT.hp);
    for (let i = 0; i < 60; i++) steerEnemy(w, e, GRUNT, 1 / 120);
    expect(e.facing.y).toBeGreaterThan(0.8);
  });
});

describe("touch damage", () => {
  it("hurts the hero on contact", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 180, y: 300 }, GRUNT.hp);
    stepWorld(w);
    expect(h.hp).toBeLessThan(h.maxHp);
  });

  it("cannot chain-delete the hero, thanks to i-frames", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    for (let i = 0; i < 4; i++) spawnEnemy(w, { x: 180, y: 300 }, GRUNT.hp);
    stepWorld(w);
    expect(h.hp).toBe(h.maxHp - GRUNT.touchDamage);
  });

  it("does not hurt the hero at a distance", () => {
    const w = fresh();
    const h = spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 40, y: 40 }, GRUNT.hp);
    stepWorld(w);
    expect(h.hp).toBe(h.maxHp);
  });
});
