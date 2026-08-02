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
const RULE = "#CFC7B0";
const RULE_BOLD = "#A79E86";
const INK = "#2E2A24";
const PENCIL = "#8A8172";
const REFUSED = "#E0483F";

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

  for (let i = 0; i <= layout.size; i++) {
    // Every fifth line is heavier, which is how a player counts a long run
    // without touching the screen.
    const heavy = i % 5 === 0;
    ctx.strokeStyle = heavy ? RULE_BOLD : RULE;
    ctx.lineWidth = heavy ? 2 : 1;

    const at = Math.floor(layout.originX + i * layout.cell) + 0.5;
    ctx.beginPath();
    ctx.moveTo(at, layout.originY);
    ctx.lineTo(at, layout.originY + end);
    ctx.stroke();

    const down = Math.floor(layout.originY + i * layout.cell) + 0.5;
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

  for (let row = 0; row < puzzle.size; row++) {
    for (let col = 0; col < puzzle.size; col++) {
      const cell = board[row * puzzle.size + col];
      if (cell !== FILLED && cell !== BLANK) continue;

      const rect = cellRect(layout, row, col);

      if (cell === FILLED) {
        // Ink while solving, the picture's own colour once it is finished.
        ctx.fillStyle = state.reveal > 0 ? puzzle.colour : INK;
        ctx.globalAlpha = state.reveal > 0 ? 0.35 + 0.65 * state.reveal : 1;
        ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 1, rect.h - 1);
        ctx.globalAlpha = 1;
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
