/** Fase visualisasi utama halaman */
export type VizPhase = "idle" | "battle" | "center" | "done";

/** Mode animasi: otomatis atau klik per-pasangan */
export type AnimMode = "auto" | "click";

/** Satu fase dalam satu PairReactionStage */
export type StepPhase = "approach" | "clash" | "clear" | "decompose";

/** Satu tier group hasil dekomposisi pasangan netral */
export interface TierGroup {
  tier: 1 | 10 | 100 | 1000;
  count: number;
}

/** Props minimal yang dibagikan ke ArenaPanel dan CharacterColumn */
export interface BattleProgress {
  tierGroups: TierGroup[];
  tierIdx: number;
  pairInTier: number;
  stepPhase: StepPhase;
  neutralised: Map<1 | 10 | 100 | 1000, number>;
}
