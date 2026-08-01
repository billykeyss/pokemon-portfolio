import { describe, it, expect } from "vitest";
import { SPEEDS, DEFAULT_SPEED, nextSpeed, coerceSpeed } from "./speed";

describe("speed", () => {
  it("offers 1x, 2x, 4x and 10x", () => {
    expect(SPEEDS).toEqual([1, 2, 4, 10]);
  });

  it("starts at 1x", () => {
    expect(DEFAULT_SPEED).toBe(1);
  });

  it("cycles through every speed and wraps back to 1x", () => {
    let s: number = DEFAULT_SPEED;
    const visited: number[] = [];
    for (let i = 0; i < SPEEDS.length; i++) {
      visited.push(s);
      s = nextSpeed(s);
    }
    expect(visited).toEqual([...SPEEDS]);
    expect(s).toBe(1);
  });

  it("recovers from an unknown current speed", () => {
    expect(nextSpeed(7)).toBe(SPEEDS[0]);
  });

  it("coerces junk to the default", () => {
    expect(coerceSpeed(3)).toBe(1);
    expect(coerceSpeed("2")).toBe(1);
    expect(coerceSpeed(undefined)).toBe(1);
    expect(coerceSpeed(null)).toBe(1);
  });

  it("passes valid speeds through untouched", () => {
    for (const s of SPEEDS) expect(coerceSpeed(s)).toBe(s);
  });
});
