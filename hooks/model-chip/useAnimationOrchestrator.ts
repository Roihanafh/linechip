"use client";

import { useState, useRef, useEffect } from "react";
import { buildBattlePlan, buildInitialChipMap } from "@/lib/model-chip/battlePlan";
import { useSound } from "@/hooks/useSound";
import type { ModelChipState } from "./useModelChipState";
import type { TierGroup, StepPhase, AnimMode } from "@/lib/model-chip/types";
import type { BattlePlan, BattleStep } from "@/lib/model-chip/battlePlan";

export interface AnimationOrchestratorOptions { state: ModelChipState }

export interface AnimationOrchestratorReturn {
  tierGroups: TierGroup[]; setTierGroups: (g: TierGroup[]) => void;
  tierIdx: number; pairInTier: number; stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
  posChipMap: Map<1 | 10 | 100 | 1000, number>;
  negChipMap: Map<1 | 10 | 100 | 1000, number>;
  animSpeed: number; setAnimSpeed: (s: number) => void;
  animMode: AnimMode; setAnimMode: (m: AnimMode) => void;
  waitingForClick: boolean; centerExiting: boolean;
  setCenterExiting: (v: boolean) => void;
  handlePair: () => void; replayAnimation: () => void;
  handleNextClick: () => void;
  handlePairDone: (neu: Map<1 | 10 | 100 | 1000, number>) => void;
  handleReset: () => void;
  // New fields for BattlePlan / decompose support
  stepIdx: number;
  currentDecomposeStep: BattleStep | null;
  handleDecomposeDone: () => void;
  handleAllianceDone: () => void;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true when both values have the same sign (both positive or both
 * negative) and neither is zero — the Alliance_Case as defined in the spec.
 * Requirements: 2.1, 2.2
 */
export function isAllianceCase(bil1: number, bil2: number): boolean {
  return (bil1 > 0 && bil2 > 0) || (bil1 < 0 && bil2 < 0);
}

/**
 * Derive TierGroup[] from the "pair" steps in a BattlePlan.
 * Used by TierProgressDots — same shape as the old buildTierGroups output.
 */
function tierGroupsFromPlan(plan: BattlePlan): TierGroup[] {
  const counts = new Map<1 | 10 | 100 | 1000, number>();
  for (const step of plan.steps) {
    if (step.type === "pair") {
      counts.set(step.tier, (counts.get(step.tier) ?? 0) + 1);
    }
  }
  const tiers: (1 | 10 | 100 | 1000)[] = [1, 10, 100, 1000];
  return tiers.filter(t => counts.has(t)).map(t => ({ tier: t, count: counts.get(t)! }));
}

/**
 * Map a BattlePlan step index (which must be a "pair" step) to
 * { tIdx, pIdx } coordinates inside `tierGroups`.
 */
function mapPairStepToPosition(
  plan: BattlePlan,
  idx: number,
  tierGroups: TierGroup[],
): { tIdx: number; pIdx: number } {
  // Count how many "pair" steps precede idx
  let pairNum = 0;
  for (let i = 0; i < idx; i++) {
    if (plan.steps[i].type === "pair") pairNum++;
  }
  // Map pairNum to tierIdx / pairInTier
  let acc = 0;
  for (let tIdx = 0; tIdx < tierGroups.length; tIdx++) {
    if (pairNum < acc + tierGroups[tIdx].count) {
      return { tIdx, pIdx: pairNum - acc };
    }
    acc += tierGroups[tIdx].count;
  }
  return { tIdx: tierGroups.length, pIdx: 0 };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Requirements: 1.2, 1.3, 1.4, 1.6, 5.1–5.5 */
export function useAnimationOrchestrator(
  opts: AnimationOrchestratorOptions
): AnimationOrchestratorReturn {
  const { state } = opts;

  const [tierGroups, setTierGroups] = useState<TierGroup[]>([]);
  const [tierIdx, setTierIdx] = useState(0);
  const [pairInTier, setPairInTier] = useState(0);
  const [stepPhase, setStepPhase] = useState<StepPhase>("approach");
  const [neutralised, setNeutralised] = useState<Map<1 | 10 | 100 | 1000, number>>(new Map());
  const [posChipMap, setPosChipMap] = useState<Map<1 | 10 | 100 | 1000, number>>(new Map());
  const [negChipMap, setNegChipMap] = useState<Map<1 | 10 | 100 | 1000, number>>(new Map());
  const [animSpeed, setAnimSpeedState] = useState(1);
  const [animMode, setAnimMode] = useState<AnimMode>("auto"); // SSR-safe default
  const [waitingForClick, setWaitingForClick] = useState(false);
  const [centerExiting, setCenterExiting] = useState(false);
  // New BattlePlan state
  const [battlePlan, setBattlePlan] = useState<BattlePlan | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animSpeedRef = useRef(1);
  const animModeRef = useRef<AnimMode>("auto");
  const tierGroupsRef = useRef<TierGroup[]>([]);
  const tierIdxRef = useRef(0);
  const pairInTierRef = useRef(0);
  // New refs for BattlePlan
  const battlePlanRef = useRef<BattlePlan | null>(null);
  const stepIdxRef = useRef(0);
  const pendingNextRef = useRef<{ stepIdx: number } | null>(null);

  animModeRef.current = animMode;
  animSpeedRef.current = animSpeed;
  tierGroupsRef.current = tierGroups;
  tierIdxRef.current = tierIdx;
  pairInTierRef.current = pairInTier;
  battlePlanRef.current = battlePlan;
  stepIdxRef.current = stepIdx;

  const playLaunch = useSound("/luncurkan.mp3");
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { const s = sessionStorage.getItem("modelChipAnimMode"); if (s === "click") setAnimMode("click"); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("modelChipAnimMode", animMode); } catch { /* ignore */ }
  }, [animMode]);

  const finishAll = () => {
    state.setVizPhase("center");
    const t1 = setTimeout(() => setCenterExiting(true), 2000);
    const t2 = setTimeout(() => state.setVizPhase("done"), 2500);
    timers.current.push(t1, t2);
  };

  // ── runCurrentStep ────────────────────────────────────────────────────────
  const runCurrentStep = (plan: BattlePlan, idx: number) => {
    if (idx >= plan.steps.length) {
      finishAll();
      return;
    }

    const step = plan.steps[idx];
    setStepIdx(idx);
    stepIdxRef.current = idx;

    if (step.type === "decompose") {
      setStepPhase("decompose");
      setWaitingForClick(false);
    } else if (step.type === "approach-wait") {
      // Show the waiting chip approaching with no partner — then auto-advance to decompose
      const tgs = tierGroupsFromPlan(plan);
      const tIdx = tgs.findIndex(g => g.tier === step.tier);
      if (tIdx >= 0) setTierIdx(tIdx);
      setPairInTier(0); // First remaining chip in the waiting side
      setStepPhase("approach-wait");
      setWaitingForClick(false);
      if (animModeRef.current === "auto") {
        timers.current.push(setTimeout(() => {
          runCurrentStep(plan, idx + 1);
        }, Math.round(1200 / animSpeedRef.current)));
      } else {
        pendingNextRef.current = { stepIdx: idx + 1 };
        setWaitingForClick(true);
      }
    } else {
      // "pair" step: compute tierIdx / pairInTier from the derived tierGroups
      const tgs = tierGroupsFromPlan(plan);
      const { tIdx, pIdx } = mapPairStepToPosition(plan, idx, tgs);
      setTierIdx(tIdx);
      setPairInTier(pIdx);
      setStepPhase("approach");
      setWaitingForClick(false);
    }
  };

  // ── startBattle ───────────────────────────────────────────────────────────
  const startBattle = (plan: BattlePlan) => {
    const tgs = tierGroupsFromPlan(plan);
    setBattlePlan(plan);
    battlePlanRef.current = plan;
    setTierGroups(tgs);

    const snapBil1 = state.snapshot?.bil1 ?? state.bil1;
    const snapBil2 = state.snapshot?.bil2 ?? state.bil2;
    const posVal = Math.max(0, snapBil1) + Math.max(0, snapBil2);
    const negVal = Math.max(0, -snapBil1) + Math.max(0, -snapBil2);
    setPosChipMap(buildInitialChipMap(posVal));
    setNegChipMap(buildInitialChipMap(negVal));

    playLaunch();
    state.setVizPhase("battle");
    runCurrentStep(plan, 0);
  };

  // ── resetAnimState ────────────────────────────────────────────────────────
  const resetAnimState = () => {
    clearTimers();
    setCenterExiting(false);
    setTierIdx(0);
    setPairInTier(0);
    setStepPhase("approach");
    setNeutralised(new Map());
    setPosChipMap(new Map());
    setNegChipMap(new Map());
    setWaitingForClick(false);
    setBattlePlan(null);
    setStepIdx(0);
    battlePlanRef.current = null;
    stepIdxRef.current = 0;
    pendingNextRef.current = null;
  };

  // ── handlePair ────────────────────────────────────────────────────────────
  const handlePair = () => {
    // Req 2.5: ignore call if animation is already in progress
    if (state.vizPhase !== "idle") return;
    const { bil1, bil2 } = state;
    resetAnimState();
    const tp = Math.max(0, bil1) + Math.max(0, bil2);
    const tn = Math.max(0, -bil1) + Math.max(0, -bil2);
    if (!(tp > 0 && tn > 0)) {
      // Either all same-sign (alliance) or one side is zero
      if (isAllianceCase(bil1, bil2)) {
        // Req 2.1, 2.2: same-sign, non-zero → snapshot + alliance phase
        state.setSnapshot({ bil1, bil2 });
        state.setVizPhase("alliance");
      } else {
        // Req 2.4: zero-case → done, no snapshot
        state.setVizPhase("done");
      }
      return;
    }
    // Req 2.3: battle-case → snapshot + start battle
    state.setSnapshot({ bil1, bil2 });
    startBattle(buildBattlePlan(bil1, bil2));
  };

  // ── replayAnimation ───────────────────────────────────────────────────────
  const replayAnimation = () => {
    const { snapshot } = state;
    if (!snapshot) return;
    resetAnimState();
    const { bil1, bil2 } = snapshot;
    if (isAllianceCase(bil1, bil2)) {
      state.setVizPhase("alliance");
      return;
    }
    const tp = Math.max(0, bil1) + Math.max(0, bil2);
    const tn = Math.max(0, -bil1) + Math.max(0, -bil2);
    if (!(tp > 0 && tn > 0)) { state.setVizPhase("done"); return; }
    startBattle(buildBattlePlan(bil1, bil2));
  };

  // ── handleDecomposeDone ───────────────────────────────────────────────────
  const handleDecomposeDone = () => {
    const plan = battlePlanRef.current;
    if (!plan) return;

    const currentStep = plan.steps[stepIdxRef.current];
    if (currentStep && currentStep.type === "decompose") {
      const targetSetter = currentStep.side === "pos" ? setPosChipMap : setNegChipMap;
      targetSetter(prev => {
        const next = new Map(prev);
        const srcTier = currentStep.tier;
        const dstTier = (srcTier / 10) as 1 | 10 | 100;
        const srcCount = next.get(srcTier) ?? 0;
        if (srcCount > 1) {
          next.set(srcTier, srcCount - 1);
        } else {
          next.delete(srcTier);
        }
        next.set(dstTier, (next.get(dstTier) ?? 0) + 10);
        return next;
      });
    }

    const nextIdx = stepIdxRef.current + 1;

    if (animModeRef.current === "auto") {
      timers.current.push(setTimeout(() => {
        runCurrentStep(plan, nextIdx);
      }, 100));
    } else {
      pendingNextRef.current = { stepIdx: nextIdx };
      setWaitingForClick(true);
    }
  };

  // ── handlePairDone ────────────────────────────────────────────────────────
  const handlePairDone = (neu: Map<1 | 10 | 100 | 1000, number>) => {
    setNeutralised(neu);
    setStepPhase("clear");

    const plan = battlePlanRef.current;
    if (!plan) return;

    const currentStep = plan.steps[stepIdxRef.current];
    const nextIdx = stepIdxRef.current + 1;

    // Delay chipMap update so the CSS "gone" transition (500ms) fully plays out
    // before React re-renders with a new count and re-keys the chip list.
    // chipMap update fires at 450ms, next step fires at 600ms.
    if (currentStep && currentStep.type === "pair") {
      const t = currentStep.tier;
      timers.current.push(setTimeout(() => {
        setPosChipMap(prev => {
          const next = new Map(prev);
          const count = next.get(t) ?? 0;
          if (count > 1) next.set(t, count - 1);
          else next.delete(t);
          return next;
        });
        setNegChipMap(prev => {
          const next = new Map(prev);
          const count = next.get(t) ?? 0;
          if (count > 1) next.set(t, count - 1);
          else next.delete(t);
          return next;
        });
      }, 450));
    }

    if (animModeRef.current === "auto") {
      timers.current.push(setTimeout(() => {
        if (nextIdx >= plan.steps.length) finishAll();
        else runCurrentStep(plan, nextIdx);
      }, 600));
    } else {
      if (nextIdx >= plan.steps.length) {
        finishAll();
      } else {
        pendingNextRef.current = { stepIdx: nextIdx };
        setWaitingForClick(true);
      }
    }
  };


  // ── handleNextClick ───────────────────────────────────────────────────────
  const handleNextClick = () => {
    if (!waitingForClick || !pendingNextRef.current) return;
    const { stepIdx: nextIdx } = pendingNextRef.current;
    pendingNextRef.current = null;
    setWaitingForClick(false);

    const plan = battlePlanRef.current;
    if (!plan) return;
    runCurrentStep(plan, nextIdx);
  };

  // ── handleAllianceDone ────────────────────────────────────────────────────
  const handleAllianceDone = () => {
    state.setVizPhase("center");
    setCenterExiting(false);
    const t1 = setTimeout(() => setCenterExiting(true), Math.round(2000 / animSpeedRef.current));
    const t2 = setTimeout(() => state.setVizPhase("done"), Math.round(2000 / animSpeedRef.current) + Math.round(500 / animSpeedRef.current));
    timers.current.push(t1, t2);
  };

  // ── handleReset ───────────────────────────────────────────────────────────
  const handleReset = () => {
    resetAnimState();
    setTierGroups([]);
    state.setBil1(0);
    state.setBil2(0);
    state.setVizPhase("idle");
    state.setSnapshot(null);
  };

  // ── currentDecomposeStep ─────────────────────────────────────────────────
  const currentDecomposeStep: BattleStep | null =
    battlePlan?.steps[stepIdx]?.type === "decompose"
      ? battlePlan.steps[stepIdx]
      : null;

  return {
    tierGroups, setTierGroups, tierIdx, pairInTier, stepPhase, neutralised,
    posChipMap, negChipMap,
    animSpeed, setAnimSpeed: (s) => { animSpeedRef.current = s; setAnimSpeedState(s); },
    animMode, setAnimMode, waitingForClick, centerExiting, setCenterExiting,
    handlePair, replayAnimation, handleNextClick, handlePairDone, handleReset,
    // New
    stepIdx,
    currentDecomposeStep,
    handleDecomposeDone,
    handleAllianceDone,
  };
}
