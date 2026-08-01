/**
 * Turn a generated image on a flat magenta backdrop into a game sprite with a
 * real alpha channel.
 *
 * The image generator ignores "no shadow" and paints a drop shadow, which is
 * the backdrop colour scaled darker. So the test is not "is this pixel close to
 * magenta" but "is this pixel a *scaled* version of magenta" — project the
 * pixel onto the backdrop colour and ask how far off that line it sits.
 *
 * That distinction matters: a naive "red and blue both exceed green" test eats
 * purple cars, and a tight colour-distance test leaves a shadow halo. The
 * projection handles both, and the lower bound on the scale factor protects the
 * near-black outlines, which would otherwise project onto the line at k ~ 0.
 */

/** Scale factors that count as backdrop: shadowed magenta through to full. */
const K_MIN = 0.32;
const K_MAX = 1.25;
/** How far off the backdrop's colour line a pixel may sit and still be backdrop. */
const RESIDUAL_TOL = 58;

/** Median of the four corners — robust to a stray sprite pixel in one corner. */
export function backdropRef(data, width, height) {
  const corners = [
    [4, 4],
    [width - 5, 4],
    [4, height - 5],
    [width - 5, height - 5],
  ].map(([x, y]) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });

  const channel = (c) => {
    const sorted = corners.map((p) => p[c]).sort((a, b) => a - b);
    return Math.round((sorted[1] + sorted[2]) / 2);
  };

  return [channel(0), channel(1), channel(2)];
}

/** Is this pixel the backdrop, or the backdrop's own drop shadow? */
export function isBackdrop(r, g, b, ref) {
  const denom = ref[0] * ref[0] + ref[1] * ref[1] + ref[2] * ref[2];
  if (denom === 0) return false;

  const k = (r * ref[0] + g * ref[1] + b * ref[2]) / denom;
  if (k < K_MIN || k > K_MAX) return false;

  const dr = r - k * ref[0];
  const dg = g - k * ref[1];
  const db = b - k * ref[2];
  return Math.sqrt(dr * dr + dg * dg + db * db) < RESIDUAL_TOL;
}

/**
 * Flood the backdrop inward from the border, clearing alpha as it goes.
 *
 * Connectivity is the point: a magenta-ish pixel *inside* the sprite (a tail
 * light, a purple panel) is never reached, so only genuine backdrop is removed.
 * Returns the number of pixels cleared.
 */
export function keyBackdrop(data, width, height) {
  const ref = backdropRef(data, width, height);
  const seen = new Uint8Array(width * height);
  const stack = [];

  const consider = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (seen[p]) return;
    const i = p * 4;
    if (!isBackdrop(data[i], data[i + 1], data[i + 2], ref)) return;
    seen[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < width; x++) {
    consider(x, 0);
    consider(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    consider(0, y);
    consider(width - 1, y);
  }

  let cleared = 0;
  while (stack.length > 0) {
    const p = stack.pop();
    data[p * 4 + 3] = 0;
    cleared++;

    const x = p % width;
    const y = (p - x) / width;
    consider(x - 1, y);
    consider(x + 1, y);
    consider(x, y - 1);
    consider(x, y + 1);
  }

  return cleared;
}

/** Tight box around everything still opaque, or null if nothing survived. */
export function contentBounds(data, width, height, alphaFloor = 8) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= alphaFloor) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Box-filter downscale, averaging in premultiplied alpha so transparent pixels
 * cannot bleed their colour into the edges of the sprite.
 */
export function downscale(data, width, height, box, targetLongEdge) {
  const scale = Math.min(1, targetLongEdge / Math.max(box.w, box.h));
  const outW = Math.max(1, Math.round(box.w * scale));
  const outH = Math.max(1, Math.round(box.h * scale));
  const out = Buffer.alloc(outW * outH * 4);

  for (let y = 0; y < outH; y++) {
    const sy0 = box.y + Math.floor((y * box.h) / outH);
    const sy1 = box.y + Math.max(sy0 + 1 - box.y, Math.floor(((y + 1) * box.h) / outH));

    for (let x = 0; x < outW; x++) {
      const sx0 = box.x + Math.floor((x * box.w) / outW);
      const sx1 = box.x + Math.max(sx0 + 1 - box.x, Math.floor(((x + 1) * box.w) / outW));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * width + sx) * 4;
          const alpha = data[i + 3] / 255;
          r += data[i] * alpha;
          g += data[i + 1] * alpha;
          b += data[i + 2] * alpha;
          a += data[i + 3];
          n++;
        }
      }

      const o = (y * outW + x) * 4;
      if (n === 0 || a === 0) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
        continue;
      }

      const alphaAvg = a / n;
      const weight = alphaAvg / 255;
      out[o] = Math.round(r / n / weight);
      out[o + 1] = Math.round(g / n / weight);
      out[o + 2] = Math.round(b / n / weight);
      out[o + 3] = Math.round(alphaAvg);
    }
  }

  return { width: outW, height: outH, data: out };
}
