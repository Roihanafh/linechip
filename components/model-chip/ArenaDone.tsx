// components/model-chip/ArenaDone.tsx
"use client";

import {
  AntibodyCharacter,
  VirusCharacter,
  CharacterChips,
  dominantPlace,
} from "@/components/game/CharacterSVGs";

interface SideInfo {
  sVal: number;
  sPaired: number;
  sRem: number;
  sType: "ab" | "ku";
  sColor: string;
  sSign: string;
  sDot: string;
  prefix: string;
  label: string;
}

interface ArenaDoneProps {
  s1: number;
  s2: number;
  s1Paired: number;
  s2Paired: number;
  s1Remaining: number;
  s2Remaining: number;
  s1Type: "ab" | "ku";
  s2Type: "ab" | "ku";
  s1Color: string;
  s2Color: string;
  s1Sign: string;
  s2Sign: string;
  s1Dot: string;
  s2Dot: string;
  remaining: number;
}

function DoneSide({ sVal, sPaired, sRem, sType, sColor, sSign, sDot, prefix, label }: SideInfo) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-2 h-2 rounded-full ${sDot}`} />
        <span className={`font-mono text-[10px] ${sColor} uppercase tracking-wide font-bold`}>
          {label} {sVal > 0 ? "Antibodi" : "Kuman"} {sSign}{sVal.toLocaleString("id-ID")}
        </span>
      </div>
      {sPaired > 0 && (
        <div>
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wide mb-1">Dinetralkan</p>
          <CharacterChips value={sPaired} type={sType} phase="exploding" size="xs" maxPerTier={9} uidPrefix={`${prefix}-pair`} />
        </div>
      )}
      {sRem > 0 && (
        <div>
          <p className={`text-[9px] ${sColor} font-mono font-bold uppercase tracking-wide mb-1`}>
            Sisa {sSign}{sRem.toLocaleString("id-ID")}
          </p>
          <CharacterChips value={sRem} type={sType} size="xs" maxPerTier={9} uidPrefix={`${prefix}-rem`} />
        </div>
      )}
      {sPaired > 0 && sRem === 0 && (
        <p className="text-[10px] text-slate-600 font-mono italic">semua dinetralkan</p>
      )}
    </div>
  );
}

export function ArenaDone({
  s1, s2, s1Paired, s2Paired, s1Remaining, s2Remaining,
  s1Type, s2Type, s1Color, s2Color, s1Sign, s2Sign, s1Dot, s2Dot, remaining,
}: ArenaDoneProps) {
  const sides: SideInfo[] = [
    { sVal: s1, sPaired: s1Paired, sRem: s1Remaining, sType: s1Type, sColor: s1Color, sSign: s1Sign, sDot: s1Dot, prefix: "done-b1", label: "Bil.1" },
    { sVal: s2, sPaired: s2Paired, sRem: s2Remaining, sType: s2Type, sColor: s2Color, sSign: s2Sign, sDot: s2Dot, prefix: "done-b2", label: "Bil.2" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {sides.map((side) => <DoneSide key={side.prefix} {...side} />)}
      </div>
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
