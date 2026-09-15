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
  // Raw string values driving the text inputs (allows transient "-" while typing)
  const [aStr, setAStr] = useState("3");
  const [bStr, setBStr] = useState("4");
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

  // Stepper: delta-based
  const changeA = (delta: number) => {
    setA((v) => {
      const next = Math.max(-99, Math.min(99, v + delta));
      setAStr(String(next));
      return next;
    });
    setResult(null);
    setIsDone(false);
  };

  // Typed input: raw string → parse → clamp
  const handleAInput = (raw: string) => {
    setAStr(raw);
    // Allow transient "-" while user is still typing
    if (raw === "-" || raw === "") { setResult(null); setIsDone(false); return; }
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) {
      setA(Math.max(-99, Math.min(99, n)));
      setResult(null);
      setIsDone(false);
    }
  };

  const commitA = () => {
    const n = parseInt(aStr, 10);
    const clamped = Number.isNaN(n) ? 0 : Math.max(-99, Math.min(99, n));
    setA(clamped);
    setAStr(String(clamped));
  };

  const changeB = (delta: number) => {
    setB((v) => {
      const next = Math.max(-99, Math.min(99, v + delta));
      setBStr(String(next));
      return next;
    });
    setResult(null);
    setIsDone(false);
  };

  const handleBInput = (raw: string) => {
    setBStr(raw);
    if (raw === "-" || raw === "") { setResult(null); setIsDone(false); return; }
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) {
      setB(Math.max(-99, Math.min(99, n)));
      setResult(null);
      setIsDone(false);
    }
  };

  const commitB = () => {
    const n = parseInt(bStr, 10);
    const clamped = Number.isNaN(n) ? 0 : Math.max(-99, Math.min(99, n));
    setB(clamped);
    setBStr(String(clamped));
  };

  const changeOp = (o: "+" | "-") => {
    setOp(o);
    setResult(null);
    setIsDone(false);
  };

  // ── Narrative explanation ──────────────────────────────────────────────────

  const getExplanation = () => {
    if (!isDone || result === null) return null;

    const aStr = a < 0 ? `(${a})` : `${a}`;
    const bStr = b < 0 ? `(${b})` : `${b}`;
    const resStr = result < 0 ? `(${result})` : `${result}`;

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
                <div className="relative">
                  {a < 0 && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-lg font-black pointer-events-none select-none z-10 text-intpink">
                      (
                    </span>
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    value={aStr}
                    onChange={(e) => handleAInput(e.target.value)}
                    onBlur={commitA}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { commitA(); handleHitung(); }
                      // Allow: digits, minus, backspace, delete, arrows, tab
                      if (!/^[0-9\-]$/.test(e.key) &&
                          !["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className={`w-16 h-12 rounded-xl text-center font-mono font-bold text-xl border-2 outline-none transition-colors ${
                      a >= 0
                        ? "border-intblue bg-intblue-light text-intblue focus:ring-2 focus:ring-intblue/30"
                        : "border-intpink bg-intpink-light text-intpink focus:ring-2 focus:ring-intpink/30"
                    }`}
                    style={a < 0 ? { paddingLeft: "1.1rem", paddingRight: "1.1rem" } : undefined}
                    aria-label="Bilangan 1"
                    maxLength={4}
                  />
                  {a < 0 && (
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-lg font-black pointer-events-none select-none z-10 text-intpink">
                      )
                    </span>
                  )}
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
                <div className="relative">
                  {b < 0 && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-lg font-black pointer-events-none select-none z-10 text-intpink">
                      (
                    </span>
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bStr}
                    onChange={(e) => handleBInput(e.target.value)}
                    onBlur={commitB}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { commitB(); handleHitung(); }
                      if (!/^[0-9\-]$/.test(e.key) &&
                          !["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className={`w-16 h-12 rounded-xl text-center font-mono font-bold text-xl border-2 outline-none transition-colors ${
                      b >= 0
                        ? "border-intblue bg-intblue-light text-intblue focus:ring-2 focus:ring-intblue/30"
                        : "border-intpink bg-intpink-light text-intpink focus:ring-2 focus:ring-intpink/30"
                    }`}
                    style={b < 0 ? { paddingLeft: "1.1rem", paddingRight: "1.1rem" } : undefined}
                    aria-label="Bilangan 2"
                    maxLength={4}
                  />
                  {b < 0 && (
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-lg font-black pointer-events-none select-none z-10 text-intpink">
                      )
                    </span>
                  )}
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
              <span className={a >= 0 ? "text-intblue" : "text-intpink"}>{a < 0 ? `(${a})` : a}</span>
              {" "}{op}{" "}
              <span className={b >= 0 ? "text-intblue" : "text-intpink"}>{b < 0 ? `(${b})` : b}</span>
              {" "}={" "}
              <span
                className={
                  result > 0 ? "text-intblue" : result < 0 ? "text-intpink" : "text-success"
                }
              >
                {result < 0 ? `(${result})` : result}
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
