import { describe, it, expect } from "vitest";
import { createWorld, spawnProjectile, spawnEnemy, bumperAt, dropBumper } from "./world";

const arena = { width: 400, height: 700 };
const fresh = () => createWorld({ arena, seed: 1 });

function settle(w: ReturnType<typeof fresh>, id: string, x: number, y: number) {
  const b = spawnProjectile(w, id, { x, y }, { x: 0, y: 0 });
  b.settled = true;
  b.kind = "settled";
  return b;
}

describe("bumperAt", () => {
  it("finds a settled bumper under the point", () => {
    const w = fresh();
    const b = settle(w, "ember", 200, 300);
    expect(bumperAt(w, 200, 300)?.id).toBe(b.id);
  });

  it("allows a little slop for fingertips", () => {
    const w = fresh();
    const b = settle(w, "ember", 200, 300);
    expect(bumperAt(w, 200 + b.radius + 6, 300)?.id).toBe(b.id);
  });

  it("returns null on empty space", () => {
    const w = fresh();
    settle(w, "ember", 50, 50);
    expect(bumperAt(w, 350, 600)).toBeNull();
  });

  it("ignores airborne critters and enemies", () => {
    const w = fresh();
    spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 0, y: -400 });
    spawnEnemy(w, { x: 100, y: 100 }, 10, 14);
    expect(bumperAt(w, 200, 300)).toBeNull();
    expect(bumperAt(w, 100, 100)).toBeNull();
  });

  it("picks the closest when bumpers overlap the touch", () => {
    const w = fresh();
    settle(w, "ember", 200, 300);
    const near = settle(w, "ember", 214, 300);
    expect(bumperAt(w, 216, 300)?.id).toBe(near.id);
  });
});

describe("dropBumper", () => {
  it("merges two of the same critter and pools their progress", () => {
    const w = fresh();
    const a = settle(w, "ember", 200, 300);
    const b = settle(w, "ember", 206, 300);
    a.hitsDealt = 3;
    b.hitsDealt = 4;

    expect(dropBumper(w, a.id)).toBe(true);
    expect(a.hitsDealt).toBe(7);
    expect(w.bodies).not.toContain(b);
  });

  it("does not merge different critters", () => {
    const w = fresh();
    const a = settle(w, "ember", 200, 300);
    const b = settle(w, "sprout", 206, 300);
    expect(dropBumper(w, a.id)).toBe(false);
    expect(w.bodies).toContain(b);
  });

  it("does not merge when they are not touching", () => {
    const w = fresh();
    const a = settle(w, "ember", 100, 300);
    settle(w, "ember", 300, 300);
    expect(dropBumper(w, a.id)).toBe(false);
    expect(w.bodies).toHaveLength(2);
  });

  it("is a no-op for an unknown or airborne body", () => {
    const w = fresh();
    const flying = spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 0, y: -1 });
    expect(dropBumper(w, flying.id)).toBe(false);
    expect(dropBumper(w, 9999)).toBe(false);
  });
});
