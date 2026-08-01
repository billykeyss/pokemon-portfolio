"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PixelPanel } from "@/app/game/_shared/pixel-ui";
import { nextSpeed } from "@/app/game/_shared/speed";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import { advance, isDone, startPour, type Pour } from "./engine/anim";
import { levelFor, paramsForLevel } from "./engine/level";
import {
  applyMove,
  canPour,
  clonePuzzle,
  isSolved,
  pourCount,
  topRun,
} from "./engine/rules";
import {
  defaultSortSave,
  loadSortSave,
  writeSortSave,
  type SortSave,
} from "./engine/save";
import { hint as solveHint } from "./engine/solve";
import type { Move, Puzzle } from "./engine/types";
import { drawScene, type DrawState } from "./render/draw";
import { hitTest, layoutBottles } from "./render/layout";
import { Hud } from "./ui/Hud";
import { LevelSelect } from "./ui/LevelSelect";
import { WinBanner } from "./ui/WinBanner";

const FIXED_DT = 1 / 60;
const HINT_DURATION = 2;
const SHAKE_DURATION = 0.35;

export default function SortPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [save, setSave] = useState<SortSave>(defaultSortSave);
  const [loaded, setLoaded] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle>(() => clonePuzzle(levelFor(1)));
  const [history, setHistory] = useState<Puzzle[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [addedBottle, setAddedBottle] = useState(false);
  const [won, setWon] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [busy, setBusy] = useState(false);

  // Per-frame state lives in refs: the loop mutates it sixty times a second and
  // must not drag React through a render to do so.
  const pourRef = useRef<Pour | null>(null);
  const beforeRef = useRef<Puzzle | null>(null);
  const hintRef = useRef<{ move: Move; t: number } | null>(null);
  const shakeRef = useRef<{ index: number; t: number } | null>(null);
  const clockRef = useRef(0);

  // Mirrors so the loop's callbacks read current values without re-subscribing.
  const puzzleRef = useRef(puzzle);
  const selectedRef = useRef(selected);
  const symbolsRef = useRef(save.symbols);
  puzzleRef.current = puzzle;
  symbolsRef.current = save.symbols;

  /**
   * Write the ref before the state. The pointer handler reads `selectedRef` on
   * the very next tap, and a ref only synced during render is still stale then
   * — so two quick taps would lose the selection and the pour with it.
   */
  const select = useCallback((index: number | null) => {
    selectedRef.current = index;
    setSelected(index);
  }, []);

  // localStorage does not exist during static export, so the save loads on mount.
  useEffect(() => {
    const restored = loadSortSave(window.localStorage);
    setSave(restored);
    setPuzzle(clonePuzzle(levelFor(restored.level)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeSortSave(window.localStorage, save);
  }, [save, loaded]);

  const loadLevel = useCallback((level: number) => {
    pourRef.current = null;
    beforeRef.current = null;
    hintRef.current = null;
    shakeRef.current = null;

    setBusy(false);
    setPuzzle(clonePuzzle(levelFor(level)));
    setHistory([]);
    select(null);
    setMoves(0);
    setAddedBottle(false);
    setWon(false);
    setSave((s) => ({ ...s, level, best: Math.max(s.best, level) }));
  }, [select]);

  const commitMove = useCallback((move: Move) => {
    const current = puzzleRef.current;
    const units = pourCount(current, move.from, move.to);
    if (units === 0) return;

    const run = topRun(current.bottles[move.from]);
    const before = clonePuzzle(current);

    // Logic commits now; the animation is presentation catching up. Undo, the
    // win check and hints therefore never depend on animation timing.
    beforeRef.current = before;
    pourRef.current = startPour(move, units, run?.color ?? 0);
    hintRef.current = null;

    setBusy(true);
    setHistory((h) => [...h, before]);
    setPuzzle(applyMove(current, move));
    setMoves((m) => m + 1);
    select(null);
  }, [select]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (pourRef.current !== null || won || showLevels) return;

      const canvas = canvasRef.current;
      if (canvas === null) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

      const current = puzzleRef.current;
      const layout = layoutBottles(
        current.bottles.length,
        current.capacity,
        canvas.width,
        canvas.height,
      );

      const index = hitTest(layout, x, y);
      if (index === null) {
        select(null);
        return;
      }

      const chosen = selectedRef.current;
      if (chosen === null) {
        if (current.bottles[index].length > 0) select(index);
        return;
      }
      if (chosen === index) {
        select(null);
        return;
      }
      if (canPour(current, chosen, index)) {
        commitMove({ from: chosen, to: index });
        return;
      }

      shakeRef.current = { index, t: 0 };
      select(current.bottles[index].length > 0 ? index : null);
    },
    [commitMove, select, showLevels, won],
  );

  const step = useCallback(() => {
    clockRef.current += FIXED_DT;

    const pour = pourRef.current;
    if (pour !== null) {
      const next = advance(pour, FIXED_DT);
      if (isDone(next)) {
        pourRef.current = null;
        beforeRef.current = null;
        setBusy(false);
        if (isSolved(puzzleRef.current)) setWon(true);
      } else {
        pourRef.current = next;
      }
    }

    const hinted = hintRef.current;
    if (hinted !== null) {
      const t = hinted.t + FIXED_DT;
      hintRef.current = t > HINT_DURATION ? null : { ...hinted, t };
    }

    const shake = shakeRef.current;
    if (shake !== null) {
      const t = shake.t + FIXED_DT;
      shakeRef.current = t > SHAKE_DURATION ? null : { ...shake, t };
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const current = puzzleRef.current;
    const layout = layoutBottles(
      current.bottles.length,
      current.capacity,
      canvas.width,
      canvas.height,
    );

    const state: DrawState = {
      puzzle: current,
      before: beforeRef.current,
      pour: pourRef.current,
      selected: selectedRef.current,
      hinted:
        hintRef.current === null
          ? null
          : { from: hintRef.current.move.from, to: hintRef.current.move.to },
      symbols: symbolsRef.current,
      shake: shakeRef.current,
      clock: clockRef.current,
    };

    drawScene(ctx, layout, state, canvas.width, canvas.height);
  }, []);

  useGameLoop({ step, draw, fixedDt: FIXED_DT, running: true, speed: save.speed });

  // Match the backing store to the element's CSS box at device resolution.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Record the score when a level is cleared, keeping the best run.
  useEffect(() => {
    if (!won) return;
    setSave((s) => {
      const previous = s.movesByLevel[s.level];
      if (previous !== undefined && previous <= moves) return s;
      return { ...s, movesByLevel: { ...s.movesByLevel, [s.level]: moves } };
    });
  }, [won, moves]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setPuzzle(clonePuzzle(h[h.length - 1]));
      setMoves((m) => Math.max(0, m - 1));
      select(null);
      setWon(false);
      return h.slice(0, -1);
    });
  }, [select]);

  const showHint = useCallback(() => {
    const move = solveHint(puzzleRef.current);
    hintRef.current = move === null ? null : { move, t: 0 };
  }, []);

  const addBottle = useCallback(() => {
    setPuzzle((p) => ({ ...p, bottles: [...p.bottles.map((b) => [...b]), []] }));
    setAddedBottle(true);
    select(null);
  }, [select]);

  const bestMoves = useMemo(
    () => save.movesByLevel[save.level] ?? null,
    [save.movesByLevel, save.level],
  );
  const colors = paramsForLevel(save.level).colors;

  return (
    <main className="min-h-dvh bg-[#0d0a15] px-4 py-5 text-[#f8f0e0]">
      <div className="relative mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link
            href="/game"
            className="text-[10px] uppercase tracking-widest opacity-60"
          >
            &larr; Arcade
          </Link>
          <h1 className="text-sm font-bold uppercase tracking-[0.3em]">
            Potion Sort
          </h1>
          <span className="w-14 text-right text-[10px] uppercase tracking-widest opacity-40">
            {colors} hues
          </span>
        </div>

        <PixelPanel className="!p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            className="block h-[58vh] w-full touch-none select-none"
            style={{ imageRendering: "pixelated" }}
          />
        </PixelPanel>

        <Hud
          level={save.level}
          moves={moves}
          best={save.best}
          speed={save.speed}
          symbols={save.symbols}
          canUndo={history.length > 0}
          canAddBottle={!addedBottle}
          busy={busy}
          onUndo={undo}
          onReset={() => loadLevel(save.level)}
          onHint={showHint}
          onAddBottle={addBottle}
          onToggleSpeed={() =>
            setSave((s) => ({ ...s, speed: nextSpeed(s.speed) }))
          }
          onToggleSymbols={() => setSave((s) => ({ ...s, symbols: !s.symbols }))}
          onOpenLevels={() => setShowLevels(true)}
        />

        {won && (
          <WinBanner
            level={save.level}
            moves={moves}
            bestMoves={bestMoves}
            onNext={() => loadLevel(save.level + 1)}
            onReplay={() => loadLevel(save.level)}
          />
        )}

        {showLevels && (
          <LevelSelect
            best={save.best}
            current={save.level}
            movesByLevel={save.movesByLevel}
            onPick={(level) => {
              setShowLevels(false);
              loadLevel(level);
            }}
            onClose={() => setShowLevels(false)}
          />
        )}
      </div>
    </main>
  );
}
