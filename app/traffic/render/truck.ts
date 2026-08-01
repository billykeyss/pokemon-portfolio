import { shade, type PixelSprite } from "@/app/game/_shared/pixelGrid";

/**
 * Top-down box truck, 12x36 — a 1:3 footprint, matching a three-cell vehicle.
 *
 * Hand-drawn rather than generated, and shaped to sit beside the generated
 * cars: same overhead angle, same heavy black outline, same flat body with a
 * highlight down one flank and a shade down the other. Nose is at the top, so
 * it shares the cars' orientation and rotates the same way for a horizontal
 * lane.
 *
 *   K outline   B body   D shade   H highlight   G glass   L lamp
 */
const GRID: readonly string[] = [
  "...KKKKKK...",
  "..KLBBBBLK..",
  ".KKBBBBBBKK.",
  ".KHBGGGGBDK.",
  ".KHBGGGGBDK.",
  ".KHBGGGGBDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  "KKKKKKKKKKKK",
  ".KKKKKKKKKK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHDDDDDDDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHDDDDDDDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHDDDDDDDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHDDDDDDDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHDDDDDDDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KHBBBBBBDK.",
  ".KKKKKKKKKK.",
  "..KLDDDDLK..",
  "...KKKKKK...",
];

const OUTLINE = "#14101c";
const GLASS = "#2b3a52";
const LAMP = "#F6E8B0";

/** Build the truck in a body colour, deriving its shade and highlight. */
export function truckSprite(body: string): PixelSprite {
  return {
    grid: GRID,
    palette: {
      K: OUTLINE,
      B: body,
      D: shade(body, -0.32),
      H: shade(body, 0.26),
      G: GLASS,
      L: LAMP,
    },
  };
}
