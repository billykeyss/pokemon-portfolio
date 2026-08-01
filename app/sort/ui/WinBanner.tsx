"use client";

import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";

export function WinBanner({
  level,
  moves,
  bestMoves,
  onNext,
  onReplay,
}: {
  level: number;
  moves: number;
  bestMoves: number | null;
  onNext: () => void;
  onReplay: () => void;
}) {
  const beatRecord = bestMoves !== null && moves < bestMoves;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
      <PixelPanel className="w-full max-w-xs text-center">
        <h2 className="mb-1 text-lg font-bold uppercase tracking-widest">
          Level {level} clear
        </h2>
        <p className="mb-4 text-xs uppercase tracking-widest opacity-70">
          {moves} moves{beatRecord ? " — new record" : ""}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <PixelButton onClick={onReplay} className="!px-2 !py-2 text-[10px]">
            Replay
          </PixelButton>
          <PixelButton onClick={onNext} className="!px-2 !py-2 text-[10px]">
            Next
          </PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
