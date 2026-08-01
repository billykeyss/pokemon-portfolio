import { describe, it, expect } from "vitest";
import {
  integrate,
  isSettled,
  SETTLE_SPEED,
  collideWalls,
  collidePair,
} from "./physics";
import type { Arena, Body } from "./types";

function makeBody(over: Partial<Body> = {}): Body {
  return {
    id: 1,
    kind: "projectile",
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    radius: 10,
    mass: 1,
    restitution: 0.8,
    hp: 1,
    critterId: null,
    hitsDealt: 0,
    chain: 0,
    settled: false,
    phasesLeft: 0,
    hasSplit: false,
    attachedTo: null,
    evolvedAtTick: -1,
    charge: 0,
    ...over,
  };
}

describe("integrate", () => {
  it("advances position by velocity * dt", () => {
    const b = makeBody({ vel: { x: 100, y: 50 } });
    integrate(b, 0.1, 0, 1);
    expect(b.pos.x).toBeCloseTo(10);
    expect(b.pos.y).toBeCloseTo(5);
  });

  it("applies gravity to vertical velocity", () => {
    const b = makeBody();
    integrate(b, 0.5, 200, 1);
    expect(b.vel.y).toBeCloseTo(100);
  });

  it("applies damping to velocity", () => {
    const b = makeBody({ vel: { x: 100, y: 0 } });
    integrate(b, 1, 0, 0.5);
    expect(b.vel.x).toBeCloseTo(50);
  });

  it("does not move settled bodies", () => {
    const b = makeBody({ settled: true, vel: { x: 100, y: 100 } });
    integrate(b, 0.1, 500, 1);
    expect(b.pos).toEqual({ x: 0, y: 0 });
  });
});

describe("isSettled", () => {
  it("is true below the settle speed", () => {
    expect(isSettled(makeBody({ vel: { x: SETTLE_SPEED - 1, y: 0 } }))).toBe(true);
  });

  it("is false above the settle speed", () => {
    expect(isSettled(makeBody({ vel: { x: SETTLE_SPEED + 1, y: 0 } }))).toBe(false);
  });
});

const ARENA: Arena = { width: 400, height: 700 };

describe("collideWalls", () => {
  it("reflects off the left wall and reports contact", () => {
    const b = makeBody({ pos: { x: 5, y: 100 }, vel: { x: -100, y: 0 }, radius: 10, restitution: 0.5 });
    expect(collideWalls(b, ARENA)).toBe(true);
    expect(b.vel.x).toBeCloseTo(50);
    expect(b.pos.x).toBe(10);
  });

  it("reflects off the right wall", () => {
    const b = makeBody({ pos: { x: 395, y: 100 }, vel: { x: 100, y: 0 }, radius: 10, restitution: 1 });
    expect(collideWalls(b, ARENA)).toBe(true);
    expect(b.vel.x).toBeCloseTo(-100);
    expect(b.pos.x).toBe(390);
  });

  it("reflects off the top wall", () => {
    const b = makeBody({ pos: { x: 200, y: 2 }, vel: { x: 0, y: -80 }, radius: 10, restitution: 0.5 });
    expect(collideWalls(b, ARENA)).toBe(true);
    expect(b.vel.y).toBeCloseTo(40);
  });

  it("ignores the bottom edge", () => {
    const b = makeBody({ pos: { x: 200, y: 699 }, vel: { x: 0, y: 100 }, radius: 10 });
    expect(collideWalls(b, ARENA)).toBe(false);
  });

  it("reports no contact in open space", () => {
    const b = makeBody({ pos: { x: 200, y: 300 }, vel: { x: 10, y: 10 } });
    expect(collideWalls(b, ARENA)).toBe(false);
  });
});

describe("collidePair", () => {
  it("reports no contact when apart", () => {
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10 });
    const b = makeBody({ id: 2, pos: { x: 100, y: 0 }, radius: 10 });
    expect(collidePair(a, b)).toBe(false);
  });

  it("separates overlapping bodies", () => {
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, vel: { x: 50, y: 0 } });
    const b = makeBody({ id: 2, pos: { x: 15, y: 0 }, radius: 10, vel: { x: 0, y: 0 } });
    expect(collidePair(a, b)).toBe(true);
    const dx = b.pos.x - a.pos.x;
    expect(Math.abs(dx)).toBeGreaterThanOrEqual(20 - 1e-6);
  });

  it("conserves momentum for equal masses in a head-on elastic hit", () => {
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, vel: { x: 50, y: 0 }, mass: 1, restitution: 1 });
    const b = makeBody({ id: 2, pos: { x: 19, y: 0 }, radius: 10, vel: { x: -50, y: 0 }, mass: 1, restitution: 1 });
    collidePair(a, b);
    expect(a.vel.x + b.vel.x).toBeCloseTo(0);
    expect(a.vel.x).toBeLessThan(0);
    expect(b.vel.x).toBeGreaterThan(0);
  });

  it("treats a settled body as immovable (infinite mass)", () => {
    const settled = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, vel: { x: 0, y: 0 }, settled: true });
    const moving = makeBody({ id: 2, pos: { x: 19, y: 0 }, radius: 10, vel: { x: -50, y: 0 }, restitution: 1 });
    collidePair(settled, moving);
    expect(settled.pos).toEqual({ x: 0, y: 0 });
    expect(settled.vel).toEqual({ x: 0, y: 0 });
    expect(moving.vel.x).toBeGreaterThan(0);
  });

  it("separates two settled bumpers without setting them in motion", () => {
    // Bumpers used to be skipped entirely when both were settled, so a critter
    // that came to rest inside another stayed merged with it for the whole run.
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, settled: true });
    const b = makeBody({ id: 2, pos: { x: 15, y: 0 }, radius: 10, settled: true });

    expect(collidePair(a, b)).toBe(true);
    expect(b.pos.x - a.pos.x).toBeCloseTo(20);
    expect(a.vel).toEqual({ x: 0, y: 0 });
    expect(b.vel).toEqual({ x: 0, y: 0 });
  });

  it("leaves settled bumpers alone once they are clear of each other", () => {
    const a = makeBody({ id: 1, pos: { x: 0, y: 0 }, radius: 10, settled: true });
    const b = makeBody({ id: 2, pos: { x: 40, y: 0 }, radius: 10, settled: true });
    expect(collidePair(a, b)).toBe(false);
    expect(a.pos.x).toBe(0);
  });

  it("resolves perfectly coincident settled bumpers to a finite position", () => {
    const a = makeBody({ id: 1, pos: { x: 50, y: 50 }, radius: 10, settled: true });
    const b = makeBody({ id: 2, pos: { x: 50, y: 50 }, radius: 10, settled: true });
    collidePair(a, b);
    expect(Number.isFinite(a.pos.x)).toBe(true);
    expect(Number.isFinite(b.pos.x)).toBe(true);
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)).toBeCloseTo(20);
  });
});

describe("floor reflection", () => {
  it("bounces a critter off the floor when asked", () => {
    const b = makeBody({ pos: { x: 200, y: 698 }, vel: { x: 0, y: 400 }, radius: 10, restitution: 0.9 });
    expect(collideWalls(b, ARENA, 1, true)).toBe(true);
    expect(b.vel.y).toBeLessThan(0);
    expect(b.pos.y).toBe(ARENA.height - 10);
  });

  it("lets enemies through the floor so they can reach the nest", () => {
    const b = makeBody({ pos: { x: 200, y: 698 }, vel: { x: 0, y: 400 }, radius: 10 });
    expect(collideWalls(b, ARENA, 1, false)).toBe(false);
    expect(b.vel.y).toBeGreaterThan(0);
  });
});

describe("floor is springy", () => {
  it("returns more energy than a soft critter's own restitution would", () => {
    const soft = makeBody({ pos: { x: 200, y: 698 }, vel: { x: 0, y: 400 }, radius: 10, restitution: 0.35 });
    collideWalls(soft, ARENA, 1, true);
    // A plain reflection would give back only 0.35 * 400 = 140.
    expect(Math.abs(soft.vel.y)).toBeGreaterThan(300);
  });

  it("still never returns more than it received", () => {
    const b = makeBody({ pos: { x: 200, y: 698 }, vel: { x: 0, y: 400 }, radius: 10, restitution: 1 });
    collideWalls(b, ARENA, 5, true);
    expect(Math.abs(b.vel.y)).toBeLessThanOrEqual(400);
  });
});
