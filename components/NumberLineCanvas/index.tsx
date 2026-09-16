"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawNumberLineGrid,
  drawCarTrail,
  drawCar,
  drawDustParticles,
  drawSegmentPill,
  drawResultDot,
  derivePhase2Color,
} from "../../lib/canvas/numberLineRenderer";
import { computeAdaptiveSpacing, computeVirtualWidth, computeAutoScroll } from "../../lib/number-line/scrollLogic";
import { getPhase2FacingDirection, getPhase2MovementDirection } from "../../lib/number-line/directionLogic";
import { loadCarImage } from "../../lib/canvas/carImage";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_DURATION = 1200;
const CANVAS_HEIGHT  = 280;
const CAR_Y          = 65;
const LINE_Y         = 100;
const CANVAS_PADDING = 60;
const INTBLUE = "#2F6FED";
const INTPINK = "#EC4899";

// ─── Easing ───────────────────────────────────────────────────────────────────

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// ─── Types ────────────────────────────────────────────────────────────────────

type AnimPhase = "IDLE" | "PHASE_1" | "PHASE_2" | "DONE";

interface NumberLineCanvasProps {
  num1: number;
  num2: number;
  operation: "+" | "-";
  runKey?: number;
  onResult?: (result: number) => void;
}

// ─── Tick layout ─────────────────────────────────────────────────────────────

function computeFixedTickLayout(n1: number, n2: number, result: number, viewportWidth: number) {
  const tickSpacing = computeAdaptiveSpacing(Math.max(1, viewportWidth));
  const isIdle = n1 === 0 && n2 === 0 && result === 0;
  let uniqueTicks: number[];
  if (isIdle) {
    uniqueTicks = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  } else {
    const s = new Set<number>();
    s.add(0); s.add(n1); s.add(result);
    const lo = Math.min(0, n1, result) - 1;
    const hi = Math.max(0, n1, result) + 1;
    for (let v = lo; v <= hi; v++) s.add(v);
    uniqueTicks = [...s].sort((a, b) => a - b);
  }
  const minTick = uniqueTicks[0];
  const tickPositions = new Map<number, number>();
  for (const v of uniqueTicks) {
    tickPositions.set(v, CANVAS_PADDING + (v - minTick) * tickSpacing);
  }
  const virtualWidth = computeVirtualWidth(uniqueTicks, tickSpacing);
  return { tickPositions, uniqueTicks, virtualWidth, tickSpacing };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NumberLineCanvas({ num1, num2, operation, runKey, onResult }: NumberLineCanvasProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef     = useRef<HTMLDivElement>(null);

  // ── Pure-ref scroll — single source of truth, no React state ──────────────
  const scrollOffsetRef  = useRef(0);
  const maxScrollRef     = useRef(0);
  const viewportWidthRef = useRef(800);

  // Shadow gradient display (visual only, OK to be slightly lagged)
  const [shadowLeft,  setShadowLeft]  = useState(false);
  const [shadowRight, setShadowRight] = useState(false);
  const [virtualWidthState, setVirtualWidthState] = useState(800);

  /** Apply scroll: write ref + DOM transform immediately, update shadows via React */
  function applyScroll(offset: number) {
    const clamped = Math.max(0, Math.min(maxScrollRef.current, offset));
    scrollOffsetRef.current = clamped;
    if (innerRef.current) {
      innerRef.current.style.transform = `translateX(-${clamped}px)`;
    }
    setShadowLeft(clamped > 0);
    setShadowRight(clamped < maxScrollRef.current);
  }

  // ── Animation state refs ──────────────────────────────────────────────────
  const phaseRef           = useRef<AnimPhase>("IDLE");
  const startTimeRef       = useRef(0);
  const animFrameRef       = useRef(0);
  const prevRunKeyRef      = useRef<number | undefined>(undefined);

  // Snapshot props captured at animation start
  const num1Ref            = useRef(0);
  const num2Ref            = useRef(0);
  const operationRef       = useRef<"+" | "-">("+");
  const resultRef          = useRef(0);
  const onResultRef        = useRef<((r: number) => void) | undefined>(undefined);
  const onResultCalledRef  = useRef(false);

  // Drag state
  const isDraggingRef      = useRef(false);
  const dragStartXRef      = useRef(0);
  const dragStartOffsetRef = useRef(0);

  // Aria label
  const [canvasAriaLabel, setCanvasAriaLabel] = useState("Animasi garis bilangan");

  // Keep onResult callback ref current
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  // ── Canvas helpers ────────────────────────────────────────────────────────

  function getCtx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function getVW() {
    return containerRef.current?.offsetWidth ?? viewportWidthRef.current;
  }

  /** Resize canvas and update maxScroll to match new tick layout */
  function resizeAndLayout(n1: number, n2: number, res: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const vw = getVW();
    viewportWidthRef.current = vw;
    const { virtualWidth } = computeFixedTickLayout(n1, n2, res, vw);
    const totalWidth = Math.max(vw, virtualWidth);
    canvas.width  = totalWidth;
    canvas.height = CANVAS_HEIGHT;
    maxScrollRef.current = Math.max(0, totalWidth - vw);
    setVirtualWidthState(totalWidth);
  }

  // ── Draw functions ────────────────────────────────────────────────────────

  function drawIdle() {
    const canvas = canvasRef.current; const ctx = getCtx();
    if (!canvas || !ctx) return;
    resizeAndLayout(0, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { tickPositions, uniqueTicks } = computeFixedTickLayout(0, 0, 0, getVW());
    drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, 0, 0, true);
  }

  function drawDone() {
    const canvas = canvasRef.current; const ctx = getCtx();
    if (!canvas || !ctx) return;
    const n1 = num1Ref.current, n2 = num2Ref.current;
    const op = operationRef.current, res = resultRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { tickPositions, uniqueTicks } = computeFixedTickLayout(n1, n2, res, getVW());
    drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, n1, res, false);
    const startX  = tickPositions.get(0)  ?? 0;
    const num1X   = tickPositions.get(n1) ?? startX;
    const resultX = tickPositions.get(res) ?? num1X;
    const p1Color = n1 >= 0 ? INTBLUE : INTPINK;
    const p2Color = derivePhase2Color(n2, op);
    drawCarTrail(ctx, startX, num1X, LINE_Y, p1Color);
    if (n1 !== 0) drawCar(ctx, num1X, CAR_Y, n1 >= 0 ? "right" : "left", true);
    if (res !== n1) {
      drawCarTrail(ctx, num1X, resultX, LINE_Y, p2Color);
      const dir2Move = getPhase2MovementDirection(n1, n2, op);
      const pill = dir2Move === "right" ? `+${Math.abs(n2)}` : `−${Math.abs(n2)}`;
      drawSegmentPill(ctx, (num1X + resultX) / 2, CAR_Y - 30, pill, p2Color);
    }
    const facingDir = n2 === 0 ? (n1 >= 0 ? "right" : "left") : getPhase2FacingDirection(n2, op);
    drawCar(ctx, resultX, CAR_Y, facingDir);
    drawResultDot(ctx, resultX, LINE_Y);
  }

  // ── Animation frames ──────────────────────────────────────────────────────

  function animatePhase1(now: number) {
    const canvas = canvasRef.current; const ctx = getCtx();
    if (!canvas || !ctx) return;
    const n1 = num1Ref.current, n2 = num2Ref.current, res = resultRef.current;
    const rawT = Math.min((now - startTimeRef.current) / PHASE_DURATION, 1);
    const t = easeOutCubic(rawT);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { tickPositions, uniqueTicks } = computeFixedTickLayout(n1, n2, res, getVW());
    drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, n1, res, false);
    const originX  = tickPositions.get(0)  ?? 0;
    const num1X    = tickPositions.get(n1) ?? originX;
    const currentX = originX + (num1X - originX) * t;
    // Auto scroll to keep car in viewport margin
    const newOffset = computeAutoScroll(currentX, scrollOffsetRef.current, viewportWidthRef.current, maxScrollRef.current);
    applyScroll(newOffset);
    const color = n1 >= 0 ? INTBLUE : INTPINK;
    const dir: "left" | "right" = n1 >= 0 ? "right" : "left";
    drawCarTrail(ctx, originX, currentX, LINE_Y, color);
    drawDustParticles(ctx, currentX, CAR_Y, dir, rawT);
    drawCar(ctx, currentX, CAR_Y, dir);
    if (rawT < 1) {
      animFrameRef.current = requestAnimationFrame(animatePhase1);
    } else {
      phaseRef.current = "PHASE_2";
      startTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(animatePhase2);
    }
  }

  function animatePhase2(now: number) {
    const canvas = canvasRef.current; const ctx = getCtx();
    if (!canvas || !ctx) return;
    const n1 = num1Ref.current, n2 = num2Ref.current;
    const op = operationRef.current, res = resultRef.current;
    const rawT = Math.min((now - startTimeRef.current) / PHASE_DURATION, 1);
    const t = easeOutCubic(rawT);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { tickPositions, uniqueTicks } = computeFixedTickLayout(n1, n2, res, getVW());
    drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, n1, res, false);
    const originX  = tickPositions.get(0)  ?? 0;
    const num1X    = tickPositions.get(n1) ?? originX;
    const resultX  = tickPositions.get(res) ?? num1X;
    const currentX = num1X + (resultX - num1X) * t;
    // Auto scroll to keep car in viewport margin
    const newOffset = computeAutoScroll(currentX, scrollOffsetRef.current, viewportWidthRef.current, maxScrollRef.current);
    applyScroll(newOffset);
    const p1Color   = n1 >= 0 ? INTBLUE : INTPINK;
    const p2Color   = derivePhase2Color(n2, op);
    const dir2Face  = getPhase2FacingDirection(n2, op);
    const dir2Move  = getPhase2MovementDirection(n1, n2, op);
    drawCarTrail(ctx, originX, num1X, LINE_Y, p1Color);
    if (n1 !== 0) drawCar(ctx, num1X, CAR_Y, n1 >= 0 ? "right" : "left", true);
    drawCarTrail(ctx, num1X, currentX, LINE_Y, p2Color);
    drawDustParticles(ctx, currentX, CAR_Y, dir2Face, rawT);
    drawCar(ctx, currentX, CAR_Y, dir2Face);
    if (rawT > 0.15) {
      const pill = dir2Move === "right" ? `+${Math.abs(n2)}` : `−${Math.abs(n2)}`;
      drawSegmentPill(ctx, (num1X + currentX) / 2, CAR_Y - 30, pill, p2Color);
    }
    if (rawT < 1) {
      animFrameRef.current = requestAnimationFrame(animatePhase2);
    } else {
      phaseRef.current = "DONE";
      cancelAnimationFrame(animFrameRef.current);
      // Keep viewport steady — user can freely drag/scroll back to 0 or num1
      drawDone();
      if (!onResultCalledRef.current) {
        onResultCalledRef.current = true;
        onResultRef.current?.(res);
        const opSym = op === "+" ? "+" : "−";
        const fmt = (n: number) => n < 0 ? `(${n})` : `${n}`;
        setCanvasAriaLabel(`Animasi garis bilangan: ${fmt(n1)} ${opSym} ${fmt(n2)} = ${fmt(res)}`);
      }
    }
  }

  // ── Start animation ───────────────────────────────────────────────────────

  function startAnimation(n1: number, n2: number, op: "+" | "-") {
    const res = op === "+" ? n1 + n2 : n1 - n2;
    // Snapshot
    num1Ref.current = n1; num2Ref.current = n2;
    operationRef.current = op; resultRef.current = res;
    onResultCalledRef.current = false;
    // Resize canvas synchronously with correct values
    resizeAndLayout(n1, n2, res);
    // Bring origin (0) into viewport at start
    const { tickPositions } = computeFixedTickLayout(n1, n2, res, getVW());
    const originX = tickPositions.get(0) ?? 0;
    const initOffset = computeAutoScroll(originX, 0, viewportWidthRef.current, maxScrollRef.current);
    applyScroll(initOffset);
    cancelAnimationFrame(animFrameRef.current);
    phaseRef.current = "PHASE_1";
    startTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animatePhase1);
  }

  // ── Resize handler ────────────────────────────────────────────────────────

  function handleResize() {
    resizeAndLayout(num1Ref.current, num2Ref.current, resultRef.current);
    if (phaseRef.current === "IDLE") drawIdle();
    else if (phaseRef.current === "DONE") drawDone();
    else {
      cancelAnimationFrame(animFrameRef.current);
      onResultCalledRef.current = false;
      phaseRef.current = "PHASE_1";
      startTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(animatePhase1);
    }
  }

  // ── Main effect ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadCarImage().catch(() => {});
    const isIdle = num1 === 0 && num2 === 0;
    if (runKey === undefined || runKey === prevRunKeyRef.current || isIdle) {
      resizeAndLayout(0, 0, 0);
      phaseRef.current = "IDLE";
      drawIdle();
    } else {
      startAnimation(num1, num2, operation);
    }
    prevRunKeyRef.current = runKey;
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, num1, num2, operation]);

  // ── Drag-to-scroll ────────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Don't allow drag while animating — car controls scroll during animation
    if (phaseRef.current === "PHASE_1" || phaseRef.current === "PHASE_2") return;
    isDraggingRef.current      = true;
    dragStartXRef.current      = e.clientX;
    dragStartOffsetRef.current = scrollOffsetRef.current;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;
    const delta = dragStartXRef.current - e.clientX;
    applyScroll(dragStartOffsetRef.current + delta);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    isDraggingRef.current = false;
    e.currentTarget.style.cursor = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft")  { e.preventDefault(); applyScroll(scrollOffsetRef.current - 40); }
    if (e.key === "ArrowRight") { e.preventDefault(); applyScroll(scrollOffsetRef.current + 40); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm mb-4 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full relative overflow-hidden"
        style={{ height: `${CANVAS_HEIGHT}px`, cursor: "grab" }}
        tabIndex={0}
        aria-label={canvasAriaLabel}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {shadowLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, rgba(0,0,0,0.08), transparent)" }} />
        )}
        <div
          ref={innerRef}
          style={{ width: virtualWidthState, transform: "translateX(0px)" }}
        >
          <canvas ref={canvasRef} style={{ height: `${CANVAS_HEIGHT}px`, display: "block" }} />
        </div>
        {shadowRight && (
          <div className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, rgba(0,0,0,0.08), transparent)" }} />
        )}
      </div>
    </div>
  );
}
