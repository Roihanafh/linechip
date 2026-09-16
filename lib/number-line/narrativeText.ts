import type { Operation } from './types';

export interface NarrativePhases {
  phase1: string;
  phase2: string;
}

function fmt(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/**
 * Membangun teks penjelasan naratif dua-fase untuk animasi garis bilangan.
 *
 * Phase 1: pergerakan dari 0 ke num1 (atau diam jika num1 = 0).
 * Phase 2: pergerakan dari num1 ke result, berdasarkan operator dan tanda num2.
 */
export function buildNarrativeText(
  num1: number,
  num2: number,
  op: Operation,
): NarrativePhases {
  // --- Phase 1 ---
  let phase1: string;
  if (num1 === 0) {
    phase1 = 'Fase 1: Bilangan pertama adalah 0 — kita tetap di titik asal.';
  } else {
    const dir1 = num1 > 0 ? 'kanan' : 'kiri';
    phase1 = `Fase 1: Dari titik 0, bergerak ke ${dir1} sebanyak ${Math.abs(num1)} langkah menuju titik ${fmt(num1)}.`;
  }

  // --- Phase 2 ---
  let phase2: string;
  if (op === '+') {
    if (num2 === 0) {
      phase2 = `Fase 2: Menambahkan 0 — posisi tetap di ${fmt(num1)}.`;
    } else {
      const dir2 = num2 > 0 ? 'kanan' : 'kiri';
      phase2 = `Fase 2: Dari titik ${fmt(num1)}, tambahkan ${fmt(num2)} dengan bergerak ke ${dir2} sebanyak ${Math.abs(num2)} langkah.`;
    }
  } else {
    // op === '-'
    if (num2 === 0) {
      phase2 = `Fase 2: Mengurangi 0 — posisi tetap di ${fmt(num1)}.`;
    } else if (num2 > 0) {
      phase2 = `Fase 2: Dari titik ${fmt(num1)}, kurangi ${fmt(num2)} — mengurangi bilangan positif berarti bergerak ke kiri sebanyak ${Math.abs(num2)} langkah.`;
    } else {
      // num2 < 0
      phase2 = `Fase 2: Dari titik ${fmt(num1)}, kurangi ${fmt(num2)} — mengurangi bilangan negatif berarti bergerak ke kanan sebanyak ${Math.abs(num2)} langkah.`;
    }
  }

  return { phase1, phase2 };
}
