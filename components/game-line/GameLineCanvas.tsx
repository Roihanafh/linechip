"use client";

/**
 * components/game-line/GameLineCanvas.tsx
 *
 * Canvas component for the Game Line number line.
 * Runs a continuous rAF loop: drawGameGrid + drawGameArrow for each arrow.
 * Supports horizontal pan via pointer events.
 */

import { useEffect, useRef } from "react";
import type { GameArrow } from "./useGameLineState";
import {
  drawGameGrid,
  drawGameArrow,
  deriveArrowColor,
} from "../../lib/canvas/gameLineRenderer";
import { loadCarImage } from "../../lib/canvas/carImage";

interface GameLineCanvasProps {
  arrows: Record<1 | 2, GameArrow>;
  spacing: number;
  offsetX: number;
  operation: "+" | "-";
  onDrag: (deltaX: number) => void;
}

const CANVAS_HEIGHT = 300;

export default function GameLineCanvas({
  arrows,
  spacing,
  offsetX,
  operation,
  onDrag,
}: GameLineCanvasProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // Keep latest props in refs so rAF closure always reads current values
  const arrowsRef    = useRef(arrows);
  const spacingRef   = useRef(spacing);
  const offsetXRef   = useRef(offsetX);
  const operationRef = useRef(operation);

  useEffect(() => { arrowsRef.current = arrows; },    [arrows]);
  useEffect(() => { spacingRef.current = spacing; },  [spacing]);
  useEffect(() => { offsetXRef.current = offsetX; },  [offsetX]);
  useEffect(() => { operationRef.current = operation; }, [operation]);

  // ── Resize ────────────────────────────────────────────────────────────────
  function resizeCanvas() {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width  = Math.max(1, container.offsetWidth - 40);
    canvas.height = CANVAS_HEIGHT;
  }

  // ── Main effect: rAF loop + resize + pointer events ──────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Preload car SVG
    loadCarImage().catch(() => {/* fall back to circle */});

    resizeCanvas();

    // rAF draw loop
    const drawFrame = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const sp  = spacingRef.current;
      const off = offsetXRef.current;
      const op  = operationRef.current;
      const arrs = arrowsRef.current;

      drawGameGrid(ctx, canvas, sp, off);

      const lineY  = canvas.height / 2;
      const carY1  = lineY - 50;
      const carY2  = lineY + 50;

      // Arrow 1
      const a1 = arrs[1];
      const len1 = a1.visualLength !== undefined ? a1.visualLength : a1.length;
      if (len1 !== 0) {
        const color1 = deriveArrowColor(1, len1, op);
        drawGameArrow(ctx, canvas, sp, off,
          { start: a1.start, length: len1, color: color1, carY: carY1, target: a1.target },
          carY1, op, 1);
      }

      // Arrow 2
      const a2 = arrs[2];
      const len2 = a2.visualLength !== undefined ? a2.visualLength : a2.length;
      if (len2 !== 0) {
        const color2 = deriveArrowColor(2, len2, op);
        drawGameArrow(ctx, canvas, sp, off,
          { start: a2.start, length: len2, color: color2, carY: carY2, target: a2.target },
          carY2, op, 2);
      }

      animFrameRef.current = requestAnimationFrame(drawFrame);
    };

    animFrameRef.current = requestAnimationFrame(drawFrame);

    // Resize handler
    const handleResize = () => {
      resizeCanvas();
    };
    window.addEventListener("resize", handleResize);

    // Pointer events for horizontal pan
    let dragStartX = 0;
    let isDragging = false;

    const onPointerDown = (e: PointerEvent) => {
      dragStartX = e.clientX;
      isDragging = true;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - dragStartX;
      dragStartX = e.clientX;
      onDrag(delta);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    canvas.addEventListener("pointerdown",   onPointerDown);
    canvas.addEventListener("pointermove",   onPointerMove);
    canvas.addEventListener("pointerup",     onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointerdown",   onPointerDown);
      canvas.removeEventListener("pointermove",   onPointerMove);
      canvas.removeEventListener("pointerup",     onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ height: `${CANVAS_HEIGHT}px`, display: "block", width: "100%", touchAction: "none" }}
      />
    </div>
  );
}
