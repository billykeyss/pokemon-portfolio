"use client";

import { valueAt, type Mask } from "../engine/candidates";
import { CELLS } from "../engine/grid";
import type { Board } from "../engine/types";
import { SudokuCell } from "./Cell";
import type { CellHighlight } from "./highlight";

export function SudokuBoard({
  board,
  candidates,
  highlights,
  onPick,
}: {
  board: Board;
  candidates: Mask[];
  highlights: CellHighlight[];
  onPick: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-9 gap-0 border-4 border-[#f8f0e0] bg-[#3a2f52]">
      {Array.from({ length: CELLS }, (_, i) => (
        <div
          key={i}
          // The 3x3 blocks are drawn with thicker edges on the cells that sit
          // on a band boundary. Overlaying a separate grid of rules would sit
          // above the cells and swallow their taps.
          className={[
            i % 9 === 2 || i % 9 === 5 ? "border-r-2 border-r-[#f8f0e0]" : "",
            Math.floor(i / 9) % 3 === 2 && i < 72 ? "border-b-2 border-b-[#f8f0e0]" : "",
          ].join(" ")}
        >
          <SudokuCell
            value={valueAt(board, i)}
            given={board.puzzle.givens[i] !== 0}
            candidates={candidates[i]}
            highlight={highlights[i]}
            onPick={() => onPick(i)}
          />
        </div>
      ))}
    </div>
  );
}
