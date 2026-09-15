"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAnimationOrchestrator } from "./useAnimationOrchestrator";
import type { SubtractionState } from "./useSubtractionState";
import type { ModelChipState } from "./useModelChipState";
import type { SubtractionSnapshot } from "@/lib/model-chip/subtractionTypes";
import type { TierGroup, AnimMode, StepPhase } from "@/lib/model-chip/types";
import type { BattleStep } from "@/lib/model-chip/battlePlan";

export interface SubtractionOrchestratorOptions {
  state: SubtractionState;
}

export interface SubtractionOrchestratorReturn {
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
  animSpeed: number;
  setAnimSpeed: (s: number) => void;
  animMode: AnimMode;
  setAnimMode: (m: AnimMode) => void;
  waitingForClick: boolean;
  centerExiting: boolean;
  handlePairDone: (neu: Map<1 | 10 | 100 | 1000, number>) => void;
  handleReset: () => void;
  transformExiting: boolean;
  handleSubtract: () => void;
  handleNextClick: () => void;
  replayAnimation: () => void;
  stepIdx: number;
  currentDecomposeStep: BattleStep | null;
  handleDecomposeDone: () => void;
}

export function useSubtractionOrchestrator(
  opts: SubtractionOrchestratorOptions
): SubtractionOrchestratorReturn {
  const { state } = opts;

  const [transformExiting, setTransformExiting] = useState(false);
  const [animMode, setAnimModeState] = useState<AnimMode>("auto");
  const [waitingForTransform, setWaitingForTransform] = useState(false);

  const transformTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animSpeedRef = useRef(1);
  const animModeRef = useRef<AnimMode>("auto");
  // Snapshot ref — always up-to-date, safe to read inside setTimeout
  const snapshotRef = useRef<SubtractionSnapshot | null>(null);
  // Keep a ref to the latest replayAnimation from innerOrch so closures are fresh
  const innerReplayRef = useRef<(() => void) | null>(null);
  const innerSetVizPhaseRef = useRef<((p: "idle" | "battle" | "center" | "done") => void) | null>(null);

  animModeRef.current = animMode;

  // ── sessionStorage ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const s = sessionStorage.getItem("subtractionChipAnimMode");
      if (s === "click") setAnimModeState("click");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem("subtractionChipAnimMode", animMode); } catch { /* ignore */ }
  }, [animMode]);

  // ── adaptedState: stable object via refs so innerOrch always reads fresh data ─
  // We use a single stable object whose getters read from refs — this avoids
  // innerOrch capturing a stale closure over bil1/bil2/snapshot/vizPhase.
  const stateRef = useRef(state);
  stateRef.current = state;

  const adaptedState = useRef<ModelChipState>({
    get bil1() { return stateRef.current.bil1; },
    get bil2() { return 0; },
    setBil1: (v) => stateRef.current.setBil1(v),
    setBil2: () => {},
    get vizPhase() {
      const p = stateRef.current.vizPhase;
      if (p === "transform" || p === "idle") return "idle";
      return p as "battle" | "center" | "done";
    },
    setVizPhase: (p) => {
      // keep a ref we can call from setTimeout
      stateRef.current.setVizPhase(p);
    },
    get snapshot() {
      const s = stateRef.current.snapshot;
      if (!s) return null;
      return { bil1: s.bil1, bil2: s.bil2_converted };
    },
    setSnapshot: () => {},
  }).current;

  const innerOrch = useAnimationOrchestrator({ state: adaptedState });

  // Keep refs to inner functions fresh every render
  innerReplayRef.current = innerOrch.replayAnimation;
  animSpeedRef.current = innerOrch.animSpeed;

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      transformTimers.current.forEach(clearTimeout);
      transformTimers.current = [];
    };
  }, []);

  // ── beginBattle — reads snapshotRef so safe inside setTimeout ────────────
  const beginBattle = useCallback((snap: SubtractionSnapshot) => {
    setTransformExiting(false);
    setWaitingForTransform(false);

    const { bil1, bil2_converted } = snap;
    const tp = Math.max(0, bil1) + Math.max(0, bil2_converted);
    const tn = Math.max(0, -bil1) + Math.max(0, -bil2_converted);

    if (!(tp > 0 && tn > 0)) {
      stateRef.current.setVizPhase("done");
      return;
    }

    // Call via ref so we always get the latest version
    innerReplayRef.current?.();
  }, []); // no deps needed — all reads go through refs

  // ── handleSubtract ────────────────────────────────────────────────────────
  const handleSubtract = useCallback(() => {
    const { bil1, bil2 } = stateRef.current;
    if (bil1 === 0 && bil2 === 0) return;

    transformTimers.current.forEach(clearTimeout);
    transformTimers.current = [];
    setTransformExiting(false);
    setWaitingForTransform(false);

    const b_konversi = -bil2;
    const snap: SubtractionSnapshot = {
      bil1,
      bil2_original: bil2,
      bil2_converted: b_konversi,
    };

    stateRef.current.setSnapshot(snap);
    snapshotRef.current = snap;

    if (bil2 !== 0) {
      stateRef.current.setVizPhase("transform");

      if (animModeRef.current === "auto") {
        // Delay = time for transform animation to play (input flip ~700ms + panel ~750ms).
        // We wait for the "after" state in TransformPanel before transitioning.
        const delay = Math.round(900 / animSpeedRef.current);
        const t = setTimeout(() => {
          setTransformExiting(true);
          // Give chip-flip-exit animation (350ms) time to play before mounting ArenaPanel
          const t2 = setTimeout(() => beginBattle(snap), 400);
          transformTimers.current.push(t2);
        }, delay);
        transformTimers.current.push(t);
      } else {
        setWaitingForTransform(true);
      }
    } else {
      beginBattle(snap);
    }
  }, [beginBattle]);

  // ── handleNextClick ───────────────────────────────────────────────────────
  const handleNextClick = useCallback(() => {
    if (stateRef.current.vizPhase === "transform" && waitingForTransform) {
      setWaitingForTransform(false);
      setTransformExiting(true);
      const snap = snapshotRef.current;
      if (snap) {
        const t = setTimeout(() => beginBattle(snap), 400);
        transformTimers.current.push(t);
      }
    } else {
      innerOrch.handleNextClick();
    }
  }, [waitingForTransform, beginBattle, innerOrch]);

  // ── replayAnimation ───────────────────────────────────────────────────────
  const replayAnimation = useCallback(() => {
    const snap = stateRef.current.snapshot;
    if (!snap) return;

    transformTimers.current.forEach(clearTimeout);
    transformTimers.current = [];
    setTransformExiting(false);
    setWaitingForTransform(false);
    snapshotRef.current = snap;

    if (snap.bil2_original !== 0) {
      stateRef.current.setVizPhase("transform");

      if (animModeRef.current === "auto") {
        const delay = Math.round(900 / animSpeedRef.current);
        const t = setTimeout(() => {
          setTransformExiting(true);
          const t2 = setTimeout(() => beginBattle(snap), 400);
          transformTimers.current.push(t2);
        }, delay);
        transformTimers.current.push(t);
      } else {
        setWaitingForTransform(true);
      }
    } else {
      beginBattle(snap);
    }
  }, [beginBattle]);

  // ── setAnimMode ───────────────────────────────────────────────────────────
  const setAnimMode = useCallback((m: AnimMode) => {
    animModeRef.current = m;
    setAnimModeState(m);
    innerOrch.setAnimMode(m);
  }, [innerOrch]);

  const combinedWaitingForClick = waitingForTransform || innerOrch.waitingForClick;

  return {
    tierGroups: innerOrch.tierGroups,
    tierIdx: innerOrch.tierIdx,
    pairInTier: innerOrch.pairInTier,
    stepPhase: innerOrch.stepPhase,
    neutralised: innerOrch.neutralised,
    animSpeed: innerOrch.animSpeed,
    setAnimSpeed: (s) => {
      animSpeedRef.current = s;
      innerOrch.setAnimSpeed(s);
    },
    animMode,
    setAnimMode,
    waitingForClick: combinedWaitingForClick,
    centerExiting: innerOrch.centerExiting,
    handlePairDone: innerOrch.handlePairDone,
    handleReset: () => {
      transformTimers.current.forEach(clearTimeout);
      transformTimers.current = [];
      setTransformExiting(false);
      setWaitingForTransform(false);
      snapshotRef.current = null;
      innerOrch.handleReset();
    },
    transformExiting,
    handleSubtract,
    handleNextClick,
    replayAnimation,
    stepIdx: innerOrch.stepIdx,
    currentDecomposeStep: innerOrch.currentDecomposeStep,
    handleDecomposeDone: innerOrch.handleDecomposeDone,
  };
}
