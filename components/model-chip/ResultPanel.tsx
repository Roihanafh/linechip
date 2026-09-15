// components/model-chip/ResultPanel.tsx
"use client";

import {
  AntibodyCharacter,
  VirusCharacter,
  dominantPlace,
} from "@/components/game/CharacterSVGs";
import type { VizPhase } from "@/lib/model-chip/types";

export interface ResultPanelProps {
  eqBil1: number;
  eqBil2: number;
  remaining: number;
  vizPhase: VizPhase;
  pairs: number;
}

export function ResultPanel({ eqBil1, eqBil2, remaining, vizPhase, pairs }: ResultPanelProps) {
  const isDone = vizPhase === "done";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            <span className={`font-mono font-bold ${eqBil1 >= 0 ? "text-intblue" : "text-intpink"}`}>
              {eqBil1 >= 0 ? `+${eqBil1.toLocaleString("id-ID")}` : `(${eqBil1.toLocaleString("id-ID")})`}
            </span>
            <span className="text-slate-400 mx-2">+</span>
            <span className={`font-mono font-bold ${eqBil2 >= 0 ? "text-intblue" : "text-intpink"}`}>
              {eqBil2 >= 0 ? `+${eqBil2.toLocaleString("id-ID")}` : `(${eqBil2.toLocaleString("id-ID")})`}
            </span>
          </p>
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
        <div className="flex items-center gap-3">
          {isDone && remaining !== 0 && (
            <div className="w-12 h-12 victory-pop">
              {remaining > 0 ? (
                <AntibodyCharacter type={dominantPlace(remaining)} uid="mc-result-char" />
              ) : (
                <VirusCharacter type={dominantPlace(Math.abs(remaining))} uid="mc-result-char" />
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
                  : `(${remaining})`
                : "?"}
            </p>
          </div>
        </div>
      </div>

      {(eqBil1 !== 0 || eqBil2 !== 0) && (
        <div className="bg-surface rounded-xl p-3 text-center font-mono text-sm mb-4">
          <span className={`font-bold ${eqBil1 >= 0 ? "text-intblue" : "text-intpink"}`}>
            {eqBil1 >= 0 ? `+${eqBil1.toLocaleString("id-ID")}` : `(${eqBil1.toLocaleString("id-ID")})`}
          </span>
          <span className="text-slate-400 mx-2">+</span>
          <span className={`font-bold ${eqBil2 >= 0 ? "text-intblue" : "text-intpink"}`}>
            {eqBil2 >= 0 ? `+${eqBil2.toLocaleString("id-ID")}` : `(${eqBil2.toLocaleString("id-ID")})`}
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
                : remaining < 0
                ? `(${remaining.toLocaleString("id-ID")})`
                : "0"
              : "?"}
          </span>
        </div>
      )}
    </div>
  );
}
