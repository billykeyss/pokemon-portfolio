import { describe, it, expect } from "vitest";
import { levelFor, paramsForLevel, seedForLevel, ARENA } from "./level";
import { GRUNT } from "../data/enemies";

describe("level curve", () => {
  it("opens gently — level one is a few grunts at base health", () => {
    const p = paramsForLevel(1);
    expect(p.enemies).toBeLessThanOrEqual(2);
    // Two swings, not three — the opening room teaches, it does not test.
    expect(p.enemyHp).toBeLessThan(GRUNT.hp);
  });

  it("climbs on both count and health", () => {
    expect(paramsForLevel(10).enemies).toBeGreaterThan(paramsForLevel(1).enemies);
    expect(paramsForLevel(10).enemyHp).toBeGreaterThan(paramsForLevel(1).enemyHp);
  });

  it("caps the count so a room stays readable", () => {
    for (const lv of [50, 200, 5000]) {
      expect(paramsForLevel(lv).enemies).toBeLessThanOrEqual(14);
    }
  });

  it("cycles the spawn shape so neighbouring levels never repeat", () => {
    expect(paramsForLevel(1).pattern).not.toBe(paramsForLevel(2).pattern);
    expect(paramsForLevel(2).pattern).not.toBe(paramsForLevel(3).pattern);
  });

  it("treats junk level numbers as level one", () => {
    for (const bad of [0, -7, 0.4, Number.NaN]) {
      expect(() => paramsForLevel(bad)).not.toThrow();
      expect(paramsForLevel(bad).enemies).toBeGreaterThan(0);
    }
  });
});

describe("seedForLevel", () => {
  it("gives neighbouring levels unrelated seeds", () => {
    expect(seedForLevel(8)).not.toBe(seedForLevel(9));
    expect(Math.abs(seedForLevel(8) - seedForLevel(9))).toBeGreaterThan(1000);
  });

  it("is stable for a given level", () => {
    expect(seedForLevel(12)).toBe(seedForLevel(12));
  });
});

describe("levelFor", () => {
  it("is deterministic — level 7 is always the same room", () => {
    expect(levelFor(7)).toEqual(levelFor(7));
  });

  it("returns the same cached object rather than rebuilding", () => {
    expect(levelFor(5)).toBe(levelFor(5));
  });

  it("spawns the promised number of enemies", () => {
    for (const lv of [1, 4, 9, 20]) {
      expect(levelFor(lv).spawns).toHaveLength(paramsForLevel(lv).enemies);
    }
  });

  it("keeps every spawn inside the room", () => {
    for (let lv = 1; lv <= 30; lv++) {
      for (const s of levelFor(lv).spawns) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(ARENA.width);
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(ARENA.height);
      }
    }
  });

  it("never spawns an enemy on top of the hero", () => {
    for (let lv = 1; lv <= 30; lv++) {
      const room = levelFor(lv);
      for (const s of room.spawns) {
        const d = Math.hypot(s.x - room.heroStart.x, s.y - room.heroStart.y);
        expect(d, `level ${lv} spawns a grunt ${Math.round(d)}px from the hero`).toBeGreaterThan(60);
      }
    }
  });

  it("gives different levels different rooms", () => {
    const a = JSON.stringify(levelFor(3).spawns);
    const b = JSON.stringify(levelFor(4).spawns);
    expect(a).not.toBe(b);
  });
});
