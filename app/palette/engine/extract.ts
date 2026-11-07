import { makeRng } from "@/app/game/_shared/rng";

export type Rgb = readonly [number, number, number];

export interface Swatch {
  hex: string;
  /** Share of the sampled pixels this colour stands for, 0..1. */
  weight: number;
  /**
   * Where in the image this colour can be found, as fractions of its width and
   * height: the pixel closest to the colour itself. Absent when the caller did
   * not say how wide the image is.
   */
  at?: { x: number; y: number };
}

export const DEFAULT_COLORS = 5;
const ITERATIONS = 12;
// Pixels this transparent say nothing about the picture's colour — a PNG's
// cut-out background would otherwise win the palette outright.
const MIN_ALPHA = 128;

export const toHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;

export function parseHex(text: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const dist2 = (a: Rgb, b: Rgb): number =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** Perceived brightness, 0..255. Decides whether a label sits in black or white. */
export const luma = ([r, g, b]: Rgb): number => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * The dominant colours of an RGBA buffer, most common first.
 *
 * k-means seeded k-means++ style from a fixed seed, so the same photo always
 * gives the same palette — a palette that reshuffles when you re-open it reads
 * as broken, not as random. The caller is expected to have downscaled the
 * image already; this is linear in the pixel count times k.
 */
export function extractPalette(
  pixels: Uint8ClampedArray,
  count: number = DEFAULT_COLORS,
  seed = 1,
  width?: number,
): Swatch[] {
  const points: Rgb[] = [];
  // Which pixel each point came from, so a colour can be traced back to a spot.
  const origin: number[] = [];
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < MIN_ALPHA) continue;
    points.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    origin.push(i / 4);
  }
  if (points.length === 0) return [];

  const rng = makeRng(seed);
  const centers: Rgb[] = [points[rng.int(points.length)]];
  const nearest = points.map((p) => dist2(p, centers[0]));
  while (centers.length < count) {
    const total = nearest.reduce((a, b) => a + b, 0);
    // Every remaining point already sits on a centre: the image has fewer
    // distinct colours than were asked for, and duplicates would be noise.
    if (total === 0) break;
    let target = rng.next() * total;
    let pick = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      target -= nearest[i];
      if (target <= 0) {
        pick = i;
        break;
      }
    }
    centers.push(points[pick]);
    for (let i = 0; i < points.length; i++) {
      nearest[i] = Math.min(nearest[i], dist2(points[i], points[pick]));
    }
  }

  const k = centers.length;
  const assign = new Int32Array(points.length);
  let sizes = new Array<number>(k).fill(0);
  let means: Rgb[] = centers;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    sizes = new Array<number>(k).fill(0);
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist2(points[i], means[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assign[i] = best;
      sizes[best]++;
      sums[best][0] += points[i][0];
      sums[best][1] += points[i][1];
      sums[best][2] += points[i][2];
    }
    means = means.map((m, c) =>
      sizes[c] === 0 ? m : ([sums[c][0] / sizes[c], sums[c][1] / sizes[c], sums[c][2] / sizes[c]] as Rgb),
    );
  }

  const closest = new Int32Array(k).fill(-1);
  const closestD = new Array<number>(k).fill(Infinity);
  for (let i = 0; i < points.length; i++) {
    const c = assign[i];
    const d = dist2(points[i], means[c]);
    if (d < closestD[c]) {
      closestD[c] = d;
      closest[c] = i;
    }
  }
  const height = width ? Math.ceil(pixels.length / 4 / width) : 0;
  const locate = (c: number): Swatch["at"] => {
    if (!width || closest[c] < 0) return undefined;
    const p = origin[closest[c]];
    return { x: ((p % width) + 0.5) / width, y: (Math.floor(p / width) + 0.5) / height };
  };

  return means
    .map((m, c) => {
      const swatch: Swatch = { hex: toHex(m), weight: sizes[c] / points.length };
      const at = locate(c);
      if (at) swatch.at = at;
      return swatch;
    })
    .filter((s) => s.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}
