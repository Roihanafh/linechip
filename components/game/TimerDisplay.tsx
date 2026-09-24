// components/game/TimerDisplay.tsx
// Stateless presentational component — no useEffect or useState.
// Displays elapsed time since question started with speed tier label.
"use client";

export interface TimerDisplayProps {
  /** Elapsed time in seconds (integer, ≥ 0) */
  elapsedTime: number;
  /** Optional extra class names forwarded to the root element */
  className?: string;
}

/** Radius of the SVG arc circle */
const R = 22;
const CIRC = 2 * Math.PI * R;

/** Total seconds before reaching minimum score tier */
const BONUS_WINDOW = 90;

interface SpeedTier {
  label: string;
  colorClass: string;
  hex: string;
}

/**
 * Returns the speed tier for a given elapsed time (integer seconds).
 * Boundaries based on elapsedTime:
 *   0–29  → Sangat Cepat 🔥  (text-success)
 *   30–59 → Cepat ⚡          (text-intblue)
 *   60–89 → Masih Oke 👍      (text-amber-500)
 *   ≥ 90  → Waktu Habis ⏰   (text-error)
 */
function getSpeedTier(elapsed: number): SpeedTier {
  if (elapsed < 30) return { label: "Sangat Cepat 🔥", colorClass: "text-success",    hex: "#22c55e" };
  if (elapsed < 60) return { label: "Cepat ⚡",        colorClass: "text-intblue",    hex: "#3b82f6" };
  if (elapsed < 90) return { label: "Masih Oke 👍",    colorClass: "text-amber-500",  hex: "#f59e0b" };
  return                   { label: "Waktu Habis ⏰",  colorClass: "text-error",       hex: "#ef4444" };
}

/**
 * Circular stopwatch displaying elapsed time since question started.
 *
 * - Displays elapsed time in MM:SS format.
 * - Shows speed tier label alongside the clock.
 * - Accessible: aria-label on time element; aria-label on speed label span.
 *
 * Edge cases:
 * - elapsedTime < 0: treated as 0 → shows "00:00" and "Sangat Cepat 🔥"
 * - NaN or non-finite: shows "00:00" with aria-label "Waktu tidak tersedia"
 */
export function TimerDisplay({ elapsedTime, className }: TimerDisplayProps) {
  const isInvalid = !Number.isFinite(elapsedTime);
  const t = isInvalid ? 0 : Math.max(0, Math.floor(elapsedTime));

  const tier = getSpeedTier(t);

  // Arc progress: 0 elapsed → full arc; BONUS_WINDOW elapsed → empty arc; beyond → stays empty
  const progress = Math.max(0, Math.min(1, 1 - t / BONUS_WINDOW));
  const dashOffset = CIRC * (1 - progress);

  // MM:SS format of elapsed time
  const mm = Math.floor(t / 60);
  const ss = t % 60;
  const timeStr = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  // aria-label on the time element
  const timeAriaLabel = isInvalid
    ? "Waktu tidak tersedia"
    : `Waktu berlalu: ${mm} menit ${ss} detik`;

  return (
    <div
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      aria-label={`Sisa waktu: ${t} detik`}
    >
      {/* Circular SVG clock */}
      <div className="relative shrink-0">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
          {/* Background track */}
          <circle
            cx="28" cy="28" r={R}
            stroke="#e2e8f0"
            strokeWidth="4"
            fill="#f8fafc"
          />
          {/* Progress arc — depletes as time increases */}
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
            fontSize="8"
            fontWeight="700"
            fontFamily="monospace"
            fill={tier.hex}
            aria-live="polite"
            aria-label={timeAriaLabel}
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
      <span
        className={`text-xs font-semibold leading-tight max-w-[64px] ${tier.colorClass}`}
        aria-label={tier.label}
      >
        {tier.label}
      </span>
    </div>
  );
}

export default TimerDisplay;
