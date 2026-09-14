// components/model-chip/SubtractionResultPanel.tsx
"use client";

import {
  AntibodyCharacter,
  VirusCharacter,
  dominantPlace,
} from "@/components/game/CharacterSVGs";
import type { VizPhaseSub } from "@/lib/model-chip/subtractionTypes";

export interface SubtractionResultPanelProps {
  /** Minuend (bilangan yang dikurangi), ditampilkan di kiri persamaan */
  eqBil1: number;
  /** Pengurang asli sebelum konversi, ditampilkan sebagai `bil1 − bil2` */
  eqBil2Original: number;
  /** Sisa setelah neutralisasi zero-pair (≡ bil1 − bil2) */
  remaining: number;
  /** Fase visualisasi — "transform" diperlakukan sama dengan "idle" */
  vizPhase: VizPhaseSub;
  /** Jumlah zero-pair yang dinetralkan */
  pairs: number;
}

/**
 * Wrapper tipis di atas ResultPanel yang menampilkan persamaan dalam format
 * `bil1 − bil2 = hasil` alih-alih `bil1 + bil2 = hasil`.
 *
 * Semua logika warna, karakter, dan placeholder `?` identik dengan ResultPanel;
 * hanya operator dan nilai bil2 yang berbeda.
 */
export function SubtractionResultPanel({
  eqBil1,
  eqBil2Original,
  remaining,
  vizPhase,
  pairs,
}: SubtractionResultPanelProps) {
  // Narrowing: "transform" dan "idle" keduanya berarti hasil belum tampil
  const isDone = vizPhase === "done";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div>
          {/* Baris ringkasan di atas: +bil1 − bil2 */}
          <p className="text-sm font-medium text-slate-700 mb-1">
            <span
              className={`font-mono font-bold ${
                eqBil1 >= 0 ? "text-intblue" : "text-intpink"
              }`}
            >
              {eqBil1 >= 0
                ? `+${eqBil1.toLocaleString("id-ID")}`
                : eqBil1.toLocaleString("id-ID")}
            </span>
            <span className="text-slate-400 mx-2">−</span>
            <span
              className={`font-mono font-bold ${
                eqBil2Original >= 0 ? "text-intblue" : "text-intpink"
              }`}
            >
              {eqBil2Original >= 0
                ? `+${eqBil2Original.toLocaleString("id-ID")}`
                : `(${eqBil2Original.toLocaleString("id-ID")})`}
            </span>
          </p>

          {/* Deskripsi zero-pair setelah selesai */}
          {isDone && pairs > 0 && (
            <p className="text-xs text-slate-400">
              {pairs.toLocaleString("id-ID")} zero-pair dinetralkan → sisa{" "}
              <span
                className={
                  remaining > 0
                    ? "text-intblue font-semibold"
                    : remaining < 0
                    ? "text-intpink font-semibold"
                    : "text-success font-semibold"
                }
              >
                {remaining > 0
                  ? `+${remaining.toLocaleString("id-ID")} antibodi`
                  : remaining < 0
                  ? `${remaining.toLocaleString("id-ID")} kuman`
                  : "0 (netral)"}
              </span>
            </p>
          )}
        </div>

        {/* Karakter dan kotak hasil */}
        <div className="flex items-center gap-3">
          {isDone && remaining !== 0 && (
            <div className="w-12 h-12 victory-pop">
              {remaining > 0 ? (
                <AntibodyCharacter
                  type={dominantPlace(remaining)}
                  uid="mc-sub-result-char"
                />
              ) : (
                <VirusCharacter
                  type={dominantPlace(Math.abs(remaining))}
                  uid="mc-sub-result-char"
                />
              )}
            </div>
          )}
          <div
            className={`min-w-[80px] text-center px-6 py-3 rounded-2xl border-2 transition-all ${
              isDone
                ? remaining > 0
                  ? "border-intblue bg-intblue-light"
                  : remaining < 0
                  ? "border-intpink bg-intpink-light"
                  : "border-success bg-success/10"
                : "border-border bg-surface"
            }`}
          >
            <p className="text-xs text-slate-400 mb-0.5">Hasil</p>
            <p
              className={`font-bold text-3xl ${
                isDone
                  ? remaining > 0
                    ? "text-intblue"
                    : remaining < 0
                    ? "text-intpink"
                    : "text-success"
                  : "text-slate-200"
              }`}
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
            >
              {isDone
                ? remaining > 0
                  ? `+${remaining}`
                  : remaining === 0
                  ? "0"
                  : remaining
                : "?"}
            </p>
          </div>
        </div>
      </div>

      {/* Baris persamaan lengkap: bil1 − bil2 = hasil */}
      {(eqBil1 !== 0 || eqBil2Original !== 0) && (
        <div className="bg-surface rounded-xl p-3 text-center font-mono text-sm mb-4">
          <span
            className={`font-bold ${
              eqBil1 >= 0 ? "text-intblue" : "text-intpink"
            }`}
          >
            {eqBil1 >= 0
              ? `+${eqBil1.toLocaleString("id-ID")}`
              : eqBil1.toLocaleString("id-ID")}
          </span>
          <span className="text-slate-400 mx-2">−</span>
          <span
            className={`font-bold ${
              eqBil2Original >= 0 ? "text-intblue" : "text-intpink"
            }`}
          >
            {eqBil2Original >= 0
              ? `+${eqBil2Original.toLocaleString("id-ID")}`
              : `(${eqBil2Original.toLocaleString("id-ID")})`}
          </span>
          <span className="text-slate-400 mx-2">=</span>
          <span
            className={`font-bold ${
              isDone
                ? remaining > 0
                  ? "text-intblue"
                  : remaining < 0
                  ? "text-intpink"
                  : "text-success"
                : "text-slate-300"
            }`}
          >
            {isDone
              ? remaining > 0
                ? `+${remaining.toLocaleString("id-ID")}`
                : remaining.toLocaleString("id-ID")
              : "?"}
          </span>
        </div>
      )}
    </div>
  );
}
