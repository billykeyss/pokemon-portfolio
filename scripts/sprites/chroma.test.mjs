import { describe, expect, it } from "vitest";
import {
  backdropRef,
  contentBounds,
  downscale,
  isBackdrop,
  keyBackdrop,
} from "./chroma.mjs";

const MAGENTA = [232, 60, 226];

/** Build an RGBA buffer from a paint callback. */
function image(width, height, paint) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

const alphaAt = (data, width, x, y) => data[(y * width + x) * 4 + 3];

describe("backdropRef", () => {
  it("reads the backdrop colour from the corners", () => {
    const data = image(20, 20, () => MAGENTA);
    expect(backdropRef(data, 20, 20)).toEqual(MAGENTA);
  });

  it("ignores a single contaminated corner", () => {
    const data = image(20, 20, (x, y) => (x < 8 && y < 8 ? [10, 200, 10] : MAGENTA));
    expect(backdropRef(data, 20, 20)).toEqual(MAGENTA);
  });
});

describe("isBackdrop", () => {
  it("accepts the backdrop itself", () => {
    expect(isBackdrop(...MAGENTA, MAGENTA)).toBe(true);
  });

  it("accepts the generator's drop shadow, a darkened backdrop", () => {
    const shadow = MAGENTA.map((c) => Math.round(c * 0.62));
    expect(isBackdrop(...shadow, MAGENTA)).toBe(true);
  });

  it("keeps a red car body", () => {
    expect(isBackdrop(214, 32, 38, MAGENTA)).toBe(false);
  });

  it("keeps a purple car body, which a naive hue test would eat", () => {
    // The whole reason for the projection test: purple is magenta-adjacent.
    expect(isBackdrop(126, 78, 232, MAGENTA)).toBe(false);
  });

  it("keeps a black outline, which sits at k near zero", () => {
    expect(isBackdrop(12, 10, 14, MAGENTA)).toBe(false);
  });

  it("keeps white headlights", () => {
    expect(isBackdrop(248, 244, 230, MAGENTA)).toBe(false);
  });

  it("keeps blue glass", () => {
    expect(isBackdrop(48, 120, 196, MAGENTA)).toBe(false);
  });
});

describe("keyBackdrop", () => {
  it("clears the backdrop and leaves the sprite opaque", () => {
    const inside = (x, y) => x >= 8 && x < 16 && y >= 8 && y < 16;
    const data = image(24, 24, (x, y) => (inside(x, y) ? [214, 32, 38] : MAGENTA));

    keyBackdrop(data, 24, 24);

    expect(alphaAt(data, 24, 0, 0)).toBe(0);
    expect(alphaAt(data, 24, 23, 23)).toBe(0);
    expect(alphaAt(data, 24, 12, 12)).toBe(255);
  });

  it("clears the drop shadow along with the backdrop", () => {
    const shadow = MAGENTA.map((c) => Math.round(c * 0.6));
    const data = image(24, 24, (x, y) => {
      if (x >= 8 && x < 16 && y >= 8 && y < 16) return [214, 32, 38];
      if (x >= 10 && x < 18 && y >= 10 && y < 18) return shadow;
      return MAGENTA;
    });

    keyBackdrop(data, 24, 24);

    expect(alphaAt(data, 24, 17, 17)).toBe(0);
    expect(alphaAt(data, 24, 12, 12)).toBe(255);
  });

  it("spares a magenta pixel enclosed by the sprite", () => {
    // Connectivity, not colour, is what protects an interior tail light.
    const data = image(24, 24, (x, y) => {
      const inSprite = x >= 6 && x < 18 && y >= 6 && y < 18;
      if (!inSprite) return MAGENTA;
      return x === 12 && y === 12 ? MAGENTA : [214, 32, 38];
    });

    keyBackdrop(data, 24, 24);

    expect(alphaAt(data, 24, 12, 12)).toBe(255);
    expect(alphaAt(data, 24, 1, 1)).toBe(0);
  });

  it("reports how many pixels it cleared", () => {
    const data = image(10, 10, () => MAGENTA);
    expect(keyBackdrop(data, 10, 10)).toBe(100);
  });
});

describe("contentBounds", () => {
  it("finds the tight box around what survived", () => {
    const data = image(20, 20, (x, y) =>
      x >= 5 && x <= 9 && y >= 3 && y <= 11 ? [10, 10, 10] : MAGENTA,
    );
    keyBackdrop(data, 20, 20);
    expect(contentBounds(data, 20, 20)).toEqual({ x: 5, y: 3, w: 5, h: 9 });
  });

  it("returns null when everything was keyed away", () => {
    const data = image(8, 8, () => MAGENTA);
    keyBackdrop(data, 8, 8);
    expect(contentBounds(data, 8, 8)).toBeNull();
  });
});

describe("downscale", () => {
  it("fits the long edge to the target", () => {
    const data = image(40, 40, () => [10, 20, 30]);
    const out = downscale(data, 40, 40, { x: 0, y: 0, w: 40, h: 20 }, 20);
    expect(out.width).toBe(20);
    expect(out.height).toBe(10);
  });

  it("never upscales a sprite that is already small", () => {
    const data = image(8, 8, () => [10, 20, 30]);
    const out = downscale(data, 8, 8, { x: 0, y: 0, w: 8, h: 8 }, 64);
    expect(out.width).toBe(8);
    expect(out.height).toBe(8);
  });

  it("preserves a solid colour", () => {
    const data = image(16, 16, () => [200, 100, 50]);
    const out = downscale(data, 16, 16, { x: 0, y: 0, w: 16, h: 16 }, 8);
    expect([out.data[0], out.data[1], out.data[2], out.data[3]]).toEqual([
      200, 100, 50, 255,
    ]);
  });

  it("does not bleed backdrop colour into the sprite edge", () => {
    // Half red, half fully transparent. Averaging in straight (non-premultiplied)
    // alpha would drag the surviving colour toward whatever the cleared pixels
    // happened to hold.
    const data = Buffer.alloc(4 * 4 * 4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const i = (y * 4 + x) * 4;
        const solid = x < 2;
        data[i] = solid ? 220 : 0;
        data[i + 1] = solid ? 30 : 255;
        data[i + 2] = solid ? 40 : 0;
        data[i + 3] = solid ? 255 : 0;
      }
    }

    const out = downscale(data, 4, 4, { x: 0, y: 0, w: 4, h: 4 }, 2);
    expect(out.data[0]).toBe(220);
    expect(out.data[1]).toBe(30);
    expect(out.data[2]).toBe(40);
  });
});
