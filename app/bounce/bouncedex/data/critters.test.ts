import { describe, it, expect } from "vitest";
import { CRITTERS, BASE_CRITTERS, getCritter, EVOLVE_HIT_THRESHOLD } from "./critters";

describe("critter roster", () => {
  it("has 14 base critters", () => {
    expect(BASE_CRITTERS).toHaveLength(14);
  });

  it("has 42 total definitions (14 bases + 28 branch forms)", () => {
    expect(Object.keys(CRITTERS)).toHaveLength(42);
  });

  it("gives every base critter exactly two branch forms", () => {
    for (const base of BASE_CRITTERS) {
      expect(base.stage).toBe(1);
      expect(base.evolvesTo).not.toBeNull();
      expect(base.evolvesTo).toHaveLength(2);
    }
  });

  it("points every evolution target at a real stage-2 critter", () => {
    for (const base of BASE_CRITTERS) {
      for (const id of base.evolvesTo!) {
        const form = CRITTERS[id];
        expect(form, `missing evolution target ${id}`).toBeDefined();
        expect(form.stage).toBe(2);
      }
    }
  });

  it("never lets a stage-2 form evolve again (single evolution per spec)", () => {
    for (const def of Object.values(CRITTERS)) {
      if (def.stage === 2) expect(def.evolvesTo).toBeNull();
    }
  });

  it("gives every branch form a unique id used by exactly one base", () => {
    const targets = BASE_CRITTERS.flatMap((b) => [...b.evolvesTo!]);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("keys every entry by its own id", () => {
    for (const [key, def] of Object.entries(CRITTERS)) {
      expect(def.id).toBe(key);
    }
  });

  it("uses physically sane values throughout", () => {
    for (const def of Object.values(CRITTERS)) {
      expect(def.mass).toBeGreaterThan(0);
      expect(def.radius).toBeGreaterThan(0);
      expect(def.damage).toBeGreaterThan(0);
      expect(def.restitution).toBeGreaterThanOrEqual(0);
      expect(def.restitution).toBeLessThanOrEqual(1);
    }
  });

  it("makes evolved forms stronger than their base", () => {
    for (const base of BASE_CRITTERS) {
      for (const id of base.evolvesTo!) {
        expect(CRITTERS[id].damage).toBeGreaterThan(base.damage);
      }
    }
  });

  it("getCritter returns a definition and throws on unknown ids", () => {
    expect(getCritter("ember").id).toBe("ember");
    expect(() => getCritter("nope")).toThrow(/nope/);
  });

  it("exposes a sane evolution threshold", () => {
    expect(EVOLVE_HIT_THRESHOLD).toBe(8);
  });
});
