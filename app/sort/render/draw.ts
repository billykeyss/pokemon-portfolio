import { ease } from "@/app/game/_shared/phases";
import {
  phaseAt,
  pouredUnits,
  sincePour,
  surfaceWobble,
  tiltAngle,
  travelArc,
  type Pour,
} from "../engine/anim";
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
  shake: { index: number; t: number } | null;
  /** Seconds since mount, for effects that pulse. */
  clock: number;
}

const BG = "#0d0a15";
const GLASS_RIM = "rgba(248, 240, 224, 0.55)";
const GLASS_RIM_DIM = "rgba(248, 240, 224, 0.38)";
const GLASS_RIM_DONE = "#8BE06A";
const CAVITY = "rgba(12, 9, 20, 0.72)";
const LIFT_PX = 0.2;
const SHAKE_DURATION = 0.35;

/** Proportions of the bottle silhouette, as fractions of its box. */
const NECK_W = 0.5;
const NECK_H = 0.13;
const SHOULDER_H = 0.11;
const BASE_R = 0.2;

interface Metrics {
  cx: number;
  neckW: number;
  bodyTop: number;
  /** Liquid sits between bodyTop and the inner base. */
  liquidTop: number;
  liquidBottom: number;
  unitH: number;
}

function metricsFor(box: BottleLayout, capacity: number): Metrics {
  const bodyTop = box.y + box.h * (NECK_H + SHOULDER_H);
  const liquidBottom = box.y + box.h;
  return {
    cx: box.x + box.w / 2,
    neckW: box.w * NECK_W,
    bodyTop,
    liquidTop: bodyTop,
    liquidBottom,
    unitH: (liquidBottom - bodyTop) / Math.max(1, capacity),
  };
}

/**
 * Outline of a bottle: a narrow neck, sloped shoulders, straight flanks and a
 * rounded base.
 *
 * Everything else about the bottle is drawn by clipping to this one path —
 * liquid included — so the contents pick up the taper at the shoulders and the
 * curve at the base for free, instead of being rectangles that happen to sit
 * inside an outline.
 */
function bottlePath(ctx: CanvasRenderingContext2D, box: BottleLayout): void {
  const { x, y, w, h } = box;
  const cx = x + w / 2;
  const neckW = w * NECK_W;
  const neckBottom = y + h * NECK_H;
  const bodyTop = y + h * (NECK_H + SHOULDER_H);
  const r = w * BASE_R;

  ctx.beginPath();
  ctx.moveTo(cx - neckW / 2, y);
  ctx.lineTo(cx - neckW / 2, neckBottom);
  // Shoulder: neck flares out to the full width of the body.
  ctx.bezierCurveTo(cx - neckW / 2, bodyTop, cx - w / 2, neckBottom, cx - w / 2, bodyTop);
  ctx.lineTo(cx - w / 2, y + h - r);
  ctx.quadraticCurveTo(cx - w / 2, y + h, cx - w / 2 + r, y + h);
  ctx.lineTo(cx + w / 2 - r, y + h);
  ctx.quadraticCurveTo(cx + w / 2, y + h, cx + w / 2, y + h - r);
  ctx.lineTo(cx + w / 2, bodyTop);
  ctx.bezierCurveTo(cx + w / 2, neckBottom, cx + neckW / 2, bodyTop, cx + neckW / 2, neckBottom);
  ctx.lineTo(cx + neckW / 2, y);
  ctx.closePath();
}

/** How full each bottle looks right now, and the unit currently in flight. */
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
 * Where the pouring bottle's mouth parks, and which way it tips. The bottle
 * rotates about its own mouth, so the spout stays anchored over the target for
 * the whole pour while the body swings up behind it.
 */
function pourGeometry(
  layout: Layout,
  pour: Pour,
): { src: BottleLayout; dst: BottleLayout; dir: number; mouthX: number; mouthY: number } {
  const src = layout.bottles[pour.move.from];
  const dst = layout.bottles[pour.move.to];
  const dir = dst.x >= src.x ? 1 : -1;

  return {
    src,
    dst,
    dir,
    mouthX: dst.x + dst.w * 0.5 - dir * dst.w * 0.24,
    mouthY: dst.y - dst.h * 0.26,
  };
}

function bottleTransform(
  state: DrawState,
  index: number,
  layout: Layout,
): { dx: number; dy: number; angle: number } {
  const { pour } = state;
  const box = layout.bottles[index];

  if (pour === null || pour.move.from !== index) {
    const raised = state.selected === index ? -box.h * LIFT_PX * 0.55 : 0;
    return { dx: 0, dy: raised, angle: 0 };
  }

  const { src, dir, mouthX, mouthY } = pourGeometry(layout, pour);
  const at = phaseAt(pour.t, pour.units);
  const lift = src.h * LIFT_PX;

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
      return {
        dx: targetDx * u,
        // Arc over the gap, and start tipping on the way in so the tilt phase
        // finishes a motion already underway rather than starting a new one.
        dy: -lift + (targetDy + lift) * u - travelArc(at.u) * src.h * 0.16,
        angle: fullTilt * u * 0.25,
      };
    }
    case "tilt":
      return {
        dx: targetDx,
        dy: targetDy,
        angle: fullTilt * (0.25 + 0.75 * ease(at.u)),
      };
    case "pour":
      return { dx: targetDx, dy: targetDy, angle: fullTilt };
    case "untilt":
      return { dx: targetDx, dy: targetDy, angle: fullTilt * (1 - ease(at.u)) };
    default: {
      const u = ease(at.u);
      return {
        dx: targetDx * (1 - u),
        dy: targetDy * (1 - u) - travelArc(at.u) * src.h * 0.1,
        angle: 0,
      };
    }
  }
}

/** Liquid, clipped to the bottle so it takes the vessel's shape. */
function drawContents(
  ctx: CanvasRenderingContext2D,
  box: BottleLayout,
  contents: number[],
  capacity: number,
  partialFraction: number,
  partialColor: number,
  wobble: number,
): void {
  const m = metricsFor(box, capacity);

  ctx.save();
  bottlePath(ctx, box);
  ctx.clip();

  ctx.fillStyle = CAVITY;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  const surfaceOf = (units: number) => m.liquidBottom - units * m.unitH;

  for (let i = 0; i < contents.length; i++) {
    const potion = PALETTE[contents[i] % PALETTE.length];
    const top = surfaceOf(i + 1);
    // Only the topmost surface sloshes; the ones buried below cannot move.
    const offset = i === contents.length - 1 ? wobble * m.unitH : 0;

    // One band per unit. Filling down to the base instead would let the
    // topmost colour paint over every unit beneath it, and the bottle would
    // render as a single solid colour.
    ctx.fillStyle = potion.hex;
    ctx.fillRect(box.x, top + offset, box.w, m.unitH - offset + 1);
  }

  if (partialFraction > 0) {
    const potion = PALETTE[partialColor % PALETTE.length];
    const base = surfaceOf(contents.length);
    ctx.fillStyle = potion.hex;
    ctx.fillRect(box.x, base - m.unitH * partialFraction, box.w, m.unitH * partialFraction + 1);
  }

  // Meniscus: a bright lip on the top surface, which is what sells it as liquid
  // rather than a stack of coloured bars.
  const total = contents.length + (partialFraction > 0 ? partialFraction : 0);
  if (total > 0) {
    const top = surfaceOf(total) + wobble * m.unitH;
    ctx.fillStyle = "rgba(255, 255, 255, 0.30)";
    ctx.fillRect(box.x, top, box.w, Math.max(1, box.h * 0.012));
  }

  // Glass: a soft highlight down one flank and a shadow down the other, drawn
  // over the liquid so the bottle reads as in front of its contents.
  const gradient = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  gradient.addColorStop(0.22, "rgba(255, 255, 255, 0.05)");
  gradient.addColorStop(0.62, "rgba(0, 0, 0, 0.0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.24)");
  ctx.fillStyle = gradient;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  ctx.restore();
}

function drawBottle(
  ctx: CanvasRenderingContext2D,
  box: BottleLayout,
  contents: number[],
  capacity: number,
  partialFraction: number,
  partialColor: number,
  wobble: number,
  highlight: boolean,
): void {
  drawContents(ctx, box, contents, capacity, partialFraction, partialColor, wobble);

  const done = isComplete(contents, capacity);
  ctx.lineWidth = Math.max(2, box.w * 0.055);
  ctx.strokeStyle = done ? GLASS_RIM_DONE : highlight ? GLASS_RIM : GLASS_RIM_DIM;
  bottlePath(ctx, box);
  ctx.stroke();

  // A thicker band across the mouth reads as the rolled lip of the glass.
  ctx.beginPath();
  ctx.lineWidth = Math.max(2, box.w * 0.075);
  ctx.moveTo(box.x + box.w * (0.5 - NECK_W / 2), box.y + 1);
  ctx.lineTo(box.x + box.w * (0.5 + NECK_W / 2), box.y + 1);
  ctx.stroke();
}

/**
 * The falling column of liquid.
 *
 * Drawn as a tapering ribbon rather than a rectangle: it narrows as it falls
 * and drifts slightly toward the centre of the target, which is enough to read
 * as a stream under gravity instead of a bar connecting two shapes.
 */
function drawStream(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
  destUnits: number,
): void {
  const { pour } = state;
  if (pour === null) return;
  if (phaseAt(pour.t, pour.units).name !== "pour") return;

  const { dst, mouthX, mouthY } = pourGeometry(layout, pour);
  const m = metricsFor(dst, state.puzzle.capacity);
  const surfaceY = Math.min(m.liquidBottom, m.liquidBottom - destUnits * m.unitH);
  if (surfaceY <= mouthY) return;

  const potion = PALETTE[pour.color % PALETTE.length];
  const topW = Math.max(3, dst.w * 0.15);
  const bottomW = topW * 0.62;
  const landX = dst.x + dst.w * 0.5;

  ctx.save();
  ctx.fillStyle = potion.hex;
  ctx.beginPath();
  ctx.moveTo(mouthX - topW / 2, mouthY);
  ctx.bezierCurveTo(
    mouthX - topW / 2,
    (mouthY + surfaceY) / 2,
    landX - bottomW / 2,
    (mouthY + surfaceY) / 2,
    landX - bottomW / 2,
    surfaceY,
  );
  ctx.lineTo(landX + bottomW / 2, surfaceY);
  ctx.bezierCurveTo(
    landX + bottomW / 2,
    (mouthY + surfaceY) / 2,
    mouthX + topW / 2,
    (mouthY + surfaceY) / 2,
    mouthX + topW / 2,
    mouthY,
  );
  ctx.closePath();
  ctx.fill();

  // A brighter core keeps the stream legible against a dark background.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(mouthX - topW * 0.16, mouthY, Math.max(1, topW * 0.22), (surfaceY - mouthY) * 0.55);
  ctx.restore();
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
  const pulse = Math.sin(state.clock * 12) > 0;

  const settling = state.pour === null ? null : sincePour(state.pour);
  const wobbleAmount = settling === null ? 0 : surfaceWobble(settling);

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
      pulse;
    const highlight =
      state.selected === box.index || box.index === pouringFrom || hintPulse;

    ctx.save();
    ctx.translate(dx + shakeX, dy);
    if (angle !== 0) {
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
      state.puzzle.capacity,
      partial !== null && partial.bottle === box.index ? partial.fraction : 0,
      partial?.color ?? 0,
      state.pour !== null && state.pour.move.to === box.index ? wobbleAmount : 0,
      highlight,
    );
    ctx.restore();
  }

  const landed = state.pour === null ? 0 : (bottles[state.pour.move.to]?.length ?? 0);
  drawStream(ctx, layout, state, landed);
}
