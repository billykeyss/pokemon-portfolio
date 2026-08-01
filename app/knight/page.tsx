"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import { PixelPanel, PixelButton } from "@/app/game/_shared/pixel-ui";
import { BASE_CRITTERS, getCritter } from "@/app/game/_shared/critters";
import {
  createWorld,
  spawnHero,
  spawnEnemy,
  stepWorld,
  heroOf,
  FIXED_DT,
  type World,
} from "./engine/world";
import { GRUNT } from "./data/enemies";
import { drawWorld } from "./render/draw";
import { Hud } from "./ui/Hud";

const ARENA = { width: 360, height: 560 };
/** Slice 1 fights one hand-placed wave; Slice 2 generates rooms. */
const WAVE = [
  { x: 70, y: 90 },
  { x: 290, y: 90 },
  { x: 180, y: 60 },
  { x: 60, y: 230 },
  { x: 300, y: 230 },
];

const STARTER = BASE_CRITTERS[0].id;

function populate(seed: number): World {
  const world = createWorld({ arena: ARENA, seed });
  spawnHero(world, { x: ARENA.width / 2, y: ARENA.height - 90 });
  for (const p of WAVE) spawnEnemy(world, p, GRUNT.hp);
  return world;
}

export default function KnightPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World>(populate(1));
  const [reducedMotion, setReducedMotion] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [hud, setHud] = useState({ hp: 5, maxHp: 5, over: false, cleared: false });

  const critter = getCritter(STARTER);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!canvasRef.current?.getContext("2d")) setCanvasFailed(true);
  }, []);

  const step = useCallback(() => {
    const world = worldRef.current;
    stepWorld(world);
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const world = worldRef.current;

    drawWorld(ctx, world, { heroColor: critter.color, reducedMotion });

    const hero = heroOf(world);
    const alive = world.entities.some((e) => e.kind === "enemy" && e.deadAtTick < 0);
    setHud((prev) => {
      const next = {
        hp: hero?.hp ?? 0,
        maxHp: hero?.maxHp ?? 5,
        over: world.over,
        cleared: !alive,
      };
      return prev.hp === next.hp &&
        prev.maxHp === next.maxHp &&
        prev.over === next.over &&
        prev.cleared === next.cleared
        ? prev
        : next;
    });
  }, [critter.color, reducedMotion]);

  const finished = hud.over || hud.cleared;
  useGameLoop({
    step,
    draw,
    fixedDt: FIXED_DT,
    running: !finished && !canvasFailed,
  });

  const restart = useCallback(() => {
    worldRef.current = populate(worldRef.current.tick + 1);
    setHud({ hp: 5, maxHp: 5, over: false, cleared: false });
  }, []);

  const toArena = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ARENA.width,
      y: ((e.clientY - rect.top) / rect.height) * ARENA.height,
    };
  };

  return (
    <main className="flex min-h-dvh select-none flex-col bg-[#0d0a15]">
      <Hud hp={hud.hp} maxHp={hud.maxHp} critterName={critter.name} />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {canvasFailed && (
          <p className="p-6 text-center text-xs uppercase tracking-wider text-[#f8f0e0]">
            This browser cannot draw the game.
          </p>
        )}

        <canvas
          ref={canvasRef}
          width={ARENA.width}
          height={ARENA.height}
          className="h-full max-h-full w-auto touch-none"
          style={{ imageRendering: "pixelated" }}
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Capture is a nicety; losing it must not break input.
            }
            worldRef.current.moveTarget = toArena(e);
          }}
          onPointerMove={(e) => {
            if (worldRef.current.moveTarget === null) return;
            e.preventDefault();
            worldRef.current.moveTarget = toArena(e);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            worldRef.current.moveTarget = null;
          }}
          onPointerCancel={() => {
            worldRef.current.moveTarget = null;
          }}
        />

        {finished && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
            <PixelPanel className="w-full max-w-sm text-center">
              <h2 className="mb-4 text-lg font-bold uppercase tracking-widest">
                {hud.cleared ? "Room cleared" : "You fell"}
              </h2>
              <div className="flex flex-col gap-2">
                <PixelButton onClick={restart}>Again</PixelButton>
                <Link
                  href="/game"
                  className="text-center text-xs uppercase tracking-widest underline opacity-70"
                >
                  Back to arcade
                </Link>
              </div>
            </PixelPanel>
          </div>
        )}
      </div>
    </main>
  );
}
