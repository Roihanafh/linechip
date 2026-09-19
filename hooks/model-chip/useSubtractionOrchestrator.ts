"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAnimationOrchestrator, isAllianceCase } from "./useAnimationOrchestrator";
import type { SubtractionState } from "./useSubtractionState";
import type { ModelChipState } from "./useModelChipState";
import type { SubtractionSnapshot, VizPhaseSub } from "@/lib/model-chip/subtractionTypes";
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
  posChipMap: Map<1 | 10 | 100 | 1000, number>;
  negChipMap: Map<1 | 10 | 100 | 1000, number>;
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
  handleAllianceSub: () => void;
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
      // "alliance" is never reached in the subtraction path
      stateRef.current.setVizPhase(p as VizPhaseSub);
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

  // ── beginAlliance — reads snapshotRef so safe inside setTimeout ─────────
  const beginAlliance = useCallback((snap: SubtractionSnapshot) => {
    setTransformExiting(false);
    setWaitingForTransform(false);
    snapshotRef.current = snap;
    stateRef.current.setVizPhase("alliance");
  }, []); // no deps needed — all reads go through refs

  // ── handleAllianceSub ─────────────────────────────────────────────────────
  const handleAllianceSub = useCallback(() => {
    stateRef.current.setVizPhase("center");
    const t1 = setTimeout(() => {
      stateRef.current.setVizPhase("done");
    }, Math.round(2000 / animSpeedRef.current) + Math.round(500 / animSpeedRef.current));
    transformTimers.current.push(t1);
  }, []);

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

    // Req 2.1, 2.2: detect alliance case (both same sign, non-zero after conversion)
    if (isAllianceCase(bil1, b_konversi)) {
      if (bil2 !== 0) {
        stateRef.current.setVizPhase("transform");

          const delay = Math.round(4000 / animSpeedRef.current);
          const t = setTimeout(() => {
            setTransformExiting(true);
            const t2 = setTimeout(() => beginAlliance(snap), 400);
            transformTimers.current.push(t2);
          }, delay);
          transformTimers.current.push(t);
      } else {
        // isAllianceCase(x, 0) is always false — safety guard only
        stateRef.current.setVizPhase("done");
      }
      return;
    }

    // Non-alliance (battle) path — unchanged
    if (bil2 !== 0) {
      stateRef.current.setVizPhase("transform");

        // Delay = time for transform animation to play (input flip ~700ms + panel ~750ms).
        // We wait for the "after" state in TransformPanel before transitioning.
        const delay = Math.round(4000 / animSpeedRef.current);
        const t = setTimeout(() => {
          setTransformExiting(true);
          // Give chip-flip-exit animation (350ms) time to play before mounting ArenaPanel
          const t2 = setTimeout(() => beginBattle(snap), 400);
          transformTimers.current.push(t2);
        }, delay);
        transformTimers.current.push(t);
    } else {
      beginBattle(snap);
    }
  }, [beginBattle, beginAlliance]);

  // ── handleNextClick ───────────────────────────────────────────────────────
  const handleNextClick = useCallback(() => {
    if (stateRef.current.vizPhase === "transform" && waitingForTransform) {
      setWaitingForTransform(false);
      setTransformExiting(true);
      const snap = snapshotRef.current;
      if (snap) {
        if (isAllianceCase(snap.bil1, snap.bil2_converted)) {
          const t = setTimeout(() => beginAlliance(snap), 400);
          transformTimers.current.push(t);
        } else {
          const t = setTimeout(() => beginBattle(snap), 400);
          transformTimers.current.push(t);
        }
      }
    } else {
      innerOrch.handleNextClick();
    }
  }, [waitingForTransform, beginAlliance, beginBattle, innerOrch]);

  // ── replayAnimation ───────────────────────────────────────────────────────
  const replayAnimation = useCallback(() => {
    const snap = stateRef.current.snapshot;
    if (!snap) return;

    transformTimers.current.forEach(clearTimeout);
    transformTimers.current = [];
    setTransformExiting(false);
    setWaitingForTransform(false);
    snapshotRef.current = snap;

    if (isAllianceCase(snap.bil1, snap.bil2_converted)) {
      if (snap.bil2_original !== 0) {
        stateRef.current.setVizPhase("transform");
          const delay = Math.round(4000 / animSpeedRef.current);
          const t = setTimeout(() => {
            setTransformExiting(true);
            const t2 = setTimeout(() => beginAlliance(snap), 400);
            transformTimers.current.push(t2);
          }, delay);
          transformTimers.current.push(t);
      } else {
        // isAllianceCase(x, 0) is false, so this is unreachable — safety guard
        beginAlliance(snap);
      }
      return;
    }

    if (snap.bil2_original !== 0) {
      stateRef.current.setVizPhase("transform");

        const delay = Math.round(4000 / animSpeedRef.current);
        const t = setTimeout(() => {
          setTransformExiting(true);
          const t2 = setTimeout(() => beginBattle(snap), 400);
          transformTimers.current.push(t2);
        }, delay);
        transformTimers.current.push(t);
    } else {
      beginBattle(snap);
    }
  }, [beginBattle, beginAlliance]);

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
    posChipMap: innerOrch.posChipMap,
    negChipMap: innerOrch.negChipMap,
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
      stateRef.current.setBil2(0);
      innerOrch.handleReset();
    },
    transformExiting,
    handleSubtract,
    handleNextClick,
    replayAnimation,
    stepIdx: innerOrch.stepIdx,
    currentDecomposeStep: innerOrch.currentDecomposeStep,
    handleDecomposeDone: innerOrch.handleDecomposeDone,
    handleAllianceSub,
  };
}
