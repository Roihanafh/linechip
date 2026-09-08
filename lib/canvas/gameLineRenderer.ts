/**
 * gameLineRenderer.ts
 *
 * Pure drawing functions for GameLineCanvas.
 * All functions receive a CanvasRenderingContext2D and plain data — no React,
 * no side-effects outside the canvas.
 *
 * Token colours match linechip globals.css:
 *   intblue  #2F6FED  intblue-dark #1E4FC4
 *   intpink  #EC4899
 */

import { getCarImageSync } from './carImage';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  intblue: '#2F6FED',
  intblueDark: '#1E4FC4',
  intpink: '#EC4899',
  tick: '#CBD5E1',
  tickZero: '#0f172a',
  label: '#475569',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Clamps spacing within [20, 80].
 * `spacing' = Math.max(20, Math.min(80, current + delta))`
 *
 * **Validates: Requirements 7.6**
 */
export function clampSpacing(current: number, delta: number): number {
  return Math.max(20, Math.min(80, current + delta));
}

/**
 * Returns the hex colour for an arrow based on its index, the operation, and
 * the direction of travel it produces.
 *
 * Arrow 1: always intblue.
 * Arrow 2:
 *   op `+`, length >= 0 → right → intblue
 *   op `+`, length <  0 → left  → intpink
 *   op `−`, length >= 0 → left  → intpink   (subtract positive = move left)
 *   op `−`, length <  0 → right → intblue   (subtract negative = move right)
 *
 * **Validates: Requirements 7.7**
 */
export function deriveArrowColor(
  arrowNum: 1 | 2,
  length: number,
  operation: '+' | '-',
): string {
  if (arrowNum === 1) return COLORS.intblue;

  const goesRight = operation === '+' ? length >= 0 : length < 0;
  return goesRight ? COLORS.intblue : COLORS.intpink;
}

// ─── Public interfaces ────────────────────────────────────────────────────────

/** Data required to draw a single arrow on the game number line. */
export interface ArrowDrawData {
  /** Starting position in number-line units. */
  start: number;
  /** Arrow length in number-line units (negative = points left). */
  length: number;
  /** Hex colour string (use deriveArrowColor). */
  color: string;
  /** Canvas y-coordinate for the car icon. */
  carY: number;
  /**
   * Final target value — used for the label pill when visualLength is
   * temporarily shorter during animation.
   */
  target?: number;
}

// ─── Drawing functions ────────────────────────────────────────────────────────

/**
 * Draws an arrowhead triangle at (x, y) pointing left or right.
 *
 * The tip sits exactly at x; the two base vertices are 10 px behind the tip
 * and ±8 px above/below the centre line.
 */
export function drawGameArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'left' | 'right',
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color + '55';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  if (direction === 'right') {
    ctx.lineTo(x - 10, y - 8);
    ctx.lineTo(x - 10, y + 8);
  } else {
    ctx.lineTo(x + 10, y - 8);
    ctx.lineTo(x + 10, y + 8);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * Draws the game number line: gradient line, left/right arrowheads,
 * tick marks, and numeric labels.
 *
 * @param spacing  Pixels per unit on the number line (clamped [20, 80]).
 * @param offsetX  Horizontal viewport offset in pixels (pan support).
 */
export function drawGameGrid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  spacing: number,
  offsetX: number,
): void {
  const centerY = canvas.height / 2;
  const centerX = canvas.width / 2 + offsetX;

  // How many integer ticks are visible on each side, with some padding.
  const halfVisible = Math.ceil(canvas.width / spacing / 2) + 3;
  const firstTick = Math.round(-offsetX / spacing) - halfVisible;
  const lastTick  = Math.round(-offsetX / spacing) + halfVisible;

  // ── Main gradient line ───────────────────────────────────────────────────
  const lineGrad = ctx.createLinearGradient(0, centerY, canvas.width, centerY);
  lineGrad.addColorStop(0,   COLORS.intblue + '66'); // transparent ends
  lineGrad.addColorStop(0.1, COLORS.intblue);
  lineGrad.addColorStop(0.9, COLORS.intblue);
  lineGrad.addColorStop(1,   COLORS.intblue + '66');

  ctx.save();
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'round';
  ctx.shadowColor = COLORS.intblue + '44';
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.moveTo(0, centerY);
  ctx.lineTo(canvas.width, centerY);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // ── Arrowheads on the axis ends ──────────────────────────────────────────
  drawGameArrowhead(ctx, canvas.width - 6, centerY, 'right', COLORS.intblue);
  drawGameArrowhead(ctx, 6,                centerY, 'left',  COLORS.intblue);

  // ── Ticks and labels ─────────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';

  for (let i = firstTick; i <= lastTick; i++) {
    const x = centerX + i * spacing;

    // Skip ticks that fall behind the arrowhead area.
    if (x < 14 || x > canvas.width - 14) continue;

    const isZero    = i === 0;
    const tickHalf  = isZero ? 10 : 6;
    const tickColor = isZero ? COLORS.tickZero : COLORS.tick;
    const tickWidth = isZero ? 2.5 : 1.5;

    ctx.save();
    ctx.strokeStyle = tickColor;
    ctx.lineWidth   = tickWidth;
    ctx.beginPath();
    ctx.moveTo(x, centerY - tickHalf);
    ctx.lineTo(x, centerY + tickHalf);
    ctx.stroke();
    ctx.restore();

    // Label
    ctx.save();
    ctx.font      = isZero
      ? 'bold 14px "Plus Jakarta Sans", system-ui, sans-serif'
      : '12px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = isZero ? COLORS.tickZero : COLORS.label;
    ctx.fillText(i.toString(), x, centerY + tickHalf + 4);
    ctx.restore();
  }

  ctx.restore();
}

// ── Internal: car drawing ────────────────────────────────────────────────────

function _drawCarFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  // Fallback circle when SVG hasn't loaded yet.
  ctx.save();
  ctx.fillStyle   = color;
  ctx.shadowColor = color + '88';
  ctx.shadowBlur  = 10;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function _drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'left' | 'right',
  color: string,
): void {
  const carImg = getCarImageSync();

  if (!carImg) {
    _drawCarFallback(ctx, x, y, color);
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  // The SVG car asset faces left by default; flip horizontally for rightward travel.
  if (direction === 'right') {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(carImg, -25, -25, 50, 50);
  ctx.restore();
}

// ── Internal: label pill ─────────────────────────────────────────────────────

function _drawLabelPill(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  text: string,
  color: string,
): void {
  ctx.save();
  ctx.font         = 'bold 13px "JetBrains Mono", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  const tw  = ctx.measureText(text).width;
  const pw  = tw + 20;
  const ph  = 22;
  const pr  = ph / 2;

  // Pill background
  ctx.fillStyle   = color;
  ctx.shadowColor = color + '55';
  ctx.shadowBlur  = 6;
  ctx.beginPath();
  ctx.roundRect(centerX - pw / 2, y - ph / 2, pw, ph, pr);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, centerX, y);
  ctx.restore();
}

/**
 * Determines the car direction for a given arrow in the context of an
 * operation and arrow index.
 *
 * Arrow 1 direction follows arrow.length directly.
 * Arrow 2 in subtraction: positive length still means moving left (subtract
 *   positive = leftward), so the car faces left. Negative length means moving
 *   right (subtract negative = rightward).
 */
function _carDirection(
  arrowIndex: 1 | 2,
  length: number,
  operation: '+' | '-',
): 'left' | 'right' {
  if (arrowIndex === 1 || operation === '+') {
    return length >= 0 ? 'right' : 'left';
  }
  // Arrow 2, subtraction: direction is flipped relative to the sign of length.
  return length >= 0 ? 'left' : 'right';
}

/**
 * Draws a single arrow on the game number line: a gradient trail, a car icon
 * at the tip, and a label pill above the midpoint.
 *
 * Skips rendering entirely if `arrow.length === 0`.
 *
 * @param carY      Canvas y-coordinate for this arrow's car/trail row.
 * @param operation The current question operator (affects car direction for arrow 2).
 * @param arrowIndex Which arrow this is (1 or 2).
 */
export function drawGameArrow(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  spacing: number,
  offsetX: number,
  arrow: ArrowDrawData,
  carY: number,
  operation: '+' | '-',
  arrowIndex: 1 | 2,
): void {
  const { start, length, color, target } = arrow;

  if (length === 0) return;

  const centerX = canvas.width / 2 + offsetX;
  const startX  = centerX + start  * spacing;
  const endX    = centerX + (start + length) * spacing;

  // ── Trail ────────────────────────────────────────────────────────────────
  const left  = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const trailW = right - left;

  if (trailW > 0) {
    const trailGrad = ctx.createLinearGradient(startX, carY, endX, carY);
    if (startX <= endX) {
      trailGrad.addColorStop(0,   color + '30');
      trailGrad.addColorStop(0.4, color + '70');
      trailGrad.addColorStop(1,   color + 'CC');
    } else {
      trailGrad.addColorStop(0,   color + 'CC');
      trailGrad.addColorStop(0.6, color + '70');
      trailGrad.addColorStop(1,   color + '30');
    }

    ctx.save();
    ctx.fillStyle   = trailGrad;
    ctx.shadowColor = color + '44';
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.roundRect(left, carY - 4, trailW, 8, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tyre-mark dashes
    ctx.strokeStyle = color + '55';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(left,  carY - 2);
    ctx.lineTo(right, carY - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left,  carY + 2);
    ctx.lineTo(right, carY + 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Car at the tip ───────────────────────────────────────────────────────
  const dir = _carDirection(arrowIndex, length, operation);
  _drawCar(ctx, endX, carY, dir, color);

  // ── Label pill above the trail midpoint ──────────────────────────────────
  const midX = (startX + endX) / 2;

  // The displayed value: use `target` (final value) if available so the pill
  // shows the committed answer even mid-animation when `length` is transient.
  const displayLength = typeof target === 'number' ? target : length;
  const absLen        = Math.abs(displayLength);
  const labelText     = dir === 'right' ? `+${absLen}` : `-${absLen}`;

  _drawLabelPill(ctx, midX, carY - 30, labelText, color);
}
