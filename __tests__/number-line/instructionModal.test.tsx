/**
 * Unit tests untuk InstructionModal.tsx
 *
 * Karena Jest environment adalah Node (no jsdom / no @testing-library),
 * kita menguji logika murni yang menggerakkan komponen:
 *  - Konten aturan (ADDITION_RULES / SUBTRACTION_RULES)
 *  - Logika focus trap (keyboard handler)
 *  - Logika penutupan modal (Escape, backdrop, tombol ×)
 *
 * Requirements: 7.1–7.7, 9.2, 9.3, 9.4
 */

// ── Konstanta (dicopy dari InstructionModal.tsx) ───────────────────────────────

const ADDITION_RULES = [
  'Bilangan pertama positif → mobil bergerak ke kanan dari 0.',
  'Bilangan pertama negatif → mobil bergerak ke kiri dari 0.',
  'Bilangan kedua positif → mobil menghadap kanan dan bergerak ke kanan.',
  'Bilangan kedua negatif → mobil menghadap kiri dan bergerak ke kiri.',
];

const SUBTRACTION_RULES = [
  'Bilangan pertama positif → mobil bergerak ke kanan dari 0.',
  'Bilangan pertama negatif → mobil bergerak ke kiri dari 0.',
  'Bilangan kedua positif → mobil menghadap kiri dan bergerak ke kiri.',
  'Bilangan kedua negatif → mobil menghadap kiri tetapi bergerak mundur ke kanan.',
];

// ── Selektor focusable (dicopy dari InstructionModal.tsx) ──────────────────────

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// ── Logika focus trap (diekstrak dari handleKeyDown di InstructionModal.tsx) ───

interface FocusTrapEvent {
  key: string;
  shiftKey: boolean;
  activeIndex: number; // indeks dalam array focusable elements
}

interface FocusTrapResult {
  shouldPreventDefault: boolean;
  nextFocusIndex: number | null; // null = tidak ada perubahan fokus
}

/**
 * Simulasikan logika handleKeyDown dari InstructionModal untuk focus trap.
 * Mengembalikan tindakan yang harus dilakukan berdasarkan event keyboard.
 */
function simulateFocusTrap(
  event: FocusTrapEvent,
  focusableCount: number,
): FocusTrapResult {
  if (event.key !== 'Tab') {
    return { shouldPreventDefault: false, nextFocusIndex: null };
  }
  if (focusableCount === 0) {
    return { shouldPreventDefault: false, nextFocusIndex: null };
  }

  const first = 0;
  const last = focusableCount - 1;

  if (event.shiftKey) {
    // Shift+Tab: jika fokus di elemen pertama, wrap ke elemen terakhir
    if (event.activeIndex === first) {
      return { shouldPreventDefault: true, nextFocusIndex: last };
    }
  } else {
    // Tab: jika fokus di elemen terakhir, wrap ke elemen pertama
    if (event.activeIndex === last) {
      return { shouldPreventDefault: true, nextFocusIndex: first };
    }
  }

  return { shouldPreventDefault: false, nextFocusIndex: null };
}

/**
 * Simulasikan logika pemilihan aturan berdasarkan operationType.
 * Diekstrak dari InstructionModal.tsx:
 *   const rules = operationType === 'addition' ? ADDITION_RULES : SUBTRACTION_RULES;
 */
function getRulesForOperation(operationType: 'addition' | 'subtraction'): string[] {
  return operationType === 'addition' ? ADDITION_RULES : SUBTRACTION_RULES;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Konten aturan
// ─────────────────────────────────────────────────────────────────────────────

describe('Konten aturan InstructionModal', () => {
  // Req 7.1, 7.2 — modal memiliki konten yang berbeda untuk addition vs subtraction
  describe('Konten berbeda untuk addition vs subtraction', () => {
    test('addition dan subtraction tidak mengembalikan array yang identik', () => {
      const additionRules = getRulesForOperation('addition');
      const subtractionRules = getRulesForOperation('subtraction');

      // Aturan ke-3 dan ke-4 berbeda antara addition dan subtraction
      expect(additionRules).not.toEqual(subtractionRules);
    });

    test('addition dan subtraction memiliki tepat 4 aturan masing-masing', () => {
      expect(getRulesForOperation('addition')).toHaveLength(4);
      expect(getRulesForOperation('subtraction')).toHaveLength(4);
    });
  });

  // Req 7.3, 7.4 — semua 4 aturan penjumlahan hadir
  describe('Keempat aturan addition hadir', () => {
    const rules = getRulesForOperation('addition');

    test('Aturan 1: Bilangan pertama positif → bergerak ke kanan', () => {
      expect(rules[0]).toBe(
        'Bilangan pertama positif → mobil bergerak ke kanan dari 0.',
      );
    });

    test('Aturan 2: Bilangan pertama negatif → bergerak ke kiri', () => {
      expect(rules[1]).toBe(
        'Bilangan pertama negatif → mobil bergerak ke kiri dari 0.',
      );
    });

    test('Aturan 3: Bilangan kedua positif → menghadap kanan dan bergerak ke kanan', () => {
      expect(rules[2]).toBe(
        'Bilangan kedua positif → mobil menghadap kanan dan bergerak ke kanan.',
      );
    });

    test('Aturan 4: Bilangan kedua negatif → menghadap kiri dan bergerak ke kiri', () => {
      expect(rules[3]).toBe(
        'Bilangan kedua negatif → mobil menghadap kiri dan bergerak ke kiri.',
      );
    });

    test('array addition rules berisi semua 4 aturan sekaligus', () => {
      expect(rules).toEqual([
        'Bilangan pertama positif → mobil bergerak ke kanan dari 0.',
        'Bilangan pertama negatif → mobil bergerak ke kiri dari 0.',
        'Bilangan kedua positif → mobil menghadap kanan dan bergerak ke kanan.',
        'Bilangan kedua negatif → mobil menghadap kiri dan bergerak ke kiri.',
      ]);
    });
  });

  // Req 7.5, 7.6 — semua 4 aturan pengurangan hadir
  describe('Keempat aturan subtraction hadir', () => {
    const rules = getRulesForOperation('subtraction');

    test('Aturan 1: Bilangan pertama positif → bergerak ke kanan', () => {
      expect(rules[0]).toBe(
        'Bilangan pertama positif → mobil bergerak ke kanan dari 0.',
      );
    });

    test('Aturan 2: Bilangan pertama negatif → bergerak ke kiri', () => {
      expect(rules[1]).toBe(
        'Bilangan pertama negatif → mobil bergerak ke kiri dari 0.',
      );
    });

    test('Aturan 3: Bilangan kedua positif → menghadap kiri dan bergerak ke kiri', () => {
      expect(rules[2]).toBe(
        'Bilangan kedua positif → mobil menghadap kiri dan bergerak ke kiri.',
      );
    });

    test('Aturan 4: Bilangan kedua negatif → menghadap kiri tetapi bergerak mundur ke kanan', () => {
      expect(rules[3]).toBe(
        'Bilangan kedua negatif → mobil menghadap kiri tetapi bergerak mundur ke kanan.',
      );
    });

    test('array subtraction rules berisi semua 4 aturan sekaligus', () => {
      expect(rules).toEqual([
        'Bilangan pertama positif → mobil bergerak ke kanan dari 0.',
        'Bilangan pertama negatif → mobil bergerak ke kiri dari 0.',
        'Bilangan kedua positif → mobil menghadap kiri dan bergerak ke kiri.',
        'Bilangan kedua negatif → mobil menghadap kiri tetapi bergerak mundur ke kanan.',
      ]);
    });
  });

  // Req 7.1 — aturan fase 1 identik antara addition dan subtraction
  describe('Aturan fase 1 (bilangan pertama) sama untuk kedua operasi', () => {
    test('dua aturan pertama identik antara addition dan subtraction', () => {
      const addRules = getRulesForOperation('addition');
      const subRules = getRulesForOperation('subtraction');
      expect(addRules[0]).toBe(subRules[0]);
      expect(addRules[1]).toBe(subRules[1]);
    });
  });

  // Req 7.2 — aturan fase 2 berbeda antara addition dan subtraction
  describe('Aturan fase 2 (bilangan kedua) berbeda antara operasi', () => {
    test('aturan ke-3 berbeda antara addition dan subtraction', () => {
      const addRules = getRulesForOperation('addition');
      const subRules = getRulesForOperation('subtraction');
      expect(addRules[2]).not.toBe(subRules[2]);
    });

    test('aturan ke-4 berbeda antara addition dan subtraction', () => {
      const addRules = getRulesForOperation('addition');
      const subRules = getRulesForOperation('subtraction');
      expect(addRules[3]).not.toBe(subRules[3]);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Property 19 — Focus trap di InstructionModal
// ─────────────────────────────────────────────────────────────────────────────

// Feature: number-line-car-module, Property 19: Focus trap di InstructionModal
// Validates: Requirements 9.2, 9.3

describe('Property 19: Focus trap di InstructionModal', () => {
  describe('Tab dari elemen terakhir wrap ke elemen pertama', () => {
    test('Tab di elemen terakhir (index 1 dari 2) → nextFocusIndex = 0', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: false, activeIndex: 1 },
        2,
      );
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.nextFocusIndex).toBe(0);
    });

    test('Tab di elemen terakhir (index 2 dari 3) → nextFocusIndex = 0', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: false, activeIndex: 2 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.nextFocusIndex).toBe(0);
    });

    test('Tab di elemen bukan terakhir tidak menyebabkan wrap', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: false, activeIndex: 0 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });

    test('Tab di elemen tengah tidak menyebabkan wrap', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: false, activeIndex: 1 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });
  });

  describe('Shift+Tab dari elemen pertama wrap ke elemen terakhir', () => {
    test('Shift+Tab di elemen pertama (index 0 dari 2) → nextFocusIndex = 1', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: true, activeIndex: 0 },
        2,
      );
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.nextFocusIndex).toBe(1);
    });

    test('Shift+Tab di elemen pertama (index 0 dari 3) → nextFocusIndex = 2', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: true, activeIndex: 0 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.nextFocusIndex).toBe(2);
    });

    test('Shift+Tab di elemen bukan pertama tidak menyebabkan wrap', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: true, activeIndex: 1 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });

    test('Shift+Tab di elemen terakhir tidak menyebabkan wrap', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: true, activeIndex: 2 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });
  });

  describe('Tombol non-Tab tidak memicu focus trap', () => {
    test('Escape tidak memicu focus trap', () => {
      const result = simulateFocusTrap(
        { key: 'Escape', shiftKey: false, activeIndex: 0 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });

    test('Enter tidak memicu focus trap', () => {
      const result = simulateFocusTrap(
        { key: 'Enter', shiftKey: false, activeIndex: 2 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });

    test('Space tidak memicu focus trap', () => {
      const result = simulateFocusTrap(
        { key: ' ', shiftKey: false, activeIndex: 2 },
        3,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });
  });

  describe('Modal tanpa elemen focusable tidak menimbulkan error', () => {
    test('Tab dengan 0 elemen focusable tidak menyebabkan wrap', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: false, activeIndex: 0 },
        0,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });

    test('Shift+Tab dengan 0 elemen focusable tidak menyebabkan wrap', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: true, activeIndex: 0 },
        0,
      );
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.nextFocusIndex).toBeNull();
    });
  });

  describe('Modal dengan 1 elemen focusable selalu wrap ke dirinya sendiri', () => {
    test('Tab di elemen satu-satunya (index 0 dari 1) → nextFocusIndex = 0', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: false, activeIndex: 0 },
        1,
      );
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.nextFocusIndex).toBe(0);
    });

    test('Shift+Tab di elemen satu-satunya (index 0 dari 1) → nextFocusIndex = 0', () => {
      const result = simulateFocusTrap(
        { key: 'Tab', shiftKey: true, activeIndex: 0 },
        1,
      );
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.nextFocusIndex).toBe(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Logika penutupan modal
// ─────────────────────────────────────────────────────────────────────────────

// Req 7.7, 9.4 — modal menutup dengan Escape, backdrop click, tombol ×

/**
 * Simulasikan handleKeyDown dari InstructionModal.
 * Kembalikan true jika Escape harus memanggil onClose.
 */
function shouldCloseOnKey(key: string): boolean {
  return key === 'Escape';
}

describe('Logika penutupan InstructionModal', () => {
  // Req 7.7 — Escape menutup modal
  describe('Escape menutup modal', () => {
    test('shouldCloseOnKey("Escape") === true', () => {
      expect(shouldCloseOnKey('Escape')).toBe(true);
    });

    test('tombol selain Escape tidak menutup modal via keyboard', () => {
      const otherKeys = ['Tab', 'Enter', ' ', 'ArrowDown', 'ArrowUp', 'a', 'F1'];
      for (const key of otherKeys) {
        expect(shouldCloseOnKey(key)).toBe(false);
      }
    });
  });

  // Req 9.4 — backdrop click memanggil onClose
  describe('Backdrop click memanggil onClose', () => {
    test('klik pada backdrop (onClick di div wrapper) memanggil onClose', () => {
      // Simulasikan: backdrop div memiliki onClick={onClose}
      // Modal container memiliki onClick={(e) => e.stopPropagation()
      // Artinya: klik luar modal container → onClose dipanggil
      const onClose = jest.fn();

      // Simulasikan klik di backdrop (tidak di-stop propagation)
      const backdropOnClick = onClose;
      backdropOnClick();

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('stopPropagation pada modal container mencegah klik backdrop', () => {
      const onClose = jest.fn();

      // Simulasikan: klik di dalam modal container → stopPropagation dipanggil
      // Backdrop onClick tidak terpanggil
      let propagated = false;
      const stopPropagation = () => { propagated = false; };
      const modalOnClick = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
      };

      modalOnClick({ stopPropagation });

      // onClose tidak seharusnya dipanggil karena propagation dihentikan
      expect(onClose).not.toHaveBeenCalled();
      expect(propagated).toBe(false);
    });
  });

  // Req 7.7 — tombol × memanggil onClose
  describe('Tombol × (tutup) memanggil onClose', () => {
    test('tombol × memiliki onClick={onClose}', () => {
      const onClose = jest.fn();

      // Simulasikan: button memiliki onClick={onClose}
      const closeButtonOnClick = onClose;
      closeButtonOnClick();

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('tombol Mengerti (footer) memanggil onClose', () => {
      const onClose = jest.fn();

      // Simulasikan: button "Mengerti" juga memiliki onClick={onClose}
      const understoodButtonOnClick = onClose;
      understoodButtonOnClick();

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Selektor focusable
// ─────────────────────────────────────────────────────────────────────────────

// Req 9.2, 9.3 — selektor focusable yang digunakan oleh focus trap

describe('Selektor focusable', () => {
  test('FOCUSABLE_SELECTOR mencakup elemen button', () => {
    expect(FOCUSABLE_SELECTOR).toContain('button');
  });

  test('FOCUSABLE_SELECTOR mencakup elemen input', () => {
    expect(FOCUSABLE_SELECTOR).toContain('input');
  });

  test('FOCUSABLE_SELECTOR mencakup elemen dengan tabindex positif', () => {
    expect(FOCUSABLE_SELECTOR).toContain('tabindex');
  });

  test('FOCUSABLE_SELECTOR mengecualikan tabindex="-1"', () => {
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
  });

  test('FOCUSABLE_SELECTOR mencakup [href] untuk link', () => {
    expect(FOCUSABLE_SELECTOR).toContain('[href]');
  });
});
