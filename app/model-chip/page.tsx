"use client";

import { useState } from "react";
import Link from "next/link";
import { DecomposedChips, chipClasses, TIERS, TIER_LABEL } from "@/components/TieredChips";

export default function ModelChipPage() {
  const [pos, setPos] = useState(0);
  const [neg, setNeg] = useState(0);
  const [paired, setPaired] = useState(false);

  const pairs = Math.min(pos, neg);
  const remaining = pos - neg;

  const handlePosChange = (val: string) => {
    const n = Math.max(0, Math.min(9999, parseInt(val) || 0));
    setPos(n);
    setPaired(false);
  };

  const handleNegChange = (val: string) => {
    const n = Math.max(0, Math.min(9999, parseInt(val) || 0));
    setNeg(n);
    setPaired(false);
  };

  const handlePair = () => setPaired(true);
  const reset = () => {
    setPos(0);
    setNeg(0);
    setPaired(false);
  };

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/materi" className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Materi / Simulasi</p>
            <h1 className="font-bold text-2xl text-[#0f172a]" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Model Chip Zero-Pair</h1>
          </div>
        </div>

        <div className="bg-intblue-light border border-intblue/20 rounded-2xl p-4 mb-6">
          <p className="text-sm text-intblue">
            <strong>Cara kerja:</strong> Masukkan nilai chip positif (antibodi 🔵) dan negatif (kuman 🔴). Chip secara otomatis ditampilkan dalam tingkatan <strong>1K / 100 / 10 / 1</strong>. Satu pasang berbeda = nol. Klik <strong>Pasangkan</strong> untuk melihat hasilnya!
          </p>
        </div>

        {/* Number inputs */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Positive input */}
          <div className="bg-white rounded-2xl border-2 border-intblue/25 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-intblue rounded-xl flex items-center justify-center text-white font-bold text-lg">+</div>
              <div>
                <p className="font-bold text-lg text-intblue" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Chip Positif</p>
                <p className="text-xs text-slate-400">Antibodi (0&ndash;9.999)</p>
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={9999}
              value={pos === 0 ? "" : pos}
              placeholder="0"
              onChange={(e) => handlePosChange(e.target.value)}
              className="w-full border-2 border-intblue/30 focus:border-intblue rounded-xl px-4 py-4 text-4xl font-mono font-bold text-intblue outline-none transition-colors text-center bg-intblue-light/30 focus:bg-white"
            />
            <div className="mt-3 min-h-12">
              {pos > 0 && paired && pairs > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-slate-400 mb-1">Dinetralkan ({pairs.toLocaleString("id-ID")})</p>
                  <DecomposedChips value={pairs} type="ab" dimmed />
                </div>
              )}
              {pos > 0 && (
                <div className={paired && pairs > 0 ? "mt-1.5" : ""}>
                  {paired && pairs > 0 && pos - pairs > 0 && (
                    <p className="text-[10px] text-intblue font-semibold mb-1">
                      Sisa (+{(pos - pairs).toLocaleString("id-ID")})
                    </p>
                  )}
                  <DecomposedChips
                    value={paired ? Math.max(0, pos - pairs) : pos}
                    type="ab"
                    maxPerTier={9}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Negative input */}
          <div className="bg-white rounded-2xl border-2 border-intpink/25 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-intpink rounded-xl flex items-center justify-center text-white font-bold text-lg">&#8722;</div>
              <div>
                <p className="font-bold text-lg text-intpink" style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}>Chip Negatif</p>
                <p className="text-xs text-slate-400">Kuman (0&ndash;9.999)</p>
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={9999}
              value={neg === 0 ? "" : neg}
              placeholder="0"
              onChange={(e) => handleNegChange(e.target.value)}
              className="w-full border-2 border-intpink/30 focus:border-intpink rounded-xl px-4 py-4 text-4xl font-mono font-bold text-intpink outline-none transition-colors text-center bg-intpink-light/30 focus:bg-white"
            />
            <div className="mt-3 min-h-12">
              {neg > 0 && paired && pairs > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-slate-400 mb-1">Dinetralkan ({pairs.toLocaleString("id-ID")})</p>
                  <DecomposedChips value={pairs} type="ku" dimmed />
                </div>
              )}
              {neg > 0 && (
                <div className={paired && pairs > 0 ? "mt-1.5" : ""}>
                  {paired && pairs > 0 && neg - pairs > 0 && (
                    <p className="text-[10px] text-intpink font-semibold mb-1">
                      Sisa (&#8722;{(neg - pairs).toLocaleString("id-ID")})
                    </p>
                  )}
                  <DecomposedChips
                    value={paired ? Math.max(0, neg - pairs) : neg}
                    type="ku"
                    maxPerTier={9}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tier legend */}
        <div className="bg-white rounded-2xl border border-border p-3 mb-4 flex flex-wrap gap-x-4 gap-y-2 items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tingkatan:</span>
          {TIERS.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <div className={chipClasses("ab", t)}>{TIER_LABEL[t]}</div>
              <span className="text-xs text-slate-400">= {t.toLocaleString("id-ID")}</span>
            </div>
          ))}
        </div>

        {/* Zero-pairs after pairing */}
        {paired && pairs > 0 && (
          <div className="bg-white rounded-2xl border border-border p-4 mb-4">
            <p className="text-xs font-semibold text-slate-400 mb-2">
              Zero-pair dinetralkan —{" "}
              <span className="font-mono text-slate-600">{pairs.toLocaleString("id-ID")} nilai</span> saling meniadakan
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <DecomposedChips value={pairs} type="ab" dimmed maxPerTier={5} />
              <span className="text-slate-400 text-sm font-bold">+</span>
              <DecomposedChips value={pairs} type="ku" dimmed maxPerTier={5} />
              <span className="text-slate-400 text-sm">=</span>
              <span className="font-mono font-bold text-success text-lg">0</span>
            </div>
          </div>
        )}

        {/* Result panel */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                <span className="font-mono font-bold text-intblue">{pos.toLocaleString("id-ID")}</span> antibodi
                <span className="text-slate-400 mx-2">+</span>
                <span className="font-mono font-bold text-intpink">{neg.toLocaleString("id-ID")}</span> kuman
              </p>
              {paired && pairs > 0 && (
                <p className="text-xs text-slate-400">
                  {pairs.toLocaleString("id-ID")} zero-pair dinetralkan &rarr; sisa{" "}
                  {Math.abs(remaining).toLocaleString("id-ID")}{" "}
                  {remaining >= 0 ? "antibodi (positif)" : "kuman (negatif)"}
                </p>
              )}
            </div>
            <div
              className={`min-w-[80px] text-center px-6 py-3 rounded-2xl border-2 transition-all ${
                paired
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
                  paired
                    ? remaining > 0
                      ? "text-intblue"
                      : remaining < 0
                      ? "text-intpink"
                      : "text-success"
                    : "text-slate-200"
                }`}
                style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
              >
                {paired
                  ? remaining > 0
                    ? `+${remaining}`
                    : remaining === 0
                    ? "0"
                    : remaining
                  : "?"}
              </p>
            </div>
          </div>

          {(pos > 0 || neg > 0) && (
            <div className="bg-surface rounded-xl p-3 text-center font-mono text-sm mb-4">
              <span className="text-intblue font-bold">+{pos}</span>
              <span className="text-slate-400 mx-2">+</span>
              <span className="text-intpink font-bold">(&#8722;{neg})</span>
              <span className="text-slate-400 mx-2">=</span>
              <span
                className={`font-bold text-lg ${
                  paired
                    ? remaining > 0
                      ? "text-intblue"
                      : remaining < 0
                      ? "text-intpink"
                      : "text-success"
                    : "text-slate-300"
                }`}
              >
                {paired
                  ? remaining > 0
                    ? `+${remaining}`
                    : remaining === 0
                    ? "0 ✓"
                    : remaining
                  : "?"}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePair}
              disabled={pos === 0 && neg === 0}
              className="flex-1 border-2 border-intblue text-intblue font-bold py-3 rounded-xl hover:bg-intblue hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Pasangkan Otomatis
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 border border-border text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Link href="/materi" className="text-sm text-slate-400 hover:text-intblue transition-colors">
            ← Kembali
          </Link>
          <Link
            href="/game-virus"
            className="bg-intblue text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-intblue-dark transition-colors flex items-center gap-2"
          >
            Main Game 🎮
          </Link>
        </div>
      </div>
    </div>
  );
}