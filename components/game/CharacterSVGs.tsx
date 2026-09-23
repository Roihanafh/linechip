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
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFE4EA" />
          <stop offset="100%" stopColor="#FFAEC0" />
        </radialGradient>
      </defs>
      <g fill="#FFAEC0" stroke="#E8899E" strokeWidth="1">
        <circle cx="50" cy="20" r="6" />
        <circle cx="76" cy="35" r="6" />
        <circle cx="76" cy="65" r="6" />
        <circle cx="50" cy="80" r="6" />
        <circle cx="24" cy="65" r="6" />
        <circle cx="24" cy="35" r="6" />
      </g>
      <circle cx="50" cy="50" r="26" fill={`url(#${id})`} stroke="#E8899E" strokeWidth="1.5" />
      <circle cx="41" cy="47" r="4" fill="#5B2333" />
      <circle cx="59" cy="47" r="4" fill="#5B2333" />
      <circle cx="42.5" cy="45.5" r="1.2" fill="white" />
      <circle cx="60.5" cy="45.5" r="1.2" fill="white" />
      <path d="M43 58 Q50 64 57 58" stroke="#5B2333" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="55" r="4" fill="#FF87A0" opacity="0.5" />
      <circle cx="66" cy="55" r="4" fill="#FF87A0" opacity="0.5" />
    </svg>
  );
}

export function VirusPuluhan({ uid = "" }: { uid?: string }) {
  const id = `vs2${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFB8D6" />
          <stop offset="100%" stopColor="#FF5FA0" />
        </radialGradient>
      </defs>
      <g stroke="#E23C82" strokeWidth="3" strokeLinecap="round">
        <line x1="50" y1="24" x2="50" y2="14" />
        <line x1="70.6" y1="29.4" x2="77.6" y2="22.4" />
        <line x1="76" y1="50" x2="86" y2="50" />
        <line x1="70.6" y1="70.6" x2="77.6" y2="77.6" />
        <line x1="50" y1="76" x2="50" y2="86" />
        <line x1="29.4" y1="70.6" x2="22.4" y2="77.6" />
        <line x1="24" y1="50" x2="14" y2="50" />
        <line x1="29.4" y1="29.4" x2="22.4" y2="22.4" />
      </g>
      <g fill="#FF8FC0" stroke="#E23C82" strokeWidth="1.2">
        <circle cx="50" cy="12" r="4.5" />
        <circle cx="79.5" cy="20.5" r="4.5" />
        <circle cx="88" cy="50" r="4.5" />
        <circle cx="79.5" cy="79.5" r="4.5" />
        <circle cx="50" cy="88" r="4.5" />
        <circle cx="20.5" cy="79.5" r="4.5" />
        <circle cx="12" cy="50" r="4.5" />
        <circle cx="20.5" cy="20.5" r="4.5" />
      </g>
      <circle cx="50" cy="50" r="26" fill={`url(#${id})`} stroke="#D6337A" strokeWidth="1.5" />
      <path d="M37 42 Q41 38 45 42" stroke="#6B123F" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="41" cy="48" r="3.6" fill="#6B123F" />
      <circle cx="59" cy="47" r="3.8" fill="#6B123F" />
      <circle cx="42.3" cy="46.5" r="1" fill="white" />
      <circle cx="60.3" cy="45.5" r="1" fill="white" />
      <path d="M42 60 Q50 55 58 61" stroke="#6B123F" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function VirusRatusan({ uid = "" }: { uid?: string }) {
  const id = `vs3${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#F0AEFF" />
          <stop offset="100%" stopColor="#B23BDB" />
        </radialGradient>
      </defs>
      <path d="M44 74 Q36 84 40 92 Q42 97 38 100" stroke="#D9A6F2" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M56 74 Q64 84 60 92 Q58 97 62 100" stroke="#D9A6F2" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g stroke="#9B2FC4" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M50 26 L50 6 M50 6 L43 -2 M50 6 L57 -2" />
        <path d="M72.8 42.6 L91.8 36.4 M91.8 36.4 L98 30 M91.8 36.4 L97 41" />
        <path d="M64.1 69.4 L75.9 85.6 M75.9 85.6 L80 93 M75.9 85.6 L71 92" />
        <path d="M35.9 69.4 L24.1 85.6 M24.1 85.6 L20 93 M24.1 85.6 L29 92" />
        <path d="M27.2 42.6 L8.2 36.4 M8.2 36.4 L2 30 M8.2 36.4 L3 41" />
      </g>
      <g stroke="#C355E8" strokeWidth="2.5" strokeLinecap="round">
        <line x1="64.1" y1="30.6" x2="70" y2="22.5" />
        <line x1="72.8" y1="57.4" x2="82.3" y2="60.5" />
        <line x1="50" y1="74" x2="50" y2="84" />
        <line x1="27.2" y1="57.4" x2="17.7" y2="60.5" />
        <line x1="35.9" y1="30.6" x2="30" y2="22.5" />
      </g>
      <g fill="#E7A6FA" stroke="#9B2FC4" strokeWidth="1">
        <circle cx="70" cy="22.5" r="4" />
        <circle cx="82.3" cy="60.5" r="4" />
        <circle cx="50" cy="84" r="4" />
        <circle cx="17.7" cy="60.5" r="4" />
        <circle cx="30" cy="22.5" r="4" />
      </g>
      <circle cx="50" cy="50" r="24" fill={`url(#${id})`} stroke="#8B26AE" strokeWidth="1.8" />
      <path d="M36 40 L44 44" stroke="#4A0A66" strokeWidth="2" strokeLinecap="round" />
      <path d="M64 40 L56 44" stroke="#4A0A66" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 48 Q43 44 46 48" stroke="#4A0A66" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M54 48 Q57 44 60 48" stroke="#4A0A66" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M40 58 Q50 64 60 58 Q56 68 50 68 Q44 68 40 58" fill="#4A0A66" />
      <path d="M45 60 L47 65 M55 60 L53 65" stroke="white" strokeWidth="1.3" />
    </svg>
  );
}

export function VirusRibuan({ uid = "" }: { uid?: string }) {
  const id = `vs4${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#B23A6B" />
          <stop offset="55%" stopColor="#6B1547" />
          <stop offset="100%" stopColor="#240A1F" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#FF2440" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
      <g fill="#7A1550" stroke="#2B0620" strokeWidth="1">
        <polygon points="45.86,22.4 54.14,22.4 50,4" />
        <polygon points="67.39,28.17 60.21,24.03 73,10.12" />
        <polygon points="75.97,39.81 71.83,32.61 89.84,27" />
        <polygon points="77.6,54.14 77.6,45.86 96,50" />
        <polygon points="71.83,67.39 75.97,60.21 89.84,73" />
        <polygon points="60.21,75.97 67.39,71.83 73,89.84" />
        <polygon points="45.86,77.6 54.14,77.6 50,96" />
        <polygon points="32.61,71.83 39.79,75.97 27,89.84" />
        <polygon points="24.03,60.21 28.17,67.39 10.16,73" />
        <polygon points="22.4,45.86 22.4,54.14 4,50" />
        <polygon points="28.17,32.61 24.03,39.79 10.16,27" />
        <polygon points="39.79,24.03 32.61,28.17 27,10.16" />
      </g>
      <circle cx="50" cy="50" r="25" fill={`url(#${id})`} stroke="#150510" strokeWidth="2" />
      <path d="M38 18 L42 4 L47 14 L50 2 L53 14 L58 4 L62 18 Z" fill="#1A0A14" stroke="#000000" strokeWidth="0.6" />
      <circle cx="50" cy="8" r="2.2" fill="#FF2440" />
      <path d="M33 40 L45 44" stroke="#1A0A14" strokeWidth="3" strokeLinecap="round" />
      <path d="M67 40 L55 44" stroke="#1A0A14" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="41" cy="49" rx="6" ry="3.4" fill="#FF2440" transform="rotate(-12 41 49)" />
      <ellipse cx="41" cy="49" rx="1.3" ry="3" fill="#1A0A14" transform="rotate(-12 41 49)" />
      <ellipse cx="59" cy="49" rx="6" ry="3.4" fill="#FF2440" transform="rotate(12 59 49)" />
      <ellipse cx="59" cy="49" rx="1.3" ry="3" fill="#1A0A14" transform="rotate(12 59 49)" />
      <path d="M36 60 Q50 68 64 60 Q58 76 50 76 Q42 76 36 60 Z" fill="#1A0A14" />
      <polygon points="42,60 45,60 43.5,67" fill="white" />
      <polygon points="55,60 58,60 56.5,67" fill="white" />
      <polygon points="45,74 48,74 46.5,67" fill="white" />
      <polygon points="52,74 55,74 53.5,67" fill="white" />
    </svg>
  );
}

// ─── Antibody characters ─────────────────────────────────────────────────────

export function AntibodySatuan({ uid = "" }: { uid?: string }) {
  const id = `ab1${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={id} x1="30" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E3F3FC" />
          <stop offset="1" stopColor="#9FD3EE" />
        </linearGradient>
      </defs>
      <line x1="50" y1="55" x2="28" y2="26" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="55" x2="72" y2="26" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="55" x2="50" y2="84" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" />
      <circle cx="28" cy="24" r="8" fill="#EAF6FC" stroke="#6FB8DE" strokeWidth="1.5" />
      <circle cx="72" cy="24" r="8" fill="#EAF6FC" stroke="#6FB8DE" strokeWidth="1.5" />
      <circle cx="50" cy="55" r="11" fill="#EAF6FC" stroke="#6FB8DE" strokeWidth="1.5" />
      <circle cx="46" cy="53" r="1.6" fill="#1B4F72" />
      <circle cx="54" cy="53" r="1.6" fill="#1B4F72" />
      <path d="M46 58 Q50 61 54 58" stroke="#1B4F72" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function AntibodyPuluhan({ uid = "" }: { uid?: string }) {
  const id = `ab2${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={id} x1="27" y1="27" x2="73" y2="73" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8AC0E8" />
          <stop offset="1" stopColor="#4A90C2" />
        </linearGradient>
      </defs>
      <line x1="50" y1="50" x2="72.6" y2="27.4" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="50" x2="72.6" y2="72.6" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="50" x2="27.4" y2="72.6" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="50" x2="27.4" y2="27.4" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" />
      <g fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="1.5">
        <circle cx="72.6" cy="27.4" r="8.5" />
        <circle cx="72.6" cy="72.6" r="8.5" />
        <circle cx="27.4" cy="72.6" r="8.5" />
        <circle cx="27.4" cy="27.4" r="8.5" />
      </g>
      <circle cx="50" cy="50" r="13" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="1.6" />
      <circle cx="46" cy="48" r="1.8" fill="#1B4F72" />
      <circle cx="54" cy="48" r="1.8" fill="#1B4F72" />
      <path d="M45 54 Q50 57 55 54" stroke="#1B4F72" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function AntibodyRatusan({ uid = "" }: { uid?: string }) {
  const id = `ab3${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id={id} x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2255AA" />
          <stop offset="1" stopColor="#0D2E66" />
        </linearGradient>
      </defs>
      <g stroke="#7FA8D6" strokeWidth="8" strokeLinecap="round">
        <line x1="50" y1="50" x2="50" y2="16" />
        <line x1="50" y1="50" x2="79.4" y2="33" />
        <line x1="50" y1="50" x2="79.4" y2="67" />
        <line x1="50" y1="50" x2="50" y2="84" />
        <line x1="50" y1="50" x2="20.6" y2="67" />
        <line x1="50" y1="50" x2="20.6" y2="33" />
      </g>
      <g stroke={`url(#${id})`} strokeWidth="5.5" strokeLinecap="round">
        <line x1="50" y1="50" x2="50" y2="16" />
        <line x1="50" y1="50" x2="79.4" y2="33" />
        <line x1="50" y1="50" x2="79.4" y2="67" />
        <line x1="50" y1="50" x2="50" y2="84" />
        <line x1="50" y1="50" x2="20.6" y2="67" />
        <line x1="50" y1="50" x2="20.6" y2="33" />
      </g>
      <g fill="#B9D3EE" stroke="#1B4F91" strokeWidth="1.6">
        <circle cx="50" cy="16" r="7" />
        <circle cx="79.4" cy="33" r="7" />
        <circle cx="79.4" cy="67" r="7" />
        <circle cx="50" cy="84" r="7" />
        <circle cx="20.6" cy="67" r="7" />
        <circle cx="20.6" cy="33" r="7" />
      </g>
      <polygon points="50,35 62,42.5 62,57.5 50,65 38,57.5 38,42.5" fill={`url(#${id})`} stroke="#0D2E66" strokeWidth="1.8" />
      <circle cx="50" cy="50" r="10" fill="#B9D3EE" stroke="#1B4F91" strokeWidth="1.4" />
      <circle cx="46.5" cy="48" r="1.7" fill="#0D2E66" />
      <circle cx="53.5" cy="48" r="1.7" fill="#0D2E66" />
      <path d="M45 54 Q50 57.5 55 54" stroke="#0D2E66" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <path d="M50 33 L50 38" stroke="#FFD34D" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function AntibodyRibuan({ uid = "" }: { uid?: string }) {
  const id = `ab4${uid}`;
  return (
    <svg viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#BFE0FF" />
          <stop offset="100%" stopColor="#2E6DA4" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#8FC1E8" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <g transform="translate(50,20) scale(0.34)">
        <line x1="0" y1="20" x2="-22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <line x1="0" y1="20" x2="22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <circle cx="-22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
        <circle cx="22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
      </g>
      <g transform="translate(78,38) rotate(72) scale(0.34)">
        <line x1="0" y1="20" x2="-22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <line x1="0" y1="20" x2="22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <circle cx="-22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
        <circle cx="22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
      </g>
      <g transform="translate(67,76) rotate(144) scale(0.34)">
        <line x1="0" y1="20" x2="-22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <line x1="0" y1="20" x2="22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <circle cx="-22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
        <circle cx="22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
      </g>
      <g transform="translate(33,76) rotate(216) scale(0.34)">
        <line x1="0" y1="20" x2="-22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <line x1="0" y1="20" x2="22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <circle cx="-22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
        <circle cx="22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
      </g>
      <g transform="translate(22,38) rotate(288) scale(0.34)">
        <line x1="0" y1="20" x2="-22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <line x1="0" y1="20" x2="22" y2="-8" stroke="#4A90C2" strokeWidth="7" strokeLinecap="round" />
        <circle cx="-22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
        <circle cx="22" cy="-10" r="9" fill="#D6EAF8" stroke="#3E7CAE" strokeWidth="2" />
      </g>
      <circle cx="50" cy="50" r="17" fill={`url(#${id})`} stroke="#1B4F72" strokeWidth="2" />
      <path d="M40 36 L44 26 L50 34 L56 26 L60 36 Z" fill="#FFD34D" stroke="#B8860B" strokeWidth="1" />
      <circle cx="46" cy="49" r="2" fill="#0B3355" />
      <circle cx="54" cy="49" r="2" fill="#0B3355" />
      <path d="M45 55 Q50 59 55 55" stroke="#0B3355" strokeWidth="2" fill="none" strokeLinecap="round" />
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
  const isSettled = phase === "settled";

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
        const shown = count;
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

          </div>
        );
      })}
    </div>
  );
}
