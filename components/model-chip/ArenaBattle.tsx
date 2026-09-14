// components/model-chip/ArenaBattle.tsx
"use client";

import { TIER_TO_PLACE } from "@/components/game/CharacterSVGs";
import { PairReactionStage } from "@/components/game/PairReactionStage";
import type { TierGroup, StepPhase, VizPhase } from "@/lib/model-chip/types";
import { CharacterColumn } from "./CharacterColumn";

interface ArenaBattleProps {
  s1: number;
  s2: number;
  s1Type: "ab" | "ku";
  s2Type: "ab" | "ku";
  s1Abs: number;
  s2Abs: number;
  s1Paired: number;
  s2Paired: number;
  s1Remaining: number;
  s2Remaining: number;
  s1Color: string;
  s2Color: string;
  s1Dot: string;
  s2Dot: string;
  s1Sign: string;
  s2Sign: string;
  snapTotalPos: number;
  snapTotalNeg: number;
  pairs: number;
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
  animSpeed: number;
  vizPhase: VizPhase;
  onPairDone: (neu: Map<1 | 10 | 100 | 1000, number>) => void;
}

function TierProgressDots({
  tierGroups,
  tierIdx,
  neutralised,
}: {
  tierGroups: TierGroup[];
  tierIdx: number;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
}) {
  return (
    <div className="flex gap-1.5">
      {tierGroups.map((tg, i) => {
        const done = (neutralised.get(tg.tier) ?? 0) >= tg.count;
        const active = i === tierIdx;
        return (
          <div
            key={i}
            title={TIER_TO_PLACE[tg.tier]}
            className={`transition-all duration-300 rounded-full ${
              done
                ? "w-2 h-2 bg-emerald-500"
                : active
                ? "w-2.5 h-2.5 bg-yellow-400 ring-2 ring-yellow-400/30"
                : "w-2 h-2 bg-slate-300"
            }`}
          />
        );
      })}
    </div>
  );
}

export function ArenaBattle({
  s1, s2, s1Type, s2Type,
  s1Abs, s2Abs, s1Paired, s2Paired, s1Remaining, s2Remaining,
  s1Color, s2Color, s1Dot, s2Dot, s1Sign, s2Sign,
  snapTotalPos, snapTotalNeg, pairs,
  tierGroups, tierIdx, pairInTier, stepPhase, neutralised, animSpeed,
  vizPhase, onPairDone,
}: ArenaBattleProps) {
  const curGroup = tierGroups[tierIdx] ?? null;
  const place = curGroup ? TIER_TO_PLACE[curGroup.tier] : "satuan";
  const totalNeutralised = Array.from(neutralised.entries()).reduce(
    (sum, [t, c]) => sum + t * c,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      {curGroup && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">
              {TIER_TO_PLACE[curGroup.tier]} &middot; {pairInTier + 1}/{curGroup.count}
            </p>
            <TierProgressDots
              tierGroups={tierGroups}
              tierIdx={tierIdx}
              neutralised={neutralised}
            />
            {totalNeutralised > 0 && (
              <span className="font-mono text-[8px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                -{totalNeutralised.toLocaleString("id-ID")} luruh
              </span>
            )}
          </div>
          <PairReactionStage
            key={`pr-${tierIdx}-${pairInTier}-${animSpeed}`}
            runKey={tierIdx * 1000 + pairInTier}
            leftType={place}
            rightType={place}
            leftFaction={s1Type}
            isPerfect={pairs === 1 && snapTotalPos === snapTotalNeg}
            onDone={() => {
              if (!curGroup) return;
              const next = new Map(neutralised);
              next.set(curGroup.tier, (next.get(curGroup.tier) ?? 0) + 1);
              onPairDone(next);
            }}
            speed={animSpeed}
            width={520}
            height={200}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-2 justify-center">
            <div className={`w-2 h-2 rounded-full ${s1Dot}`} />
            <span className={`font-mono text-[9px] ${s1Color} uppercase tracking-wide font-bold`}>
              Bil.1 {s1 !== 0 ? `${s1Sign}${s1.toLocaleString("id-ID")}` : ""}
            </span>
          </div>
          {s1 === 0 ? (
            <p className="text-[9px] text-slate-400 font-mono italic text-center">tidak ada</p>
          ) : (
            <CharacterColumn
              sAbs={s1Abs} sPaired={s1Paired} sRemaining={s1Remaining}
              sType={s1Type} sColor={s1Color} sSign={s1Sign} prefix="b1"
              vizPhase={vizPhase} tierGroups={tierGroups} tierIdx={tierIdx}
              pairInTier={pairInTier} neutralised={neutralised} stepPhase={stepPhase}
            />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-2 justify-center">
            <div className={`w-2 h-2 rounded-full ${s2Dot}`} />
            <span className={`font-mono text-[9px] ${s2Color} uppercase tracking-wide font-bold`}>
              {s2 !== 0 ? `${s2Sign}${s2.toLocaleString("id-ID")}` : ""} Bil.2
            </span>
          </div>
          {s2 === 0 ? (
            <p className="text-[9px] text-slate-400 font-mono italic text-center">tidak ada</p>
          ) : (
            <CharacterColumn
              sAbs={s2Abs} sPaired={s2Paired} sRemaining={s2Remaining}
              sType={s2Type} sColor={s2Color} sSign={s2Sign} prefix="b2"
              vizPhase={vizPhase} tierGroups={tierGroups} tierIdx={tierIdx}
              pairInTier={pairInTier} neutralised={neutralised} stepPhase={stepPhase}
            />
          )}
        </div>
      </div>
    </div>
  );
}
