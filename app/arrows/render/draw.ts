import {
  flightAlpha,
  flightOffset,
  flightTrack,
  rebuffGlow,
  rebuffShake,
  sampleTrack,
  TRACK_PAD,
  type Flight,
  type Rebuff,
} from "../engine/anim";
import { DIRS, headOf, type Arrow, type Board } from "../engine/types";
import { cellRect, type Layout } from "./layout";

export interface DrawState {
  board: Board;
  flight: Flight | null;
  rebuff: Rebuff | null;
  clock: number;
}

const PAPER = "#F5F1E4";
const PAPER_EDGE = "#E6DFCB";
const DOT = "#CFC7B0";
const BLOCKER = "#E0483F";

/**
 * A hue per arrow, on a light board.
 *
 * The reference these are modelled on prints bright saturated routes on paper
 * rather than pale ones on black, and it is the better choice here too: a
 * winding track has to be followed by eye across the board, and a dark line on
 * a light ground holds its shape at a thickness where a glowing one on black
 * would bloom into its neighbours.
 */
const HUES = [
  "#3BA85B",
  "#3B7DD8",
  "#D8A11E",
  "#C9457A",
  "#7B4FC4",
  "#1F9E86",
  "#E0703A",
  "#5AA9E6",
  "#9B2F4A",
  "#7BC043",
];

/** Rounded polyline through the arrow's cells, capped with a head. */
function drawTrack(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  arrow: Arrow,
  offsetCells: number,
  alpha: number,
  shakeCells: number,
  glow: number,
): void {
  const { dx, dy } = DIRS[arrow.dir];
  // Shake runs across the arrow's axis, so a refused arrow rocks sideways
  // rather than nudging toward the exit it was just denied. It stays a rigid
  // jolt — the arrow is being stopped, not travelling anywhere.
  const shakeX = -dy * shakeCells * layout.cell;
  const shakeY = dx * shakeCells * layout.cell;

  /**
   * Each point rides the arrow's own route rather than every cell sharing one
   * offset vector. On a bent arrow the two differ: sliding along the track
   * takes the tail round the same corner the head turned, while a shared
   * vector drags the whole shape sideways out of its corridor.
   */
  const track = flightTrack(arrow, Math.abs(offsetCells) + arrow.cells.length + 2);

  const centre = (index: number) => {
    const at = sampleTrack(track, TRACK_PAD + index + offsetCells);
    // cellRect wants whole cells; take cell (0,0) and shift by the fractional
    // position, so a sample between two cells lands between them on screen.
    const origin = cellRect(layout, 0, 0);
    return {
      x: origin.x + origin.w / 2 + at.col * layout.cell + shakeX,
      y: origin.y + origin.h / 2 + at.row * layout.cell + shakeY,
    };
  };

  const colour = glow > 0 ? BLOCKER : HUES[arrow.hue % HUES.length];
  /**
   * Wide enough that neighbouring tracks nearly touch.
   *
   * A thin line on a wide cell reads as a scattering of marks; at this width the
   * paper left between two parallel tracks narrows to a gutter, and the board
   * reads as corridors with walls between them — which is the maze the arrows
   * are supposed to be threading.
   */
  const width = layout.cell * 0.64;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (glow > 0) {
    ctx.shadowColor = BLOCKER;
    ctx.shadowBlur = layout.cell * 0.7 * glow;
  }

  // Body. A single-cell arrow has no segment to stroke, so it gets a dot.
  if (arrow.cells.length === 1) {
    const p = centre(0);
    ctx.beginPath();
    ctx.arc(p.x, p.y, width * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    const first = centre(0);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < arrow.cells.length; i++) {
      const p = centre(i);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Head: a triangle sitting just past the last cell's centre, pointing along
  // the final segment.
  // The wings have to overhang the body, or a head as wide as this one reads as
  // a blunt end rather than a point.
  const head = centre(arrow.cells.length - 1);
  const nose = layout.cell * 0.5;
  const wing = layout.cell * 0.46;
  const angle = Math.atan2(dy, dx);

  ctx.shadowBlur = glow > 0 ? layout.cell * 0.7 * glow : 0;
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(nose, 0);
  ctx.lineTo(nose - wing, -wing * 0.86);
  ctx.lineTo(nose - wing, wing * 0.86);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  void headOf;
}

function drawPaper(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  canvasW: number,
  canvasH: number,
): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // A faint dot at every cell corner, so the grid is felt rather than ruled.
  ctx.fillStyle = DOT;
  const r = Math.max(0.8, layout.cell * 0.035);
  for (let row = 0; row <= layout.size; row++) {
    for (let col = 0; col <= layout.size; col++) {
      ctx.beginPath();
      ctx.arc(
        layout.originX + col * layout.cell,
        layout.originY + row * layout.cell,
        r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  ctx.strokeStyle = PAPER_EDGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    layout.originX - layout.cell * 0.2,
    layout.originY - layout.cell * 0.2,
    layout.cell * layout.size + layout.cell * 0.4,
    layout.cell * layout.size + layout.cell * 0.4,
  );
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
): void {
  drawPaper(ctx, layout, canvasW, canvasH);

  const shake = state.rebuff === null ? 0 : rebuffShake(state.rebuff.t);
  const glow = state.rebuff === null ? 0 : rebuffGlow(state.rebuff.t);

  for (const arrow of state.board.arrows) {
    const jolted = state.rebuff?.id === arrow.id;
    const blocking = state.rebuff?.blockerId === arrow.id;
    drawTrack(ctx, layout, arrow, 0, 1, jolted ? shake : 0, blocking ? glow : 0);
  }

  // The arrow on its way out is drawn last, so it passes over the board rather
  // than under whatever it is sliding past.
  if (state.flight !== null) {
    drawTrack(
      ctx,
      layout,
      state.flight.arrow,
      flightOffset(state.flight),
      flightAlpha(state.flight),
      0,
      0,
    );
  }
}
