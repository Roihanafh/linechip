"use client";

import { useState, useRef, useEffect } from "react";
import { buildTierGroups } from "@/lib/model-chip/tierUtils";
import { computeNextStep } from "@/lib/model-chip/stepMachine";
import { useSound } from "@/hooks/useSound";
import type { ModelChipState } from "./useModelChipState";
import type { TierGroup, StepPhase, AnimMode } from "@/lib/model-chip/types";

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
}

/** Requirements: 1.2, 1.3, 1.4, 1.6, 5.1–5.10 */
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

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animSpeedRef = useRef(1);
  const animModeRef = useRef<AnimMode>("auto");
  const tierGroupsRef = useRef<TierGroup[]>([]);
  const tierIdxRef = useRef(0);
  const pairInTierRef = useRef(0);
  const pendingNextRef = useRef<{ groups: TierGroup[]; tIdx: number; pIdx: number; neu: Map<1 | 10 | 100 | 1000, number> } | null>(null);

  animModeRef.current = animMode;
  animSpeedRef.current = animSpeed;
  tierGroupsRef.current = tierGroups;
  tierIdxRef.current = tierIdx;
  pairInTierRef.current = pairInTier;

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

  const runPair = (groups: TierGroup[], tIdx: number, pIdx: number, _neu: Map<1 | 10 | 100 | 1000, number>) => {
    if (tIdx >= groups.length) { finishAll(); return; }
    const group = groups[tIdx];
    if (pIdx >= group.count) { runPair(groups, tIdx + 1, 0, _neu); return; }
    setTierIdx(tIdx); setPairInTier(pIdx); setStepPhase("approach"); setWaitingForClick(false);
  };

  const startBattle = (groups: TierGroup[]) => {
    setTierGroups(groups); playLaunch(); state.setVizPhase("battle");
    runPair(groups, 0, 0, new Map());
  };

  const resetAnimState = () => {
    clearTimers(); setCenterExiting(false); setTierIdx(0); setPairInTier(0);
    setStepPhase("approach"); setNeutralised(new Map()); setWaitingForClick(false);
    pendingNextRef.current = null;
  };

  const handlePair = () => {
    const { bil1, bil2 } = state;
    if (bil1 === 0 && bil2 === 0) return;
    resetAnimState();
    const tp = Math.max(0, bil1) + Math.max(0, bil2);
    const tn = Math.max(0, -bil1) + Math.max(0, -bil2);
    state.setSnapshot({ bil1, bil2 });
    if (!(tp > 0 && tn > 0)) { state.setVizPhase("done"); return; }
    startBattle(buildTierGroups(Math.min(tp, tn)));
  };

  const replayAnimation = () => {
    const { snapshot } = state;
    if (!snapshot) return;
    resetAnimState();
    const tp = Math.max(0, snapshot.bil1) + Math.max(0, snapshot.bil2);
    const tn = Math.max(0, -snapshot.bil1) + Math.max(0, -snapshot.bil2);
    if (!(tp > 0 && tn > 0)) { state.setVizPhase("done"); return; }
    startBattle(buildTierGroups(Math.min(tp, tn)));
  };

  const handleNextClick = () => {
    if (!waitingForClick || !pendingNextRef.current) return;
    setWaitingForClick(false);
    const { groups, tIdx, pIdx, neu } = pendingNextRef.current;
    pendingNextRef.current = null;
    runPair(groups, tIdx, pIdx, neu);
  };

  const handlePairDone = (neu: Map<1 | 10 | 100 | 1000, number>) => {
    setNeutralised(neu); setStepPhase("clear");
    const groups = tierGroupsRef.current;
    const tIdx = tierIdxRef.current;
    const pIdx = pairInTierRef.current;
    const nextStep = computeNextStep(groups, tIdx, pIdx);
    if (animModeRef.current === "auto") {
      timers.current.push(setTimeout(() => {
        if (nextStep.type === "done") finishAll();
        else runPair(groups, nextStep.tIdx, nextStep.pIdx, neu);
      }, 100));
    } else {
      if (nextStep.type === "done") { finishAll(); }
      else { pendingNextRef.current = { groups, tIdx: nextStep.tIdx, pIdx: nextStep.pIdx, neu }; setWaitingForClick(true); }
    }
  };

  const handleReset = () => {
    resetAnimState(); setTierGroups([]);
    state.setBil1(0); state.setBil2(0); state.setVizPhase("idle"); state.setSnapshot(null);
  };

  return {
    tierGroups, setTierGroups, tierIdx, pairInTier, stepPhase, neutralised,
    animSpeed, setAnimSpeed: (s) => { animSpeedRef.current = s; setAnimSpeedState(s); },
    animMode, setAnimMode, waitingForClick, centerExiting, setCenterExiting,
    handlePair, replayAnimation, handleNextClick, handlePairDone, handleReset,
  };
}
