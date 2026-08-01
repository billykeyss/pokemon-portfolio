export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BottleLayout extends Rect {
  index: number;
  /** Height of one liquid unit. */
  unitH: number;
}

export interface Layout {
  bottles: BottleLayout[];
  rows: number;
  unitH: number;
}

/**
 * Wrapping sooner than the bottles strictly need keeps them large. A single row
 * of seven is width-bound, so each bottle ends up narrow and short with most of
 * the canvas empty above and below it; two rows of four fills the frame with
 * bottles nearly twice the size.
 */
const MAX_PER_ROW = 6;
/** Outward padding on hit rectangles, as a fraction of bottle width. */
const TOUCH_PAD = 0.15;
/** Bottle height as a multiple of its width, at its squattest and tallest. */
const MIN_ASPECT = 2.2;
const MAX_ASPECT = 4;

/**
 * Spacing scales with how crowded the board is.
 *
 * A bottle's width comes out of the gap between bottles, so a single fixed gap
 * has to be sized for the worst case — and then an early level of nine sits
 * shoulder to shoulder for no reason, while a late one of twenty is still
 * cramped. Sparse boards get room to breathe; dense ones close up only as far
 * as they must.
 */
function spacingFor(perRow: number, rows: number): { gap: number; headroom: number } {
  const gap = perRow <= 4 ? 0.75 : perRow <= 5 ? 0.62 : 0.44;
  const headroom = rows <= 2 ? 0.42 : rows === 3 ? 0.32 : 0.24;
  return { gap, headroom };
}

/**
 * Arrange bottles in as many rows as they need, then centre the block.
 *
 * Width and height are decoupled deliberately. Sizing the bottle by a single
 * fixed aspect ratio leaves a tall canvas mostly empty — with five bottles on a
 * phone, width binds long before height does. Instead the bottle takes the
 * width it can have and then grows toward the height available, bounded by an
 * aspect range so it still reads as a bottle.
 *
 * Pure — no canvas, no DOM — so it can be asserted on.
 */
export function layoutBottles(
  count: number,
  capacity: number,
  canvasW: number,
  canvasH: number,
): Layout {
  const n = Math.max(1, count);
  const rows = Math.ceil(n / MAX_PER_ROW);
  const perRow = Math.ceil(n / rows);
  const { gap: gapRatio, headroom } = spacingFor(perRow, rows);

  // perRow bottles plus (perRow - 1) gaps must fit across the canvas.
  const widthLimit = canvasW / (perRow + (perRow - 1) * gapRatio);
  const heightLimit = (canvasH / rows) * (1 - headroom);

  let bottleW = Math.max(1, widthLimit);
  let bottleH = Math.min(bottleW * MAX_ASPECT, heightLimit);

  // Too short to look like a bottle: narrow it until the proportions recover.
  if (bottleH < bottleW * MIN_ASPECT) {
    bottleW = Math.max(1, bottleH / MIN_ASPECT);
    bottleH = bottleW * MIN_ASPECT;
  }

  const gap = bottleW * gapRatio;
  const unitH = bottleH / Math.max(1, capacity);

  const lift = bottleH * headroom;
  const rowStride = bottleH + lift;
  const startY = Math.max(0, (canvasH - rowStride * rows) / 2);

  const bottles: BottleLayout[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inThisRow = Math.min(perRow, n - row * perRow);
    const rowWidth = inThisRow * bottleW + (inThisRow - 1) * gap;

    bottles.push({
      index: i,
      x: (canvasW - rowWidth) / 2 + col * (bottleW + gap),
      // The lift clearance sits above each row, not below it.
      y: startY + row * rowStride + lift,
      w: bottleW,
      h: bottleH,
      unitH,
    });
  }

  return { bottles, rows, unitH };
}

/** Index of the bottle under a point, with padding so touch targets are kind. */
export function hitTest(layout: Layout, x: number, y: number): number | null {
  for (const b of layout.bottles) {
    const pad = b.w * TOUCH_PAD;
    if (
      x >= b.x - pad &&
      x <= b.x + b.w + pad &&
      y >= b.y - pad &&
      y <= b.y + b.h + pad
    ) {
      return b.index;
    }
  }
  return null;
}
