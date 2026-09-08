"use client";

/**
 * components/game-line/GameLineArrowControls.tsx
 *
 * Input controls for adjusting start and length of Arrow 1 and Arrow 2.
 * Uses local string state for each field to allow free typing without
 * overriding the external state mid-keystroke.
 */

import { useState, useEffect, useCallback } from "react";
import type { GameArrow } from "./useGameLineState";

interface GameLineArrowControlsProps {
  arrows: Record<1 | 2, GameArrow>;
  onChangeArrow: (num: 1 | 2, property: "start" | "length", delta: number) => void;
  onSetArrowValue: (num: 1 | 2, property: "start" | "length", value: number) => void;
}

type ArrowNum = 1 | 2;
type ArrowProp = "start" | "length";

const ARROW_STYLES = {
  1: {
    bg: "bg-intblue-light",
    border: "border-intblue/20",
    text: "text-intblue",
    btn: "bg-intblue/10 hover:bg-intblue/20 text-intblue border border-intblue/20",
    label: "text-intblue font-semibold",
  },
  2: {
    bg: "bg-intpink-light",
    border: "border-intpink/20",
    text: "text-intpink",
    btn: "bg-intpink/10 hover:bg-intpink/20 text-intpink border border-intpink/20",
    label: "text-intpink font-semibold",
  },
} as const;

interface FieldState {
  value: string;
  editing: boolean;
}

function ArrowRow({
  arrowNum,
  arrow,
  onChangeArrow,
  onSetArrowValue,
}: {
  arrowNum: ArrowNum;
  arrow: GameArrow;
  onChangeArrow: GameLineArrowControlsProps["onChangeArrow"];
  onSetArrowValue: GameLineArrowControlsProps["onSetArrowValue"];
}) {
  const styles = ARROW_STYLES[arrowNum];

  const [startField, setStartField] = useState<FieldState>({
    value: String(arrow.start),
    editing: false,
  });
  const [lengthField, setLengthField] = useState<FieldState>({
    value: String(arrow.length),
    editing: false,
  });

  // Sync from external state when not editing
  useEffect(() => {
    if (!startField.editing) {
      setStartField((f) => ({ ...f, value: String(arrow.start) }));
    }
  }, [arrow.start, startField.editing]);

  useEffect(() => {
    if (!lengthField.editing) {
      setLengthField((f) => ({ ...f, value: String(arrow.length) }));
    }
  }, [arrow.length, lengthField.editing]);

  const commit = useCallback(
    (prop: ArrowProp, val: string) => {
      const parsed = parseInt(val, 10);
      if (!Number.isNaN(parsed)) {
        onSetArrowValue(arrowNum, prop, parsed);
      }
      if (prop === "start") setStartField((f) => ({ ...f, editing: false }));
      else setLengthField((f) => ({ ...f, editing: false }));
    },
    [arrowNum, onSetArrowValue]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: digits, backspace, delete, arrows, tab, home, end, enter
    if (
      /^[0-9]$/.test(e.key) ||
      ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End", "Enter"].includes(e.key)
    ) {
      return;
    }
    // Allow minus only at position 0 and only once
    if (e.key === "-") {
      const input = e.currentTarget;
      if (input.selectionStart === 0 && !input.value.includes("-")) return;
    }
    // Block everything else (letters, e, E, +, etc.)
    e.preventDefault();
  }, []);

  const renderField = (prop: ArrowProp, field: FieldState, setField: React.Dispatch<React.SetStateAction<FieldState>>) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChangeArrow(arrowNum, prop, -1)}
        className={`w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center ${styles.btn} transition-colors`}
        aria-label={`Kurangi ${prop} Arrow ${arrowNum}`}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={field.value}
        onFocus={() => setField((f) => ({ ...f, editing: true }))}
        onChange={(e) => setField({ value: e.target.value, editing: true })}
        onBlur={(e) => commit(prop, e.target.value)}
        onKeyDown={(e) => {
          handleKeyDown(e);
          if (e.key === "Enter") commit(prop, e.currentTarget.value);
        }}
        className={`w-16 text-center font-mono text-sm rounded-lg border px-1 py-1 outline-none focus:ring-2 focus:ring-current ${styles.bg} ${styles.border} ${styles.text}`}
        aria-label={`${prop === "start" ? "Mulai" : "Panjang"} Arrow ${arrowNum}`}
      />
      <button
        onClick={() => onChangeArrow(arrowNum, prop, 1)}
        className={`w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center ${styles.btn} transition-colors`}
        aria-label={`Tambah ${prop} Arrow ${arrowNum}`}
      >
        +
      </button>
    </div>
  );

  return (
    <div className={`rounded-xl border p-3 ${styles.bg} ${styles.border} space-y-2`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${styles.label}`}>
        Panah {arrowNum}
      </p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs w-12 ${styles.text}`}>Mulai</span>
          {renderField("start", startField, setStartField)}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs w-12 ${styles.text}`}>Panjang</span>
          {renderField("length", lengthField, setLengthField)}
        </div>
      </div>
    </div>
  );
}

export default function GameLineArrowControls({
  arrows,
  onChangeArrow,
  onSetArrowValue,
}: GameLineArrowControlsProps) {
  return (
    <div className="space-y-3">
      <ArrowRow arrowNum={1} arrow={arrows[1]} onChangeArrow={onChangeArrow} onSetArrowValue={onSetArrowValue} />
      <ArrowRow arrowNum={2} arrow={arrows[2]} onChangeArrow={onChangeArrow} onSetArrowValue={onSetArrowValue} />
    </div>
  );
}
