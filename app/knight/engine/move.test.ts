import { describe, it, expect } from "vitest";
import { steerHero, isStandingStill, HERO_SPEED, STOP_SPEED } from "./move";
import type { Entity } from "./types";

function hero(over: Partial<Entity> = {}): Entity {
  return {
    id: 1,
    kind: "hero",
    pos: { x: 100, y: 100 },
    vel: { x: 0, y: 0 },
    radius: 12,
    hp: 5,
    maxHp: 5,
    facing: { x: 0, y: 1 },
    hitAtTick: -1,
    deadAtTick: -1,
    attack: { phase: "idle", startedAtTick: 0 },
    ...over,
  };
}

describe("steerHero", () => {
  it("accelerates toward the target rather than snapping", () => {
    const h = hero();
    steerHero(h, { x: 300, y: 100 }, 1 / 120);
    expect(h.vel.x).toBeGreaterThan(0);
    // One step must not reach full speed, or movement feels weightless.
    expect(h.vel.x).toBeLessThan(HERO_SPEED);
  });

  it("converges on full speed when held", () => {
    const h = hero();
    for (let i = 0; i < 240; i++) steerHero(h, { x: 300, y: 100 }, 1 / 120);
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeCloseTo(HERO_SPEED, 0);
  });

  it("decelerates to a stop when the target is released", () => {
    const h = hero({ vel: { x: HERO_SPEED, y: 0 } });
    for (let i = 0; i < 240; i++) steerHero(h, null, 1 / 120);
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeLessThan(1);
  });

  it("faces the direction of travel", () => {
    const h = hero();
    for (let i = 0; i < 30; i++) steerHero(h, { x: 100, y: 400 }, 1 / 120);
    expect(h.facing.y).toBeGreaterThan(0.9);
  });

  it("keeps facing after stopping rather than snapping to a default", () => {
    const h = hero();
    for (let i = 0; i < 30; i++) steerHero(h, { x: 400, y: 100 }, 1 / 120);
    const facedX = h.facing.x;
    for (let i = 0; i < 240; i++) steerHero(h, null, 1 / 120);
    expect(h.facing.x).toBeCloseTo(facedX, 1);
  });

  it("does not jitter when the target is already underfoot", () => {
    const h = hero();
    for (let i = 0; i < 60; i++) steerHero(h, { x: 100, y: 100 }, 1 / 120);
    expect(Math.hypot(h.vel.x, h.vel.y)).toBeLessThan(STOP_SPEED);
  });
});

describe("isStandingStill", () => {
  it("is true below the stop speed", () => {
    expect(isStandingStill(hero({ vel: { x: STOP_SPEED - 1, y: 0 } }))).toBe(true);
  });

  it("is false above it", () => {
    expect(isStandingStill(hero({ vel: { x: STOP_SPEED + 1, y: 0 } }))).toBe(false);
  });
});
