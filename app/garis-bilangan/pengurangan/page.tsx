'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import NumberLineCanvas from '@/components/NumberLineCanvas';
import { InputPanel } from '@/components/number-line';
import ResultPanel from '@/components/number-line/ResultPanel';
import InstructionModal from '@/components/number-line/InstructionModal';

export default function PenguranganPage() {
  const [num1Input, setNum1Input] = useState(0);
  const [num2Input, setNum2Input] = useState(0);
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCalculate = useCallback(() => {
    setResult(null);
    setNum1(num1Input);
    setNum2(num2Input);
    setRunKey(k => k + 1);
  }, [num1Input, num2Input]);

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="max-w-3xl mx-auto px-4">
        {/* Back link */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/materi"
            className="p-2 rounded-xl bg-white border border-border hover:bg-slate-50 transition-colors"
            aria-label="Kembali ke halaman materi"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <p className="text-xs text-slate-400 font-medium">Materi / Garis Bilangan</p>
            <h1 className="font-bold text-2xl text-[#0f172a]" style={{ fontFamily: 'var(--font-baloo2), system-ui, sans-serif' }}>
              Pengurangan Bilangan Bulat
            </h1>
          </div>
        </div>

        <InputPanel
          num1={num1Input}
          num2={num2Input}
          operation="-"
          onNum1Change={setNum1Input}
          onNum2Change={setNum2Input}
          onCalculate={handleCalculate}
          onShowInstructions={() => setIsModalOpen(true)}
        />

        <NumberLineCanvas
          num1={num1}
          num2={num2}
          operation="-"
          runKey={runKey}
          onResult={r => setResult(r)}
        />

        <ResultPanel
          num1={num1}
          num2={num2}
          operation="-"
          result={result}
        />

        <InstructionModal
          operationType="subtraction"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </div>
  );
}
