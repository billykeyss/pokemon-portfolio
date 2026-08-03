import { BLANK, FILLED, type Board, type Puzzle } from "../engine/types";
import { cellRect, type Layout } from "./layout";

export interface DrawState {
  puzzle: Puzzle;
  board: Board;
  /** 0 while solving, ramping to 1 as the finished picture takes its colour. */
  reveal: number;
  /** A refused tap, for the flash. */
  refused: { row: number; col: number; t: number } | null;
}

const PAPER = "#F5F1E4";
// Darkened from the original #CFC7B0 (contrast 1.49:1 against PAPER) to
// #BBB093 (1.91:1) — a real bump without approaching RULE_BOLD's 2.36:1, so
// the two ranks of line stay clearly distinct and neither competes with INK.
const RULE = "#BBB093";
const RULE_BOLD = "#A79E86";
const INK = "#2E2A24";
const PENCIL = "#8A8172";
const REFUSED = "#E0483F";

/**
 * Grid line widths in device pixels, derived from the cell size rather than
 * hard-coded.
 *
 * The canvas is dpr-scaled (see page.tsx), so a hard-coded `lineWidth` of 1
 * is one *device* pixel — half a CSS pixel on a retina screen. Deriving the
 * width from the cell instead means the line scales with the board and the
 * display together: a hairline on a phone at dpr 1 stays a hairline, but the
 * same board on a retina screen gets a line that actually shows up.
 */
function gridLineWidths(cell: number): { light: number; heavy: number } {
  const light = Math.max(1, Math.round(cell * 0.03));
  return { light, heavy: light * 2 };
}

/** Duration of the refusal flash, in seconds. */
export const REFUSE_DURATION = 0.32;

function drawClues(ctx: CanvasRenderingContext2D, layout: Layout, puzzle: Puzzle): void {
  const font = Math.floor(layout.cell * 0.56);
  ctx.font = `${font}px ui-monospace, monospace`;
  ctx.fillStyle = INK;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Both gutters are right-aligned against the grid: the LAST number of a clue
  // list sits in the slot touching its line, and earlier ones step outward from
  // there. Counting outward from the grid rather than inward from the gutter's
  // edge is what keeps a short clue list adjacent to its line instead of
  // stranded at the far edge — and `- 0.5` centres the text in its slot rather
  // than placing it on the slot's boundary.
  for (let row = 0; row < puzzle.size; row++) {
    const clue = puzzle.rowClues[row];
    const numbers = clue.length === 0 ? [0] : clue;
    for (let i = 0; i < numbers.length; i++) {
      const slotsFromGrid = numbers.length - i;
      ctx.fillText(
        String(numbers[i]),
        layout.originX - layout.cell * (slotsFromGrid - 0.5),
        layout.originY + layout.cell * (row + 0.5),
      );
    }
  }

  for (let col = 0; col < puzzle.size; col++) {
    const clue = puzzle.colClues[col];
    const numbers = clue.length === 0 ? [0] : clue;
    for (let i = 0; i < numbers.length; i++) {
      const slotsFromGrid = numbers.length - i;
      ctx.fillText(
        String(numbers[i]),
        layout.originX + layout.cell * (col + 0.5),
        layout.originY - layout.cell * (slotsFromGrid - 0.5),
      );
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const end = layout.cell * layout.size;
  const { light, heavy } = gridLineWidths(layout.cell);

  for (let i = 0; i <= layout.size; i++) {
    // Every fifth line is heavier, which is how a player counts a long run
    // without touching the screen.
    const isHeavy = i % 5 === 0;
    const width = isHeavy ? heavy : light;
    ctx.strokeStyle = isHeavy ? RULE_BOLD : RULE;
    ctx.lineWidth = width;

    // Crisp-line trick, generalised past 1px: a stroke of even width centred
    // on a whole device pixel covers whole pixels on both sides, so no
    // offset is needed. An odd width needs the classic +0.5 to land the same
    // way — centring an odd width directly on a pixel boundary straddles two
    // rows/columns at half intensity instead.
    const half = width % 2 === 0 ? 0 : 0.5;

    const at = Math.round(layout.originX + i * layout.cell) + half;
    ctx.beginPath();
    ctx.moveTo(at, layout.originY);
    ctx.lineTo(at, layout.originY + end);
    ctx.stroke();

    const down = Math.round(layout.originY + i * layout.cell) + half;
    ctx.beginPath();
    ctx.moveTo(layout.originX, down);
    ctx.lineTo(layout.originX + end, down);
    ctx.stroke();
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: DrawState,
  canvasW: number,
  canvasH: number,
): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const { puzzle, board } = state;

  // Half the interior line width, symmetric on every side: the gap it opens
  // between two adjacent filled cells then exactly matches the light rule
  // drawn through it (drawGrid paints over the grid after these fills), so
  // neither a sliver of paper nor a bite out of the ink shows at an ordinary
  // boundary. A heavy (every-fifth) line is wider than that gap and does cut
  // a little into the ink on both sides — deliberately: it is the same
  // "heavier line" emphasis the grid already uses elsewhere.
  const { light } = gridLineWidths(layout.cell);
  const inset = Math.max(1, Math.round(light / 2));

  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      const cell = board[row * puzzle.size + col];
      if (cell !== FILLED && cell !== BLANK) continue;

      const rect = cellRect(layout, row, col);

      if (cell === FILLED) {
        // Ink underneath, the picture's colour fading in on top.
        //
        // Swapping the fill from ink to colour instead would make reveal 0 and
        // reveal 0.001 render differently — the cell would jump to a pale tint
        // in a single frame, so the moment of winning reads as a flash rather
        // than the fade it is meant to be.
        ctx.fillStyle = INK;
        ctx.fillRect(rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2);

        if (state.reveal > 0) {
          ctx.globalAlpha = state.reveal;
          ctx.fillStyle = puzzle.colour;
          ctx.fillRect(rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2);
          ctx.globalAlpha = 1;
        }
        continue;
      }

      // A mark is the player's own bookkeeping, so it is drawn lightly — it
      // must never compete with the picture forming beside it.
      ctx.globalAlpha = Math.max(0, 1 - state.reveal);
      ctx.strokeStyle = PENCIL;
      ctx.lineWidth = Math.max(1, layout.cell * 0.08);
      const pad = rect.w * 0.3;
      ctx.beginPath();
      ctx.moveTo(rect.x + pad, rect.y + pad);
      ctx.lineTo(rect.x + rect.w - pad, rect.y + rect.h - pad);
      ctx.moveTo(rect.x + rect.w - pad, rect.y + pad);
      ctx.lineTo(rect.x + pad, rect.y + rect.h - pad);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawGrid(ctx, layout);
  if (state.reveal < 1) drawClues(ctx, layout, puzzle);

  if (state.refused !== null) {
    const fade = Math.max(0, 1 - state.refused.t / REFUSE_DURATION);
    const rect = cellRect(layout, state.refused.row, state.refused.col);
    ctx.globalAlpha = fade;
    ctx.fillStyle = REFUSED;
    ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 1, rect.h - 1);
    ctx.globalAlpha = 1;
  }
}
