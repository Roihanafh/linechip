'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { clampInt } from '../../lib/number-line/formatters';
import type { InputPanelProps } from '../../lib/number-line/types';
import { useSound } from '../../hooks/useSound';

const MIN = -99;
const MAX = 99;

/** CSS classes for an input field based on the committed sign */
function inputClasses(n: number): string {
  if (n > 0) return 'border-intblue/40 focus:border-intblue bg-intblue-light/40 text-intblue';
  if (n < 0) return 'border-intpink/40 focus:border-intpink bg-intpink-light/40 text-intpink';
  return 'border-border bg-surface text-slate-400';
}

function dotClass(n: number): string {
  if (n > 0) return 'bg-intblue';
  if (n < 0) return 'bg-intpink';
  return 'bg-slate-300';
}

function titleColor(n: number): string {
  if (n > 0) return 'text-intblue';
  if (n < 0) return 'text-intpink';
  return 'text-slate-400';
}

function subtitleText(n: number): string {
  if (n === 0) return `-${MAX} s/d +${MAX}`;
  if (n > 0) return `Positif +${n}`;
  return `Negatif ${n}`;
}

interface NumberFieldProps {
  value: number;
  onChange: (val: number) => void;
  onCalculate: () => void;
  ariaLabel: string;
}

function NumberField({ value, onChange, onCalculate, ariaLabel }: NumberFieldProps) {
  // Raw string in the input — can be "", "-", "5", "-3"
  const [rawStr, setRawStr] = useState<string>(value === 0 ? '' : String(value));
  // Block external sync while the field has focus
  const isFocusedRef = React.useRef(false);

  // Sync from parent only when not focused (e.g. stepper or external reset)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setRawStr(value === 0 ? '' : String(value));
    }
  }, [value]);

  const isNeg = value < 0;
  const parenColor = isNeg ? 'text-intpink' : 'text-intblue';

  // Commit on blur: normalize and clamp
  const commit = useCallback(
    (str: string) => {
      if (str === '' || str === '-') { onChange(0); setRawStr(''); return; }
      const parsed = parseInt(str, 10);
      const clamped = isNaN(parsed) ? 0 : clampInt(parsed, MIN, MAX);
      onChange(clamped);
      setRawStr(clamped === 0 ? '' : String(clamped));
    },
    [onChange],
  );

  // Live-update parent on every keystroke so colors/labels react immediately
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawStr(raw);
    if (raw === '' || raw === '-') {
      onChange(0);
    } else {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) onChange(clampInt(parsed, MIN, MAX));
    }
  };

  return (
    <div className="relative">
      {isNeg && (
        <span
          className={`absolute left-2 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none select-none z-10 ${parenColor}`}
          aria-hidden="true"
        >
          (
        </span>
      )}
      <input
        type="number"
        min={MIN}
        max={MAX}
        value={rawStr}
        placeholder="0"
        aria-label={ariaLabel}
        onChange={handleChange}
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={() => { isFocusedRef.current = false; commit(rawStr); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit(rawStr);
            onCalculate();
          }
        }}
        className={`w-full border-2 rounded-xl ${isNeg ? 'px-6' : 'px-3'} py-3 text-3xl font-mono font-black outline-none transition-colors duration-300 text-center focus:bg-white
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          ${inputClasses(value)}`}
      />
      {isNeg && (
        <span
          className={`absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none select-none z-10 ${parenColor}`}
          aria-hidden="true"
        >
          )
        </span>
      )}
    </div>
  );
}

export function InputPanel({
  num1,
  num2,
  operation,
  onNum1Change,
  onNum2Change,
  onCalculate,
  onShowInstructions,
}: InputPanelProps) {
  const playLuncurkan = useSound('/luncurkan.mp3');
  return (
    <div className="mb-4">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4">

        {/* Label row */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${dotClass(num1)}`} />
            <span
              className={`font-bold text-sm truncate ${titleColor(num1)}`}
              style={{ fontFamily: 'var(--font-baloo2), system-ui, sans-serif' }}
            >
              Bilangan 1
            </span>
          </div>
          <div />
          <div className="flex items-center gap-1.5 justify-end">
            <span
              className={`font-bold text-sm truncate ${titleColor(num2)}`}
              style={{ fontFamily: 'var(--font-baloo2), system-ui, sans-serif' }}
            >
              Bilangan 2
            </span>
            <div className={`w-2 h-2 rounded-full shrink-0 ${dotClass(num2)}`} />
          </div>
        </div>

        {/* Input row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <NumberField
            value={num1}
            onChange={onNum1Change}
            onCalculate={onCalculate}
            ariaLabel="Input nilai pertama"
          />

          {/* Fixed operator */}
          <div
            aria-label={`Operator ${operation === '+' ? 'penjumlahan' : 'pengurangan'}`}
            className="flex items-center justify-center w-8 shrink-0"
          >
            <span className="text-slate-300 font-black text-2xl select-none">
              {operation === '+' ? '+' : '−'}
            </span>
          </div>

          <NumberField
            value={num2}
            onChange={onNum2Change}
            onCalculate={onCalculate}
            ariaLabel="Input nilai kedua"
          />
        </div>

        {/* Subtitle row */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mt-1.5">
          <p className={`text-[10px] text-center ${num1 > 0 ? 'text-intblue/70' : num1 < 0 ? 'text-intpink/70' : 'text-slate-400'}`}>
            {subtitleText(num1)}
          </p>
          <div />
          <p className={`text-[10px] text-center ${num2 > 0 ? 'text-intblue/70' : num2 < 0 ? 'text-intpink/70' : 'text-slate-400'}`}>
            {subtitleText(num2)}
          </p>
        </div>

        {/* Action row */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => { playLuncurkan(); onCalculate(); }}
            aria-label="Hitung hasil"
            className="px-8 py-2.5 bg-intblue text-white rounded-xl font-bold text-sm hover:bg-intblue-dark transition-colors shadow-sm"
          >
            Hitung
          </button>
          <button
            type="button"
            onClick={onShowInstructions}
            aria-label="Buka instruksi"
            className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-lg flex items-center justify-center hover:bg-amber-100 transition-colors"
          >
            💡
          </button>
        </div>
      </div>
    </div>
  );
}

export default InputPanel;
