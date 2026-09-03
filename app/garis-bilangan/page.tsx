"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

export default function GarisBilanganPage() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [op, setOp] = useState<"+" | "-">("+");
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const result = op === "+" ? a + b : a - b;
  const phase1End = Math.abs(a);

  const steps = useMemo(() => {
    const arr: number[] = [0];
    const dir1 = a > 0 ? 1 : a < 0 ? -1 : 0;
    for (let i = 0; i < Math.abs(a); i++) arr.push(arr[arr.length - 1] + dir1);
    const r = op === "+" ? a + b : a - b;
    const diff = r - a;
    const dir2 = diff > 0 ? 1 : diff < 0 ? -1 : 0;
    for (let i = 0; i < Math.abs(diff); i++) arr.push(arr[arr.length - 1] + dir2);
    return arr;
  }, [a, b, op]);

  const currentPos = steps[Math.min(stepIndex, steps.length - 1)];
  const isDone = stepIndex >= steps.length - 1 && stepIndex > 0;
  const isIdle = stepIndex === 0 && !playing;

  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStepIndex((i) => i + 1), 600 / speed);
    return () => clearTimeout(timer);
  }, [playing, stepIndex, steps.length, speed]);

  const handlePlay = () => {
    if (isDone) {
      setStepIndex(0);
      setTimeout(() => setPlaying(true), 50);
    } else {
      setPlaying(true);
    }
  };

  const reset = () => {
    setPlaying(false);
    setStepIndex(0);
  };

  const changeA = (delta: number) => {
    reset();
    setA((v) => Math.max(-10, Math.min(10, v + delta)));
  };
  const changeB = (delta: number) => {
    reset();
    setB((v) => Math.max(-10, Math.min(10, v + delta)));
  };
  const changeOp = (o: "+" | "-") => {
    reset();
    setOp(o);
  };

  const getExplanation = () => {
    if (isIdle) return `Siap menghitung: ${a > 0 ? `+${a}` : a} ${op} ${b > 0 ? `+${b}` : b} = ?`;
    if (stepIndex <= phase1End && stepIndex > 0)
      return `Bergerak dari 0 ke ${a > 0 ? "kanan" : "kiri"} sebanyak ${Math.abs(a)} langkah. Sekarang di titik ${currentPos}.`;
    if (!isDone)
      return `Dari titik ${a}, ${op === "+" ? "tambahkan" : "kurangkan"} ${Math.abs(b)} langkah ke ${result > a ? "kanan" : "kiri"}. Sekarang di ${currentPos}.`;
    return `Selesai! ${a} ${op} ${b} = ${result}`;
  };

  const MIN = -15,
    MAX = 15,
    RANGE = MAX - MIN;
  const W = 640,
    H = 80,
    PX = 24;
  const UW = (W - 2 * PX) / RANGE;
  const nx = (n: number) => PX + (n - MIN) * UW;

  const phase1Complete = stepIndex > phase1End;
  const phase2Color = result >= a ? "#2F6FED" : "#EC4899";
  const phase1Color = a >= 0 ? "#2F6FED" : "#EC4899";

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/materi"
            className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Materi / Simulasi</p>
            <h1
              className="font-bold text-2xl text-[#0f172a]"
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
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
                >
                  +
                </button>
              </div>
            </div>

            {/* = Result */}
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1.5">Hasil</p>
              <div
                className={`w-16 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-xl border-2 transition-all select-none ${
                  isDone
                    ? result >= 0
                      ? "border-success bg-success/10 text-success"
                      : "border-intpink bg-intpink-light text-intpink"
                    : "border-slate-200 bg-slate-50 text-slate-300"
                }`}
              >
                {isDone ? (result > 0 ? `+${result}` : result) : "?"}
              </div>
            </div>
          </div>
        </div>

        {/* Number line SVG */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-4">
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              preserveAspectRatio="xMidYMid meet"
              className="block min-w-[320px]"
            >
              <line x1={PX} y1={45} x2={W - PX + 6} y2={45} stroke="#CBD5E1" strokeWidth="2"/>
              <path d={`M${W - PX + 2} 42 L${W - PX + 9} 45 L${W - PX + 2} 48`} fill="#94a3b8"/>

              {Array.from({ length: RANGE + 1 }, (_, i) => MIN + i).map((n) => {
                const x = nx(n);
                const isZero = n === 0;
                const showLabel = n % 5 === 0 || Math.abs(n) <= 5;
                return (
                  <g key={n}>
                    <line
                      x1={x} y1={isZero ? 37 : 40}
                      x2={x} y2={50}
                      stroke={isZero ? "#0f172a" : "#CBD5E1"}
                      strokeWidth={isZero ? 2 : 1}
                    />
                    {showLabel && (
                      <text
                        x={x} y={64}
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                        fill={n > 0 ? "#2F6FED" : n < 0 ? "#EC4899" : "#0f172a"}
                        fontWeight={isZero ? "700" : "500"}
                      >
                        {n}
                      </text>
                    )}
                  </g>
                );
              })}

              {stepIndex > 0 && (
                <>
                  <line
                    x1={nx(0)} y1={32}
                    x2={phase1Complete ? nx(a) : nx(currentPos)} y2={32}
                    stroke={phase1Color} strokeWidth="2.5" strokeLinecap="round"
                  />
                  {phase1Complete && a !== 0 && (
                    <path
                      d={
                        a > 0
                          ? `M${nx(a) - 5} 29 L${nx(a)} 32 L${nx(a) - 5} 35`
                          : `M${nx(a) + 5} 29 L${nx(a)} 32 L${nx(a) + 5} 35`
                      }
                      fill={phase1Color}
                    />
                  )}
                </>
              )}

              {phase1Complete && (
                <>
                  <line
                    x1={nx(a)} y1={22}
                    x2={isDone ? nx(result) : nx(currentPos)} y2={22}
                    stroke={phase2Color} strokeWidth="2.5" strokeLinecap="round"
                  />
                  {isDone && result !== a && (
                    <path
                      d={
                        result > a
                          ? `M${nx(result) - 5} 19 L${nx(result)} 22 L${nx(result) - 5} 25`
                          : `M${nx(result) + 5} 19 L${nx(result)} 22 L${nx(result) + 5} 25`
                      }
                      fill={phase2Color}
                    />
                  )}
                </>
              )}

              {stepIndex > 0 && !isDone && (
                <g>
                  <circle cx={nx(currentPos)} cy={45} r={7} fill="white" stroke="#2F6FED" strokeWidth="2.5"/>
                  <circle cx={nx(currentPos)} cy={45} r={3} fill="#2F6FED"/>
                </g>
              )}

              <circle cx={nx(0)} cy={45} r={4} fill="white" stroke="#0f172a" strokeWidth="2"/>
              {isDone && (
                <g>
                  <circle cx={nx(result)} cy={45} r={10} fill="#22C55E" opacity="0.2"/>
                  <circle cx={nx(result)} cy={45} r={6} fill="#22C55E"/>
                  <text x={nx(result)} y={49} textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">&#10003;</text>
                </g>
              )}
            </svg>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            <button
              onClick={handlePlay}
              disabled={playing}
              className="flex items-center gap-2 bg-intblue disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-intblue-dark transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <polygon points="3 2 3 12 12 7" fill="currentColor"/>
              </svg>
              {isDone ? "Ulangi" : "Mulai"}
            </button>
            <button
              onClick={() => setPlaying(false)}
              disabled={!playing}
              className="flex items-center gap-2 border border-border text-slate-600 disabled:opacity-40 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="2" width="3" height="10" rx="1" fill="currentColor"/>
                <rect x="8" y="2" width="3" height="10" rx="1" fill="currentColor"/>
              </svg>
              Jeda
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 border border-border text-slate-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7A5 5 0 1 0 7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 2L4.5 0v4z" fill="currentColor"/>
              </svg>
              Reset
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Kecepatan:</span>
              <input
                type="range" min="0.5" max="3" step="0.5" value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-20 accent-intblue"
              />
              <span className="text-xs font-mono text-intblue font-bold">{speed}&times;</span>
            </div>
          </div>
        </div>

        {/* Explanation panel */}
        <div
          className={`rounded-2xl p-4 mb-6 transition-all duration-300 ${
            isDone
              ? "bg-success/10 border border-success/30"
              : isIdle
              ? "bg-surface border border-border"
              : "bg-intblue-light border border-intblue/20"
          }`}
        >
          <p className={`font-medium text-sm ${isDone ? "text-success" : "text-intblue"}`}>
            {getExplanation()}
          </p>
          {isDone && (
            <p
              className="font-bold text-2xl text-[#0f172a] mt-2"
              style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
            >
              {a > 0 ? `+${a}` : a} {op} {b > 0 ? `+${b}` : b} ={" "}
              <span className={result >= 0 ? "text-intblue" : "text-intpink"}>
                {result > 0 ? `+${result}` : result}
              </span>
            </p>
          )}
        </div>

        <div className="flex justify-between items-center">
          <Link
            href="/materi"
            className="text-sm text-slate-400 hover:text-intblue transition-colors flex items-center gap-1"
          >
            ← Kembali ke Materi
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