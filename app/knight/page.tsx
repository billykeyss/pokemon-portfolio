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
import { levelFor, ARENA, REACH_PER_BONUS } from "./engine/level";
import {
  loadSave,
  writeSave,
  recordClear,
  defaultSave,
  type KnightSave,
} from "./engine/save";
import { drawWorld } from "./render/draw";
import { Hud } from "./ui/Hud";

const STARTER = BASE_CRITTERS[0].id;

/**
 * Build the room for a level.
 *
 * `reachBonus` is passed in rather than read from a save: powerups belong to
 * the current run, not to the profile, so they have to survive moving between
 * rooms and vanish when a run ends.
 */
function populate(level: number, reachBonus: number): World {
  const room = levelFor(level);
  const world = createWorld({ arena: room.arena, seed: level });
  world.mods.reachBonus = reachBonus;
  spawnHero(world, room.heroStart);
  for (const spawn of room.spawns) spawnEnemy(world, spawn, room.enemyHp);
  return world;
}

export default function KnightPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [save, setSave] = useState<KnightSave>(defaultSave());
  const [level, setLevel] = useState(1);
  // Reach earned this run. A ref because the render loop reads it every frame
  // and must not re-subscribe when it changes.
  const reachRef = useRef(0);
  const worldRef = useRef<World>(populate(1, 0));
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

  // localStorage does not exist during the static export, so progress loads
  // after mount and the opening room is whatever the save unlocked.
  useEffect(() => {
    const loaded = loadSave(window.localStorage);
    setSave(loaded);
    setLevel(loaded.level);
    reachRef.current = 0;
    worldRef.current = populate(loaded.level, 0);
  }, []);

  const step = useCallback(() => {
    stepWorld(worldRef.current);
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

  /**
   * Clearing banks a reach powerup and opens the next room; falling replays
   * the same one with the run's gains lost. Losing what you earned is what
   * makes the powerup worth having.
   */
  const advance = useCallback(() => {
    const cleared = hud.cleared && !hud.over;
    const next = cleared ? level + 1 : level;

    if (cleared) {
      reachRef.current += REACH_PER_BONUS;
      const updated = recordClear(save, level);
      setSave(updated);
      writeSave(window.localStorage, updated);
    } else {
      reachRef.current = 0;
    }

    setLevel(next);
    worldRef.current = populate(next, reachRef.current);
    setHud({ hp: 5, maxHp: 5, over: false, cleared: false });
  }, [hud.cleared, hud.over, level, save]);

  const toArena = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ARENA.width,
      y: ((e.clientY - rect.top) / rect.height) * ARENA.height,
    };
  };

  return (
    <main className="flex min-h-dvh select-none flex-col bg-[#0d0a15]">
      <Hud
        hp={hud.hp}
        maxHp={hud.maxHp}
        critterName={`${critter.name} · lv ${level}`}
      />

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
              <h2 className="mb-3 text-lg font-bold uppercase tracking-widest">
                {hud.cleared ? `Level ${level} cleared` : "You fell"}
              </h2>

              {hud.cleared ? (
                <p className="mb-4 text-[11px] uppercase tracking-widest text-[#F8D030]">
                  +{REACH_PER_BONUS} reach
                </p>
              ) : (
                <p className="mb-4 text-[11px] uppercase tracking-widest opacity-60">
                  Reach resets
                </p>
              )}

              <div className="flex flex-col gap-2">
                <PixelButton onClick={advance}>
                  {hud.cleared ? `Level ${level + 1}` : "Try again"}
                </PixelButton>
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
