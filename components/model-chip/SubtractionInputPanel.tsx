// components/model-chip/SubtractionInputPanel.tsx
"use client";

import { inputPanelProps } from "@/lib/model-chip/inputPanelProps";
import type { AnimMode } from "@/lib/model-chip/types";
import type { VizPhaseSub, SubtractionSnapshot } from "@/lib/model-chip/subtractionTypes";
import { useSound } from "@/hooks/useSound";

export interface SubtractionInputPanelProps {
  bil1: number;
  bil2: number;
  animMode: AnimMode;
  animSpeed: number;
  vizPhase: VizPhaseSub;
  snapshot: SubtractionSnapshot | null;
  waitingForClick: boolean;
  isAnimating: boolean;
  onBil1Change: (val: string) => void;
  onBil2Change: (val: string) => void;
  onSubtract: () => void;
  onReset: () => void;
  onReplay: () => void;
  onAnimModeChange: (m: AnimMode) => void;
  onSpeedChange: (s: number) => void;
  onNextClick: () => void;
}

export function SubtractionInputPanel({
  bil1,
  bil2,
  animMode,
  animSpeed,
  vizPhase,
  snapshot,
  waitingForClick,
  isAnimating,
  onBil1Change,
  onBil2Change,
  onSubtract,
  onReset,
  onReplay,
  onAnimModeChange,
  onSpeedChange,
  onNextClick,
}: SubtractionInputPanelProps) {
  const p1 = inputPanelProps(bil1);
  const p2 = inputPanelProps(bil2);
  const playLuncurkan = useSound('/luncurkan.mp3');

  const isDone = vizPhase === "done";
  const showInputKembali =
    isDone || (snapshot !== null && !isAnimating && vizPhase !== "idle");
  const showSpeedControl = vizPhase === "battle";

  return (
    <div className="mb-4">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4">

        {/* Input fields */}
        <div
          className={`transition-opacity duration-300 ${
            isAnimating && vizPhase !== "transform" ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {/* Row: labels */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-2">
            {/* Bil1 label */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                p1.isPos ? "bg-intblue" : p1.isNeg ? "bg-intpink" : "bg-slate-300"
              }`} />
              <span
                className={`font-bold text-sm truncate ${p1.titleColor}`}
                style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
              >
                {p1.troopName ?? "Bilangan 1"}
              </span>
            </div>

            <div />

            {/* Bil2 label — static */}
            <div className="flex items-center gap-1.5 justify-end">
              <span
                className={`font-bold text-sm truncate ${p2.titleColor}`}
                style={{ fontFamily: "var(--font-baloo2), system-ui, sans-serif" }}
              >
                {p2.troopName ?? "Pengurang"}
              </span>
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                p2.isPos ? "bg-intblue" : p2.isNeg ? "bg-intpink" : "bg-slate-300"
              }`} />
            </div>
          </div>

          {/* Row: inputs */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {/* Bil1 input — tidak berubah */}
            <div className="relative">
              {bil1 < 0 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none select-none z-10 text-intpink">
                  (
                </span>
              )}
              <input
                type="number"
                min={-9999}
                max={9999}
                value={bil1 === 0 ? "" : bil1}
                placeholder="0"
                aria-label="Minuend: masukkan bilangan bulat antara -9999 dan 9999"
                onChange={(e) => onBil1Change(e.target.value)}
                readOnly={vizPhase !== "idle"}
                className={`w-full border-2 ${p1.inputBorder} focus:bg-white rounded-xl ${bil1 < 0 ? "px-6" : "px-3"} py-3 text-3xl font-mono font-black ${p1.inputColor} outline-none transition-colors duration-300 text-center`}
              />
              {bil1 < 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none select-none z-10 text-intpink">
                  )
                </span>
              )}
            </div>

            {/* Operator — always minus */}
            <div className="flex items-center justify-center w-8 shrink-0">
              <span className="font-black text-2xl select-none text-slate-300">{"\u2212"}</span>
            </div>

            {/* Bil2 wrapper — static */}
            <div className="relative rounded-xl overflow-hidden">
              {bil2 < 0 && (
                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none select-none z-10 ${p2.isNeg ? "text-intpink" : "text-intblue"}`}>
                  (
                </span>
              )}
              <input
                type="number"
                min={-9999}
                max={9999}
                value={bil2 === 0 ? "" : bil2}
                placeholder="0"
                aria-label="Pengurang: masukkan bilangan bulat antara -9999 dan 9999"
                onChange={(e) => onBil2Change(e.target.value)}
                readOnly={vizPhase !== "idle"}
                className={`w-full border-2 ${p2.inputBorder} focus:bg-white rounded-xl ${bil2 < 0 ? "px-6" : "px-3"} py-3 text-3xl font-mono font-black outline-none text-center transition-colors duration-300 ${p2.inputColor}`}
              />
              {bil2 < 0 && (
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none select-none z-10 ${p2.isNeg ? "text-intpink" : "text-intblue"}`}>
                  )
                </span>
              )}
            </div>
          </div>

          {/* Row: subtitles */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mt-1.5">
            <p className={`text-[10px] ${
              p1.isPos ? "text-intblue/70" : p1.isNeg ? "text-intpink/70" : "text-slate-400"
            } text-center`}>
              {p1.absVal > 0 ? p1.subtitle : "-9.999 s/d +9.999"}
            </p>
            <div />
            <p className={`text-[10px] ${
              p2.isPos ? "text-intblue/70" : p2.isNeg ? "text-intpink/70" : "text-slate-400"
            } text-center`}>
              {p2.absVal > 0 ? `Pengurang ${p2.subtitle}` : "Pengurang -9.999 s/d +9.999"}
            </p>
          </div>
        </div>

        {/* AnimMode selector */}
        <div
          role="group"
          aria-label="Pilih mode animasi"
          className={`mt-4 flex justify-center gap-1.5 p-1 rounded-xl bg-slate-100 w-fit mx-auto transition-opacity duration-200 ${
            vizPhase !== "idle" ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {(["auto", "click"] as const).map((mode) => {
            const isActive = animMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onAnimModeChange(mode)}
                aria-pressed={isActive}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 border-2 ${
                  isActive
                    ? "bg-intblue text-white border-intblue shadow-sm"
                    : "bg-transparent text-slate-400 border-transparent hover:text-slate-500"
                }`}
              >
                {mode === "auto" ? "Otomatis \uD83E\uDD16" : "Klik \u25B6"}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {vizPhase === "idle" && (
              <button
                onClick={() => { playLuncurkan(); onSubtract(); }}
                disabled={bil1 === 0 && bil2 === 0}
                className="px-8 py-2.5 bg-intblue text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Pasangkan &#9889;
              </button>
            )}
            {showInputKembali && (
              <button
                onClick={onReset}
                className="px-8 py-2.5 bg-white border-2 border-border text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Input Kembali &#128260;
              </button>
            )}
            {snapshot !== null && (
              <button
                onClick={onReplay}
                aria-label="Ulangi animasi dengan nilai yang sama"
                className="px-5 py-2.5 bg-white border-2 border-intblue/30 text-intblue rounded-xl font-bold text-sm hover:bg-intblue-light transition-colors"
              >
                Putar ulang &#x21BA;
              </button>
            )}
          </div>

          {/* Aria-live: animating indicator */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {isAnimating ? "Animasi berjalan..." : ""}
          </div>

          {/* Visual indicator saat battle/center */}
          {(vizPhase === "battle" || vizPhase === "center") && (
            <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Animasi berjalan...
            </div>
          )}

          {/* Speed control — battle phase only */}
          {showSpeedControl && (
            <div className="flex gap-0.5 p-1 rounded-lg bg-slate-100">
              {([0.5, 1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => onSpeedChange(spd)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    animSpeed === spd
                      ? "bg-intblue text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {spd}&times;
                </button>
              ))}
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
