"use client";

import { PixelPanel, PixelButton } from "@/app/game/_shared/pixel-ui";
import { BASE_CRITTERS, CRITTERS, getCritter } from "@/app/game/_shared/critters";
import { CritterIcon } from "./CritterIcon";

export function DexScreen({
  discovered,
  eggs,
  onClose,
}: {
  discovered: string[];
  eggs: number;
  onClose: () => void;
}) {
  const seen = new Set(discovered);
  const total = Object.keys(CRITTERS).length;

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-[#0d0a15] p-4">
      <PixelPanel>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold uppercase tracking-widest">Dex</h2>
          <span className="text-xs uppercase tracking-wider opacity-60">
            {seen.size} / {total} · {eggs} eggs
          </span>
        </div>

        <div className="space-y-2">
          {BASE_CRITTERS.map((base) => (
            <div key={base.id} className="flex items-center gap-1">
              <Entry id={base.id} known={seen.has(base.id)} />
              <span className="shrink-0 opacity-40">→</span>
              {base.evolvesTo!.map((id) => (
                <Entry key={id} id={id} known={seen.has(id)} />
              ))}
            </div>
          ))}
        </div>

        <PixelButton onClick={onClose} className="mt-4 w-full">
          Close
        </PixelButton>
      </PixelPanel>
    </div>
  );
}

function Entry({ id, known }: { id: string; known: boolean }) {
  const def = getCritter(id);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1 border-2 border-[#3a2f55] px-1 py-1">
      {known ? (
        <CritterIcon id={id} size={16} className="shrink-0" />
      ) : (
        <span className="inline-block h-4 w-4 shrink-0 bg-[#2a2140]" />
      )}
      <span
        className={`truncate text-[10px] uppercase tracking-wider ${known ? "" : "opacity-30"}`}
      >
        {known ? def.name : "???"}
      </span>
    </div>
  );
}
