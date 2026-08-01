"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import {
  loadSave,
  writeSave,
  defaultSave,
  type BouncedexSave,
} from "./save";
import { nextSpeed, DEFAULT_SPEED, type Speed } from "@/app/game/_shared/speed";
import {
  createWorld,
  spawnProjectile,
  spawnEnemy,
  stepWorld,
  FIXED_DT,
  CHARGE_SPEED_BONUS,
  OVERDRIVE_CHARGE,
  isOverdrive,
  triggerOverdrive,
  bumperAt,
  dropBumper,
  type World,
} from "./engine/world";
import { autoAim, aimFromDrag, predictPath, LAUNCH_SPEED } from "./engine/aim";
import { buildWave, laneX } from "./engine/waves";
import { makeRng, type Rng } from "@/app/game/_shared/rng";
import { pendingEvolution, applyEvolution, autoEvolveDecided } from "./engine/combat";
import { drawWorld } from "./render/draw";
import { BASE_CRITTERS, getCritter } from "@/app/game/_shared/critters";
import { rollUpgrades, UPGRADE_EVERY_WAVES, type Upgrade } from "./data/upgrades";
import type { Vec2 } from "./engine/vec";
import { Hud } from "./ui/Hud";
import { ChoiceModal, type Choice } from "./ui/ChoiceModal";
import { RunSummary } from "./ui/RunSummary";
import { DexScreen } from "./ui/DexScreen";

const ARENA = { width: 400, height: 700 };
const LAUNCH_ORIGIN: Vec2 = { x: ARENA.width / 2, y: ARENA.height - 30 };
const MANUAL_RELEASE_MS = 3000;
/** Hold this long for a fully charged shot. */
const CHARGE_MS = 900;
/** One wave every 6 simulated seconds. */
const WAVE_INTERVAL_TICKS = 120 * 6;

const DEFAULT_STARTERS = BASE_CRITTERS.slice(0, 3).map((c) => c.id);

/**
 * Auto-pick countdowns are real-time, but choices arrive on *simulated* time,
 * so at 10x the game hits an evolution every few hundred ms and would sit
 * paused ~94% of the time waiting on 4-5s modals. Scale the wait with speed,
 * with a floor so the choice is still readable.
 */
const autoPickMs = (base: number, speed: number) => Math.max(500, base / speed);

function fillQueue(existing: string[], size: number, pool: string[], rng: Rng): string[] {
  const next = [...existing];
  while (next.length < size) next.push(rng.pick(pool));
  return next.slice(0, size);
}

export default function BouncedexPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World>(createWorld({ arena: ARENA, seed: 1 }));
  const autoTimerRef = useRef(0);
  const lastTouchRef = useRef(0);
  const dragRef = useRef<Vec2 | null>(null);
  const draggingBumperRef = useRef<number | null>(null);
  const chargeStartRef = useRef(0);
  const chargeRef = useRef(0);
  const waveRngRef = useRef(makeRng(1));
  const queueRef = useRef<string[]>([]);
  const startersRef = useRef<string[]>(DEFAULT_STARTERS);
  const lastUpgradeWaveRef = useRef(0);
  const reloadRef = useRef(0);

  const [autoMode, setAutoMode] = useState(true);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [save, setSave] = useState<BouncedexSave>(defaultSave());
  const [showDex, setShowDex] = useState(false);
  const [runOver, setRunOver] = useState(false);
  const [pendingUpgrades, setPendingUpgrades] = useState<Upgrade[] | null>(null);
  const [pendingEvo, setPendingEvo] = useState<{
    bodyId: number;
    options: readonly [string, string];
  } | null>(null);
  const [hud, setHud] = useState({
    wave: 0,
    nestHp: 5,
    maxNestHp: 5,
    combo: 0,
    queue: [] as string[],
    reload: 0,
    charge: 0,
    overdrive: 0,
    overdriveActive: false,
  });

  // localStorage is unavailable during the static build, so the save must load
  // in an effect rather than in a useState initialiser.
  useEffect(() => {
    const loaded = loadSave(window.localStorage);
    const starters = loaded.starters.length ? loaded.starters : DEFAULT_STARTERS;
    const withStarters: BouncedexSave = {
      ...loaded,
      starters,
      dex: Array.from(new Set([...loaded.dex, ...starters])),
    };
    startersRef.current = starters;
    queueRef.current = fillQueue(
      [],
      worldRef.current.mods.queueSize,
      starters,
      waveRngRef.current,
    );
    setSave(withStarters);
    setAutoMode(withStarters.autoMode);
    setSpeed(withStarters.speed);
    writeSave(window.localStorage, withStarters);
  }, []);

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

  /** Fire if the launcher has reloaded. Returns whether a shot went out. */
  const launch = useCallback((dir: Vec2, charge = 0): boolean => {
    const world = worldRef.current;
    const mods = world.mods;

    // Manual aiming buys you a *better* shot, never a free extra one — both
    // auto and manual draw from the same reload clock.
    if (autoTimerRef.current < mods.autoFireInterval) return false;
    autoTimerRef.current = 0;

    queueRef.current = fillQueue(
      queueRef.current,
      mods.queueSize,
      startersRef.current,
      waveRngRef.current,
    );
    const critterId = queueRef.current.shift();
    if (!critterId) return false;

    const power =
      LAUNCH_SPEED * mods.launchPower * (1 + CHARGE_SPEED_BONUS * charge);
    spawnProjectile(
      world,
      critterId,
      LAUNCH_ORIGIN,
      { x: dir.x * power, y: dir.y * power },
      charge,
    );
    return true;
  }, []);

  const step = useCallback(() => {
    const world = worldRef.current;
    stepWorld(world);

    if (world.tick > 0 && world.tick % WAVE_INTERVAL_TICKS === 0) {
      world.wave += 1;
      for (const spawn of buildWave(world.wave, waveRngRef.current)) {
        spawnEnemy(
          world,
          {
            x: laneX(spawn.lane, ARENA.width) + spawn.xJitter,
            y: -spawn.radius - spawn.yOffset,
          },
          spawn.hp,
          spawn.radius,
        );
      }
    }

    // The reload clock always ticks, so a manual shot and an auto shot are
    // interchangeable draws on the same cadence.
    autoTimerRef.current = Math.min(
      autoTimerRef.current + FIXED_DT,
      world.mods.autoFireInterval,
    );
    reloadRef.current = autoTimerRef.current / world.mods.autoFireInterval;

    if (dragRef.current) {
      chargeRef.current = Math.min(
        1,
        (performance.now() - chargeStartRef.current) / CHARGE_MS,
      );
    }

    const manualRecently = performance.now() - lastTouchRef.current < MANUAL_RELEASE_MS;
    if (autoMode && !manualRecently && !world.over) {
      launch(autoAim(world, LAUNCH_ORIGIN));
    }

    if (world.over) {
      setRunOver(true);
      return;
    }

    if (
      world.wave > 0 &&
      world.wave % UPGRADE_EVERY_WAVES === 0 &&
      world.wave !== lastUpgradeWaveRef.current
    ) {
      lastUpgradeWaveRef.current = world.wave;
      setPendingUpgrades(rollUpgrades(waveRngRef.current));
      return;
    }

    // Lines whose branch is already settled evolve silently; only the first
    // of each line interrupts play.
    autoEvolveDecided(world);

    const evo = pendingEvolution(world);
    if (evo) setPendingEvo({ bodyId: evo.bodyId, options: evo.options });
  }, [autoMode, launch]);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const world = worldRef.current;
    const aimPath = dragRef.current
      ? predictPath(
          world,
          LAUNCH_ORIGIN,
          aimFromDrag(LAUNCH_ORIGIN, dragRef.current),
          world.mods.launchPower * (1 + CHARGE_SPEED_BONUS * chargeRef.current),
          // A charged shot travels further, so show more of where it goes.
          26 + Math.round(chargeRef.current * 30),
        )
      : null;

    drawWorld(ctx, world, {
      aimPath,
      shake: Math.min(world.combo, 6),
      reducedMotion,
    });

    const queue = queueRef.current;
    setHud((prev) =>
      prev.wave === world.wave &&
      prev.nestHp === world.nestHp &&
      prev.combo === world.combo &&
      prev.queue.length === queue.length &&
      Math.round(prev.reload * 8) === Math.round(reloadRef.current * 8) &&
      Math.round(prev.charge * 8) === Math.round(chargeRef.current * 8) &&
      Math.round(prev.overdrive * 20) === Math.round((world.overdrive / OVERDRIVE_CHARGE) * 20) &&
      prev.overdriveActive === isOverdrive(world) &&
      prev.queue.every((id, i) => id === queue[i])
        ? prev
        : {
            wave: world.wave,
            nestHp: world.nestHp,
            maxNestHp: world.maxNestHp,
            combo: world.combo,
            queue: [...queue],
            reload: reloadRef.current,
            charge: chargeRef.current,
            overdrive: world.overdrive / OVERDRIVE_CHARGE,
            overdriveActive: isOverdrive(world),
          },
    );
  }, [reducedMotion]);

  const paused =
    pendingUpgrades !== null || pendingEvo !== null || runOver || showDex;
  useGameLoop({
    step,
    draw,
    fixedDt: FIXED_DT,
    running: !paused && !canvasFailed,
    speed,
  });

  const cycleSpeed = useCallback(() => {
    setSpeed((current) => {
      const next = nextSpeed(current);
      // Persist immediately: a run can end before the next save point.
      setSave((s) => {
        const merged = { ...s, speed: next };
        writeSave(window.localStorage, merged);
        return merged;
      });
      return next;
    });
  }, []);

  const chooseUpgrade = useCallback(
    (id: string) => {
      const picked = pendingUpgrades?.find((u) => u.id === id);
      if (picked) {
        const world = worldRef.current;
        world.mods = picked.apply(world.mods);
        // A bigger queue must fill immediately, or NEXT renders short slots.
        queueRef.current = fillQueue(
          queueRef.current,
          world.mods.queueSize,
          startersRef.current,
          waveRngRef.current,
        );
      }
      setPendingUpgrades(null);
    },
    [pendingUpgrades],
  );

  const chooseEvolution = useCallback(
    (toId: string) => {
      if (pendingEvo) applyEvolution(worldRef.current, pendingEvo.bodyId, toId);
      setPendingEvo(null);
    },
    [pendingEvo],
  );

  const restart = useCallback(() => {
    const world = worldRef.current;
    const eggsEarned = world.wave + Math.floor(world.bestCombo / 2);
    const merged: BouncedexSave = {
      ...save,
      eggs: save.eggs + eggsEarned,
      dex: Array.from(new Set([...save.dex, ...world.discovered])),
      bestWave: Math.max(save.bestWave, world.wave),
      bestCombo: Math.max(save.bestCombo, world.bestCombo),
      autoMode,
      speed,
    };
    writeSave(window.localStorage, merged);
    setSave(merged);

    const nextSeed = world.tick + 1;
    lastUpgradeWaveRef.current = 0;
    autoTimerRef.current = 0;
    waveRngRef.current = makeRng(nextSeed);
    // createWorld already seeds fresh defaultMods().
    worldRef.current = createWorld({ arena: ARENA, seed: nextSeed });
    queueRef.current = fillQueue(
      [],
      worldRef.current.mods.queueSize,
      startersRef.current,
      waveRngRef.current,
    );
    setRunOver(false);
  }, [save, autoMode, speed]);

  const toCanvasSpace = (e: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ARENA.width,
      y: ((e.clientY - rect.top) / rect.height) * ARENA.height,
    };
  };

  return (
    <main className="flex min-h-dvh select-none flex-col bg-[#0d0a15]">
      <Hud
        wave={hud.wave}
        nestHp={hud.nestHp}
        maxNestHp={hud.maxNestHp}
        combo={hud.combo}
        queue={hud.queue}
        reload={hud.reload}
        charge={hud.charge}
        overdrive={hud.overdrive}
        overdriveActive={hud.overdriveActive}
        onOverdrive={() => triggerOverdrive(worldRef.current)}
        autoMode={autoMode}
        speed={speed}
        onToggleAuto={() => setAutoMode((v) => !v)}
        onCycleSpeed={cycleSpeed}
        onOpenDex={() => setShowDex(true)}
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
            e.currentTarget.setPointerCapture(e.pointerId);
            const at = toCanvasSpace(e);

            // Touching an existing bumper picks it up instead of aiming, so
            // the board is something you tend rather than just scenery.
            const grabbed = bumperAt(worldRef.current, at.x, at.y);
            if (grabbed) {
              draggingBumperRef.current = grabbed.id;
              lastTouchRef.current = performance.now();
              return;
            }

            dragRef.current = at;
            chargeStartRef.current = performance.now();
            chargeRef.current = 0;
            lastTouchRef.current = performance.now();
          }}
          onPointerMove={(e) => {
            const held = draggingBumperRef.current;
            if (held !== null) {
              e.preventDefault();
              const at = toCanvasSpace(e);
              const body = worldRef.current.bodies.find((b) => b.id === held);
              if (body) {
                // Keep it inside the arena so a bumper cannot be parked in a wall.
                const { width, height } = worldRef.current.arena;
                body.pos.x = Math.max(body.radius, Math.min(width - body.radius, at.x));
                body.pos.y = Math.max(body.radius, Math.min(height - body.radius, at.y));
              }
              lastTouchRef.current = performance.now();
              return;
            }

            if (!dragRef.current) return;
            e.preventDefault();
            dragRef.current = toCanvasSpace(e);
            lastTouchRef.current = performance.now();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            if (draggingBumperRef.current !== null) {
              dropBumper(worldRef.current, draggingBumperRef.current);
              draggingBumperRef.current = null;
              lastTouchRef.current = performance.now();
              return;
            }

            if (dragRef.current) {
              launch(aimFromDrag(LAUNCH_ORIGIN, dragRef.current), chargeRef.current);
            }
            dragRef.current = null;
            chargeRef.current = 0;
            lastTouchRef.current = performance.now();
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            chargeRef.current = 0;
            draggingBumperRef.current = null;
          }}
        />

        {pendingUpgrades && (
          <ChoiceModal
            title="Choose an upgrade"
            choices={pendingUpgrades.map(
              (u): Choice => ({ id: u.id, name: u.name, description: u.description }),
            )}
            onChoose={chooseUpgrade}
            autoPickAfterMs={autoMode ? autoPickMs(5000, speed) : null}
          />
        )}

        {pendingEvo && (
          <ChoiceModal
            title="Evolving!"
            choices={pendingEvo.options.map((id): Choice => {
              const d = getCritter(id);
              return {
                id,
                name: d.name,
                description: `${d.behavior} · ${d.damage} dmg`,
                critterId: id,
              };
            })}
            onChoose={chooseEvolution}
            autoPickAfterMs={autoMode ? autoPickMs(4000, speed) : null}
          />
        )}

        {showDex && (
          <DexScreen
            discovered={save.dex}
            eggs={save.eggs}
            onClose={() => setShowDex(false)}
          />
        )}

        {runOver && (
          <RunSummary
            wave={worldRef.current.wave}
            bestCombo={worldRef.current.bestCombo}
            eggsEarned={
              worldRef.current.wave + Math.floor(worldRef.current.bestCombo / 2)
            }
            newDexEntries={worldRef.current.discovered.filter(
              (id) => !save.dex.includes(id),
            )}
            onRestart={restart}
          />
        )}
      </div>
    </main>
  );
}
