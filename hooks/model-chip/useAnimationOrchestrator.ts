"use client";

import { useState, useRef, useEffect } from "react";
import { buildBattlePlan } from "@/lib/model-chip/battlePlan";
import { useSound } from "@/hooks/useSound";
import type { ModelChipState } from "./useModelChipState";
import type { TierGroup, StepPhase, AnimMode } from "@/lib/model-chip/types";
import type { BattlePlan, BattleStep } from "@/lib/model-chip/battlePlan";

export interface AnimationOrchestratorOptions { state: ModelChipState }

export interface AnimationOrchestratorReturn {
  tierGroups: TierGroup[]; setTierGroups: (g: TierGroup[]) => void;
  tierIdx: number; pairInTier: number; stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const tiers: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];
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
    setWaitingForClick(false);
    setBattlePlan(null);
    setStepIdx(0);
    battlePlanRef.current = null;
    stepIdxRef.current = 0;
    pendingNextRef.current = null;
  };

  // ── handlePair ────────────────────────────────────────────────────────────
  const handlePair = () => {
    const { bil1, bil2 } = state;
    if (bil1 === 0 && bil2 === 0) return;
    resetAnimState();
    const tp = Math.max(0, bil1) + Math.max(0, bil2);
    const tn = Math.max(0, -bil1) + Math.max(0, -bil2);
    state.setSnapshot({ bil1, bil2 });
    if (!(tp > 0 && tn > 0)) { state.setVizPhase("done"); return; }
    startBattle(buildBattlePlan(bil1, bil2));
  };

  // ── replayAnimation ───────────────────────────────────────────────────────
  const replayAnimation = () => {
    const { snapshot } = state;
    if (!snapshot) return;
    resetAnimState();
    const { bil1, bil2 } = snapshot;
    const tp = Math.max(0, bil1) + Math.max(0, bil2);
    const tn = Math.max(0, -bil1) + Math.max(0, -bil2);
    if (!(tp > 0 && tn > 0)) { state.setVizPhase("done"); return; }
    startBattle(buildBattlePlan(bil1, bil2));
  };

  // ── handleDecomposeDone ───────────────────────────────────────────────────
  const handleDecomposeDone = () => {
    const plan = battlePlanRef.current;
    if (!plan) return;
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
    const nextIdx = stepIdxRef.current + 1;

    if (animModeRef.current === "auto") {
      timers.current.push(setTimeout(() => {
        if (nextIdx >= plan.steps.length) finishAll();
        else runCurrentStep(plan, nextIdx);
      }, 100));
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
    animSpeed, setAnimSpeed: (s) => { animSpeedRef.current = s; setAnimSpeedState(s); },
    animMode, setAnimMode, waitingForClick, centerExiting, setCenterExiting,
    handlePair, replayAnimation, handleNextClick, handlePairDone, handleReset,
    // New
    stepIdx,
    currentDecomposeStep,
    handleDecomposeDone,
  };
}
