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
}: CharacterColumnProps) {
  const allTiersOrder: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];

  const isApproach = stepPhase === "approach";

  const isTierDone = (t: 1 | 10 | 100 | 1000): boolean => {
    const grp = tierGroups.find((g) => g.tier === t);
    if (!grp) return false;
    return (neutralised.get(t) ?? 0) >= grp.count;
  };

  const isTierActive = (t: 1 | 10 | 100 | 1000): boolean =>
    tierGroups[tierIdx]?.tier === t && vizPhase === "battle";

  // Decompose paired per tier
  const pairedByTier = new Map<1 | 10 | 100 | 1000, number>();
  let remP = sPaired;
  for (const t of allTiersOrder) {
    const c = Math.floor(remP / t);
    if (c > 0) pairedByTier.set(t, c);
    remP %= t;
  }

  // Decompose remaining per tier
  const remainByTier = new Map<1 | 10 | 100 | 1000, number>();
  let remR = sRemaining;
  for (const t of allTiersOrder) {
    const c = Math.floor(remR / t);
    if (c > 0) remainByTier.set(t, c);
    remR %= t;
  }

  const rows: React.ReactNode[] = [];

  for (const t of allTiersOrder) {
    const pCount = pairedByTier.get(t) ?? 0;
    const rCount = remainByTier.get(t) ?? 0;
    if (pCount === 0 && rCount === 0) continue;

    const tierPlace  = TIER_TO_PLACE[t];
    const tierDone   = isTierDone(t);
    const tierActive = isTierActive(t);
    const doneInTier = neutralised.get(t) ?? 0;
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
            ×{tierVal}
          </span>
          {tierDone && (
            <span className="font-mono text-[7px] text-emerald-600">✓ luruh</span>
          )}
          {tierActive && !tierDone && (
            <span className="font-mono text-[7px] text-amber-500 animate-pulse">
              bereaksi
            </span>
          )}
        </div>

        {/* Paired characters — shown with individual react state */}
        {pCount > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-0.5">
            {Array.from({ length: Math.min(pCount, 9) }, (_, i) => {
              const isDecomposeActiveTier =
                stepPhase === "decompose" &&
                activeDecomposeTier !== null &&
                t === activeDecomposeTier;

              const isGone =
                i < doneInTier ||
                (tierActive && i === pairInTier && !isApproach);
              const isDimmed = tierActive && i === pairInTier && isApproach;
              const isWaiting = !tierDone && (!tierActive || i > pairInTier);

              return (
                <div
                  key={`${prefix}-p-${t}-${i}`}
                  className={`w-8 h-8 shrink-0 transition-all duration-500 ${
                    isDecomposeActiveTier
                      ? "opacity-25 scale-90"
                      : isGone
                      ? "opacity-0 scale-0"
                      : isDimmed
                      ? "opacity-25 scale-90"
                      : isWaiting && tierActive && i > pairInTier
                      ? "opacity-60"
                      : "opacity-100"
                  }`}
                >
                  {sType === "ab" ? (
                    <AntibodyCharacter
                      type={tierPlace}
                      uid={`${prefix}-p-${t}-${i}`}
                    />
                  ) : (
                    <VirusCharacter
                      type={tierPlace}
                      uid={`${prefix}-p-${t}-${i}`}
                    />
                  )}
                </div>
              );
            })}
            {pCount > 9 && (
              <span
                className={`text-[8px] font-mono font-bold self-center ${
                  sType === "ab" ? "text-blue-400" : "text-rose-400"
                }`}
              >
                +{pCount - 9}
              </span>
            )}
          </div>
        )}

        {/* Remaining characters — always full opacity */}
        {rCount > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {Array.from({ length: Math.min(rCount, 9) }, (_, i) => (
              <div
                key={`${prefix}-r-${t}-${i}`}
                className="w-8 h-8 shrink-0"
              >
                {sType === "ab" ? (
                  <AntibodyCharacter
                    type={tierPlace}
                    uid={`${prefix}-r-${t}-${i}`}
                  />
                ) : (
                  <VirusCharacter
                    type={tierPlace}
                    uid={`${prefix}-r-${t}-${i}`}
                  />
                )}
              </div>
            ))}
            {rCount > 9 && (
              <span
                className={`text-[8px] font-mono font-bold self-center ${
                  sType === "ab" ? "text-blue-400" : "text-rose-400"
                }`}
              >
                +{rCount - 9}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return <>{rows}</>;
}
