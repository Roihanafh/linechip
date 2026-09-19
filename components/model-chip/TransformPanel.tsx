// components/model-chip/TransformPanel.tsx
"use client";

import { useEffect, useState } from "react";
import {
  AntibodyCharacter,
  VirusCharacter,
  CharacterChips,
  CHAR_NAMES,
  dominantPlace,
} from "@/components/game/CharacterSVGs";

export interface TransformPanelProps {
  /** Nilai bil2 asli sebelum konversi (dari snapshot). */
  bil2: number;
  /** Nilai setelah konversi: -bil2. */
  b_konversi: number;
  /** true saat panel sedang keluar menuju fase battle. */
  isExiting: boolean;
}

/**
 * TransformPanel — tampilan penuh konversi pengurang.
 *
 * Menampilkan karakter SVG asli (kiri) yang "berubah jenis" menjadi
 * karakter SVG lawannya (kanan), dilengkapi:
 *  - Nama karakter sebelum dan sesudah konversi
 *  - CharacterChips untuk visualisasi jumlah chip
 *  - Animasi: karakter kiri fade-out, karakter kanan fade-in
 *  - Formula a − b = a + (−b)
 */
export function TransformPanel({ bil2, b_konversi, isExiting }: TransformPanelProps) {
  const n = Math.abs(bil2);
  const isPositive = bil2 > 0;

  const fromType: "ab" | "ku" = isPositive ? "ab" : "ku";
  const toType: "ab" | "ku" = isPositive ? "ku" : "ab";
  const place = dominantPlace(n);
  const fromName = CHAR_NAMES[fromType][place];
  const toName = CHAR_NAMES[toType][place];

  const labelBefore = isPositive ? `+${n}` : `\u2212${n}`;
  const labelAfter  = isPositive ? `\u2212${n}` : `+${n}`;

  // Dynamic formula based on sign of bil2
  // bil2 > 0: a - b = a + (-b)   => pengurang positif dibalik jadi negatif
  // bil2 < 0: a - (-b) = a + b   => pengurang negatif dibalik jadi positif
  const formulaHeader = isPositive
    ? "a \u2212 b = a + (\u2212b)"
    : "a \u2212 (\u2212b) = a + b";
  const formulaArrow = isPositive
    ? "\u2212b\u00a0=\u00a0+(\u2212b)"
    : "\u2212(\u2212b)\u00a0=\u00a0+b";

  // Explanation text shown before animation starts
  const explainBefore = isPositive
    ? `Pengurang \u003cstrong\u003e${fromName}\u003c/strong\u003e (antibodi) akan berubah menjadi kuman`
    : `Pengurang \u003cstrong\u003e${fromName}\u003c/strong\u003e (kuman) akan berubah menjadi antibodi`;

  const tipeSumber = isPositive ? "antibodi" : "kuman";
  const tipeTujuan = isPositive ? "kuman" : "antibodi";
  const ariaLabel  = `Ubah ${n} chip ${tipeSumber} menjadi ${tipeTujuan}`;

  const [step, setStep] = useState<"before" | "flipping" | "after">("before");

  useEffect(() => {
    const t1 = setTimeout(() => setStep("flipping"), 600);
    const t2 = setTimeout(() => setStep("after"), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className={`mb-4 ${isExiting ? "chip-flip-exit" : "rise-in"}`}
      aria-label={ariaLabel}
    >
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">

        {/* Header */}
        <div
          className={`px-5 pt-4 pb-3 text-center border-b border-border/60 ${
            isPositive ? "bg-intblue-light/40" : "bg-intpink-light/40"
          }`}
        >
          <h2
            className="font-bold text-base text-slate-700 mb-0.5"
            style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
          >
            &#8596; Konversi Pengurang
          </h2>
          <p className="text-xs text-slate-400 font-mono">{formulaHeader}</p>
        </div>

        {/* Main conversion display */}
        <div className="p-5">
          <div className="flex items-start justify-center gap-3">

            {/* BEFORE */}
            <div
              className="flex flex-col items-center gap-2 flex-1 min-w-0"
              style={{
                opacity: step === "after" ? 0.35 : 1,
                transform: step === "after" ? "scale(0.85)" : "scale(1)",
                transition: "opacity 1.0s ease-out, transform 1.0s ease-out",
              }}
            >
              <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                fromType === "ab" ? "bg-intblue text-white" : "bg-intpink text-white"
              }`}>
                {tipeSumber}
              </div>
              <div className="w-20 h-20 drop-shadow-md">
                {fromType === "ab"
                  ? <AntibodyCharacter type={place} uid="tf-from" />
                  : <VirusCharacter type={place} uid="tf-from" />
                }
              </div>
              <p className={`text-xs font-bold text-center ${
                fromType === "ab" ? "text-intblue" : "text-intpink"
              }`} style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>
                {fromName}
              </p>
              <div className={`font-mono font-black text-xl ${
                fromType === "ab" ? "text-intblue" : "text-intpink"
              }`}>
                {labelBefore}
              </div>
              <div className="w-full max-w-[96px]">
                <CharacterChips value={n} type={fromType} size="xs" maxPerTier={9} rowSize={3} uidPrefix="tf-from" />
              </div>
            </div>

            {/* Arrow centre */}
            <div className="flex flex-col items-center gap-1.5 shrink-0 pt-6">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-lg font-black shadow-md transition-all duration-400 ${
                  step === "flipping"
                    ? "bg-gradient-to-br from-intblue to-intpink scale-125"
                    : "bg-slate-300 scale-100"
                }`}
              >
                &#8596;
              </div>
              <p className="text-[9px] text-slate-400 font-mono text-center leading-tight mt-0.5">
                {formulaArrow}
              </p>
              <div className="flex gap-1 mt-1">
                {(["before","flipping","after"] as const).map((s) => (
                  <div key={s} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    step === s ? "bg-intblue scale-125" : "bg-slate-200"
                  }`} />
                ))}
              </div>
            </div>

            {/* AFTER */}
            <div
              className="flex flex-col items-center gap-2 flex-1 min-w-0"
              style={{
                opacity: step === "before" ? 0 : step === "flipping" ? 0.55 : 1,
                transform: step === "before"
                  ? "scale(0.7) translateY(10px)"
                  : step === "flipping"
                  ? "scale(0.9)"
                  : "scale(1)",
                transition: "opacity 1.0s ease-out, transform 1.0s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                toType === "ab" ? "bg-intblue text-white" : "bg-intpink text-white"
              }`}>
                {tipeTujuan}
              </div>
              <div className="w-20 h-20 drop-shadow-md" style={{
                filter: step === "after" ? "none" : "grayscale(0.4)",
                transition: "filter 0.8s ease",
              }}>
                {toType === "ab"
                  ? <AntibodyCharacter type={place} uid="tf-to" />
                  : <VirusCharacter type={place} uid="tf-to" />
                }
              </div>
              <p className={`text-xs font-bold text-center ${
                toType === "ab" ? "text-intblue" : "text-intpink"
              }`} style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>
                {toName}
              </p>
              <div className={`font-mono font-black text-xl ${
                toType === "ab" ? "text-intblue" : "text-intpink"
              }`}>
                {labelAfter}
              </div>
              <div className="w-full max-w-[96px]">
                <CharacterChips value={n} type={toType} size="xs" maxPerTier={9} rowSize={3} uidPrefix="tf-to" />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className={`mt-4 rounded-xl px-4 py-2.5 text-center text-xs transition-all duration-700 ${
            step === "after"
              ? isPositive
                ? "bg-intpink-light border border-intpink/20 text-intpink"
                : "bg-intblue-light border border-intblue/20 text-intblue"
              : "bg-slate-50 border border-slate-100 text-slate-400"
          }`}>
            {step === "after" ? (
              <span>
                <strong>{fromName}</strong>{" "}
                <span className={`font-bold ${fromType === "ab" ? "text-intblue" : "text-intpink"}`}>{labelBefore}</span>
                {" "}dibalik menjadi{" "}
                <strong>{toName}</strong>{" "}
                <span className={`font-bold ${toType === "ab" ? "text-intblue" : "text-intpink"}`}>{labelAfter}</span>
              </span>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: explainBefore }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
