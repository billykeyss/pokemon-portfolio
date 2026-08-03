"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LevelSelect } from "@/app/game/_shared/LevelSelect";
import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import { useSprites } from "@/app/game/_shared/useSprites";
import {
  advanceSlide,
  exitDuration,
  isSlideDone,
  startSlide,
  type Slide,
} from "./engine/anim";
import { blankBoard, paramsForLevel } from "./engine/level";
import { LevelSource } from "./engine/levelSource";
import {
  applyMove,
  cloneBoard,
  freeRun,
  isSolved,
  occupancy,
  vehicleById,
} from "./engine/rules";
import {
  defaultTrafficSave,
  loadTrafficSave,
  writeTrafficSave,
  type TrafficSave,
} from "./engine/save";
import { hint as solveHint } from "./engine/solve";
import { type Board, type Move } from "./engine/types";
import { drawScene, spriteSources, type DrawState } from "./render/draw";
import { cellAt, layoutBoard } from "./render/layout";

const FIXED_DT = 1 / 60;
const HINT_DURATION = 2.2;

export default function TrafficPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sources = useMemo(spriteSources, []);
  const { sprites } = useSprites(sources);

  const [save, setSave] = useState<TrafficSave>(defaultTrafficSave);
  const [loaded, setLoaded] = useState(false);
  /**
   * Empty until a board arrives. Generation is off the main thread now, so
   * there is a moment on first load with nothing to draw — which is the price
   * of never freezing the board mid-play.
   */
  const [board, setBoard] = useState<Board>(() => blankBoard(1));
  const [building, setBuilding] = useState(true);
  const [history, setHistory] = useState<Board[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showLevels, setShowLevels] = useState(false);

  const slideRef = useRef<Slide | null>(null);
  const exitRef = useRef<number | null>(null);
  const hintRef = useRef<{ id: number; t: number } | null>(null);
  const clockRef = useRef(0);

  const boardRef = useRef(board);
  const selectedRef = useRef(selected);
  boardRef.current = board;

  /**
   * Write the ref before the state. The pointer handler reads `selectedRef` on
   * the very next tap, and a ref only synced during render is still stale then
   * — so two quick taps would lose the selection and the move with it.
   */
  const select = useCallback((id: number | null) => {
    selectedRef.current = id;
    setSelected(id);
  }, []);

  const sourceRef = useRef<LevelSource | null>(null);
  if (sourceRef.current === null && typeof window !== "undefined") {
    sourceRef.current = new LevelSource();
  }

  useEffect(() => () => sourceRef.current?.dispose(), []);

  useEffect(() => {
    const restored = loadTrafficSave(window.localStorage);
    setSave(restored);
    setLoaded(true);

    let live = true;
    setBuilding(true);
    sourceRef.current?.request(restored.level).then((first) => {
      if (!live) return;
      const copy = cloneBoard(first);
      // Synchronously, because the render loop reads the ref and would
      // otherwise judge the empty placeholder as a solved board.
      boardRef.current = copy;
      setBoard(copy);
      setBuilding(false);
    });

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeTrafficSave(window.localStorage, save);
  }, [save, loaded]);

  /**
   * Build the next level in the background while this one is being played.
   * Generation runs a search that can take a noticeable moment on a crowded
   * board, and levelFor memoises — so paying for it now makes the transition
   * instant later, when the player is actually waiting.
   */
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => sourceRef.current?.prefetch(save.level + 1), 400);
    return () => window.clearTimeout(timer);
  }, [save.level, loaded]);

  const loadLevel = useCallback((level: number) => {
    slideRef.current = null;
    exitRef.current = null;
    hintRef.current = null;

    setBusy(false);
    setHistory([]);
    select(null);
    setMoves(0);
    setWon(false);
    setSave((s) => ({ ...s, level, best: Math.max(s.best, level) }));

    const prepared = sourceRef.current?.ready(level) ?? null;
    if (prepared !== null) {
      // Prefetched: swap straight in, no visible gap.
      const copy = cloneBoard(prepared);
      boardRef.current = copy;
      setBoard(copy);
      setBuilding(false);
      return;
    }

    // Not prefetched — a jump from level select, usually. Blank the board so
    // the previous level is not left on screen looking playable.
    const empty = blankBoard(level);
    boardRef.current = empty;
    setBoard(empty);
    setBuilding(true);

    sourceRef.current?.request(level).then((next) => {
      const copy = cloneBoard(next);
      boardRef.current = copy;
      setBoard(copy);
      setBuilding(false);
    });
  }, [select]);

  const commitMove = useCallback((move: Move) => {
    const current = boardRef.current;
    const before = cloneBoard(current);
    const after = applyMove(current, move);

    // Logic commits now; the slide is presentation catching up.
    slideRef.current = startSlide(move);
    hintRef.current = null;

    setBusy(true);
    setHistory((h) => [...h, before]);
    setBoard(after);
    setMoves((m) => m + 1);
    select(null);
  }, [select]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (slideRef.current !== null || won || showLevels || building) return;

      const canvas = canvasRef.current;
      if (canvas === null) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

      const current = boardRef.current;
      const layout = layoutBoard(
        current.size,
        current.exitRow,
        canvas.width,
        canvas.height,
      );

      const cell = cellAt(layout, x, y);
      if (cell === null) {
        select(null);
        return;
      }

      const grid = occupancy(current);
      const hit = grid[cell.row * current.size + cell.col];
      const chosen = selectedRef.current;

      if (chosen === null || hit === chosen) {
        select(hit === -1 || hit === chosen ? null : hit);
        return;
      }

      const vehicle = vehicleById(current, chosen);
      if (vehicle === undefined) {
        select(null);
        return;
      }

      // Slide toward the tapped cell, as far as the road allows. Forgiving on a
      // touch screen: the player aims at where they want the car, not at the
      // exact cell it can reach.
      const wanted = vehicle.horizontal
        ? cell.col - vehicle.col
        : cell.row - vehicle.row;
      const onAxis =
        (vehicle.horizontal ? cell.row : cell.col) ===
        (vehicle.horizontal ? vehicle.row : vehicle.col);
      if (wanted === 0 || !onAxis) {
        select(hit === -1 ? null : hit);
        return;
      }

      const dir = Math.sign(wanted);
      const delta = dir * Math.min(Math.abs(wanted), freeRun(current, chosen, dir));
      if (delta === 0) {
        select(hit === -1 ? null : hit);
        return;
      }

      commitMove({ id: chosen, delta });
    },
    [building, commitMove, select, showLevels, won],
  );

  const step = useCallback(() => {
    clockRef.current += FIXED_DT;

    const slide = slideRef.current;
    if (slide !== null) {
      const next = advanceSlide(slide, FIXED_DT);
      if (isSlideDone(next)) {
        slideRef.current = null;
        setBusy(false);
        if (isSolved(boardRef.current)) exitRef.current = 0;
      } else {
        slideRef.current = next;
      }
    }

    if (exitRef.current !== null) {
      exitRef.current += FIXED_DT;
      if (exitRef.current >= exitDuration()) setWon(true);
    }

    const hinted = hintRef.current;
    if (hinted !== null) {
      const t = hinted.t + FIXED_DT;
      hintRef.current = t > HINT_DURATION ? null : { ...hinted, t };
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const current = boardRef.current;
    const layout = layoutBoard(
      current.size,
      current.exitRow,
      canvas.width,
      canvas.height,
    );

    const state: DrawState = {
      board: current,
      slide: slideRef.current,
      exitT: exitRef.current,
      selected: selectedRef.current,
      hinted: hintRef.current?.id ?? null,
      clock: clockRef.current,
    };

    drawScene(ctx, layout, state, canvas.width, canvas.height, sprites.current);
  }, [sprites]);

  useGameLoop({ step, draw, fixedDt: FIXED_DT, running: true });

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
      exitRef.current = null;
      setBoard(cloneBoard(h[h.length - 1]));
      setMoves((m) => Math.max(0, m - 1));
      select(null);
      setWon(false);
      return h.slice(0, -1);
    });
  }, [select]);

  const showHint = useCallback(() => {
    const move = solveHint(boardRef.current);
    hintRef.current = move === null ? null : { id: move.id, t: 0 };
    if (move !== null) select(move.id);
  }, [select]);

  const bestMoves = save.movesByLevel[save.level] ?? null;
  const par = paramsForLevel(save.level).minMoves;

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
          <h1 className="text-sm font-bold uppercase tracking-[0.3em]">Traffic Jam</h1>
          <span className="w-14 text-right text-[10px] uppercase tracking-widest opacity-40">
            par {par}+
          </span>
        </div>

        <PixelPanel className="relative !p-2">
          {building && (
            <span className="absolute inset-0 z-10 flex items-center justify-center text-[10px] uppercase tracking-widest opacity-60">
              Building level…
            </span>
          )}
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            // Square, because the board is: a tall canvas would just be letterboxing.
            className="block aspect-square w-full touch-none select-none"
          />
        </PixelPanel>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setShowLevels(true)}
              className="underline decoration-dotted underline-offset-4"
            >
              Level {save.level}
            </button>
            <span className="opacity-60">Moves {moves}</span>
            <span className="opacity-60">Best {save.best}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <PixelButton
              onClick={undo}
              disabled={history.length === 0 || busy}
              className="!px-1 !py-2 text-[10px]"
            >
              Undo
            </PixelButton>
            <PixelButton
              onClick={() => loadLevel(save.level)}
              disabled={busy}
              className="!px-1 !py-2 text-[10px]"
            >
              Reset
            </PixelButton>
            <PixelButton
              onClick={showHint}
              disabled={busy}
              className="!px-1 !py-2 text-[10px]"
            >
              Hint
            </PixelButton>
          </div>

          <p className="text-center text-[10px] uppercase tracking-widest opacity-40">
            Tap a car, then tap where it should go
          </p>
        </div>

        {showLevels && (
          <LevelSelect
            best={save.best}
            current={save.level}
            scoreByLevel={save.movesByLevel}
            scoreLabel="moves"
            onPick={(level) => {
              setShowLevels(false);
              loadLevel(level);
            }}
            onClose={() => setShowLevels(false)}
          />
        )}

        {won && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <PixelPanel className="w-full max-w-xs text-center">
              <h2 className="mb-1 text-lg font-bold uppercase tracking-widest">
                Level {save.level} clear
              </h2>
              <p className="mb-4 text-xs uppercase tracking-widest opacity-70">
                {moves} moves
                {bestMoves !== null && moves < bestMoves ? " — new record" : ""}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PixelButton
                  onClick={() => loadLevel(save.level)}
                  className="!px-2 !py-2 text-[10px]"
                >
                  Replay
                </PixelButton>
                <PixelButton
                  onClick={() => loadLevel(save.level + 1)}
                  className="!px-2 !py-2 text-[10px]"
                >
                  Next
                </PixelButton>
              </div>
            </PixelPanel>
          </div>
        )}
      </div>
    </main>
  );
}
