import { describe, it, expect } from "vitest";
// This import must come first, and must be "./coins" — not "./world". It pins
// the dangerous load order for the value-level cycle between the two:
// coins.ts imports heroOf from world.ts, and world.ts imports
// dropCoins/updateCoins back from coins.ts. See stats-cycle.test.ts for the
// same hazard shape, which once left BASE_STATS undefined/NaN at load time.
// This cycle is believed safe because both directions cross only hoisted
// `function` declarations — never a module-level `const` whose initialiser
// reads a value from the other side — but that is exactly what the earlier,
// broken cycle looked like from the outside. This file exists so a
// reintroduced const-level dependency fails here, with "./coins" as the very
// first module touched, rather than surviving on accidental import order.
import { dropCoins, sweepCoins, MAGNET_RADIUS } from "./coins";
import { createWorld } from "./world";

describe("coins.ts survives being the first module loaded", () => {
  it("exports finite constants when coins.ts loads before world.ts", () => {
    expect(Number.isFinite(MAGNET_RADIUS)).toBe(true);
    expect(MAGNET_RADIUS).toBeGreaterThan(0);
  });

  it("a drop/sweep round trip still works in this load order", () => {
    const w = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    dropCoins(w, { x: 10, y: 10 }, 3);
    dropCoins(w, { x: 20, y: 20 }, 4);

    expect(w.coins.length).toBeGreaterThan(0);
    for (const coin of w.coins) {
      expect(Number.isFinite(coin.value)).toBe(true);
      expect(coin.value).toBeGreaterThan(0);
    }

    sweepCoins(w);

    expect(w.coins).toHaveLength(0);
    expect(Number.isFinite(w.purse)).toBe(true);
    expect(w.purse).toBe(7);
  });
});
