import { describe, it, expect } from "vitest";
import { createWorld, spawnHero } from "../engine/world";
import { dropCoins } from "../engine/coins";
import { drawWorld } from "./draw";

/**
 * A proxy `CanvasRenderingContext2D` that records every call instead of
 * drawing anything. This is a weak test by design: canvas output isn't
 * something Node can render, so the only thing asserted below is that a
 * world holding a coin issues more draw calls than one that doesn't. That
 * proves the coin code path runs — it says nothing about where a coin ends
 * up on screen, whether it's legible, or whether it bobs correctly. The
 * visual check for those is manual, not this file.
 */
function fakeCtx() {
  const calls: string[] = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop: string) {
      if (prop === "canvas") return { width: 360, height: 560 };
      return (...args: unknown[]) => {
        calls.push(`${prop}(${args.join(",")})`);
      };
    },
    set() {
      return true;
    },
  };
  const ctx = new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe("drawWorld", () => {
  it("draws a coin that is on the floor", () => {
    const w = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    spawnHero(w, { x: 180, y: 470 });
    dropCoins(w, { x: 100, y: 100 }, 3);

    const bare = fakeCtx();
    const withCoin = fakeCtx();
    const w2 = createWorld({ arena: { width: 360, height: 560 }, seed: 1 });
    spawnHero(w2, { x: 180, y: 470 });

    drawWorld(withCoin.ctx, w, { heroColor: "#fff", reducedMotion: true });
    drawWorld(bare.ctx, w2, { heroColor: "#fff", reducedMotion: true });

    expect(withCoin.calls.length).toBeGreaterThan(bare.calls.length);
  });
});
