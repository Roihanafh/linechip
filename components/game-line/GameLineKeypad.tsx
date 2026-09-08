"use client";

/**
 * components/game-line/GameLineKeypad.tsx
 *
 * Numeric keypad for entering the game answer.
 * Layout (4-column grid):
 *   [7][8][9][←]
 *   [4][5][6][−]
 *   [1][2][3]
 *   [   0   ]
 */

interface GameLineKeypadProps {
  onAddDigit: (digit: string) => void;
}

const digitClass =
  "flex items-center justify-center h-12 rounded-xl font-mono font-bold text-lg " +
  "bg-white border border-border text-slate-800 hover:bg-surface active:scale-95 transition-all cursor-pointer select-none";

const backspaceClass =
  "flex items-center justify-center h-12 rounded-xl font-bold text-lg col-span-1 " +
  "bg-error/10 text-error border border-error/20 hover:bg-error/20 active:scale-95 transition-all cursor-pointer select-none";

const minusClass =
  "flex items-center justify-center h-12 rounded-xl font-bold text-lg col-span-1 " +
  "bg-intpink-light text-intpink border border-intpink/20 hover:bg-intpink/20 active:scale-95 transition-all cursor-pointer select-none";

export default function GameLineKeypad({ onAddDigit }: GameLineKeypadProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {/* Row 1 */}
      <button className={digitClass}    onClick={() => onAddDigit("7")} aria-label="7">7</button>
      <button className={digitClass}    onClick={() => onAddDigit("8")} aria-label="8">8</button>
      <button className={digitClass}    onClick={() => onAddDigit("9")} aria-label="9">9</button>
      <button className={backspaceClass} onClick={() => onAddDigit("←")} aria-label="Hapus">←</button>

      {/* Row 2 */}
      <button className={digitClass}    onClick={() => onAddDigit("4")} aria-label="4">4</button>
      <button className={digitClass}    onClick={() => onAddDigit("5")} aria-label="5">5</button>
      <button className={digitClass}    onClick={() => onAddDigit("6")} aria-label="6">6</button>
      <button className={minusClass}    onClick={() => onAddDigit("-")} aria-label="Minus">−</button>

      {/* Row 3: only 3 buttons, span 4/3 each doesn't divide evenly — use col-span workaround */}
      <button className={`${digitClass} col-span-1`} onClick={() => onAddDigit("1")} aria-label="1">1</button>
      <button className={`${digitClass} col-span-1`} onClick={() => onAddDigit("2")} aria-label="2">2</button>
      <button className={`${digitClass} col-span-2`} onClick={() => onAddDigit("3")} aria-label="3">3</button>

      {/* Row 4: 0 spans all 4 columns */}
      <button
        className={`${digitClass} col-span-4`}
        onClick={() => onAddDigit("0")}
        aria-label="0"
      >
        0
      </button>
    </div>
  );
}
