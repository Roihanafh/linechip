// app/model-chip/pengurangan/page.tsx
"use client";

import Link from "next/link";
import { useSubtractionState } from "@/hooks/model-chip/useSubtractionState";
import { useSubtractionOrchestrator } from "@/hooks/model-chip/useSubtractionOrchestrator";
import {
  TierLegend,
  ArenaPanel,
  TransformPanel,
  SubtractionInputPanel,
  SubtractionResultPanel,
} from "@/components/model-chip";
import type { VizPhase } from "@/lib/model-chip/types";

export default function SubtractionPage() {
  const state = useSubtractionState();
  const orch = useSubtractionOrchestrator({ state });

  const { bil1, bil2, vizPhase, snapshot } = state;

  // ── Derived values ──────────────────────────────────────────────────────
  const bConverted = snapshot?.bil2_converted ?? 0;

  const snapTotalPos =
    Math.max(0, snapshot?.bil1 ?? 0) + Math.max(0, bConverted);
  const snapTotalNeg =
    Math.max(0, -(snapshot?.bil1 ?? 0)) + Math.max(0, -bConverted);
  const pairs = Math.min(snapTotalPos, snapTotalNeg);
  const remaining = snapTotalPos - snapTotalNeg;

  const eqBil1 = snapshot?.bil1 ?? bil1;
  const eqBil2Original = snapshot?.bil2_original ?? bil2;

  // ── Narrowing VizPhaseSub → VizPhase for ArenaPanel ────────────────────
  // ArenaPanel doesn't know "transform"; map it (and "idle") to "idle".
  const arenaPhase: VizPhase =
    vizPhase === "transform" || vizPhase === "idle"
      ? "idle"
      : (vizPhase as VizPhase);

  // ArenaPanel uses bil2_converted, not the original bil2
  const arenaSnapshot = snapshot
    ? { bil1: snapshot.bil1, bil2: snapshot.bil2_converted }
    : null;

  // ── isAnimating flag ────────────────────────────────────────────────────
  const isAnimating =
    vizPhase === "transform" ||
    vizPhase === "battle" ||
    vizPhase === "center";

  // ── Input callbacks — clamp to [-9999, 9999], only active in idle ───────
  const clamp = (v: number) => Math.max(-9999, Math.min(9999, v));

  const onBil1Change = (val: string) => {
    if (vizPhase !== "idle") return;
    const raw = parseInt(val);
    state.setBil1(isNaN(raw) ? 0 : clamp(raw));
    state.setSnapshot(null);
  };

  const onBil2Change = (val: string) => {
    if (vizPhase !== "idle") return;
    const raw = parseInt(val);
    state.setBil2(isNaN(raw) ? 0 : clamp(raw));
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
            aria-label="Kembali ke halaman materi"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8l5 5"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Materi / Simulasi</p>
            <h1
              className="font-bold text-2xl text-[#0f172a]"
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
            >
              Model Chip Pengurangan
            </h1>
          </div>
        </div>

        {/* Info banner — Req 9.1, 9.2 */}
        <div className="bg-intblue-light border border-intblue/20 rounded-2xl p-4 mb-4">
          <p className="text-sm text-intblue">
            Masukkan <strong>Bilangan 1</strong> (minuend) dan{" "}
            <strong>Bilangan 2</strong> (pengurang).{" "}
            <strong>Antibodi 🔵</strong> mewakili bilangan{" "}
            <strong>positif</strong>; <strong>Kuman 🔴</strong> mewakili
            bilangan <strong>negatif</strong>.{" "}
            Pengurang selalu <strong>dibalik jenisnya</strong> sebelum bertarung —
            itulah makna{" "}
            <span className="font-mono font-semibold">a − b = a + (−b)</span>.
          </p>
        </div>

        <TierLegend />

        <SubtractionInputPanel
          bil1={bil1}
          bil2={bil2}
          animMode={orch.animMode}
          animSpeed={orch.animSpeed}
          vizPhase={vizPhase}
          snapshot={snapshot}
          waitingForClick={orch.waitingForClick}
          isAnimating={isAnimating}
          onBil1Change={onBil1Change}
          onBil2Change={onBil2Change}
          onSubtract={orch.handleSubtract}
          onReset={orch.handleReset}
          onReplay={orch.replayAnimation}
          onAnimModeChange={orch.setAnimMode}
          onSpeedChange={orch.setAnimSpeed}
          onNextClick={orch.handleNextClick}
        />

        {/* Reset button — visible directly below input area during animation */}
        {vizPhase !== "idle" && vizPhase !== "done" && (
          <div className="flex justify-center -mt-2 mb-4">
            <button
              id="btn-reset-subtraction-animation"
              onClick={orch.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:shadow-md transition-all duration-200 text-xs font-bold"
            >
              <svg
                width="14" height="14" viewBox="0 0 16 16" fill="none"
                className="transition-transform duration-300 hover:rotate-180"
              >
                <path
                  d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 3.89 1.61L13.5 2.5V6h-3.5l1.41-1.41A3.5 3.5 0 1 0 11.5 8"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              Kembali ke Input
            </button>
          </div>
        )}

        {/* TransformPanel — only during "transform" phase */}
        {vizPhase === "transform" && snapshot !== null && (
          <TransformPanel
            bil2={snapshot.bil2_original}
            b_konversi={snapshot.bil2_converted}
            isExiting={orch.transformExiting}
          />
        )}

        {/* ArenaPanel — shown once out of idle/transform */}
        {arenaSnapshot !== null &&
          vizPhase !== "idle" &&
          vizPhase !== "transform" && (
            <ArenaPanel
              snapshot={arenaSnapshot}
              vizPhase={arenaPhase}
              centerExiting={orch.centerExiting}
              snapTotalPos={snapTotalPos}
              snapTotalNeg={snapTotalNeg}
              pairs={pairs}
              remaining={remaining}
              tierGroups={orch.tierGroups}
              tierIdx={orch.tierIdx}
              pairInTier={orch.pairInTier}
              stepPhase={orch.stepPhase}
              neutralised={orch.neutralised}
              posChipMap={orch.posChipMap}
              negChipMap={orch.negChipMap}
              animSpeed={orch.animSpeed}
              onPairDone={orch.handlePairDone}
              stepIdx={orch.stepIdx}
              currentDecomposeStep={orch.currentDecomposeStep}
              onDecomposeDone={orch.handleDecomposeDone}
            />
          )}



        <SubtractionResultPanel
          eqBil1={eqBil1}
          eqBil2Original={eqBil2Original}
          remaining={remaining}
          vizPhase={vizPhase}
          pairs={pairs}
        />

      </div>
    </div>
  );
}
