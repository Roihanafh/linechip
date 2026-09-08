"use client";

/**
 * components/NumberLineCanvas/index.tsx
 *
 * Reusable canvas-based number-line component with a two-phase animation:
 *   Phase 1 (1200 ms): car travels 0 → num1
 *   Phase 2 (1200 ms): car travels num1 → result (num1 op num2)
 *
 * Uses easeOutCubic easing and drawing functions from lib/canvas/numberLineRenderer.
 */

import { useEffect, useRef } from "react";
import {
  computeTickLayout,
  drawNumberLineGrid,
  drawCarTrail,
  drawCar,
  drawDustParticles,
  drawSegmentPill,
  drawResultDot,
  derivePhase2Color,
} from "../../lib/canvas/numberLineRenderer";
import { loadCarImage } from "../../lib/canvas/carImage";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_DURATION = 1200; // ms per phase
const CANVAS_HEIGHT  = 280;  // px (fixed)
const CAR_Y          = 65;   // y of the car
const LINE_Y         = 100;  // y of the number line (matches LAYOUT.lineY in renderer)

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
  /** Increment to re-trigger animation. No re-trigger if value unchanged. */
  runKey?: number;
  /** Called once when animation reaches DONE, with the computed result. */
  onResult?: (result: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NumberLineCanvas({
  num1,
  num2,
  operation,
  runKey,
  onResult,
}: NumberLineCanvasProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track runKey to detect changes without re-triggering on unrelated renders
  const prevRunKeyRef = useRef<number | undefined>(undefined);

  // Animation state refs (kept in refs to avoid stale closure issues in rAF)
  const phaseRef        = useRef<AnimPhase>("IDLE");
  const startTimeRef    = useRef<number>(0);
  const animFrameRef    = useRef<number>(0);

  // Snapshot props at animation start so mid-animation prop changes don't corrupt the frame
  const num1Ref         = useRef<number>(0);
  const num2Ref         = useRef<number>(0);
  const operationRef    = useRef<"+" | "-">("+" );
  const resultRef       = useRef<number>(0);
  const onResultRef     = useRef<((r: number) => void) | undefined>(undefined);
  const onResultCalledRef = useRef<boolean>(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function resizeCanvas() {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width  = container.offsetWidth - 40;
    canvas.height = CANVAS_HEIGHT;
  }

  function getCtx(): CanvasRenderingContext2D | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  // ── Draw helpers that read from snapshot refs ─────────────────────────────

  function drawIdle() {
    const canvas = canvasRef.current;
    const ctx    = getCtx();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { tickPositions, uniqueTicks } = computeTickLayout(canvas, 0, 0, 0);
    drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, 0, 0, true);
  }

  function drawDone() {
    const canvas = canvasRef.current;
    const ctx    = getCtx();
    if (!canvas || !ctx) return;

    const n1  = num1Ref.current;
    const n2  = num2Ref.current;
    const op  = operationRef.current;
    const res = resultRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { tickPositions, uniqueTicks } = computeTickLayout(canvas, n1, n2, res);

    drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, n1, res, false);

    const startX  = tickPositions.get(0)  ?? 0;
    const num1X   = tickPositions.get(n1) ?? startX;
    const resultX = tickPositions.get(res) ?? num1X;

    const phase1Color = n1 >= 0 ? INTBLUE : INTPINK;
    const phase2Color = derivePhase2Color(n2, op);

    // Full phase 1 trail (with silhouette car at num1)
    drawCarTrail(ctx, startX, num1X, LINE_Y, phase1Color);
    if (n1 !== 0) {
      drawCar(ctx, num1X, CAR_Y, n1 >= 0 ? "right" : "left", true);
      const pill1Text = n1 >= 0 ? `+${n1}` : `${n1}`;
      drawSegmentPill(
        ctx,
        (startX + num1X) / 2,
        CAR_Y - 30,
        pill1Text,
        phase1Color,
      );
    }

    // Full phase 2 trail
    if (res !== n1) {
      drawCarTrail(ctx, num1X, resultX, LINE_Y, phase2Color);
      const pill2Text = n2 >= 0
        ? (op === "+" ? `+${n2}` : `-${n2}`)
        : (op === "+" ? `${n2}` : `+${Math.abs(n2)}`);
      drawSegmentPill(
        ctx,
        (num1X + resultX) / 2,
        CAR_Y - 30,
        pill2Text,
        phase2Color,
      );
    }

    // Result dot
    drawResultDot(ctx, resultX, LINE_Y);
  }

  // ── Animation frames ──────────────────────────────────────────────────────

  function animatePhase1(now: number) {
    const canvas = canvasRef.current;
    const ctx    = getCtx();
    if (!canvas || !ctx) return;

    const n1  = num1Ref.current;
    const n2  = num2Ref.current;
    const res = resultRef.current;

    const elapsed  = now - startTimeRef.current;
    const rawT     = Math.min(elapsed / PHASE_DURATION, 1);
    const t        = easeOutCubic(rawT);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { tickPositions, uniqueTicks } = computeTickLayout(canvas, n1, n2, res);
    drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, n1, res, false);

    const originX = tickPositions.get(0)  ?? 0;
    const num1X   = tickPositions.get(n1) ?? originX;
    const currentX = originX + (num1X - originX) * t;

    const color    = n1 >= 0 ? INTBLUE : INTPINK;
    const direction: "left" | "right" = n1 >= 0 ? "right" : "left";

    drawCarTrail(ctx, originX, currentX, LINE_Y, color);
    drawDustParticles(ctx, currentX, CAR_Y, direction, rawT);
    drawCar(ctx, currentX, CAR_Y, direction);

    if (rawT < 1) {
      animFrameRef.current = requestAnimationFrame(animatePhase1);
    } else {
      // Transition to PHASE_2
      phaseRef.current   = "PHASE_2";
      startTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(animatePhase2);
    }
  }

  function animatePhase2(now: number) {
    const canvas = canvasRef.current;
    const ctx    = getCtx();
    if (!canvas || !ctx) return;

    const n1  = num1Ref.current;
    const n2  = num2Ref.current;
    const op  = operationRef.current;
    const res = resultRef.current;

    const elapsed = now - startTimeRef.current;
    const rawT    = Math.min(elapsed / PHASE_DURATION, 1);
    const t       = easeOutCubic(rawT);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { tickPositions, uniqueTicks } = computeTickLayout(canvas, n1, n2, res);
    drawNumberLineGrid(ctx, canvas, tickPositions, uniqueTicks, n1, res, false);

    const originX  = tickPositions.get(0)  ?? 0;
    const num1X    = tickPositions.get(n1) ?? originX;
    const resultX  = tickPositions.get(res) ?? num1X;
    const currentX = num1X + (resultX - num1X) * t;

    const phase1Color = n1 >= 0 ? INTBLUE : INTPINK;
    const phase2Color = derivePhase2Color(n2, op);
    const dir2: "left" | "right" = currentX >= num1X ? "right" : "left";

    // Phase 1 full trail + silhouette car at num1
    drawCarTrail(ctx, originX, num1X, LINE_Y, phase1Color);
    if (n1 !== 0) {
      drawCar(ctx, num1X, CAR_Y, n1 >= 0 ? "right" : "left", true);
      const pill1Text = n1 >= 0 ? `+${n1}` : `${n1}`;
      drawSegmentPill(
        ctx,
        (originX + num1X) / 2,
        CAR_Y - 30,
        pill1Text,
        phase1Color,
      );
    }

    // Phase 2 trail (growing)
    drawCarTrail(ctx, num1X, currentX, LINE_Y, phase2Color);

    // Phase 2 car
    drawDustParticles(ctx, currentX, CAR_Y, dir2, rawT);
    drawCar(ctx, currentX, CAR_Y, dir2);

    // Phase 2 pill (show label above trail midpoint)
    if (rawT > 0.15) {
      const pill2Text = n2 >= 0
        ? (op === "+" ? `+${n2}` : `-${n2}`)
        : (op === "+" ? `${n2}` : `+${Math.abs(n2)}`);
      drawSegmentPill(
        ctx,
        (num1X + currentX) / 2,
        CAR_Y - 30,
        pill2Text,
        phase2Color,
      );
    }

    if (rawT < 1) {
      animFrameRef.current = requestAnimationFrame(animatePhase2);
    } else {
      // Transition to DONE
      phaseRef.current = "DONE";
      cancelAnimationFrame(animFrameRef.current);

      drawDone();

      if (!onResultCalledRef.current) {
        onResultCalledRef.current = true;
        onResultRef.current?.(res);
      }
    }
  }

  // ── Start / restart animation ─────────────────────────────────────────────

  function startAnimation(n1: number, n2: number, op: "+" | "-") {
    const res = op === "+" ? n1 + n2 : n1 - n2;

    // Snapshot props into refs so rAF callbacks stay consistent
    num1Ref.current      = n1;
    num2Ref.current      = n2;
    operationRef.current = op;
    resultRef.current    = res;
    onResultCalledRef.current = false;

    cancelAnimationFrame(animFrameRef.current);

    phaseRef.current     = "PHASE_1";
    startTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animatePhase1);
  }

  // ── Resize handler ────────────────────────────────────────────────────────

  function handleResize() {
    resizeCanvas();
    const phase = phaseRef.current;

    if (phase === "IDLE") {
      drawIdle();
    } else if (phase === "DONE") {
      drawDone();
    } else {
      // Animation running — cancel and restart from phase 1
      cancelAnimationFrame(animFrameRef.current);
      onResultCalledRef.current = false;
      phaseRef.current     = "PHASE_1";
      startTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(animatePhase1);
    }
  }

  // ── Main effect: run on mount + when runKey/props change ──────────────────

  useEffect(() => {
    // Preload car image in background so it's ready for first paint
    loadCarImage().catch(() => {/* silently fall back to circle */});

    resizeCanvas();

    const isIdle = num1 === 0 && num2 === 0;

    if (runKey === undefined || runKey === prevRunKeyRef.current || isIdle) {
      // No animation trigger: show static idle line
      phaseRef.current = "IDLE";
      drawIdle();
    } else {
      // runKey changed and values are non-trivial: start animation
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

  // Keep onResult ref current without re-running the animation effect
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ height: `${CANVAS_HEIGHT}px`, display: "block", width: "100%" }}
      />
    </div>
  );
}
