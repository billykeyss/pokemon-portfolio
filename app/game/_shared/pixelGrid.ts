export interface PixelSprite {
  /** Rows of single-character palette keys. `.` is transparent. */
  grid: readonly string[];
  palette: Record<string, string>;
}

export interface GridRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Paint a character-grid sprite into a box.
 *
 * Cells are rounded up and placed on a floored origin, so neighbouring pixels
 * always meet: at fractional scales, rounding each cell independently leaves
 * hairline seams through the sprite that read as cracks.
 */
export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  sprite: PixelSprite,
  rect: GridRect,
  alpha = 1,
): void {
  const rows = sprite.grid.length;
  if (rows === 0) return;
  const cols = sprite.grid[0].length;
  if (cols === 0) return;

  const cellW = rect.w / cols;
  const cellH = rect.h / rows;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (let row = 0; row < rows; row++) {
    const line = sprite.grid[row];
    for (let col = 0; col < line.length; col++) {
      const key = line[col];
      if (key === ".") continue;

      const color = sprite.palette[key];
      if (color === undefined) continue;

      const x = Math.floor(rect.x + col * cellW);
      const y = Math.floor(rect.y + row * cellH);
      ctx.fillStyle = color;
      ctx.fillRect(
        x,
        y,
        Math.ceil(rect.x + (col + 1) * cellW) - x,
        Math.ceil(rect.y + (row + 1) * cellH) - y,
      );
    }
  }

  ctx.restore();
}

/** Mix a hex colour toward black (t < 0) or white (t > 0), t in -1..1. */
export function shade(hex: string, t: number): string {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const target = t < 0 ? 0 : 255;
  const amount = Math.min(1, Math.abs(t));

  const mix = (channel: number) =>
    Math.round(channel + (target - channel) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(r)}${mix(g)}${mix(b)}`;
}
