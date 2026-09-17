// components/model-chip/CharacterColumn.tsx
"use client";

import {
  AntibodyCharacter,
  VirusCharacter,
  TIER_TO_PLACE,
} from "@/components/game/CharacterSVGs";
import type { VizPhase, TierGroup, StepPhase } from "@/lib/model-chip/types";

export interface CharacterColumnProps {
  sAbs: number;
  sPaired: number;
  sRemaining: number;
  sType: "ab" | "ku";
  sColor: string;    // Tailwind class e.g. "text-intblue"
  sSign: string;     // "" | "+"
  prefix: string;    // uid prefix for gradient deduplication
  vizPhase: VizPhase;
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
  stepPhase: StepPhase;
  activeDecomposeTier?: 1 | 10 | 100 | 1000 | null;
  isDecomposeSide?: boolean; // true only if THIS column is the one being decomposed
  chipMap?: Map<1 | 10 | 100 | 1000, number>;
}

// Decomposition must go from largest to smallest so each Math.floor(rem/t) is correct.
const DECOMPOSE_ORDER: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];
// Rendering goes largest to smallest so Ribuan (x1000)/Puluhan (x10) appears at top and Satuan (x1) at bottom.
const RENDER_ORDER: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];

// ─── Helper: idle-float animation for chips when stepPhase === "idle" ─────────

function chipIdleAnim(stepPhase: StepPhase, globalIdx: number): string | undefined {
  if (stepPhase === "idle") {
    return `idle-float 2800ms ease-in-out ${(globalIdx % 6) * 120}ms infinite`;
  }
  return undefined;
}

export function CharacterColumn({
  sPaired,
  sRemaining,
  sType,
  prefix,
  vizPhase,
  tierGroups,
  tierIdx,
  pairInTier,
  neutralised,
  stepPhase,
  activeDecomposeTier = null,
  isDecomposeSide = false,
  chipMap,
}: CharacterColumnProps) {
  const isApproach = stepPhase === "approach";

  const isTierDone = (t: 1 | 10 | 100 | 1000): boolean => {
    const grp = tierGroups.find((g) => g.tier === t);
    if (!grp) return false;
    return (neutralised.get(t) ?? 0) >= grp.count;
  };

  const isTierActive = (t: 1 | 10 | 100 | 1000): boolean =>
    tierGroups[tierIdx]?.tier === t && vizPhase === "battle" &&
    (stepPhase === "approach" || stepPhase === "approach-wait");

  // Decompose paired per tier -- fallback if chipMap not provided
  const pairedByTier = new Map<1 | 10 | 100 | 1000, number>();
  let remP = sPaired;
  for (const t of DECOMPOSE_ORDER) {
    const c = Math.floor(remP / t);
    if (c > 0) pairedByTier.set(t, c);
    remP %= t;
  }

  // Decompose remaining per tier -- fallback if chipMap not provided
  const remainByTier = new Map<1 | 10 | 100 | 1000, number>();
  let remR = sRemaining;
  for (const t of DECOMPOSE_ORDER) {
    const c = Math.floor(remR / t);
    if (c > 0) remainByTier.set(t, c);
    remR %= t;
  }

  const rows: React.ReactNode[] = [];
  let globalChipIdx = 0;

  // Render rows in ascending order so Satuan (x1) appears at top
  for (const t of RENDER_ORDER) {
    const count = chipMap
      ? chipMap.get(t) ?? 0
      : (pairedByTier.get(t) ?? 0) + (remainByTier.get(t) ?? 0);

    if (count === 0) continue;

    const tierPlace  = TIER_TO_PLACE[t];
    const tierDone   = isTierDone(t);
    const tierActive = isTierActive(t);
    const tierVal    = t.toLocaleString("id-ID");

    rows.push(
      <div key={t} className="mb-2">
        {/* Tier label */}
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span
            className={`font-mono text-[8px] font-bold uppercase tracking-wide ${
              tierDone
                ? "text-slate-400"
                : tierActive
                ? "text-amber-500"
                : "text-slate-500"
            }`}
          >
            x{tierVal}
          </span>
          {tierDone && (
            <span className="font-mono text-[7px] text-emerald-600">luruh</span>
          )}
          {tierActive && !tierDone && stepPhase === "approach-wait" && (
            <span className="font-mono text-[7px] text-orange-500 animate-pulse">
              menunggu…
            </span>
          )}
          {tierActive && !tierDone && stepPhase === "approach" && (
            <span className="font-mono text-[7px] text-amber-500 animate-pulse">
              bereaksi
            </span>
          )}
        </div>

        {/* Chips container */}
        <div className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: Math.min(count, 12) }, (_, i) => {
            // During decompose, only highlight the chip being decomposed on its tier AND side
            const isDecomposeActiveTier =
              stepPhase === "decompose" &&
              isDecomposeSide &&
              activeDecomposeTier !== null &&
              t === activeDecomposeTier;

            const isDecomposingChip =
              isDecomposeActiveTier && i === Math.min(count, 12) - 1;

            // Pair reaction visuals only apply during pair/approach-wait steps, NOT during decompose
            const isPairPhase = stepPhase !== "decompose";
            const isReactingChip = isPairPhase && tierActive && i === pairInTier;
            const isGone = isReactingChip && stepPhase === "clear";
            // Dimmed during approach (about to react) OR during approach-wait (waiting with no partner)
            const isDimmed = isReactingChip && (stepPhase === "approach" || stepPhase === "approach-wait");

            const currentGlobalIdx = globalChipIdx++;
            const idleAnim = !isDecomposingChip && !isGone && !isDimmed
              ? chipIdleAnim(stepPhase, currentGlobalIdx)
              : undefined;

            return (
              <div
                key={`${prefix}-${t}-${i}`}
                className={`w-8 h-8 shrink-0 transition-all duration-500 ${
                  isDecomposingChip
                    ? "opacity-30 scale-90 animate-pulse ring-2 ring-purple-500 rounded-full"
                    : isGone
                    ? "opacity-0 scale-0"
                    : isDimmed && stepPhase === "approach-wait"
                    ? "opacity-50 scale-95 ring-2 ring-orange-400 rounded-full animate-pulse"
                    : isDimmed
                    ? "opacity-25 scale-90"
                    : "opacity-100"
                }`}
                style={{ animation: idleAnim }}
              >
                {sType === "ab" ? (
                  <AntibodyCharacter
                    type={tierPlace}
                    uid={`${prefix}-${t}-${i}`}
                  />
                ) : (
                  <VirusCharacter
                    type={tierPlace}
                    uid={`${prefix}-${t}-${i}`}
                  />
                )}
              </div>
            );
          })}
          {count > 12 && (
            <span
              className={`text-[8px] font-mono font-bold self-center ${
                sType === "ab" ? "text-blue-400" : "text-rose-400"
              }`}
            >
              +{count - 12}
            </span>
          )}
        </div>
      </div>
    );
  }

  return <>{rows}</>;
}
