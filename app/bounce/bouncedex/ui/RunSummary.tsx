"use client";

import Link from "next/link";
import { PixelPanel, PixelButton } from "@/app/game/_shared/pixel-ui";
import { getCritter } from "@/app/game/_shared/critters";

export function RunSummary({
  wave,
  bestCombo,
  eggsEarned,
  newDexEntries,
  onRestart,
}: {
  wave: number;
  bestCombo: number;
  eggsEarned: number;
  newDexEntries: string[];
  onRestart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 p-4">
      <PixelPanel className="w-full max-w-sm">
        <h2 className="mb-4 text-center text-lg font-bold uppercase tracking-widest">
          Nest Fallen
        </h2>

        <dl className="mb-4 space-y-1 text-sm uppercase tracking-wider">
          <div className="flex justify-between">
            <dt>Waves cleared</dt>
            <dd>{wave}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Best combo</dt>
            <dd>&times;{bestCombo}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Eggs earned</dt>
            <dd>{eggsEarned}</dd>
          </div>
        </dl>

        {newDexEntries.length > 0 && (
          <div className="mb-4 border-2 border-[#F8D030] p-2">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#F8D030]">
              New Dex entries
            </p>
            <p className="text-sm">
              {newDexEntries.map((id) => getCritter(id).name).join(", ")}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <PixelButton onClick={onRestart}>Run again</PixelButton>
          <Link
            href="/bounce"
            className="text-center text-xs uppercase tracking-widest underline opacity-70"
          >
            Back to arcade
          </Link>
        </div>
      </PixelPanel>
    </div>
  );
}
