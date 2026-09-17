// components/model-chip/ArenaPanel.tsx
"use client";

import { dominantPlace, TIER_TO_PLACE } from "@/components/game/CharacterSVGs";
import type { VizPhase, TierGroup, StepPhase } from "@/lib/model-chip/types";
import type { BattleStep } from "@/lib/model-chip/battlePlan";
import { ArenaBattle } from "./ArenaBattle";
import { ArenaCenter } from "./ArenaCenter";
import { ArenaDone } from "./ArenaDone";
import { AllianceStage } from "@/components/game/AllianceStage";

export interface ArenaPanelProps {
  snapshot: { bil1: number; bil2: number }; // guaranteed non-null (parent guards)
  vizPhase: VizPhase;
  centerExiting: boolean;
  snapTotalPos: number;
  snapTotalNeg: number;
  pairs: number;
  remaining: number;
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
  posChipMap?: Map<1 | 10 | 100 | 1000, number>;
  negChipMap?: Map<1 | 10 | 100 | 1000, number>;
  animSpeed: number;
  onPairDone: (neu: Map<1 | 10 | 100 | 1000, number>) => void;
  onAllianceDone: () => void;
  stepIdx: number;
  currentDecomposeStep: BattleStep | null;
  onDecomposeDone: () => void;
}

export function ArenaPanel({
  snapshot, vizPhase, centerExiting,
  snapTotalPos, snapTotalNeg, pairs, remaining,
  tierGroups, tierIdx, pairInTier, stepPhase, neutralised, posChipMap, negChipMap, animSpeed, onPairDone, onAllianceDone,
  stepIdx, currentDecomposeStep, onDecomposeDone,
}: ArenaPanelProps) {
  const s1 = snapshot.bil1;
  const s2 = snapshot.bil2;
  const s1Type: "ab" | "ku" = s1 >= 0 ? "ab" : "ku";
  const s2Type: "ab" | "ku" = s2 >= 0 ? "ab" : "ku";
  const s1Abs = Math.abs(s1);
  const s2Abs = Math.abs(s2);
  const hasBattle = snapTotalPos > 0 && snapTotalNeg > 0;
  const s1Paired = hasBattle ? Math.min(s1Abs, pairs) : 0;
  const s2Paired = hasBattle ? Math.min(s2Abs, pairs) : 0;
  const s1Remaining = s1Abs - s1Paired;
  const s2Remaining = s2Abs - s2Paired;
  const s1Color = s1 > 0 ? "text-intblue" : "text-intpink";
  const s2Color = s2 > 0 ? "text-intblue" : "text-intpink";
  const s1Dot = s1 > 0 ? "bg-intblue" : "bg-intpink";
  const s2Dot = s2 > 0 ? "bg-intblue" : "bg-intpink";
  const s1Sign = s1 > 0 ? "+" : "";
  const s2Sign = s2 > 0 ? "+" : "";
  const s1Place = dominantPlace(s1Paired || s1Abs || 1);
  const s2Place = dominantPlace(s2Paired || s2Abs || 1);
  const isDone = vizPhase === "done";
  const curGroup = tierGroups[tierIdx] ?? null;

  const headerText =
    vizPhase === "alliance" ? "🤝 Persekutuan!"
    : vizPhase === "battle" ? "⚔️ Pertarungan!"
    : vizPhase === "center" ? "⚡ Reaksi Netralisasi"
    : isDone ? "✓ Selesai"
    : "Arena";

  const statusText =
    vizPhase === "alliance" ? "Bergabung"
    : vizPhase === "battle" && curGroup
      ? `${TIER_TO_PLACE[curGroup.tier]} ${pairInTier + 1}/${curGroup.count}`
      : vizPhase === "center" ? "Bereaksi"
      : isDone ? "Selesai"
      : "Standby";

  const accentBarClass = isDone
    ? "bg-emerald-400"
    : vizPhase === "center"
      ? "bg-gradient-to-r from-intblue to-intpink"
      : vizPhase === "alliance"
        ? (snapshot?.bil1 ?? 0) > 0 ? "bg-intblue" : "bg-intpink"
        : "bg-gradient-to-r from-intblue via-amber-400 to-intpink animate-pulse";

  const sharedProps = {
    s1, s2, s1Type, s2Type, s1Abs, s2Abs,
    s1Paired, s2Paired, s1Remaining, s2Remaining,
    s1Color, s2Color, s1Dot, s2Dot, s1Sign, s2Sign,
  };

  return (
    <div className={`bg-white rounded-2xl border-2 border-slate-200 shadow-md p-4 mb-4 overflow-hidden relative ${isDone ? "arena-expand" : "arena-enter"}`}>
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${accentBarClass}`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pt-2">
        <span data-testid="arena-header" className="font-mono text-[11px] tracking-[0.8px] text-slate-500 uppercase font-bold">
          {headerText}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isDone ? "bg-emerald-500" : "bg-yellow-400 animate-pulse"}`} />
          <span className="font-mono text-[10px] text-slate-500">{statusText}</span>
        </div>
      </div>

      {vizPhase === "battle" && (
        <ArenaBattle
          {...sharedProps}
          snapTotalPos={snapTotalPos}
          snapTotalNeg={snapTotalNeg}
          pairs={pairs}
          tierGroups={tierGroups}
          tierIdx={tierIdx}
          pairInTier={pairInTier}
          stepPhase={stepPhase}
          neutralised={neutralised}
          posChipMap={posChipMap}
          negChipMap={negChipMap}
          animSpeed={animSpeed}
          vizPhase={vizPhase}
          onPairDone={onPairDone}
          stepIdx={stepIdx}
          currentDecomposeStep={currentDecomposeStep}
          onDecomposeDone={onDecomposeDone}
        />
      )}

      {vizPhase === "center" && (
        <ArenaCenter
          s1Type={s1Type}
          s2Type={s2Type}
          s1Place={s1Place}
          s2Place={s2Place}
          pairs={pairs}
          remaining={remaining}
          centerExiting={centerExiting}
          s1={s1}
          s2={s2}
        />
      )}

      {vizPhase === "alliance" && snapshot && (
        <AllianceStage
          bil1Value={snapshot.bil1}
          bil2Value={snapshot.bil2}
          faction={snapshot.bil1 > 0 ? "ab" : "ku"}
          autoStart={true}
          hideControls={true}
          speed={animSpeed}
          onComplete={onAllianceDone}
        />
      )}

      {isDone && (
        <ArenaDone
          {...sharedProps}
          remaining={remaining}
        />
      )}
    </div>
  );
}
