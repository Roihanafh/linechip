// hooks/useTimedScoring.ts
// Custom hook untuk manajemen lifecycle timer dan kalkulasi Timed_Score.
"use client";

import { useState, useRef, useEffect } from "react";
import { computeTimedScore } from "@/lib/game/timedScore";

export interface UseTimedScoringReturn {
  /** Waktu yang telah berlalu sejak startTimer() dipanggil, dalam detik (integer, ≥ 0). */
  elapsedTime: number;
  /** Reset elapsedTime ke 0 dan mulai interval 1 detik. Idempoten — aman dipanggil saat timer aktif. */
  startTimer: () => void;
  /** Hentikan interval dan bekukan elapsedTime pada nilai saat ini. Tidak mereset elapsedTime. */
  stopTimer: () => void;
  /** Kembalikan computeTimedScore(elapsedTime) saat ini. Fallback ke 0 jika terjadi error tak terduga. */
  getScore: () => number;
}

/**
 * useTimedScoring
 *
 * Mengelola timer soal dan kalkulasi poin berbasis kecepatan.
 *
 * Lifecycle:
 * - Panggil `startTimer()` ketika soal baru ditampilkan.
 * - Panggil `stopTimer()` ketika jawaban benar dikirim.
 * - Baca `elapsedTime` untuk tampilan UI (reactif).
 * - Baca `getScore()` untuk nilai poin yang akan diberikan.
 *
 * useRef digunakan untuk intervalRef agar clearInterval tidak memicu re-render.
 */
export function useTimedScoring(): UseTimedScoringReturn {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup saat komponen unmount — cegah memory leak
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Mulai timer dari 0.
   * Jika timer sudah aktif, bersihkan interval lama terlebih dahulu (idempoten restart).
   */
  const startTimer = () => {
    // Clear interval aktif jika ada
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset elapsed time ke 0
    setElapsedTime(0);

    // Mulai interval baru — naikkan elapsedTime sebesar 1 setiap 1000 ms
    intervalRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  /**
   * Hentikan timer, bekukan elapsedTime pada nilai saat ini.
   * Tidak mereset elapsedTime — nilai tetap tersedia untuk getScore().
   */
  const stopTimer = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /**
   * Kembalikan Timed_Score berdasarkan elapsedTime saat ini.
   * Dibungkus try/catch sebagai safety net — computeTimedScore seharusnya tidak throw.
   */
  const getScore = (): number => {
    try {
      return computeTimedScore(elapsedTime);
    } catch {
      return 0;
    }
  };

  return { elapsedTime, startTimer, stopTimer, getScore };
}
