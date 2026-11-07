"use client";

import { useEffect, useRef } from "react";
import { GAME_ICONS } from "./icons";
import { drawPixelGrid } from "./pixelGrid";

/**
 * The badge on an arcade cabinet, painted from the game's own pixel grid.
 *
 * Falls back to a plain accent block when a slug has no icon, so adding a game
 * to the registry never leaves a hole on the dashboard — it just looks plainer
 * until someone draws one.
 */
export function GameIcon({
  slug,
  accent,
  size = 44,
  framed = true,
}: {
  slug: string;
  accent: string;
  size?: number;
  /** Draw the badge's own border and field. Off when the host already frames it. */
  framed?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sprite = GAME_ICONS[slug];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || sprite === undefined) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPixelGrid(ctx, sprite, { x: 0, y: 0, w: canvas.width, h: canvas.height });
  }, [sprite, size]);

  // Accent on the border, art on a dark field. Filling the badge with the
  // accent instead puts a saturated colour directly behind the sprite, and the
  // outlines stop reading.
  const frame = framed
    ? ({ width: size, height: size, background: "#161022", borderColor: accent } as const)
    : ({ width: size, height: size } as const);
  const border = framed ? "border-4" : "";
  const art = framed ? size - 8 : size;

  if (sprite === undefined) {
    return <span className={`shrink-0 ${border}`} style={framed ? frame : { ...frame, background: accent }} />;
  }

  return (
    <span className={`grid shrink-0 place-items-center ${border}`} style={frame}>
      <canvas ref={canvasRef} style={{ width: art, height: art, imageRendering: "pixelated" }} />
    </span>
  );
}
