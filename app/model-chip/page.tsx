// app/model-chip/page.tsx
"use client";

import Link from "next/link";
import { useModelChipState } from "@/hooks/model-chip/useModelChipState";
import { useAnimationOrchestrator } from "@/hooks/model-chip/useAnimationOrchestrator";
import { TierLegend, InputPanel, ArenaPanel, ResultPanel } from "@/components/model-chip";

export default function ModelChipPage() {
  const state = useModelChipState();
  const anim = useAnimationOrchestrator({ state });

  const { bil1, bil2, vizPhase, snapshot } = state;

  // Derived values
  const snapTotalPos = snapshot
    ? Math.max(0, snapshot.bil1) + Math.max(0, snapshot.bil2)
    : Math.max(0, bil1) + Math.max(0, bil2);
  const snapTotalNeg = snapshot
    ? Math.max(0, -snapshot.bil1) + Math.max(0, -snapshot.bil2)
    : Math.max(0, -bil1) + Math.max(0, -bil2);
  const pairs = Math.min(snapTotalPos, snapTotalNeg);
  const remaining = snapTotalPos - snapTotalNeg;
  const eqBil1 = snapshot?.bil1 ?? bil1;
  const eqBil2 = snapshot?.bil2 ?? bil2;

  // Input callbacks — only active in idle phase, clamp to [-9999, 9999]
  const onBil1Change = (val: string) => {
    if (vizPhase !== "idle") return;
    const raw = parseInt(val);
    state.setBil1(isNaN(raw) ? 0 : Math.max(-9999, Math.min(9999, raw)));
    state.setSnapshot(null);
  };
  const onBil2Change = (val: string) => {
    if (vizPhase !== "idle") return;
    const raw = parseInt(val);
    state.setBil2(isNaN(raw) ? 0 : Math.max(-9999, Math.min(9999, raw)));
    state.setSnapshot(null);
  };

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/materi"
            className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Materi / Simulasi</p>
            <h1
              className="font-bold text-2xl text-[#0f172a]"
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
            >
              Model Zero-Pair
            </h1>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-intblue-light border border-intblue/20 rounded-2xl p-4 mb-4">
          <p className="text-sm text-intblue">
            Masukkan nilai pada <strong>Bilangan 1</strong> dan <strong>Bilangan 2</strong>.{" "}
            Bilangan positif mewakili <strong>Antibodi 🔵</strong>, sedangkan bilangan negatif mewakili{" "}
            <strong>Kuman 🔴</strong>. Klik <strong>Pasangkan</strong> untuk melihat animasi netralisasi.
          </p>
        </div>

        <TierLegend />

        <InputPanel
          bil1={bil1}
          bil2={bil2}
          animMode={anim.animMode}
          animSpeed={anim.animSpeed}
          vizPhase={vizPhase}
          snapshot={snapshot}
          waitingForClick={anim.waitingForClick}
          onBil1Change={onBil1Change}
          onBil2Change={onBil2Change}
          onPair={anim.handlePair}
          onReset={anim.handleReset}
          onReplay={anim.replayAnimation}
          onAnimModeChange={anim.setAnimMode}
          onSpeedChange={anim.setAnimSpeed}
          onNextClick={anim.handleNextClick}
        />

        {snapshot !== null && (
          <ArenaPanel
            snapshot={snapshot}
            vizPhase={vizPhase}
            centerExiting={anim.centerExiting}
            snapTotalPos={snapTotalPos}
            snapTotalNeg={snapTotalNeg}
            pairs={pairs}
            remaining={remaining}
            tierGroups={anim.tierGroups}
            tierIdx={anim.tierIdx}
            pairInTier={anim.pairInTier}
            stepPhase={anim.stepPhase}
            neutralised={anim.neutralised}
            animSpeed={anim.animSpeed}
            onPairDone={anim.handlePairDone}
          />
        )}

        <ResultPanel
          eqBil1={eqBil1}
          eqBil2={eqBil2}
          remaining={remaining}
          vizPhase={vizPhase}
          pairs={pairs}
        />

      </div>
    </div>
  );
}
