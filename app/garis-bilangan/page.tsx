"use client";

/**
 * app/garis-bilangan/page.tsx
 *
 * Upgraded number-line page using the NumberLineCanvas component
 * for canvas-based two-phase animation, replacing the previous SVG renderer.
 *
 * Retains the same input panel and layout conventions but:
 *  - Extends input range from [-10,10] to [-99,99]
 *  - Replaces SVG + manual step animation with NumberLineCanvas + runKey
 *  - Shows a richer narrative explanation panel after animation
 */

import { useState } from "react";
import Link from "next/link";
import NumberLineCanvas from "../../components/NumberLineCanvas";

export default function GarisBilanganPage() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [op, setOp] = useState<"+" | "-">("+");
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [isDone, setIsDone] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleHitung = () => {
    const res = op === "+" ? a + b : a - b;
    setResult(res);
    setIsDone(false);
    setRunKey((k) => k + 1);
  };

  const handleReset = () => {
    setResult(null);
    setIsDone(false);
    // NOT incrementing runKey — canvas stays in idle state
  };

  const changeA = (delta: number) => {
    setA((v) => Math.max(-99, Math.min(99, v + delta)));
    setResult(null);
    setIsDone(false);
  };

  const changeB = (delta: number) => {
    setB((v) => Math.max(-99, Math.min(99, v + delta)));
    setResult(null);
    setIsDone(false);
  };

  const changeOp = (o: "+" | "-") => {
    setOp(o);
    setResult(null);
    setIsDone(false);
  };

  // ── Narrative explanation ──────────────────────────────────────────────────

  const getExplanation = () => {
    if (!isDone || result === null) return null;

    const aStr = a > 0 ? `+${a}` : `${a}`;
    const bStr = b > 0 ? `+${b}` : `${b}`;
    const resStr = result > 0 ? `+${result}` : `${result}`;

    const phase1Dir = a > 0 ? "kanan" : a < 0 ? "kiri" : "diam";
    const phase1Desc =
      a === 0
        ? "Fase 1: Bilangan pertama adalah 0, jadi kita tetap di titik asal."
        : `Fase 1: Dari titik 0, bergerak ke ${phase1Dir} sebanyak ${Math.abs(a)} langkah menuju titik ${aStr}.`;

    let phase2Desc: string;
    if (op === "+") {
      const bDir = b >= 0 ? "kanan" : "kiri";
      phase2Desc =
        b === 0
          ? `Fase 2: Menambahkan 0 — posisi tetap di ${aStr}.`
          : `Fase 2: Dari titik ${aStr}, tambahkan ${bStr} dengan bergerak ke ${bDir} sebanyak ${Math.abs(b)} langkah.`;
    } else {
      // subtraction
      const actualDir = b >= 0 ? "kiri" : "kanan";
      const reason = b >= 0
        ? `mengurangi bilangan positif berarti bergerak ke kiri`
        : `mengurangi bilangan negatif berarti bergerak ke kanan`;
      phase2Desc =
        b === 0
          ? `Fase 2: Mengurangi 0 — posisi tetap di ${aStr}.`
          : `Fase 2: Dari titik ${aStr}, kurangi ${bStr} — ${reason} (${actualDir}) sebanyak ${Math.abs(b)} langkah.`;
    }

    const conclusion =
      result === 0
        ? `Kesimpulan: ${aStr} ${op} ${bStr} = 0 — kembali ke titik asal!`
        : `Kesimpulan: ${aStr} ${op} ${bStr} = ${resStr}.`;

    return { phase1Desc, phase2Desc, conclusion };
  };

  const explanation = getExplanation();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-3xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/materi"
            className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors"
            aria-label="Kembali ke Materi"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Materi / Simulasi</p>
            <h1
              className="font-bold text-2xl text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Simulasi Garis Bilangan
            </h1>
          </div>
        </div>

        {/* Input panel */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-500 mb-4">Susun Operasi</h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">

            {/* Number A */}
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1.5">Bilangan 1</p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => changeA(-1)}
                  className="w-8 h-8 bg-intblue-light text-intblue rounded-lg font-bold hover:bg-intblue hover:text-white transition-colors text-sm"
                  aria-label="Kurangi bilangan 1"
                >
                  −
                </button>
                <div
                  className={`w-16 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-xl border-2 select-none ${
                    a >= 0
                      ? "border-intblue bg-intblue-light text-intblue"
                      : "border-intpink bg-intpink-light text-intpink"
                  }`}
                >
                  {a > 0 ? `+${a}` : a}
                </div>
                <button
                  onClick={() => changeA(1)}
                  className="w-8 h-8 bg-intblue-light text-intblue rounded-lg font-bold hover:bg-intblue hover:text-white transition-colors text-sm"
                  aria-label="Tambah bilangan 1"
                >
                  +
                </button>
              </div>
            </div>

            {/* Operator */}
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1.5">Operasi</p>
              <div className="flex gap-2">
                {(["+", "-"] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => changeOp(o)}
                    className={`w-12 h-12 rounded-xl font-bold text-2xl transition-all ${
                      op === o
                        ? "bg-intblue text-white shadow-md"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                    aria-pressed={op === o}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Number B */}
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1.5">Bilangan 2</p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => changeB(-1)}
                  className="w-8 h-8 bg-intblue-light text-intblue rounded-lg font-bold hover:bg-intblue hover:text-white transition-colors text-sm"
                  aria-label="Kurangi bilangan 2"
                >
                  −
                </button>
                <div
                  className={`w-16 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-xl border-2 select-none ${
                    b >= 0
                      ? "border-intblue bg-intblue-light text-intblue"
                      : "border-intpink bg-intpink-light text-intpink"
                  }`}
                >
                  {b > 0 ? `+${b}` : b}
                </div>
                <button
                  onClick={() => changeB(1)}
                  className="w-8 h-8 bg-intblue-light text-intblue rounded-lg font-bold hover:bg-intblue hover:text-white transition-colors text-sm"
                  aria-label="Tambah bilangan 2"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Hitung + Reset */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={handleHitung}
              className="flex items-center gap-2 bg-intblue text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-intblue-dark transition-colors shadow-md"
            >
              ▶ Hitung
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 border border-border text-slate-600 font-semibold px-6 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-4">
          <NumberLineCanvas
            num1={a}
            num2={b}
            operation={op}
            runKey={runKey}
            onResult={(r) => {
              setResult(r);
              setIsDone(true);
            }}
          />
        </div>

        {/* Result panel */}
        {isDone && result !== null && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Hasil</p>
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span className={a >= 0 ? "text-intblue" : "text-intpink"}>{a > 0 ? `+${a}` : a}</span>
              {" "}{op}{" "}
              <span className={b >= 0 ? "text-intblue" : "text-intpink"}>{b > 0 ? `+${b}` : b}</span>
              {" "}={" "}
              <span
                className={
                  result > 0 ? "text-intblue" : result < 0 ? "text-intpink" : "text-success"
                }
              >
                {result > 0 ? `+${result}` : result}
              </span>
            </p>
            {result === 0 && (
              <p className="text-success text-sm font-medium mt-2">
                🔄 Kembali ke titik asal!
              </p>
            )}
          </div>
        )}

        {/* Narrative explanation */}
        {explanation && (
          <div className="bg-intblue-light border border-intblue/20 rounded-2xl p-5 mb-6 space-y-2 text-sm">
            <p className="text-intblue">{explanation.phase1Desc}</p>
            <p className="text-intblue">{explanation.phase2Desc}</p>
            <p className="font-bold text-intblue-dark">{explanation.conclusion}</p>
          </div>
        )}

        {/* Bottom nav */}
        <div className="flex justify-between items-center mt-4">
          <Link
            href="/materi"
            className="text-sm text-slate-400 hover:text-intblue transition-colors"
          >
            ← Kembali ke Materi
          </Link>
          <Link
            href="/intline-run"
            className="bg-intblue text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-intblue-dark transition-colors flex items-center gap-2"
          >
            Main Game 🎯
          </Link>
        </div>
      </div>
    </div>
  );
}
