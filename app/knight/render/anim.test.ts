import { describe, it, expect } from "vitest";
import { poseFor, shakeFrom, SHAKE_TICKS, SHAKE_PEAK } from "./anim";
import type { Entity } from "../engine/types";

function entity(over: Partial<Entity> = {}): Entity {
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

describe("poseFor", () => {
  it("bobs while idle without drifting away", () => {
    const seen: number[] = [];
    for (let t = 0; t < 240; t++) seen.push(poseFor(entity(), t).offsetY);
    expect(Math.max(...seen)).toBeGreaterThan(0);
    expect(Math.min(...seen)).toBeLessThan(0);
    // A bob must stay small, or the sprite detaches from its hitbox.
    expect(Math.max(...seen.map(Math.abs))).toBeLessThan(4);
  });

  it("squashes and stretches while walking", () => {
    const walking = entity({ vel: { x: 120, y: 0 } });
    let sawSquash = false;
    let sawStretch = false;
    for (let t = 0; t < 240; t++) {
      const p = poseFor(walking, t);
      if (p.scaleY < 0.99) sawSquash = true;
      if (p.scaleY > 1.01) sawStretch = true;
    }
    expect(sawSquash && sawStretch).toBe(true);
  });

  it("tilts into the direction of travel", () => {
    const right = poseFor(entity({ vel: { x: 130, y: 0 } }), 10).tilt;
    const left = poseFor(entity({ vel: { x: -130, y: 0 } }), 10).tilt;
    expect(Math.sign(right)).toBe(-Math.sign(left));
    expect(right).not.toBe(0);
  });

  it("pulls back during wind-up and lunges when active", () => {
    const windup = poseFor(
      entity({ facing: { x: 1, y: 0 }, attack: { phase: "windup", startedAtTick: 0 } }),
      7,
    );
    const active = poseFor(
      entity({ facing: { x: 1, y: 0 }, attack: { phase: "active", startedAtTick: 0 } }),
      1,
    );
    expect(windup.offsetX).toBeLessThan(0);
    expect(active.offsetX).toBeGreaterThan(0);
  });

  it("flashes white on the tick it is hit and fades out", () => {
    const hit = entity({ hitAtTick: 100 });
    expect(poseFor(hit, 100).flash).toBeCloseTo(1, 1);
    expect(poseFor(hit, 108).flash).toBeLessThan(poseFor(hit, 101).flash);
    expect(poseFor(hit, 200).flash).toBe(0);
  });

  it("collapses on death", () => {
    const dead = entity({ deadAtTick: 50 });
    const early = poseFor(dead, 51);
    const late = poseFor(dead, 70);
    expect(late.scaleY).toBeLessThan(early.scaleY);
    expect(late.scaleY).toBeGreaterThanOrEqual(0);
  });

  it("is bounded in every state, so a sprite can never explode", () => {
    const states: Entity[] = [
      entity(),
      entity({ vel: { x: 400, y: 400 } }),
      entity({ attack: { phase: "windup", startedAtTick: 0 } }),
      entity({ attack: { phase: "active", startedAtTick: 0 } }),
      entity({ attack: { phase: "recover", startedAtTick: 0 } }),
      entity({ hitAtTick: 0 }),
      entity({ deadAtTick: 0 }),
    ];
    for (const e of states) {
      for (let t = 0; t < 200; t++) {
        const p = poseFor(e, t);
        expect(Number.isFinite(p.offsetX)).toBe(true);
        expect(Number.isFinite(p.offsetY)).toBe(true);
        expect(p.scaleX).toBeGreaterThan(0);
        expect(p.scaleX).toBeLessThan(2.5);
        expect(p.scaleY).toBeGreaterThanOrEqual(0);
        expect(p.scaleY).toBeLessThan(2.5);
        expect(Math.abs(p.tilt)).toBeLessThan(1);
        expect(p.flash).toBeGreaterThanOrEqual(0);
        expect(p.flash).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("shakeFrom", () => {
  it("is silent with no hit on record", () => {
    expect(shakeFrom(-1, 500)).toBe(0);
  });

  it("peaks on the hit tick and decays to nothing", () => {
    const peak = shakeFrom(100, 100);
    expect(peak).toBeGreaterThan(0);
    expect(shakeFrom(100, 100 + Math.floor(SHAKE_TICKS / 2))).toBeLessThan(peak);
    expect(shakeFrom(100, 100 + SHAKE_TICKS)).toBe(0);
  });

  it("stays gentle — a big shake reads as a tremor, not a knock", () => {
    for (let t = 0; t <= SHAKE_TICKS; t++) {
      expect(shakeFrom(0, t)).toBeLessThanOrEqual(SHAKE_PEAK);
    }
    expect(SHAKE_PEAK).toBeLessThanOrEqual(3);
  });

  it("ignores a hit tick in the future", () => {
    expect(shakeFrom(200, 100)).toBe(0);
  });
});
