import { describe, it, expect } from "vitest";
import { createWorld, spawnProjectile, spawnEnemy } from "./world";
import {
  applyImpact,
  comboDamage,
  pendingEvolution,
  applyEvolution,
  COMBO_DAMAGE_CAP,
  autoEvolveDecided,
} from "./combat";
import { EVOLVE_HIT_THRESHOLD } from "@/app/game/_shared/critters";

const arena = { width: 400, height: 700 };

describe("comboDamage", () => {
  it("returns base damage at combo 0", () => {
    expect(comboDamage(10, 0)).toBe(10);
  });

  it("scales up with combo", () => {
    expect(comboDamage(10, 3)).toBeGreaterThan(comboDamage(10, 1));
  });

  it("stops scaling past the damage cap so long chains cannot run away", () => {
    expect(comboDamage(10, COMBO_DAMAGE_CAP)).toBe(
      comboDamage(10, COMBO_DAMAGE_CAP * 10),
    );
  });

  it("respects a custom combo step (the MOMENTUM upgrade)", () => {
    expect(comboDamage(10, 4, 0.5)).toBeGreaterThan(comboDamage(10, 4, 0.25));
  });

  it("always returns a whole number", () => {
    for (let c = 0; c < 20; c++) {
      expect(Number.isInteger(comboDamage(7, c))).toBe(true);
    }
  });
});

describe("applyImpact", () => {
  it("damages an enemy and increments the combo", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    const e = spawnEnemy(w, { x: 200, y: 300 }, 100, 14);
    const ev = applyImpact(w, p, e)!;
    expect(ev.damage).toBeGreaterThan(0);
    expect(e.hp).toBeLessThan(100);
    expect(w.combo).toBe(1);
  });

  it("credits the attacker with a hit dealt", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    const e = spawnEnemy(w, { x: 200, y: 300 }, 100, 14);
    applyImpact(w, p, e);
    expect(p.hitsDealt).toBe(1);
  });

  it("reports a kill and removes the enemy when HP reaches zero", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    const e = spawnEnemy(w, { x: 200, y: 300 }, 1, 14);
    const ev = applyImpact(w, p, e)!;
    expect(ev.killed).toBe(true);
    expect(w.bodies).not.toContain(e);
  });

  it("tracks the best combo across a run", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    for (let i = 0; i < 4; i++) {
      applyImpact(w, p, spawnEnemy(w, { x: 200, y: 300 }, 100, 14));
    }
    expect(w.bestCombo).toBe(4);
  });

  it("ignores impacts where the attacker is not a critter", () => {
    const w = createWorld({ arena, seed: 1 });
    const a = spawnEnemy(w, { x: 200, y: 300 }, 10, 14);
    const b = spawnEnemy(w, { x: 220, y: 300 }, 10, 14);
    expect(applyImpact(w, a, b)).toBeNull();
  });

  it("does not build combo for settled bumpers, only airborne projectiles", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    const e = spawnEnemy(w, { x: 200, y: 300 }, 100, 14);
    const ev = applyImpact(w, p, e)!;
    expect(ev.damage).toBeGreaterThan(0);
    expect(e.hp).toBeLessThan(100);
    expect(w.combo).toBe(0);
  });

  it("ignores impacts on non-enemies", () => {
    const w = createWorld({ arena, seed: 1 });
    const a = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -1 });
    const b = spawnProjectile(w, "ember", { x: 230, y: 400 }, { x: 0, y: -1 });
    expect(applyImpact(w, a, b)).toBeNull();
  });
});

describe("evolution", () => {
  it("reports no pending evolution below the hit threshold", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD - 1;
    expect(pendingEvolution(w)).toBeNull();
  });

  it("reports a pending evolution with both branch options at the threshold", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    const ev = pendingEvolution(w)!;
    expect(ev.bodyId).toBe(p.id);
    expect(ev.fromId).toBe("ember");
    expect(ev.options).toEqual(["blaze", "cinder"]);
  });

  it("does not offer evolution to an unsettled projectile", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: -300 });
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    expect(pendingEvolution(w)).toBeNull();
  });

  it("swaps the body to its evolved form and resets the hit counter", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    applyEvolution(w, p.id, "blaze");
    expect(p.critterId).toBe("blaze");
    expect(p.hitsDealt).toBe(0);
    expect(p.radius).toBe(13);
  });

  it("never offers a second evolution to an already-evolved form", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    applyEvolution(w, p.id, "blaze");
    p.hitsDealt = EVOLVE_HIT_THRESHOLD * 3;
    expect(pendingEvolution(w)).toBeNull();
  });

  it("rejects an evolution target that is not one of the body's branches", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    expect(() => applyEvolution(w, p.id, "torrent")).toThrow();
  });
});

describe("branch memory (evolution dialog spam)", () => {
  it("asks once per line, then stops asking for that line", () => {
    const w = createWorld({ arena, seed: 1 });
    const settle = (id: string) => {
      const p = spawnProjectile(w, id, { x: 200, y: 400 }, { x: 0, y: 0 });
      p.settled = true;
      p.kind = "settled";
      p.hitsDealt = EVOLVE_HIT_THRESHOLD;
      return p;
    };

    const first = settle("ember");
    expect(pendingEvolution(w)?.fromId).toBe("ember");

    applyEvolution(w, first.id, "blaze");
    settle("ember");
    settle("ember");
    expect(pendingEvolution(w)).toBeNull();
  });

  it("auto-evolves later critters down the branch already chosen", () => {
    const w = createWorld({ arena, seed: 1 });
    w.branchChoices.ember = "cinder";

    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;

    expect(autoEvolveDecided(w)).toBe(1);
    expect(p.critterId).toBe("cinder");
  });

  it("leaves undecided lines alone for the player to choose", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;

    expect(autoEvolveDecided(w)).toBe(0);
    expect(p.critterId).toBe("ember");
  });

  it("still asks separately for a different critter line", () => {
    const w = createWorld({ arena, seed: 1 });
    w.branchChoices.ember = "blaze";

    const p = spawnProjectile(w, "sprout", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;

    expect(pendingEvolution(w)?.fromId).toBe("sprout");
  });

  it("records every form reached for the Dex", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    applyEvolution(w, p.id, "blaze");
    expect(w.discovered).toContain("blaze");
  });
});

describe("evolution feedback", () => {
  it("stamps the tick so the renderer can flash the critter", () => {
    const w = createWorld({ arena, seed: 1 });
    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;
    expect(p.evolvedAtTick).toBe(-1);

    w.tick = 500;
    applyEvolution(w, p.id, "blaze");
    expect(p.evolvedAtTick).toBe(500);
  });

  it("stamps silent auto-evolutions too, not just prompted ones", () => {
    // The vast majority of evolutions in a run are automatic; if only the
    // prompted ones flashed, evolution would look broken.
    const w = createWorld({ arena, seed: 1 });
    w.branchChoices.ember = "cinder";
    w.tick = 900;

    const p = spawnProjectile(w, "ember", { x: 200, y: 400 }, { x: 0, y: 0 });
    p.settled = true;
    p.kind = "settled";
    p.hitsDealt = EVOLVE_HIT_THRESHOLD;

    expect(autoEvolveDecided(w)).toBe(1);
    expect(p.evolvedAtTick).toBe(900);
  });
});
