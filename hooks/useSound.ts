// hooks/useSound.ts
// Lightweight hook for playing a preloaded audio file.
// Initialised synchronously (no useEffect race), SSR-safe.
"use client";

import { useRef } from "react";

/**
 * useSound(src)
 *
 * Returns a `play(rate?)` function that restarts the audio from the beginning.
 * - Safe to call on the server (typeof Audio check).
 * - Created synchronously so it is ready before first user interaction.
 *
 * @param src   Path relative to /public, e.g. "/luncurkan.mp3"
 * @param rate  Default playback rate (default 1.0)
 */
export function useSound(src: string, rate = 1.0) {
  const audioRef = useRef<HTMLAudioElement | null>(
    typeof Audio !== "undefined"
      ? (() => {
          const a = new Audio(src);
          a.preload = "auto";
          return a;
        })()
      : null
  );

  return function play(overrideRate?: number) {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.playbackRate = Math.min(overrideRate ?? rate, 4);
      a.play().catch(() => {/* autoplay policy — silently ignore */});
    } catch {
      // ignore
    }
  };
}
