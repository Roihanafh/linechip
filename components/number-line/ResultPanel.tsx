import { formatIntDisplay, getNumberColorClass } from '../../lib/number-line/formatters';
import { buildNarrativeText } from '../../lib/number-line/narrativeText';
import type { ResultPanelProps } from '../../lib/number-line/types';

export default function ResultPanel({ num1, num2, operation, result }: ResultPanelProps) {
  // Placeholder state — no animation has run yet
  if (result === null) {
    return (
      <div className="mt-4 rounded-2xl bg-white border border-border p-5 text-center text-slate-400 text-sm">
        Masukkan angka dan tekan <span className="font-semibold text-intblue">Hitung</span> untuk melihat hasil.
      </div>
    );
  }

  const narrative = buildNarrativeText(num1, num2, operation);

  return (
    <div className="mt-4 rounded-2xl bg-white border border-border p-5 space-y-4">
      {/* Equation */}
      <div className="flex items-center justify-center gap-1 text-2xl font-bold font-heading">
        <span className={getNumberColorClass(num1)}>{formatIntDisplay(num1)}</span>
        <span className="text-slate-600">{operation === '+' ? '+' : '−'}</span>
        <span className={getNumberColorClass(num2)}>{formatIntDisplay(num2)}</span>
        <span className="text-slate-600">=</span>
        <span className={getNumberColorClass(result)}>{formatIntDisplay(result)}</span>
      </div>

      {/* Narrative explanation */}
      <div className="space-y-2 text-sm text-slate-700">
        <p className="leading-relaxed">{narrative.phase1}</p>
        <p className="leading-relaxed">{narrative.phase2}</p>
      </div>

      {/* Return to origin message */}
      {result === 0 && (
        <p className="text-center text-sm font-semibold text-intblue">
          🔄 Kembali ke titik asal!
        </p>
      )}
    </div>
  );
}
