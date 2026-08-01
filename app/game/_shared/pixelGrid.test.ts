import { describe, expect, it } from "vitest";
import { drawPixelGrid, shade, type PixelSprite } from "./pixelGrid";

/** Minimal 2D context stand-in that records the rects it was asked to fill. */
function recordingCtx() {
  const fills: { x: number; y: number; w: number; h: number; color: string }[] = [];
  let fillStyle = "";
  let alpha = 1;

  const ctx = {
    save: () => {},
    restore: () => {},
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(v: string) {
      fillStyle = v;
    },
    get globalAlpha() {
      return alpha;
    },
    set globalAlpha(v: number) {
      alpha = v;
    },
    fillRect: (x: number, y: number, w: number, h: number) =>
      void fills.push({ x, y, w, h, color: fillStyle }),
  };

  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills };
}

const sprite: PixelSprite = {
  grid: ["AB", ".A"],
  palette: { A: "#ff0000", B: "#00ff00" },
};

describe("drawPixelGrid", () => {
  it("skips transparent cells", () => {
    const { ctx, fills } = recordingCtx();
    drawPixelGrid(ctx, sprite, { x: 0, y: 0, w: 20, h: 20 });
    expect(fills).toHaveLength(3);
  });

  it("maps each key to its palette colour", () => {
    const { ctx, fills } = recordingCtx();
    drawPixelGrid(ctx, sprite, { x: 0, y: 0, w: 20, h: 20 });
    expect(fills.map((f) => f.color)).toEqual(["#ff0000", "#00ff00", "#ff0000"]);
  });

  it("skips a key with no palette entry rather than drawing black", () => {
    const { ctx, fills } = recordingCtx();
    drawPixelGrid(ctx, { grid: ["AZ"], palette: { A: "#fff" } }, {
      x: 0,
      y: 0,
      w: 10,
      h: 10,
    });
    expect(fills).toHaveLength(1);
  });

  it("fills the box it was given", () => {
    const { ctx, fills } = recordingCtx();
    drawPixelGrid(ctx, sprite, { x: 0, y: 0, w: 20, h: 20 });

    const right = Math.max(...fills.map((f) => f.x + f.w));
    const bottom = Math.max(...fills.map((f) => f.y + f.h));
    expect(right).toBe(20);
    expect(bottom).toBe(20);
  });

  it("leaves no seam between neighbouring cells at fractional scales", () => {
    // 7 does not divide evenly by 2. Cells are allowed to overlap by a pixel —
    // that is what guarantees coverage — but they must never leave a gap, which
    // would read as a crack through the sprite.
    const { ctx, fills } = recordingCtx();
    drawPixelGrid(ctx, { grid: ["AA"], palette: { A: "#fff" } }, {
      x: 0,
      y: 0,
      w: 7,
      h: 7,
    });

    const [left, right] = fills.sort((a, b) => a.x - b.x);
    expect(left.x + left.w).toBeGreaterThanOrEqual(right.x);
    expect(left.x + left.w - right.x).toBeLessThanOrEqual(1);
  });

  it("honours the alpha it is given", () => {
    const { ctx } = recordingCtx();
    expect(() => drawPixelGrid(ctx, sprite, { x: 0, y: 0, w: 8, h: 8 }, 0.4)).not.toThrow();
  });

  it("does nothing for an empty grid", () => {
    const { ctx, fills } = recordingCtx();
    drawPixelGrid(ctx, { grid: [], palette: {} }, { x: 0, y: 0, w: 10, h: 10 });
    expect(fills).toHaveLength(0);
  });
});

describe("shade", () => {
  it("returns the colour unchanged at zero", () => {
    expect(shade("#3366cc", 0)).toBe("#3366cc");
  });

  it("darkens toward black", () => {
    expect(shade("#ffffff", -1)).toBe("#000000");
  });

  it("lightens toward white", () => {
    expect(shade("#000000", 1)).toBe("#ffffff");
  });

  it("accepts shorthand hex", () => {
    expect(shade("#fff", 0)).toBe("#ffffff");
  });

  it("moves partway for a partial amount", () => {
    expect(shade("#000000", 0.5)).toBe("#808080");
  });

  it("clamps beyond the ends", () => {
    expect(shade("#ffffff", -5)).toBe("#000000");
    expect(shade("#000000", 5)).toBe("#ffffff");
  });
});
