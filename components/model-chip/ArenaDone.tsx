// components/model-chip/ArenaDone.tsx
"use client";

import {
  AntibodyCharacter,
  VirusCharacter,
  CharacterChips,
  dominantPlace,
} from "@/components/game/CharacterSVGs";

interface ArenaDoneProps {
  s1: number;
  s2: number;
  s1Paired: number;
  s2Paired: number;
  s1Remaining: number;
  s2Remaining: number;
  remaining: number;
}

export function ArenaDone({
  s1, s2, s1Paired, s2Paired, s1Remaining, s2Remaining,
  remaining,
}: ArenaDoneProps) {
  const isAllianceCase = (s1 > 0 && s2 > 0) || (s1 < 0 && s2 < 0);

  return (
    <>
      {isAllianceCase ? (
        (() => {
          const faction: "ab" | "ku" = s1 > 0 ? "ab" : "ku";
          const totalValue = Math.abs(s1) + Math.abs(s2);
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${faction === "ab" ? "bg-intblue" : "bg-intpink"}`} />
                <span className={`font-mono text-[10px] ${faction === "ab" ? "text-intblue" : "text-intpink"} uppercase tracking-wide font-bold`}>
                  Total {faction === "ab" ? "Antibodi" : "Kuman"} {faction === "ab" ? "+" : "−"}{Math.abs(s1 + s2)}
                </span>
              </div>
              <CharacterChips
                value={totalValue}
                type={faction}
                phase="idle"
                size="xs"
                maxPerTier={12}
                uidPrefix="done-alliance"
              />
            </div>
          );
        })()
      ) : (
        <div className="flex flex-col gap-3">
          {/* Neutralised chips from both sides */}
          {(s1Paired > 0 || s2Paired > 0) && (
            <div className="flex flex-col gap-1">
              <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide">
                Dinetralkan: {s1Paired + s2Paired}
              </p>
              <div className="flex gap-2 flex-wrap">
                {s1Paired > 0 && (
                  <CharacterChips
                    value={s1Paired}
                    type={s1 > 0 ? "ab" : "ku"}
                    phase="exploding"
                    size="xs"
                    maxPerTier={6}
                    uidPrefix="done-b1-pair"
                  />
                )}
                {s2Paired > 0 && (
                  <CharacterChips
                    value={s2Paired}
                    type={s2 > 0 ? "ab" : "ku"}
                    phase="exploding"
                    size="xs"
                    maxPerTier={6}
                    uidPrefix="done-b2-pair"
                  />
                )}
              </div>
            </div>
          )}
          {/* Winner chips */}
          {remaining !== 0 && (() => {
            const winFaction: "ab" | "ku" = remaining > 0 ? "ab" : "ku";
            const winValue = Math.abs(remaining);
            const winColor = remaining > 0 ? "text-intblue" : "text-intpink";
            const winSign = remaining > 0 ? "+" : "−";
            return (
              <div className="flex flex-col gap-1">
                <p className={`text-[9px] ${winColor} font-mono font-bold uppercase tracking-wide`}>
                  Sisa {winSign}{winValue}
                </p>
                <CharacterChips
                  value={winValue}
                  type={winFaction}
                  phase="idle"
                  size="xs"
                  maxPerTier={12}
                  uidPrefix="done-battle-rem"
                />
              </div>
            );
          })()}
        </div>
      )}
      {/* Bottom Sisa / Tepat nol section — unchanged */}
      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-4 animate-fade-slide-in">
        {remaining !== 0 ? (
          <>
            <div className="w-12 h-12 victory-pop">
              {remaining > 0
                ? <AntibodyCharacter type={dominantPlace(remaining)} uid="arena-result" />
                : <VirusCharacter type={dominantPlace(Math.abs(remaining))} uid="arena-result" />}
            </div>
            <div className="text-center">
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">Sisa</p>
              <p className={`font-mono font-black text-2xl ${remaining > 0 ? "text-intblue" : "text-intpink"}`}>
                {remaining > 0 ? `+${remaining.toLocaleString("id-ID")}` : remaining.toLocaleString("id-ID")}
              </p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-3xl mb-1">🎉</p>
            <p className="font-mono font-black text-success text-2xl">0</p>
            <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wide">Tepat nol!</p>
          </div>
        )}
      </div>
    </>
  );
}
