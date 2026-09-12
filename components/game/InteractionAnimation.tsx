// components/game/InteractionAnimation.tsx
// Interaction classification and animation orchestration for the game-virus page.
//
// Task 8.1: classifyInteraction pure function and its types.
// Task 8.7: InteractionAnimation component.

"use client";

import { useEffect, useRef } from "react";
import { dominantPlace, type PlaceValue } from "./CharacterSVGs";
import { BattleStage } from "./BattleStage";
import { AllianceStage } from "./AllianceStage";

// ─── Types ──────────────────────────────────────────────────────────────────

export type InteractionType = "battle" | "alliance";

export interface InteractionConfig {
  type: InteractionType;
  /** Dominant tier of the positive (antibody) side — or bil1 in alliance */
  abType: PlaceValue;
  /** Dominant tier of the negative (virus) side — or bil2 in alliance */
  kuType: PlaceValue;
  /** Only present for alliance: which faction both characters belong to */
  faction?: "ab" | "ku";
  /** Only present for battle: true when bil1 + bil2 === 0 */
  isPerfectNeutralization?: boolean;
}

// ─── classifyInteraction ─────────────────────────────────────────────────────

/**
 * Determines the interaction type and configuration from two integer values.
 *
 * Rules:
 * - Either value === 0 → throws (guard against invalid game state)
 * - Signs differ       → `"battle"`; sets `isPerfectNeutralization` if sum is 0
 * - Both positive      → `"alliance"` with faction `"ab"`
 * - Both negative      → `"alliance"` with faction `"ku"`
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export function classifyInteraction(bil1: number, bil2: number): InteractionConfig {
  if (bil1 === 0 || bil2 === 0) {
    throw new Error("classifyInteraction: neither value may be zero");
  }

  const signsMatch = (bil1 > 0) === (bil2 > 0);

  if (!signsMatch) {
    // Tanda berbeda → Battle
    const posVal = bil1 > 0 ? bil1 : bil2;
    const negVal = bil1 < 0 ? bil1 : bil2;
    return {
      type: "battle",
      abType: dominantPlace(posVal),
      kuType: dominantPlace(negVal),
      isPerfectNeutralization: bil1 + bil2 === 0,
    };
  }

  // Tanda sama → Alliance
  const faction: "ab" | "ku" = bil1 > 0 ? "ab" : "ku";
  return {
    type: "alliance",
    faction,
    abType: dominantPlace(bil1),
    kuType: dominantPlace(bil2),
  };
}

// ─── InteractionAnimation ─────────────────────────────────────────────────────

interface InteractionAnimationProps {
  bil1Value: number;
  bil2Value: number;
  onComplete: () => void;
  speed?: number;
}

/**
 * Orchestrates Battle or Alliance animation based on the signs of the two values.
 *
 * - Calls `classifyInteraction` once on mount to determine the animation type.
 * - Renders `<BattleStage>` (signs differ) or `<AllianceStage>` (same sign).
 * - Both stages are started automatically (`autoStart={true}`) with controls hidden.
 * - Respects `prefers-reduced-motion`: skips animation and calls `onComplete`
 *   after 200 ms instead.
 * - `onComplete` is guaranteed to fire exactly once via a ref guard.
 * - All pending `setTimeout` calls are cleared on unmount.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.1, 9.2
 */
export function InteractionAnimation({
  bil1Value,
  bil2Value,
  onComplete,
  speed,
}: InteractionAnimationProps) {
  // ── One-time classification on mount ──────────────────────────────────────
  // classifyInteraction throws for zero values; the caller (game-virus/page.tsx)
  // is expected to guard against that before mounting this component.
  const config = classifyInteraction(bil1Value, bil2Value);

  // ── Guard: call onComplete exactly once ───────────────────────────────────
  const called = useRef(false);
  function handleComplete() {
    if (!called.current) {
      called.current = true;
      onComplete();
    }
  }

  // ── Pending timers ref (reduced-motion path) ───────────────────────────────
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── prefers-reduced-motion: skip animation, call onComplete after 200ms ───
  // Requirement 9.2
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      const id = setTimeout(() => handleComplete(), 200);
      timers.current.push(id);
    }

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // handleComplete is stable within a single render; intentional omission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      aria-hidden="true"
      role="presentation"
      data-testid="interaction-animation"
    >
      {config.type === "battle" ? (
        <BattleStage
          antibodyType={config.abType}
          virusType={config.kuType}
          isPerfectNeutralization={config.isPerfectNeutralization}
          onComplete={handleComplete}
          autoStart={true}
          hideControls={true}
          speed={speed}
        />
      ) : (
        <AllianceStage
          bil1Value={bil1Value}
          bil2Value={bil2Value}
          faction={config.faction!}
          onComplete={handleComplete}
          autoStart={true}
          hideControls={true}
          speed={speed}
        />
      )}
    </div>
  );
}
