"use client";

import { TIERS } from "@/components/TieredChips";
import {
  AntibodyCharacter,
  VirusCharacter,
  CHAR_NAMES,
  TIER_TO_PLACE,
} from "@/components/game/CharacterSVGs";

export function TierLegend() {
  return (
    <div className="bg-white rounded-2xl border border-border p-4 mb-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Tingkatan Karakter:</p>
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-intblue" />
          <span className="text-[10px] font-semibold text-intblue uppercase tracking-wide">Antibodi (positif +)</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TIERS.map((t) => {
            const place = TIER_TO_PLACE[t];
            return (
              <div key={t} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-intblue-light/40 border border-intblue/10">
                <div className="w-12 h-12"><AntibodyCharacter type={place} uid={`mc-leg-ab-${t}`} /></div>
                <span className="text-[10px] font-bold text-intblue">+{t.toLocaleString("id-ID")}</span>
                <span className="text-[8px] text-slate-500 text-center leading-tight">{CHAR_NAMES.ab[place]}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-intpink" />
          <span className="text-[10px] font-semibold text-intpink uppercase tracking-wide">Kuman (negatif -)</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TIERS.map((t) => {
            const place = TIER_TO_PLACE[t];
            return (
              <div key={t} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-intpink-light/40 border border-intpink/10">
                <div className="w-12 h-12"><VirusCharacter type={place} uid={`mc-leg-ku-${t}`} /></div>
                <span className="text-[10px] font-bold text-intpink">-{t.toLocaleString("id-ID")}</span>
                <span className="text-[8px] text-slate-500 text-center leading-tight">{CHAR_NAMES.ku[place]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
