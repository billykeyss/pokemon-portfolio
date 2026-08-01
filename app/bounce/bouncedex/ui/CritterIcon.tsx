"use client";

import { useEffect, useRef, useState } from "react";
import { getCritter } from "../data/critters";
import { bakeCritterIcon } from "../render/draw";

/**
 * The same pixel sprite the arena draws, for HUD, Dex and modal use — so a
 * critter looks like itself everywhere instead of degrading to a coloured dot.
 */
export function CritterIcon({
  id,
  size = 24,
  className = "",
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Artwork loads asynchronously; re-bake once it lands.
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const paint = () => {
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || cancelled) return;

      const baked = bakeCritterIcon(id, size);
      canvas.width = baked.width;
      canvas.height = baked.height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, baked.width, baked.height);
      ctx.drawImage(baked, 0, 0);
    };

    paint();
    // One retry after the sprite sheet has had a chance to arrive.
    const t = window.setTimeout(() => {
      if (!cancelled) {
        setTick((n) => n + 1);
        paint();
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [id, size]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ imageRendering: "pixelated", width: size, height: size }}
      title={getCritter(id).name}
    />
  );
}
