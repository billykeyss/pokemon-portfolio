"use client";

import { PixelButton } from "@/app/game/_shared/pixel-ui";
import type { Speed } from "@/app/game/_shared/speed";

export interface HudProps {
  level: number;
  moves: number;
  best: number;
  speed: Speed;
  symbols: boolean;
  canUndo: boolean;
  canAddBottle: boolean;
  busy: boolean;
  onUndo: () => void;
  onReset: () => void;
  onHint: () => void;
  onAddBottle: () => void;
  onToggleSpeed: () => void;
  onToggleSymbols: () => void;
  onOpenLevels: () => void;
}

export function Hud(props: HudProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest">
        <button
          type="button"
          onClick={props.onOpenLevels}
          className="underline decoration-dotted underline-offset-4"
        >
          Level {props.level}
        </button>
        <span className="opacity-60">Moves {props.moves}</span>
        <span className="opacity-60">Best {props.best}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <PixelButton
          onClick={props.onUndo}
          disabled={!props.canUndo || props.busy}
          className="!px-1 !py-2 text-[10px]"
        >
          Undo
        </PixelButton>
        <PixelButton
          onClick={props.onReset}
          disabled={props.busy}
          className="!px-1 !py-2 text-[10px]"
        >
          Reset
        </PixelButton>
        <PixelButton
          onClick={props.onHint}
          disabled={props.busy}
          className="!px-1 !py-2 text-[10px]"
        >
          Hint
        </PixelButton>
        <PixelButton
          onClick={props.onAddBottle}
          disabled={!props.canAddBottle || props.busy}
          className="!px-1 !py-2 text-[10px]"
        >
          +Flask
        </PixelButton>
      </div>

      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
        <button type="button" onClick={props.onToggleSpeed} className="opacity-70">
          Speed {props.speed}x
        </button>
        <button
          type="button"
          onClick={props.onToggleSymbols}
          className="opacity-70"
        >
          Glyphs {props.symbols ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
