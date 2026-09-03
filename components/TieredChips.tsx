export type Tier = 1 | 10 | 100 | 1000;
export const TIERS: Tier[] = [1, 10, 100, 1000];
export const TIER_LABEL: Record<Tier, string> = { 1: "1", 10: "10", 100: "100", 1000: "1K" };

export const decompose = (value: number): { tier: Tier; count: number }[] => {
  const result: { tier: Tier; count: number }[] = [];
  let rem = Math.floor(Math.abs(value));
  for (const t of [1000, 100, 10, 1] as Tier[]) {
    const c = Math.floor(rem / t);
    if (c > 0) result.push({ tier: t, count: c });
    rem %= t;
  }
  return result;
};

const AB_CHIP: Record<Tier, string> = {
  1: "w-7 h-7 text-[10px] bg-intblue/20 border border-intblue/50 text-intblue",
  10: "w-9 h-9 text-xs bg-intblue/50 border-2 border-intblue text-white shadow-sm",
  100: "w-11 h-11 text-sm bg-intblue border-2 border-intblue-dark text-white shadow-md",
  1000: "w-14 h-14 text-sm bg-intblue-dark border-4 border-amber-400 text-white shadow-lg",
};

const KU_CHIP: Record<Tier, string> = {
  1: "w-7 h-7 text-[10px] bg-intpink/20 border border-intpink/50 text-intpink",
  10: "w-9 h-9 text-xs bg-intpink/50 border-2 border-intpink text-white shadow-sm",
  100: "w-11 h-11 text-sm bg-intpink border-2 border-intpink-dark text-white shadow-md",
  1000: "w-14 h-14 text-sm bg-intpink-dark border-4 border-amber-400 text-white shadow-lg",
};

export function chipClasses(type: "ab" | "ku", tier: Tier): string {
  return `rounded-full flex items-center justify-center font-bold select-none shrink-0 ${
    (type === "ab" ? AB_CHIP : KU_CHIP)[tier]
  }`;
}

export type AnimPhase = "idle" | "charging" | "exploding" | "settled";

interface DecomposedChipsProps {
  value: number;
  type: "ab" | "ku";
  phase?: AnimPhase;
  dimmed?: boolean;
  maxPerTier?: number;
}

export function DecomposedChips({
  value,
  type,
  phase = "idle",
  dimmed = false,
  maxPerTier = 9,
}: DecomposedChipsProps) {
  const groups = decompose(value);
  if (groups.length === 0) return null;

  const isCharging = phase === "charging";
  const isExploding = phase === "exploding";

  return (
    <div className="space-y-1.5">
      {groups.map(({ tier, count }) => {
        const shown = Math.min(count, maxPerTier);
        return (
          <div key={tier} className="flex flex-wrap gap-1 items-center">
            {Array.from({ length: shown }, (_, i) => (
              <div
                key={`${tier}-${i}`}
                className={`${chipClasses(type, tier)} transition-all duration-500 ${
                  dimmed ? "opacity-30 scale-90" : ""
                } ${isCharging ? "animate-pulse" : ""} ${
                  isExploding ? "scale-0 opacity-0" : ""
                }`}
              >
                {TIER_LABEL[tier]}
              </div>
            ))}
            {count > maxPerTier && (
              <span className="text-xs font-mono text-slate-400 ml-1">
                &times;{count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
