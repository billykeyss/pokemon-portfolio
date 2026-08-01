import { phaseAt, pouredUnits, tiltAngle, type Pour } from "../engine/anim";
import { PALETTE } from "../engine/palette";
import { isComplete } from "../engine/rules";
import type { Puzzle } from "../engine/types";
import type { BottleLayout, Layout } from "./layout";

export interface DrawState {
  /** Committed state. During a pour this is already the post-move puzzle. */
  puzzle: Puzzle;
  /** Pre-move snapshot; non-null only while a pour is animating. */
  before: Puzzle | null;
  pour: Pour | null;
  selected: number | null;
  hinted: { from: number; to: number } | null;
  symbols: boolean;
  shake: { index: number; t: number } | null;
  /** Seconds since mount, for effects that pulse. */
  clock: number;
}

const BG = "#0d0a15";
const GLASS = "#f8f0e0";
const GLASS_DIM = "rgba(248, 240, 224, 0.3)";
const GLASS_DONE = "#78C850";
const CAVITY = "#150f22";
const BORDER = 4;
const LIFT_PX = 0.22;
const SHAKE_DURATION = 0.35;

/** Smoothstep — no easing library needed for six phases. */
const ease = (u: number): number => u * u * (3 - 2 * u);

/**
 * How full each bottle appears right now. Whole units come from replaying the
 * committed move up to the current progress; the unit in flight is returned
 * separately so it can be drawn as a partial slab in the destination.
 */
function displayState(state: DrawState): {
  bottles: number[][];
  partial: { bottle: number; color: number; fraction: number } | null;
} {
  const { pour, before, puzzle } = state;
  if (pour === null || before === null) {
    return { bottles: puzzle.bottles.map((b) => [...b]), partial: null };
  }

  const bottles = before.bottles.map((b) => [...b]);
  const poured = pouredUnits(pour);
  const whole = Math.floor(poured);

  for (let i = 0; i < whole; i++) {
    const unit = bottles[pour.move.from].pop();
    if (unit !== undefined) bottles[pour.move.to].push(unit);
  }

  const fraction = poured - whole;
  const partial =
    fraction > 0.001 && whole < pour.units
      ? { bottle: pour.move.to, color: pour.color, fraction }
      : null;

  // The unit mid-flight has left the source but not yet landed.
  if (partial !== null) bottles[pour.move.from].pop();

  return { bottles, partial };
}

/**
 * Where the pouring bottle's mouth parks, and which way it tips.
 *
 * The bottle rotates about its own mouth rather than its base, and the mouth is
 * parked just above the destination's rim. That keeps the spout anchored over
 * the target for the whole pour while the body swings up behind it — pivoting
 * about the base instead throws the mouth away from the bottle it is filling.
 */
function pourGeometry(
  layout: Layout,
  pour: Pour,
): { src: BottleLayout; dst: BottleLayout; dir: number; mouthX: number; mouthY: number } {
  const src = layout.bottles[pour.move.from];
  const dst = layout.bottles[pour.move.to];
  // Tip toward the destination: a bottle pouring leftward rotates the other way.
  const dir = dst.x >= src.x ? 1 : -1;

  return {
    src,
    dst,
    dir,
    // Offset back toward the source so the body leans over its own side.
    mouthX: dst.x + dst.w * 0.5 - dir * dst.w * 0.22,
    mouthY: dst.y - dst.h * 0.3,
  };
}

/** Where a bottle sits and how far it is tipped, this frame. */
function bottleTransform(
  state: DrawState,
  index: number,
  layout: Layout,
): { dx: number; dy: number; angle: number } {
  const { pour } = state;
  const box = layout.bottles[index];

  if (pour === null || pour.move.from !== index) {
    const raised = state.selected === index ? -box.h * LIFT_PX * 0.6 : 0;
    return { dx: 0, dy: raised, angle: 0 };
  }

  const { src, dir, mouthX, mouthY } = pourGeometry(layout, pour);
  const at = phaseAt(pour.t, pour.units);
  const lift = src.h * LIFT_PX;

  // Displacement that carries the bottle's own mouth onto the parking spot.
  const targetDx = mouthX - (src.x + src.w * 0.5);
  const targetDy = mouthY - src.y;

  const remaining =
    (state.before?.bottles[pour.move.from].length ?? 0) - pouredUnits(pour);
  const fullTilt = dir * tiltAngle(remaining, state.puzzle.capacity);

  switch (at.name) {
    case "lift":
      return { dx: 0, dy: -lift * ease(at.u), angle: 0 };
    case "travel": {
      const u = ease(at.u);
      return { dx: targetDx * u, dy: -lift + (targetDy + lift) * u, angle: 0 };
    }
    case "tilt":
      return { dx: targetDx, dy: targetDy, angle: fullTilt * ease(at.u) };
    case "pour":
      return { dx: targetDx, dy: targetDy, angle: fullTilt };
    case "untilt":
      return { dx: targetDx, dy: targetDy, angle: fullTilt * (1 - ease(at.u)) };
    default: {
      const u = ease(at.u);
      return { dx: targetDx * (1 - u), dy: targetDy * (1 - u), angle: 0 };
    }
  }
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  colorIndex: number,
  symbols: boolean,
): void {
  const potion = PALETTE[colorIndex % PALETTE.length];

  ctx.fillStyle = potion.hex;
  ctx.fillRect(x, y, w, h);

  // A lighter band along the top edge reads as a liquid surface.
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(x, y, w, Math.max(1, h * 0.16));

  if (symbols && h > 9) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.font = `bold ${Math.max(8, Math.floor(h * 0.52))}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(potion.glyph, x + w / 2, y + h / 2 + h * 0.05);
  }
}

function drawBottle(
  ctx: CanvasRenderingContext2D,
  box: BottleLayout,
  contents: number[],
  partialFraction: number,
  partialColor: number,
  state: DrawState,
  highlight: boolean,
): void {
  const { x, y, w, h, unitH } = box;
  const innerX = x + BORDER;
  const innerW = w - BORDER * 2;

  ctx.fillStyle = CAVITY;
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < contents.length; i++) {
    drawUnit(
      ctx,
      innerX,
      y + h - (i + 1) * unitH,
      innerW,
      unitH,
      contents[i],
      state.symbols,
    );
  }

  // The unit currently landing, drawn as a growing slab on top of the stack.
  if (partialFraction > 0) {
    const slabH = unitH * partialFraction;
    drawUnit(
      ctx,
      innerX,
      y + h - contents.length * unitH - slabH,
      innerW,
      slabH,
      partialColor,
      false,
    );
  }

  const done = isComplete(contents, state.puzzle.capacity);
  ctx.lineWidth = BORDER;
  ctx.strokeStyle = done ? GLASS_DONE : highlight ? GLASS : GLASS_DIM;
  ctx.strokeRect(x + BORDER / 2, y + BORDER / 2, w - BORDER, h - BORDER);

  // Neck: a narrower band at the top so a bottle reads as a bottle, not a bar.
  const neckW = w * 0.5;
  const neckX = x + (w - neckW) / 2;
  ctx.fillStyle = BG;
  ctx.fillRect(x - 1, y - BORDER, w + 2, BORDER);
  ctx.fillStyle = CAVITY;
  ctx.fillRect(neckX, y - BORDER * 2, neckW, BORDER * 2);
  ctx.strokeStyle = done ? GLASS_DONE : highlight ? GLASS : GLASS_DIM;
  ctx.strokeRect(
    neckX + BORDER / 2,
    y - BORDER * 2,
    neckW - BORDER,
    BORDER * 2 + BORDER,
  );
}

/**
 * The falling column of liquid, from the tipped bottle's mouth down to the
 * surface of whatever is already in the destination.
 */
function drawStream(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
  destContents: number,
): void {
  const { pour } = state;
  if (pour === null) return;
  if (phaseAt(pour.t, pour.units).name !== "pour") return;

  const { dst, mouthX, mouthY } = pourGeometry(layout, pour);
  const potion = PALETTE[pour.color % PALETTE.length];

  // Land on the current liquid surface, not the floor of the bottle.
  const surfaceY = dst.y + dst.h - destContents * dst.unitH;
  if (surfaceY <= mouthY) return;

  const width = Math.max(3, dst.w * 0.14);
  ctx.fillStyle = potion.hex;
  ctx.fillRect(mouthX - width / 2, mouthY, width, surfaceY - mouthY);

  // A brighter core keeps the stream legible against a dark background.
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fillRect(mouthX - width / 2, mouthY, Math.max(1, width * 0.3), surfaceY - mouthY);
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const { bottles, partial } = displayState(state);
  const pouringFrom = state.pour?.move.from ?? -1;

  for (const box of layout.bottles) {
    const contents = bottles[box.index] ?? [];
    const { dx, dy, angle } = bottleTransform(state, box.index, layout);

    const shaking =
      state.shake !== null &&
      state.shake.index === box.index &&
      state.shake.t < SHAKE_DURATION;
    const shakeX = shaking ? Math.sin(state.shake!.t * 70) * box.w * 0.12 : 0;

    const hintPulse =
      state.hinted !== null &&
      (state.hinted.from === box.index || state.hinted.to === box.index) &&
      Math.sin(state.clock * 12) > 0;

    const highlight =
      state.selected === box.index || box.index === pouringFrom || hintPulse;

    ctx.save();
    ctx.translate(dx + shakeX, dy);
    if (angle !== 0) {
      // Pivot about the bottle's own mouth. The translate above has already put
      // that point over the destination, so the spout stays put while the body
      // swings.
      const px = box.x + box.w * 0.5;
      const py = box.y;
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.translate(-px, -py);
    }

    drawBottle(
      ctx,
      box,
      contents,
      partial !== null && partial.bottle === box.index ? partial.fraction : 0,
      partial?.color ?? 0,
      state,
      highlight,
    );
    ctx.restore();
  }

  const landed =
    state.pour === null ? 0 : (bottles[state.pour.move.to]?.length ?? 0);
  drawStream(ctx, layout, state, landed);
}
