"use client";

import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";
import type { Explanation } from "../engine/explain";

export function HintPanel({
  explanation,
  canApply,
  onApply,
  onClose,
}: {
  explanation: Explanation;
  /** False when the deduction only eliminates candidates and places nothing. */
  canApply: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    // Fixed to the bottom of the viewport, with no scrim.
    //
    // No scrim, because a hint's whole job is to light the board while the
    // player reads the sentence: the centred full-bleed overlay this started as
    // sat squarely on the lower half of the grid and dimmed the rest, so a hint
    // about anything below the middle explained itself over the top of the
    // thing it was explaining.
    //
    // Fixed rather than absolute, because absolute anchors to the content
    // column, which is taller than a laptop viewport — on 1366x768 most of the
    // panel sat below the fold, and with the scrim gone there was no cue that
    // anything had opened at all. Hint read as a dead button. The viewport
    // always has a bottom edge; the column's is wherever the page happens to
    // end. The page still scrolls underneath, so on a viewport too short to
    // hold both, every row remains reachable rather than permanently hidden.
    // Trimmed padding, for the same reason: the shorter this is, the shorter a
    // viewport it can share with the board without touching it.
    <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center p-3">
      <PixelPanel className="w-full max-w-xs !py-2">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest">
          {explanation.headline}
        </h2>
        <p className="mb-3 text-xs leading-relaxed opacity-80">{explanation.body}</p>
        <div className="grid grid-cols-2 gap-2">
          <PixelButton onClick={onClose} className="!px-2 !py-2 text-[10px]">
            Close
          </PixelButton>
          <PixelButton
            onClick={canApply ? onApply : onClose}
            className="!px-2 !py-2 text-[10px]"
          >
            {canApply ? "Apply" : "Got it"}
          </PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
