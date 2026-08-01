import { ease } from "@/app/game/_shared/phases";
import {
  phaseAt,
  pourRate,
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
import { bubbleAt, bubbleField, sparkleAlpha, sparkleField } from "./background";
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

const BG_TOP = "#221a4d";
const BG_BOTTOM = "#110c26";
const SHELF = "#33254a";
const SHELF_LIP = "#4a3768";
const GLASS_RIM = "rgba(248, 240, 224, 0.55)";
const GLASS_RIM_DIM = "rgba(248, 240, 224, 0.38)";
const CORK = "#C89A63";
const CORK_DARK = "#8F6537";
const CORK_LIGHT = "#E5C293";
/**
 * Empty glass is a faint tint, not a dark fill. Filling it opaquely turned
 * every neck into a black blob sitting above the liquid and made empty bottles
 * read as holes; letting the backdrop through is what makes them look like
 * glass at all.
 */
const CAVITY = "rgba(198, 208, 255, 0.10)";
const LIFT_PX = 0.2;
const SHAKE_DURATION = 0.35;

const BUBBLES = bubbleField(26);
const SPARKLES = sparkleField(34);

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
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.18)");
  gradient.addColorStop(0.24, "rgba(255, 255, 255, 0.06)");
  gradient.addColorStop(0.62, "rgba(0, 0, 0, 0.0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.26)");
  ctx.fillStyle = gradient;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  // A single bright streak down the left shoulder. One hard specular does more
  // to sell curved glass than the broad gradient does — the gradient shades the
  // form, this says the surface is glossy.
  const streakW = Math.max(1.5, box.w * 0.075);
  const streakX = box.x + box.w * 0.2;
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.beginPath();
  ctx.roundRect(
    streakX,
    m.bodyTop + box.h * 0.04,
    streakW,
    box.h * 0.34,
    streakW,
  );
  ctx.fill();

  // Contact shadow inside the base, so the liquid looks like it is resting in
  // the bottle rather than floating at the bottom of a tube.
  if (contents.length > 0 || partialFraction > 0) {
    const floor = ctx.createLinearGradient(0, m.liquidBottom - box.h * 0.1, 0, m.liquidBottom);
    floor.addColorStop(0, "rgba(0, 0, 0, 0)");
    floor.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    ctx.fillStyle = floor;
    ctx.fillRect(box.x, m.liquidBottom - box.h * 0.1, box.w, box.h * 0.1);
  }

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
  // Soft shadow pooled under the bottle, tying it to the shelf.
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(
    box.x + box.w / 2,
    box.y + box.h + box.w * 0.04,
    box.w * 0.44,
    box.w * 0.1,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  drawContents(ctx, box, contents, capacity, partialFraction, partialColor, wobble);

  ctx.lineWidth = Math.max(2, box.w * 0.055);
  ctx.strokeStyle = highlight ? GLASS_RIM : GLASS_RIM_DIM;
  bottlePath(ctx, box);
  ctx.stroke();

  // The rolled lip of the glass: an ellipse rather than a straight bar, which
  // is what gives the mouth an opening instead of a flat cap.
  const lipRx = (box.w * NECK_W) / 2;
  const lipRy = Math.max(2, box.w * 0.07);
  ctx.lineWidth = Math.max(2, box.w * 0.06);
  ctx.beginPath();
  ctx.ellipse(box.x + box.w / 2, box.y + lipRy * 0.6, lipRx, lipRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (isComplete(contents, capacity)) {
    drawCork(ctx, box);
    return;
  }

  ctx.fillStyle = "rgba(10, 8, 18, 0.35)";
  ctx.beginPath();
  ctx.ellipse(box.x + box.w / 2, box.y + lipRy * 0.6, lipRx * 0.72, lipRy * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A stopper in the neck, marking a bottle as finished.
 *
 * This was a green outline round the glass, which announced "correct" in the
 * language of form validation rather than of the game. A cork says the same
 * thing from inside the fiction — that one's sealed, set it aside — and it
 * reads at a glance across a board of twenty-odd bottles, which a rim colour
 * competing with the liquid inside it does not.
 */
function drawCork(ctx: CanvasRenderingContext2D, box: BottleLayout): void {
  const cx = box.x + box.w / 2;
  const neckW = box.w * NECK_W;
  const plugW = neckW * 0.86;
  const headW = neckW * 1.24;
  const headH = Math.max(3, box.h * 0.05);
  const headTop = box.y - headH;
  const plugBottom = box.y + box.h * NECK_H * 0.66;

  ctx.save();

  // Plug first, so the head overlaps it and hides the seam. Darker than the
  // head because it sits behind glass.
  ctx.fillStyle = CORK_DARK;
  ctx.beginPath();
  ctx.moveTo(cx - plugW / 2, box.y);
  ctx.lineTo(cx - plugW / 2, plugBottom - plugW * 0.22);
  ctx.quadraticCurveTo(cx - plugW / 2, plugBottom, cx, plugBottom);
  ctx.quadraticCurveTo(cx + plugW / 2, plugBottom, cx + plugW / 2, plugBottom - plugW * 0.22);
  ctx.lineTo(cx + plugW / 2, box.y);
  ctx.closePath();
  ctx.fill();

  // Shaded across its width rather than flat-filled — that alone is the
  // difference between a cylinder and a tab stuck on the front.
  const barrel = ctx.createLinearGradient(cx - headW / 2, 0, cx + headW / 2, 0);
  barrel.addColorStop(0, CORK_DARK);
  barrel.addColorStop(0.32, CORK_LIGHT);
  barrel.addColorStop(0.66, CORK);
  barrel.addColorStop(1, CORK_DARK);

  const headBottom = box.y + headH * 0.55;
  const r = Math.min(headW * 0.26, headH * 0.85);

  ctx.fillStyle = barrel;
  ctx.beginPath();
  ctx.moveTo(cx - headW / 2, headBottom);
  ctx.lineTo(cx - headW / 2, headTop + r);
  ctx.quadraticCurveTo(cx - headW / 2, headTop, cx - headW / 2 + r, headTop);
  ctx.lineTo(cx + headW / 2 - r, headTop);
  ctx.quadraticCurveTo(cx + headW / 2, headTop, cx + headW / 2, headTop + r);
  ctx.lineTo(cx + headW / 2, headBottom);
  ctx.closePath();
  ctx.fill();

  // Two short pits. Cork is porous; without them the head reads as plastic.
  ctx.strokeStyle = "rgba(112, 76, 40, 0.5)";
  ctx.lineWidth = Math.max(1, box.w * 0.018);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - headW * 0.18, headTop + headH * 0.45);
  ctx.lineTo(cx - headW * 0.04, headTop + headH * 0.45);
  ctx.moveTo(cx + headW * 0.08, headTop + headH * 1.05);
  ctx.lineTo(cx + headW * 0.22, headTop + headH * 1.05);
  ctx.stroke();

  ctx.restore();
}

/**
 * The falling column of liquid.
 *
 * Drawn as a tapering ribbon rather than a rectangle: it narrows as it falls
 * and drifts slightly toward the centre of the target, which is enough to read
 * as a stream under gravity instead of a bar connecting two shapes.
 *
 * Its width also tracks the flow rate, so it swells as the bottle tips and
 * thins to nothing as it empties. A constant-width stream blinked in and out at
 * the pour boundaries, which was the most mechanical thing on screen.
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

  // Square-rooted so the stream spends most of the pour near full width and
  // only tapers at the very ends; the raw rate spends too long looking like a
  // trickle.
  const flow = Math.sqrt(pourRate(pour));
  if (flow < 0.02) return;

  const { dst, mouthX, mouthY } = pourGeometry(layout, pour);
  const m = metricsFor(dst, state.puzzle.capacity);
  const surfaceY = Math.min(m.liquidBottom, m.liquidBottom - destUnits * m.unitH);
  if (surfaceY <= mouthY) return;

  const potion = PALETTE[pour.color % PALETTE.length];
  const topW = Math.max(1, dst.w * 0.15 * flow);
  const bottomW = topW * 0.62;
  const landX = dst.x + dst.w * 0.5;

  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.4 + flow);
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
  ctx.globalAlpha = 0.35 * flow;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(mouthX - topW * 0.16, mouthY, Math.max(1, topW * 0.22), (surfaceY - mouthY) * 0.55);
  ctx.restore();
}

/** Gradient sky, drifting bubbles and a few twinkles behind the shelves. */
function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  clock: number,
  canvasW: number,
  canvasH: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, canvasH);
  sky.addColorStop(0, BG_TOP);
  sky.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.save();
  for (const sparkle of SPARKLES) {
    const alpha = sparkleAlpha(sparkle, clock);
    if (alpha <= 0.01) continue;
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = "#fff6d8";
    ctx.beginPath();
    ctx.arc(sparkle.x * canvasW, sparkle.y * canvasH, sparkle.r * canvasW, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const bubble of BUBBLES) {
    const { x, y, r } = bubbleAt(bubble, clock, canvasW, canvasH);
    ctx.globalAlpha = bubble.alpha;
    ctx.fillStyle = "#cbb8ff";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // A brighter arc on the upper left reads as a highlight on the bubble.
    ctx.globalAlpha = bubble.alpha * 1.6;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, Math.PI * 0.9, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** A shelf under each row, so the bottles stand on something. */
function drawShelves(ctx: CanvasRenderingContext2D, layout: Layout, canvasW: number): void {
  const rows = new Map<number, number>();
  for (const box of layout.bottles) {
    const base = Math.round(box.y + box.h);
    rows.set(base, Math.max(rows.get(base) ?? 0, box.w));
  }

  for (const [base, width] of rows) {
    const thickness = Math.max(3, width * 0.09);
    const inset = canvasW * 0.02;

    ctx.fillStyle = SHELF;
    ctx.fillRect(inset, base, canvasW - inset * 2, thickness);
    ctx.fillStyle = SHELF_LIP;
    ctx.fillRect(inset, base, canvasW - inset * 2, Math.max(1, thickness * 0.32));
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
): void {
  drawBackdrop(ctx, state.clock, canvasW, canvasH);
  drawShelves(ctx, layout, canvasW);

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
