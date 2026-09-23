// components/game/TimerDisplay.tsx
// Stateless presentational component — no useEffect or useState.
// Renders a compact circular stopwatch-style countdown from 90 → 0 → negative (time over).
"use client";

export interface TimerDisplayProps {
  /** Elapsed time in seconds (integer, ≥ 0) */
  elapsedTime: number;
  /** Optional extra class names forwarded to the root element */
  className?: string;
}

/** Total seconds before the countdown crosses zero */
const COUNTDOWN_FROM = 90;

/** Radius of the SVG arc circle */
const R = 22;
const CIRC = 2 * Math.PI * R;

interface SpeedTier {
  label: string;
  color: string;
  hex: string;
}

function getSpeedTier(elapsed: number): SpeedTier {
  const remaining = COUNTDOWN_FROM - elapsed;
  if (remaining > 60) return { label: "Cepat 🔥",      color: "text-emerald-500", hex: "#10b981" };
  if (remaining > 30) return { label: "Oke ⚡",         color: "text-blue-500",    hex: "#3b82f6" };
  if (remaining > 0)  return { label: "Hampir ⏳",      color: "text-amber-500",   hex: "#f59e0b" };
  return                     { label: "Waktu Habis ⏰", color: "text-rose-500",    hex: "#ef4444" };
}

/**
 * Compact circular stopwatch countdown.
 *
 * - Counts DOWN from 90 to 0; after 0 shows negative elapsed seconds (e.g. -5).
 * - Arc depletes clockwise as time passes; turns red when over.
 * - Fits inline next to question text — ~56 px tall.
 *
 * Edge cases:
 * - elapsedTime < 0 or NaN → treated as 0.
 */
export function TimerDisplay({ elapsedTime, className }: TimerDisplayProps) {
  const t = Number.isFinite(elapsedTime) && elapsedTime >= 0 ? Math.floor(elapsedTime) : 0;
  const remaining = COUNTDOWN_FROM - t;
  const tier = getSpeedTier(t);

  // Arc progress: 0 elapsed → full arc; 90 elapsed → empty arc; beyond → stays empty
  const progress = Math.max(0, Math.min(1, remaining / COUNTDOWN_FROM));
  const dashOffset = CIRC * (1 - progress);

  // Display: countdown when positive, negative when time is over
  const absVal = Math.abs(remaining);
  const sign = remaining < 0 ? "-" : "";
  const mm = Math.floor(absVal / 60);
  const ss = absVal % 60;
  const timeStr = mm > 0
    ? `${sign}${mm}:${String(ss).padStart(2, "0")}`
    : `${sign}${ss}`;

  const ariaLabel =
    remaining >= 0
      ? `Sisa waktu: ${remaining} detik`
      : `Waktu habis: lewat ${Math.abs(remaining)} detik`;

  const overClass = remaining <= 0 ? "animate-pulse" : "";

  return (
    <div
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      aria-label={ariaLabel}
    >
      {/* Circular SVG clock */}
      <div className={`relative shrink-0 ${overClass}`}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          {/* Background track */}
          <circle
            cx="28" cy="28" r={R}
            stroke={remaining <= 0 ? "#fecaca" : "#e2e8f0"}
            strokeWidth="4"
            fill={remaining <= 0 ? "#fff1f2" : "#f8fafc"}
          />
          {/* Progress arc — depletes clockwise */}
          <circle
            cx="28" cy="28" r={R}
            stroke={tier.hex}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dashoffset 0.8s linear, stroke 0.5s",
            }}
          />
          {/* Centre time text */}
          <text
            x="28" y="28"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={mm > 0 ? "8" : "11"}
            fontWeight="700"
            fontFamily="monospace"
            fill={tier.hex}
            aria-live="polite"
          >
            {timeStr}
          </text>
        </svg>
        {/* Tiny clock badge */}
        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
            <circle cx="4.5" cy="4.5" r="3.5" stroke={tier.hex} strokeWidth="1"/>
            <path d="M4.5 2.5v2l1.2 1.2" stroke={tier.hex} strokeWidth="0.9" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Speed tier label */}
      <span className={`text-xs font-semibold leading-tight max-w-[64px] ${tier.color}`}>
        {tier.label}
      </span>
    </div>
  );
}

export default TimerDisplay;
