"use client";

/**
 * app/intline-run/page.tsx
 *
 * Full Game Line implementation.
 * Uses useGameLineState for all state management.
 * Layout: max-w-5xl, 1-col mobile / 2-col md+
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGameLineState } from "../../components/game-line/useGameLineState";
import { useTimedScoring } from "@/hooks/useTimedScoring";
import { TimerDisplay } from "@/components/game/TimerDisplay";
import GameLineCanvas from "../../components/game-line/GameLineCanvas";
import GameLineArrowControls from "../../components/game-line/GameLineArrowControls";
import GameLineKeypad from "../../components/game-line/GameLineKeypad";
import { useSound } from "../../hooks/useSound";
import { validateArrowPlacement } from "../../lib/game/arrowHelpers";
import { awardPoints } from "../../features/game/scoreService";
import { resolveDisplayScore, formatScore } from "../../lib/game/chipHelpers";
import { useAuth } from "../../features/auth";

export default function IntLineRunPage() {
  const {
    currentQuestion,
    newQuestion,
    arrows,
    changeArrow,
    setArrowValue,
    resetArrows,
    playArrows,
    isAnimating,
    userAnswer,
    addDigit,
    checkAnswer,
    feedback,
    spacing,
    changeSpacing,
    offsetX,
    handleCanvasDrag,
  } = useGameLineState();

  const { user, profile } = useAuth();

  const [sessionScore, setSessionScore] = useState(0);
  const [arrowFeedback, setArrowFeedback] = useState<string | null>(null);

  const { elapsedTime, startTimer, stopTimer, getScore } = useTimedScoring();

  const playLaunch = useSound("/luncurkan.mp3");

  // Wrapper that resets arrow feedback, advances to a new question, and restarts the timer
  const handleNewQuestion = () => {
    newQuestion();
    setArrowFeedback(null);
    startTimer();
  };

  // Auto-advance after correct answer (2000 ms delay)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Start timer when the first question mounts
  useEffect(() => {
    startTimer();
  }, []);

  const handleCheckAnswer = () => {
    // Layer 1: validate arrow placement
    const placementResult = validateArrowPlacement(arrows, currentQuestion);
    if (!placementResult.valid) {
      setArrowFeedback(placementResult.message ?? "Posisi panah tidak valid.");
      return;
    }

    // Layer 2: placement valid — check the answer
    setArrowFeedback(null);
    const correct = checkAnswer();
    if (correct) {
      stopTimer();
      setSessionScore(prev => prev + awardPoints(user?.uid ?? null, getScore()));
      autoAdvanceRef.current = setTimeout(() => {
        handleNewQuestion();
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/materi"
            className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors"
            aria-label="Kembali ke Materi"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-medium">Game</p>
            <h1
              className="font-bold text-2xl text-slate-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Game Garis Bilangan 🎯
            </h1>
          </div>
          {/* Score display */}
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-xs text-slate-400 font-medium">
              Sesi:{" "}
              <span className="font-bold text-slate-700" aria-label={`Skor sesi: ${sessionScore}`}>
                {formatScore(sessionScore)}
              </span>
            </span>
            {user && (
              <span className="text-xs text-slate-400 font-medium">
                Total:{" "}
                <span className="font-bold text-intblue" aria-label={`Total poin: ${resolveDisplayScore(profile?.totalScore)}`}>
                  {resolveDisplayScore(profile?.totalScore).toLocaleString("id-ID")}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* How to play */}
        <div className="bg-intblue-light border border-intblue/20 rounded-2xl p-4 mb-6 text-sm text-intblue">
          <strong>Cara Bermain:</strong> Atur posisi dua panah pada garis bilangan sehingga ujung Panah 2 menunjuk ke jawaban soal.
          Tekan <strong>Cek Posisi</strong> untuk melihat animasi, lalu ketik jawaban dan tekan <strong>Periksa</strong>.
        </div>

        {/* Main layout: 2-col on md+ */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Left column — canvas + question */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Question card */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Soal</p>
              <p
                className="text-3xl font-bold text-slate-900"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {currentQuestion.a < 0 ? `(${currentQuestion.a})` : currentQuestion.a}
                {" "}{currentQuestion.op}{" "}
                {currentQuestion.b < 0 ? `(${currentQuestion.b})` : currentQuestion.b}
                {" = ?"}
              </p>
              <TimerDisplay elapsedTime={elapsedTime} className="mt-3" />
            </div>

            {/* Game canvas */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <GameLineCanvas
                arrows={arrows}
                spacing={spacing}
                offsetX={offsetX}
                operation={currentQuestion.op}
                onDrag={handleCanvasDrag}
              />
              {/* Zoom controls */}
              <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-border">
                <span className="text-xs text-slate-400 mr-auto">Seret canvas untuk geser · Zoom:</span>
                <button
                  onClick={() => changeSpacing(-5)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors"
                  aria-label="Zoom out"
                >
                  −
                </button>
                <button
                  onClick={() => changeSpacing(5)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>
            </div>

            {/* Cek Posisi button */}
            <button
              onClick={() => { playLaunch(); playArrows(); }}
              disabled={isAnimating}
              className="w-full py-3 rounded-xl bg-intblue-light text-intblue font-bold border border-intblue/20 hover:bg-intblue/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAnimating ? "⏳ Animasi berjalan…" : "▶ Cek Posisi"}
            </button>

            {/* Reset arrows */}
            <button
              onClick={resetArrows}
              className="w-full py-2 rounded-xl text-slate-400 border border-border hover:bg-slate-50 text-sm transition-colors"
            >
              Reset Panah
            </button>
          </div>

          {/* Right column — controls */}
          <div className="w-full md:w-80 flex flex-col gap-4">

            {/* Arrow controls */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-3">Atur Panah</p>
              <GameLineArrowControls
                arrows={arrows}
                onChangeArrow={changeArrow}
                onSetArrowValue={setArrowValue}
              />
            </div>

            {/* Answer panel */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Jawaban</p>
              <div
                className="h-14 flex items-center justify-center rounded-xl bg-surface border border-border mb-3 text-3xl font-bold text-slate-900"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {userAnswer !== "" ? userAnswer : <span className="text-slate-300">—</span>}
              </div>
              <GameLineKeypad onAddDigit={addDigit} />
            </div>

            {/* Periksa + Soal Baru */}
            <div className="flex gap-2">
              <button
                onClick={() => { playLaunch(); handleCheckAnswer(); }}
                disabled={isAnimating}
                className="flex-1 py-3 rounded-xl bg-intblue text-white font-bold hover:bg-intblue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                Periksa
              </button>
              <button
                onClick={() => { handleNewQuestion(); }}
                className="flex-1 py-3 rounded-xl border border-border text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Soal Baru
              </button>
            </div>

            {/* Feedback panel — arrowFeedback takes priority over hook feedback */}
            {(arrowFeedback || feedback) && (
              <div
                className={`rounded-2xl p-4 text-sm font-medium ${
                  arrowFeedback
                    ? "bg-error/10 border border-error/30 text-error"
                    : feedback!.type === "success"
                    ? "bg-success/10 border border-success/30 text-success"
                    : "bg-error/10 border border-error/30 text-error"
                }`}
                role="alert"
              >
                {arrowFeedback ?? feedback!.message}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-8 flex justify-between items-center text-sm">
          <Link href="/materi" className="text-slate-400 hover:text-intblue transition-colors">
            ← Kembali ke Materi
          </Link>
          <Link href="/garis-bilangan" className="text-intblue hover:text-intblue-dark font-semibold transition-colors">
            Buka Simulasi →
          </Link>
        </div>
      </div>
    </div>
  );
}

