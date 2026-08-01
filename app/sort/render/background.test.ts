import { describe, expect, it } from "vitest";
import { bubbleAt, bubbleField, sparkleAlpha, sparkleField } from "./background";

const W = 400;
const H = 600;

describe("bubbleField", () => {
  it("makes the requested number", () => {
    expect(bubbleField(12)).toHaveLength(12);
  });

  it("is identical between calls, so a remount does not reshuffle", () => {
    expect(bubbleField(8)).toEqual(bubbleField(8));
  });

  it("differs between seeds", () => {
    expect(bubbleField(8, 1)).not.toEqual(bubbleField(8, 2));
  });

  it("keeps every bubble faint enough to sit behind the game", () => {
    for (const b of bubbleField(30)) {
      expect(b.alpha).toBeGreaterThan(0);
      expect(b.alpha).toBeLessThan(0.2);
    }
  });

  it("gives every bubble a positive size and upward speed", () => {
    for (const b of bubbleField(30)) {
      expect(b.r).toBeGreaterThan(0);
      expect(b.speed).toBeGreaterThan(0);
    }
  });

  it("handles a request for none", () => {
    expect(bubbleField(0)).toEqual([]);
  });
});

describe("bubbleAt", () => {
  const bubble = bubbleField(1)[0];

  it("rises over time", () => {
    const early = bubbleAt(bubble, 0, W, H).y;
    const later = bubbleAt(bubble, 1, W, H).y;
    expect(later).toBeLessThan(early);
  });

  it("wraps instead of running off forever", () => {
    // Sampled across many cycles, it must stay in a band around the canvas
    // rather than drifting away — the field never restarts.
    for (let t = 0; t < 200; t += 3.7) {
      const { y, r } = bubbleAt(bubble, t, W, H);
      expect(y).toBeGreaterThan(-r * 4);
      expect(y).toBeLessThan(H + r * 4);
    }
  });

  it("stays roughly within the canvas horizontally", () => {
    for (let t = 0; t < 40; t += 1.3) {
      const { x } = bubbleAt(bubble, t, W, H);
      expect(x).toBeGreaterThan(-W * 0.1);
      expect(x).toBeLessThan(W * 1.1);
    }
  });

  it("sways rather than rising in a straight line", () => {
    const xs = [];
    for (let t = 0; t < 12; t += 0.5) xs.push(bubbleAt(bubble, t, W, H).x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0);
  });

  it("scales its radius with canvas width", () => {
    expect(bubbleAt(bubble, 0, 800, H).r).toBeCloseTo(bubbleAt(bubble, 0, 400, H).r * 2);
  });
});

describe("sparkleField", () => {
  it("is deterministic", () => {
    expect(sparkleField(10)).toEqual(sparkleField(10));
  });

  it("places every sparkle inside the canvas", () => {
    for (const s of sparkleField(40)) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(1);
    }
  });
});

describe("sparkleAlpha", () => {
  const sparkle = sparkleField(1)[0];

  it("stays within range", () => {
    for (let t = 0; t < 20; t += 0.17) {
      const a = sparkleAlpha(sparkle, t);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it("spends part of its cycle fully dark, so it reads as a twinkle", () => {
    let dark = 0;
    for (let t = 0; t < 20; t += 0.05) {
      if (sparkleAlpha(sparkle, t) === 0) dark++;
    }
    expect(dark).toBeGreaterThan(0);
  });

  it("reaches full brightness at some point", () => {
    let brightest = 0;
    for (let t = 0; t < 20; t += 0.02) {
      brightest = Math.max(brightest, sparkleAlpha(sparkle, t));
    }
    expect(brightest).toBeGreaterThan(0.9);
  });
});
