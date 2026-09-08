// components/game/CharacterSVGs.tsx
// Shared SVG character illustrations for LineChip game.
// Each component accepts a `uid` prop (default "") appended to gradient IDs
// so multiple instances on the same page never share a <defs> ID.

export type PlaceValue = "satuan" | "puluhan" | "ratusan" | "ribuan";

export const TIER_TO_PLACE: Record<1 | 10 | 100 | 1000, PlaceValue> = {
  1: "satuan",
  10: "puluhan",
  100: "ratusan",
  1000: "ribuan",
};

export const CHAR_NAMES = {
  ab: { satuan: "Monoab", puluhan: "Bimoab", ratusan: "Polyab", ribuan: "Pentaab" },
  ku: { satuan: "Mikrovir", puluhan: "Sporovir", ratusan: "Dendrovir", ribuan: "Coronavir" },
} as const;

/** Returns the place-value label for the dominant tier in a number's absolute value. */
export function dominantPlace(value: number): PlaceValue {
  const abs = Math.abs(value);
  if (abs >= 1000) return "ribuan";
  if (abs >= 100) return "ratusan";
  if (abs >= 10) return "puluhan";
  return "satuan";
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Virus characters ────────────────────────────────────────────────────────

export function VirusSatuan({ uid = "" }: { uid?: string }) {
  const id = `vs1${uid}`;
  const spikes = [0, 60, 120, 180, 240, 300].map((deg) => {
    const p1 = polar(50, 50, 21, deg);
    const p2 = polar(50, 50, 33, deg);
    return <line key={deg} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FFB6C1" strokeWidth="3.5" strokeLinecap="round" />;
  });
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="38%" cy="33%" r="66%">
          <stop offset="0%" stopColor="#FFD6DC" />
          <stop offset="100%" stopColor="#FFB6C1" />
        </radialGradient>
      </defs>
      {spikes}
      <circle cx="50" cy="50" r="20" fill={`url(#${id})`} />
      <circle cx="50" cy="50" r="7" fill="#C2185B" opacity="0.5" />
      <circle cx="44" cy="44" r="2.5" fill="white" opacity="0.4" />
    </svg>
  );
}

export function VirusPuluhan({ uid = "" }: { uid?: string }) {
  const id = `vs2${uid}`;
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  const spikes = angles.map((deg) => {
    const p1 = polar(50, 50, 22, deg);
    const p2 = polar(50, 50, 33, deg);
    const pt = polar(50, 50, 39, deg);
    return (
      <g key={deg}>
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FF85C2" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={pt.x} cy={pt.y} r="4.5" fill="#FFB3D9" stroke="#FF69B4" strokeWidth="1" />
      </g>
    );
  });
  const innerDots = [45, 135, 225, 315].map((deg) => {
    const p = polar(50, 50, 11, deg);
    return <circle key={deg} cx={p.x} cy={p.y} r="2" fill="#AD1457" opacity="0.45" />;
  });
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="37%" cy="33%" r="65%">
          <stop offset="0%" stopColor="#FFB3D9" />
          <stop offset="100%" stopColor="#FF69B4" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" stroke="#FFD6E8" strokeWidth="1.2" strokeDasharray="3.5 3.5" fill="none" />
      {spikes}
      <circle cx="50" cy="50" r="22" fill={`url(#${id})`} />
      {innerDots}
      <circle cx="50" cy="50" r="5" fill="#AD1457" opacity="0.6" />
      <circle cx="44" cy="45" r="2.5" fill="white" opacity="0.35" />
    </svg>
  );
}

export function VirusRatusan({ uid = "" }: { uid?: string }) {
  const id = `vs3${uid}`;
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    const deg = i * 36;
    const isLong = i % 2 === 0;
    if (isLong) {
      const p1 = polar(50, 50, 23, deg);
      const p2 = polar(50, 50, 40, deg);
      const b1 = polar(p2.x, p2.y, 8, deg - 36);
      const b2 = polar(p2.x, p2.y, 8, deg + 36);
      elements.push(
        <g key={`l${deg}`}>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FFB3FF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1={p2.x} y1={p2.y} x2={b1.x} y2={b1.y} stroke="#FFB3FF" strokeWidth="1.8" strokeLinecap="round" />
          <line x1={p2.x} y1={p2.y} x2={b2.x} y2={b2.y} stroke="#FFB3FF" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    } else {
      const p1 = polar(50, 50, 23, deg);
      const p2 = polar(50, 50, 30, deg);
      const pt = polar(50, 50, 35, deg);
      elements.push(
        <g key={`s${deg}`}>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#FF66FF" strokeWidth="2" strokeLinecap="round" />
          <circle cx={pt.x} cy={pt.y} r="3.5" fill="#FFB3FF" stroke="#CC00CC" strokeWidth="0.8" />
        </g>
      );
    }
  }
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="37%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#FFB3FF" />
          <stop offset="100%" stopColor="#FF00FF" />
        </radialGradient>
      </defs>
      <path d="M46,72 Q38,81 42,89 Q45,95 40,100" stroke="#FFB3FF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M54,72 Q62,81 58,89 Q55,95 60,100" stroke="#FFB3FF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {elements}
      <circle cx="50" cy="50" r="22" fill={`url(#${id})`} />
      <circle cx="50" cy="50" r="10" fill="none" stroke="#990099" strokeWidth="1.5" strokeDasharray="2.5 2.5" opacity="0.55" />
      <circle cx="50" cy="50" r="5" fill="#660066" opacity="0.7" />
      <circle cx="43" cy="43" r="2" fill="white" opacity="0.3" />
    </svg>
  );
}

export function VirusRibuan({ uid = "" }: { uid?: string }) {
  const id = `vs4${uid}`;
  const spikes = Array.from({ length: 12 }, (_, i) => {
    const deg = i * 30;
    const st1 = polar(50, 50, 33, deg);
    const st2 = polar(50, 50, 42, deg);
    const head = polar(50, 50, 48, deg);
    return (
      <g key={deg}>
        <line x1={st1.x} y1={st1.y} x2={st2.x} y2={st2.y} stroke="#EDB3E8" strokeWidth="3" strokeLinecap="round" />
        <circle cx={head.x} cy={head.y} r="6" fill="#EDB3E8" stroke="#C855C8" strokeWidth="1.2" />
        <circle cx={head.x} cy={head.y} r="2.5" fill="#BA47BA" opacity="0.55" />
      </g>
    );
  });
  const rna = Array.from({ length: 6 }, (_, i) => {
    const p = polar(50, 50, 12, i * 60);
    return <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#8B2588" opacity="0.5" />;
  });
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="37%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#EDB3E8" />
          <stop offset="100%" stopColor="#DA70D6" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#E090DC" strokeWidth="1.5" opacity="0.5" />
      {spikes}
      <circle cx="50" cy="50" r="32" fill="#F5E0F5" stroke="#EDB3E8" strokeWidth="1" opacity="0.4" />
      <circle cx="50" cy="50" r="22" fill={`url(#${id})`} />
      {rna}
      <circle cx="50" cy="50" r="5" fill="#5C1A5C" opacity="0.8" />
      <circle cx="43" cy="43" r="2.5" fill="white" opacity="0.3" />
    </svg>
  );
}

// ─── Antibody characters ─────────────────────────────────────────────────────

export function AntibodySatuan({ uid = "" }: { uid?: string }) {
  const id = `ab1${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={id} x1="28" y1="28" x2="50" y2="82" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C8E8F5" />
          <stop offset="1" stopColor="#ADD8E6" />
        </linearGradient>
      </defs>
      <line x1="50" y1="58" x2="27" y2="29" stroke={`url(#${id})`} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="50" y1="58" x2="73" y2="29" stroke={`url(#${id})`} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="50" y1="58" x2="50" y2="82" stroke={`url(#${id})`} strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="27" cy="29" r="8.5" fill="#D6EEF7" stroke="#ADD8E6" strokeWidth="1.5" />
      <circle cx="73" cy="29" r="8.5" fill="#D6EEF7" stroke="#ADD8E6" strokeWidth="1.5" />
      <line x1="22" y1="28" x2="32" y2="28" stroke="#5B9EC9" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="68" y1="28" x2="78" y2="28" stroke="#5B9EC9" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AntibodyPuluhan({ uid = "" }: { uid?: string }) {
  const id = `ab2${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={id} x1="24" y1="27" x2="50" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6B9AC4" />
          <stop offset="1" stopColor="#4682B4" />
        </linearGradient>
      </defs>
      <line x1="50" y1="58" x2="24" y2="27" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="58" x2="76" y2="27" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="58" x2="50" y2="84" stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="58" r="5.5" fill="#4682B4" stroke="#4682B4" strokeWidth="1" />
      <ellipse cx="24" cy="27" rx="10" ry="10" fill="#C5D9EC" stroke="#4682B4" strokeWidth="1.5" />
      <ellipse cx="76" cy="27" rx="10" ry="10" fill="#C5D9EC" stroke="#4682B4" strokeWidth="1.5" />
      <path d="M19 23 L24 30 L29 23" stroke="#4682B4" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M71 23 L76 30 L81 23" stroke="#4682B4" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AntibodyRatusan({ uid = "" }: { uid?: string }) {
  const id = `ab3${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={id} x1="24" y1="26" x2="50" y2="86" gradientUnits="userSpaceOnUse">
          <stop stopColor="#003399" />
          <stop offset="1" stopColor="#00008B" />
        </linearGradient>
      </defs>
      <line x1="52" y1="56" x2="27" y2="25" stroke="#6699CC" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="48" y1="56" x2="73" y2="25" stroke="#6699CC" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="58" x2="23" y2="28" stroke={`url(#${id})`} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="50" y1="58" x2="77" y2="28" stroke={`url(#${id})`} strokeWidth="5.5" strokeLinecap="round" />
      <line x1="46" y1="58" x2="46" y2="84" stroke={`url(#${id})`} strokeWidth="4" strokeLinecap="round" />
      <line x1="54" y1="58" x2="54" y2="84" stroke={`url(#${id})`} strokeWidth="4" strokeLinecap="round" />
      <line x1="44" y1="63" x2="56" y2="63" stroke="#4477AA" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="68" x2="56" y2="68" stroke="#4477AA" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="50" cy="58" r="5" fill="#00008B" />
      <ellipse cx="23" cy="28" rx="10" ry="10" fill="#99BBDD" stroke="#0000CD" strokeWidth="1.5" />
      <ellipse cx="77" cy="28" rx="10" ry="10" fill="#99BBDD" stroke="#0000CD" strokeWidth="1.5" />
      <path d="M17 26 L23 33 L29 26" stroke="#00008B" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M71 26 L77 33 L83 26" stroke="#00008B" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="50,85 44,89 44,95 50,98 56,95 56,89" fill="#AACCEE" stroke="#0000CD" strokeWidth="1.2" />
    </svg>
  );
}

export function AntibodyRibuan({ uid = "" }: { uid?: string }) {
  const units = Array.from({ length: 5 }, (_, i) => {
    const baseAngle = i * 72;
    const hRad = ((baseAngle - 90) * Math.PI) / 180;
    const hx = 50 + 19 * Math.cos(hRad);
    const hy = 50 + 19 * Math.sin(hRad);
    const a1 = polar(hx, hy, 17, baseAngle - 36);
    const a2 = polar(hx, hy, 17, baseAngle + 36);
    const st = { x: hx + 8 * Math.cos(hRad + Math.PI), y: hy + 8 * Math.sin(hRad + Math.PI) };
    return (
      <g key={i}>
        <line x1={hx} y1={hy} x2={a1.x} y2={a1.y} stroke="#3355AA" strokeWidth="3" strokeLinecap="round" />
        <line x1={hx} y1={hy} x2={a2.x} y2={a2.y} stroke="#3355AA" strokeWidth="3" strokeLinecap="round" />
        <line x1={hx} y1={hy} x2={st.x} y2={st.y} stroke="#1A3A8A" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={a1.x} cy={a1.y} r="5" fill="#8899BB" stroke="#000099" strokeWidth="1" />
        <circle cx={a2.x} cy={a2.y} r="5" fill="#8899BB" stroke="#000099" strokeWidth="1" />
        <circle cx={hx} cy={hy} r="3" fill="#000080" />
      </g>
    );
  });
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="19" stroke="#7799CC" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
      {units}
      <circle cx="50" cy="50" r="7" fill="#000066" stroke="#000080" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="3" fill="#8899BB" opacity="0.8" />
    </svg>
  );
}

// ─── Dispatcher components ────────────────────────────────────────────────────

export function VirusCharacter({ type, uid = "" }: { type: PlaceValue; uid?: string }) {
  switch (type) {
    case "satuan":  return <VirusSatuan uid={uid} />;
    case "puluhan": return <VirusPuluhan uid={uid} />;
    case "ratusan": return <VirusRatusan uid={uid} />;
    case "ribuan":  return <VirusRibuan uid={uid} />;
  }
}

export function AntibodyCharacter({ type, uid = "" }: { type: PlaceValue; uid?: string }) {
  switch (type) {
    case "satuan":  return <AntibodySatuan uid={uid} />;
    case "puluhan": return <AntibodyPuluhan uid={uid} />;
    case "ratusan": return <AntibodyRatusan uid={uid} />;
    case "ribuan":  return <AntibodyRibuan uid={uid} />;
  }
}

// ─── CharacterChips — replaces DecomposedChips ───────────────────────────────

interface CharacterChipsProps {
  value: number;        // absolute value to decompose
  type: "ab" | "ku";   // antibody or virus
  dimmed?: boolean;     // grayed out (for neutralized pairs)
  phase?: "idle" | "charging" | "exploding" | "settled";
  maxPerTier?: number;  // cap characters per tier (default 9)
  rowSize?: number;     // characters per row before wrapping (default 9)
  size?: "xs" | "sm" | "md"; // xs=w-6h-6, sm=w-8h-8 (default), md=w-10h-10
  uidPrefix?: string;   // prefix for gradient uid deduplication
  dissolveDelay?: number; // ms delay between each character during dissolve (default 120)
}

/** Decomposes a number into tiers and renders SVG characters instead of chip circles.
 *  Each tier renders in rows of `rowSize` characters (default 9). */
export function CharacterChips({
  value,
  type,
  dimmed = false,
  phase = "idle",
  maxPerTier = 9,
  rowSize = 9,
  size = "sm",
  uidPrefix = "cc",
  dissolveDelay = 120,
}: CharacterChipsProps) {
  // Decompose value into tiers
  const groups: { tier: 1 | 10 | 100 | 1000; count: number }[] = [];
  let rem = Math.floor(Math.abs(value));
  for (const t of [1000, 100, 10, 1] as (1 | 10 | 100 | 1000)[]) {
    const c = Math.floor(rem / t);
    if (c > 0) groups.push({ tier: t, count: c });
    rem %= t;
  }
  if (groups.length === 0) return null;

  const sizeClass = size === "xs" ? "w-6 h-6" : size === "md" ? "w-10 h-10" : "w-8 h-8";
  const isCharging = phase === "charging";
  const isExploding = phase === "exploding";

  // Split an array into chunks of `n`
  function chunks<T>(arr: T[], n: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n));
    return result;
  }

  // Flatten all characters into a single indexed list for staggered dissolve
  let flatIndex = 0;

  return (
    <div className="space-y-1.5">
      {groups.map(({ tier, count }) => {
        const shown = Math.min(count, maxPerTier);
        const place = TIER_TO_PLACE[tier];
        const indices = Array.from({ length: shown }, (_, i) => i);
        const rows = chunks(indices, rowSize);
        return (
          <div key={tier} className="space-y-0.5">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1 items-center justify-center">
                {row.map((i) => {
                  const delay = isExploding ? flatIndex++ * dissolveDelay : 0;
                  if (!isExploding) flatIndex++;
                  return (
                    <div
                      key={`${tier}-${i}`}
                      className={`${sizeClass} shrink-0 ${
                        dimmed ? "opacity-30 grayscale scale-90" : ""
                      } ${isCharging ? "animate-pulse" : ""} ${
                        isExploding ? "scale-0 opacity-0" : ""
                      }`}
                      style={
                        isExploding
                          ? { transition: `all 600ms ease-out ${delay}ms` }
                          : { transition: "all 300ms" }
                      }
                    >
                      {type === "ab"
                        ? <AntibodyCharacter type={place} uid={`${uidPrefix}-ab-${tier}-${i}`} />
                        : <VirusCharacter type={place} uid={`${uidPrefix}-ku-${tier}-${i}`} />
                      }
                    </div>
                  );
                })}
              </div>
            ))}
            {count > maxPerTier && (
              <span className={`text-xs font-mono font-bold ${
                type === "ab" ? "text-blue-500" : "text-rose-500"
              }`}>
                +{(count - maxPerTier).toLocaleString("id-ID")} lagi
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
