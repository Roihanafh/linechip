// components/model-chip/ArenaCenter.tsx
"use client";

import { AntibodyCharacter, VirusCharacter, dominantPlace } from "@/components/game/CharacterSVGs";

interface ArenaCenterProps {
  s1Type: "ab" | "ku";
  s2Type: "ab" | "ku";
  s1Place: ReturnType<typeof dominantPlace>;
  s2Place: ReturnType<typeof dominantPlace>;
  pairs: number;
  remaining: number;
  centerExiting: boolean;
  s1: number;
  s2: number;
}

export function ArenaCenter({
  s1Type, s2Type, s1Place, s2Place,
  pairs, remaining, centerExiting, s1, s2,
}: ArenaCenterProps) {
  const pairsDisplay = Math.min(pairs, 6);

  return (
    <div className={`${centerExiting ? "reaction-center-out" : "reaction-center-in"}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-intblue/5 blur-2xl" />
      </div>
      <div className="flex items-center justify-center gap-6">
        {/* Left side */}
        <div className={`flex flex-col items-center gap-2 ${centerExiting ? "chip-fly-left" : ""}`}>
          <div className="flex gap-1 justify-center flex-wrap max-w-[140px]">
            {Array.from({ length: pairsDisplay }, (_, i) => (
              <div key={i} className="w-10 h-10 shrink-0">
                {s1Type === "ab"
                  ? <AntibodyCharacter type={s1Place} uid={`cr-s1-${i}`} />
                  : <VirusCharacter type={s1Place} uid={`cr-s1-${i}`} />}
              </div>
            ))}
          </div>
          {pairs > pairsDisplay && (
            <span className={`font-mono text-[10px] font-bold ${s1 >= 0 ? "text-intblue" : "text-intpink"}`}>
              ×{pairs.toLocaleString("id-ID")}
            </span>
          )}
        </div>

        {/* Center burst */}
        <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-slate-300/60 reaction-burst" style={{ animationDelay: "0ms" }} />
          <div className="absolute inset-0 rounded-full border-2 border-intblue/30 reaction-burst" style={{ animationDelay: "400ms" }} />
          <div className="absolute inset-0 rounded-full border-2 border-intpink/25 reaction-burst" style={{ animationDelay: "800ms" }} />
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-intblue via-white to-intpink opacity-70 blur-[2px]" />
          <span className="absolute font-bold text-xl text-slate-700 drop-shadow select-none">✕</span>
        </div>

        {/* Right side */}
        <div className={`flex flex-col items-center gap-2 ${centerExiting ? "chip-fly-right" : ""}`}>
          <div className="flex gap-1 justify-center flex-wrap max-w-[140px]">
            {Array.from({ length: pairsDisplay }, (_, i) => (
              <div key={i} className="w-10 h-10 shrink-0">
                {s2Type === "ab"
                  ? <AntibodyCharacter type={s2Place} uid={`cr-s2-${i}`} />
                  : <VirusCharacter type={s2Place} uid={`cr-s2-${i}`} />}
              </div>
            ))}
          </div>
          {pairs > pairsDisplay && (
            <span className={`font-mono text-[10px] font-bold ${s2 >= 0 ? "text-intblue" : "text-intpink"}`}>
              ×{pairs.toLocaleString("id-ID")}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex justify-center mt-5">
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-intblue" />
          <span className="font-mono text-[11px] text-slate-600">
            {pairs.toLocaleString("id-ID")} zero-pair dinetralkan
          </span>
          <div className="w-2 h-2 rounded-full bg-intpink" />
        </div>
      </div>
      {remaining !== 0 ? (
        <div className="flex justify-center mt-3">
          <span className={`font-mono text-sm font-bold ${remaining > 0 ? "text-intblue" : "text-intpink"}`}>
            Sisa:{" "}
            {remaining > 0
              ? `+${remaining.toLocaleString("id-ID")}`
              : remaining.toLocaleString("id-ID")}
          </span>
        </div>
      ) : (
        <p className="text-center font-mono text-sm font-bold text-emerald-600 mt-3">= 0 · Tepat Netral!</p>
      )}
    </div>
  );
}
