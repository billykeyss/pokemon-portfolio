import { describe, it, expect } from "vitest";
import { buildWave, isBossWave, laneX, LANES } from "./waves";
import { makeRng } from "@/app/game/_shared/rng";

describe("isBossWave", () => {
  it("is true every 10th wave", () => {
    expect(isBossWave(10)).toBe(true);
    expect(isBossWave(20)).toBe(true);
  });

  it("is false otherwise", () => {
    expect(isBossWave(1)).toBe(false);
    expect(isBossWave(9)).toBe(false);
    expect(isBossWave(11)).toBe(false);
  });

  it("is false at wave 0", () => {
    expect(isBossWave(0)).toBe(false);
  });
});

describe("laneX", () => {
  it("spreads lanes evenly across the arena", () => {
    const xs = Array.from({ length: LANES }, (_, i) => laneX(i, 400));
    expect(xs).toHaveLength(5);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    expect(xs[0]).toBeGreaterThan(0);
    expect(xs[xs.length - 1]).toBeLessThan(400);
  });
});

describe("buildWave", () => {
  it("is deterministic for a given seed", () => {
    expect(buildWave(7, makeRng(3))).toEqual(buildWave(7, makeRng(3)));
  });

  it("produces only basic enemies on wave 1", () => {
    const wave = buildWave(1, makeRng(1));
    expect(wave.length).toBeGreaterThan(0);
    expect(wave.every((e) => e.kind === "basic")).toBe(true);
  });

  it("grows in enemy count as waves progress", () => {
    const early = buildWave(1, makeRng(5)).length;
    const late = buildWave(15, makeRng(5)).length;
    expect(late).toBeGreaterThan(early);
  });

  it("grows in total HP as waves progress", () => {
    const total = (i: number) => buildWave(i, makeRng(5)).reduce((s, e) => s + e.hp, 0);
    expect(total(15)).toBeGreaterThan(total(1));
  });

  it("places every enemy in a valid lane", () => {
    for (let i = 1; i <= 30; i++) {
      for (const e of buildWave(i, makeRng(i))) {
        expect(e.lane).toBeGreaterThanOrEqual(0);
        expect(e.lane).toBeLessThan(LANES);
      }
    }
  });

  it("returns exactly one boss on a boss wave", () => {
    const wave = buildWave(10, makeRng(1));
    expect(wave.filter((e) => e.kind === "boss")).toHaveLength(1);
  });

  it("gives the boss substantially more HP than a basic enemy", () => {
    const boss = buildWave(10, makeRng(1)).find((e) => e.kind === "boss")!;
    const basic = buildWave(1, makeRng(1))[0];
    expect(boss.hp).toBeGreaterThan(basic.hp * 5);
  });

  it("introduces armored enemies by wave 4 and fast ones by wave 6", () => {
    const kindsBy = (max: number) => {
      const s = new Set<string>();
      for (let i = 1; i <= max; i++) for (const e of buildWave(i, makeRng(i))) s.add(e.kind);
      return s;
    };
    expect(kindsBy(5).has("armored")).toBe(true);
    expect(kindsBy(8).has("fast")).toBe(true);
  });

  it("always produces positive hp and radius", () => {
    for (let i = 1; i <= 30; i++) {
      for (const e of buildWave(i, makeRng(i))) {
        expect(e.hp).toBeGreaterThan(0);
        expect(e.radius).toBeGreaterThan(0);
      }
    }
  });
});

describe("spawn stagger", () => {
  it("spreads a wave vertically so it does not enter as one stack", () => {
    const wave = buildWave(12, makeRng(3));
    const offsets = new Set(wave.map((e) => e.yOffset));
    expect(wave.length).toBeGreaterThan(3);
    // A rigid column would share a single offset.
    expect(offsets.size).toBeGreaterThan(wave.length / 2);
  });

  it("jitters horizontally without leaving the lane", () => {
    for (const e of buildWave(12, makeRng(9))) {
      expect(Math.abs(e.xJitter)).toBeLessThanOrEqual(10);
    }
  });

  it("keeps the stagger deterministic", () => {
    expect(buildWave(9, makeRng(5))).toEqual(buildWave(9, makeRng(5)));
  });

  it("spawns the boss dead centre with no stagger", () => {
    const boss = buildWave(10, makeRng(1))[0];
    expect(boss.yOffset).toBe(0);
    expect(boss.xJitter).toBe(0);
  });
});
