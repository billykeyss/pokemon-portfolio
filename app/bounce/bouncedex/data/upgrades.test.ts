import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { UPGRADES, rollUpgrades, defaultMods, UPGRADE_EVERY_WAVES } from "./upgrades";
import { makeRng } from "@/app/game/_shared/rng";

const ENGINE_DIR = join(__dirname, "..", "engine");

/**
 * Everything that may consume a run modifier: the simulation itself, plus the
 * React shell that owns the launcher (fire rate, queue, launch power).
 */
const CONSUMER_SOURCES = [
  ...readdirSync(ENGINE_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => readFileSync(join(ENGINE_DIR, f), "utf8")),
  readFileSync(join(__dirname, "..", "page.tsx"), "utf8"),
];

describe("upgrades", () => {
  it("offers a pool of at least six upgrades", () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(6);
  });

  it("gives every upgrade a unique id", () => {
    const ids = UPGRADES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every upgrade a name and description", () => {
    for (const u of UPGRADES) {
      expect(u.name.length).toBeGreaterThan(0);
      expect(u.description.length).toBeGreaterThan(0);
    }
  });

  it("rolls three distinct upgrades by default", () => {
    const picks = rollUpgrades(makeRng(1));
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => p.id)).size).toBe(3);
  });

  it("is deterministic for a given seed", () => {
    const a = rollUpgrades(makeRng(9)).map((u) => u.id);
    const b = rollUpgrades(makeRng(9)).map((u) => u.id);
    expect(a).toEqual(b);
  });

  it("never returns more upgrades than the pool holds", () => {
    expect(rollUpgrades(makeRng(1), 999)).toHaveLength(UPGRADES.length);
  });

  it("returns a new mods object rather than mutating the input", () => {
    const base = defaultMods();
    const frozen = { ...base };
    for (const u of UPGRADES) u.apply(base);
    expect(base).toEqual(frozen);
  });

  it("changes at least one field for every upgrade", () => {
    const base = defaultMods();
    for (const u of UPGRADES) {
      expect(u.apply(base), `${u.id} was a no-op`).not.toEqual(base);
    }
  });

  it("offers upgrades every five waves", () => {
    expect(UPGRADE_EVERY_WAVES).toBe(5);
  });

  it("offers a pool deep enough that choices stay varied", () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(18);
  });

  it("has every RunMods field actually read by the simulation", () => {
    // The original build shipped three upgrades whose fields nothing read, so
    // picking them did nothing at all. This pins that shut: every field must
    // be referenced by the simulation or by the shell that owns the launcher.
    const consumers = CONSUMER_SOURCES.join("\n");
    for (const field of Object.keys(defaultMods())) {
      expect(consumers, `mods.${field} is never read by anything`).toContain(
        `mods.${field}`,
      );
    }
  });

  it("has every upgrade change a field the simulation reads", () => {
    const base = defaultMods();
    for (const u of UPGRADES) {
      const after = u.apply(base);
      const touched = (Object.keys(base) as (keyof typeof base)[]).filter(
        (k) => after[k] !== base[k],
      );
      expect(touched.length, `${u.id} changes nothing`).toBeGreaterThan(0);
    }
  });
});
