import { describe, it, expect } from "vitest";
import { add, sub, scale, dot, len, lenSq, norm } from "./vec";

describe("vec", () => {
  it("adds without mutating inputs", () => {
    const a = { x: 1, y: 2 };
    const b = { x: 3, y: 4 };
    expect(add(a, b)).toEqual({ x: 4, y: 6 });
    expect(a).toEqual({ x: 1, y: 2 });
  });

  it("subtracts", () => {
    expect(sub({ x: 5, y: 5 }, { x: 2, y: 1 })).toEqual({ x: 3, y: 4 });
  });

  it("scales", () => {
    expect(scale({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 });
  });

  it("dots", () => {
    expect(dot({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
  });

  it("computes length and squared length", () => {
    expect(len({ x: 3, y: 4 })).toBe(5);
    expect(lenSq({ x: 3, y: 4 })).toBe(25);
  });

  it("normalizes to unit length", () => {
    const n = norm({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(len(n)).toBeCloseTo(1);
  });

  it("normalizing a zero vector returns zero rather than NaN", () => {
    expect(norm({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});
