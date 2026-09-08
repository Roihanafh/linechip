import { getCarImageSync } from './carImage';

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  intblue: '#2F6FED',
  intblueDark: '#1E4FC4',
  intblueLight: '#EAF1FF',
  intpink: '#EC4899',
  success: '#22C55E',
  tick: '#CBD5E1',
  tickZero: '#0f172a',
  lineGradientMid: '#2F6FED',
} as const;

const LAYOUT = {
  padding: 60,       // px left & right
  lineY: 100,        // y of the main number line
  carY: 65,          // y of the car / animated marker
  canvasHeight: 280, // fixed canvas height
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
export type TickLayout = {
  tickPositions: Map<number, number>;
  uniqueTicks: number[];
};

// ─── computeTickLayout ────────────────────────────────────────────────────────
/**
 * Compute the set of tick values and their pixel x-positions.
 *
 * Idle state (num1 === 0 && num2 === 0 && result === 0):
 *   Returns a default –5 … +5 range.
 * Active state:
 *   Always includes 0, num1, and result. Dense ticks fill the
 *   region around those key values; the visible range extends a
 *   few units beyond the furthest key value.
 */
export function computeTickLayout(
  canvas: HTMLCanvasElement,
  num1: number,
  num2: number,
  result: number,
): TickLayout {
  const usableWidth = canvas.width - 2 * LAYOUT.padding;
  const isIdle = num1 === 0 && num2 === 0 && result === 0;

  let uniqueTicks: number[];

  if (isIdle) {
    uniqueTicks = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  } else {
    const tickSet = new Set<number>();

    // Key values that must always appear
    tickSet.add(0);
    tickSet.add(num1);
    tickSet.add(result);

    // Dense ticks around result (±3)
    const rng = 3;
    for (let i = result - rng; i <= result + rng; i++) tickSet.add(i);

    // Fill between 0 and num1 for visual continuity
    const dist = Math.abs(num1);
    const lo = Math.min(0, num1);
    const hi = Math.max(0, num1);

    if (dist <= 20) {
      for (let i = lo; i <= hi; i++) {
        if (Math.abs(i - result) > rng) tickSet.add(i);
      }
    } else {
      const step = Math.max(1, Math.floor(dist / 5));
      for (let i = lo; i <= hi; i += step) {
        if (Math.abs(i - result) > rng) tickSet.add(i);
      }
    }

    // One boundary tick beyond the furthest key value
    const maxKey = Math.max(Math.abs(num1), Math.abs(result));
    tickSet.add(maxKey + rng + 1);
    tickSet.add(-(maxKey + rng + 1));

    uniqueTicks = [...tickSet].sort((a, b) => a - b);
  }

  const spacing = usableWidth / Math.max(uniqueTicks.length - 1, 1);
  const tickPositions = new Map<number, number>();
  uniqueTicks.forEach((tick, idx) => {
    tickPositions.set(tick, LAYOUT.padding + idx * spacing);
  });

  return { tickPositions, uniqueTicks };
}

// ─── drawNumberLineGrid ───────────────────────────────────────────────────────
/**
 * Draw the static number-line grid: horizontal line, right arrowhead, tick
 * marks, and tick labels.
 *
 * Positive ticks → intblue; negative ticks → intpink; zero → slate-900 (tickZero).
 * The zero tick mark is taller than the rest.
 */
export function drawNumberLineGrid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  tickPositions: Map<number, number>,
  uniqueTicks: number[],
  num1: number,
  result: number,
  isIdle: boolean,
): void {
  const lineY = LAYOUT.lineY;
  const left  = LAYOUT.padding;
  const right = canvas.width - LAYOUT.padding;

  // ── Horizontal line ────────────────────────────────────────────────────
  const gradient = ctx.createLinearGradient(left, lineY, right, lineY);
  gradient.addColorStop(0,   COLORS.intblueLight);
  gradient.addColorStop(0.5, COLORS.intblue);
  gradient.addColorStop(1,   COLORS.intblueLight);

  ctx.save();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(47,111,237,0.25)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(left, lineY);
  ctx.lineTo(right, lineY);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // ── Right arrowhead ────────────────────────────────────────────────────
  ctx.save();
  ctx.fillStyle = COLORS.intblue;
  ctx.shadowColor = 'rgba(47,111,237,0.3)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(right + 10, lineY);
  ctx.lineTo(right - 2, lineY - 7);
  ctx.lineTo(right - 2, lineY + 7);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // ── Tick marks & labels ────────────────────────────────────────────────
  uniqueTicks.forEach((tick) => {
    const x = tickPositions.get(tick);
    if (x === undefined) return;
    // Clip ticks that overflow the usable area slightly
    if (x < left - 12 || x > right + 12) return;

    const isZero   = tick === 0;
    const isNum1   = !isIdle && tick === num1 && tick !== result;
    const isResult = !isIdle && tick === result;

    // Tick mark height
    const halfH = isZero ? 12 : isResult || isNum1 ? 9 : 6;

    ctx.save();
    if (isZero) {
      ctx.strokeStyle = COLORS.tickZero;
      ctx.lineWidth = 2.5;
    } else if (isResult) {
      ctx.strokeStyle = tick >= 0 ? COLORS.intblue : COLORS.intpink;
      ctx.lineWidth = 2;
    } else if (isNum1) {
      ctx.strokeStyle = tick >= 0 ? COLORS.intblue : COLORS.intpink;
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = COLORS.tick;
      ctx.lineWidth = 1.5;
    }
    ctx.beginPath();
    ctx.moveTo(x, lineY - halfH);
    ctx.lineTo(x, lineY + halfH);
    ctx.stroke();
    ctx.restore();

    // Label
    const labelY = lineY + halfH + 14;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isZero) {
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = COLORS.tickZero;
    } else if (tick > 0) {
      ctx.font = isResult || isNum1
        ? 'bold 12px "Plus Jakarta Sans", sans-serif'
        : '11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = COLORS.intblue;
    } else {
      ctx.font = isResult || isNum1
        ? 'bold 12px "Plus Jakarta Sans", sans-serif'
        : '11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = COLORS.intpink;
    }

    ctx.fillText(tick.toString(), x, labelY);
    ctx.restore();
  });
}

// ─── drawCarTrail ─────────────────────────────────────────────────────────────
/**
 * Draw a coloured trail band between startX and endX on the number line.
 * Uses a rounded rect with a subtle gradient and a dashed centre line.
 */
export function drawCarTrail(
  ctx: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  y: number,
  color: string,
): void {
  if (startX === endX) return;

  const left  = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const w = right - left;
  const h = 10;
  const r = h / 2;

  // Base band
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur  = 6;
  ctx.fillStyle   = color + 'CC';  // ~80 % opacity
  ctx.beginPath();
  ctx.roundRect(left, y - h / 2, w, h, r);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Highlight stripe along the top edge
  const hl = ctx.createLinearGradient(left, y - h / 2, right, y - h / 2);
  hl.addColorStop(0,   'rgba(255,255,255,0)');
  hl.addColorStop(0.2, 'rgba(255,255,255,0.5)');
  hl.addColorStop(0.8, 'rgba(255,255,255,0.5)');
  hl.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.roundRect(left, y - h / 2, w, h * 0.45, r);
  ctx.fill();

  // Dashed centre line (tyre marks)
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── drawCar ──────────────────────────────────────────────────────────────────
/**
 * Draw the car SVG (via getCarImageSync) centred at (x, y).
 *
 * - If the image hasn't loaded yet, a fallback intblue circle is drawn instead.
 * - direction='left'  → the car is flipped horizontally.
 * - isSilhouette=true → rendered at 0.4 opacity (ghost/silhouette mode).
 *
 * The SVG source points the car toward the left; flipping it makes it face right.
 */
export function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'left' | 'right',
  isSilhouette?: boolean,
): void {
  ctx.save();
  ctx.globalAlpha = isSilhouette ? 0.4 : 1;
  ctx.translate(x, y);

  // SVG car asset faces left; flip to face right
  if (direction === 'right') {
    ctx.scale(-1, 1);
  }

  const carImg = getCarImageSync();
  if (carImg) {
    ctx.drawImage(carImg, -25, -25, 50, 50);
  } else {
    // Fallback: intblue circle with a directional highlight
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.intblue;
    ctx.shadowColor = 'rgba(47,111,237,0.5)';
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur  = 0;
    // Small white dot as windshield
    ctx.beginPath();
    ctx.arc(-5, -4, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }

  ctx.restore();
}

// ─── drawSegmentPill ──────────────────────────────────────────────────────────
/**
 * Draw a rounded-rect pill label above a trail segment.
 * Centred horizontally at centerX, positioned at y (top of pill).
 */
export function drawSegmentPill(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  text: string,
  color: string,
): void {
  ctx.save();
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const tw = ctx.measureText(text).width;
  const pw = tw + 16;
  const ph = 22;
  const pr = 11;
  const pillY = y - ph / 2;

  // Pill background
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.roundRect(centerX - pw / 2, pillY, pw, ph, pr);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, centerX, y);
  ctx.restore();
}

// ─── drawDustParticles ────────────────────────────────────────────────────────
/**
 * Draw several small fading circles behind the car to suggest movement dust.
 * progress (0..1) drives the fade cycle so particles pulse as the car moves.
 */
export function drawDustParticles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'left' | 'right',
  progress: number,
): void {
  const count = 5;
  for (let i = 0; i < count; i++) {
    // Particles trail behind the car
    const offsetX =
      direction === 'right'
        ? -22 - Math.random() * 28
        : 22 + Math.random() * 28;
    const offsetY = (Math.random() - 0.5) * 18;
    const size    = 2 + Math.random() * 3.5;
    // Fade based on progress cycle so they feel alive
    const fade    = 0.25 + Math.random() * 0.3;
    const cycle   = 1 - (progress % 0.25) / 0.25;
    const alpha   = fade * cycle;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(203, 213, 225, ${alpha})`;  // slate-300 tone
    ctx.fill();
    ctx.restore();
  }
}

// ─── drawResultDot ────────────────────────────────────────────────────────────
/**
 * Draw the result marker: an intblue-dark dot with a glow halo, centred at (x, y).
 */
export function drawResultDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();

  // Outer glow
  ctx.shadowColor = 'rgba(30,79,196,0.55)';
  ctx.shadowBlur  = 18;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.intblueDark;
  ctx.fill();
  ctx.shadowBlur = 0;

  // White inner ring
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Small highlight
  ctx.beginPath();
  ctx.arc(x - 3, y - 3, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();

  ctx.restore();
}

// ─── derivePhase2Color ────────────────────────────────────────────────────────
/**
 * Return the trail colour for phase 2 based on the operation and num2.
 *
 * | op  | num2  | direction        | colour   |
 * |-----|-------|------------------|----------|
 * |  +  | >= 0  | right            | intblue  |
 * |  +  |  < 0  | left             | intpink  |
 * |  −  | >= 0  | left (sub pos)   | intpink  |
 * |  −  |  < 0  | right (sub neg)  | intblue  |
 */
export function derivePhase2Color(num2: number, op: '+' | '-'): string {
  if (op === '+') {
    return num2 >= 0 ? COLORS.intblue : COLORS.intpink;
  }
  // op === '-'
  return num2 >= 0 ? COLORS.intpink : COLORS.intblue;
}
