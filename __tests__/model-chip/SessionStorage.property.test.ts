/**
 * Property-based test for sessionStorage persistence logic in app/model-chip/page.tsx.
 *
 * Tests pure state-machine logic — no React rendering, no jsdom. Models
 * sessionStorage as a plain Map<string, string> to avoid environment
 * dependencies. Mirrors the established pattern in:
 *   - __tests__/model-chip/ClickMode.property.test.ts
 *   - __tests__/model-chip/Tombol_Lanjut.property.test.ts
 *
 * The logic under test mirrors two fragments from app/model-chip/page.tsx:
 *
 *   // Lazy initializer (useState)
 *   try {
 *     const saved = sessionStorage.getItem("modelChipAnimMode");
 *     return saved === "click" ? "click" : "auto";
 *   } catch {
 *     return "auto";
 *   }
 *
 *   // Write side-effect (useEffect)
 *   try { sessionStorage.setItem("modelChipAnimMode", animMode); } catch {}
 *
 * **Property 1: sessionStorage round-trip**
 * **Validates: Requirements 1.3**
 */

import * as fc from "fast-check";

// ── Types ─────────────────────────────────────────────────────────────────────

type AnimMode = "auto" | "click";

// ── Pure model of the sessionStorage layer ───────────────────────────────────
//
// We represent sessionStorage as a plain Map<string, string>. Each helper
// mirrors the exact try/catch pattern used in page.tsx so the property tests
// are structurally identical to the production code.

const STORAGE_KEY = "modelChipAnimMode";

/**
 * Mirrors the `useEffect` write in page.tsx:
 *   try { sessionStorage.setItem("modelChipAnimMode", animMode); } catch {}
 *
 * Returns the updated store (new Map so tests remain side-effect free).
 * On a simulated error, leaves the store unchanged.
 */
function writeToStore(
  store: Map<string, string>,
  mode: AnimMode,
  throwOnWrite = false
): Map<string, string> {
  try {
    if (throwOnWrite) throw new Error("storage unavailable");
    const next = new Map(store);
    next.set(STORAGE_KEY, mode);
    return next;
  } catch {
    return store;
  }
}

/**
 * Mirrors the lazy initializer in page.tsx:
 *   try {
 *     const saved = sessionStorage.getItem("modelChipAnimMode");
 *     return saved === "click" ? "click" : "auto";
 *   } catch {
 *     return "auto";
 *   }
 *
 * When `throwOnRead` is true, the get call throws (simulates unavailable
 * sessionStorage) and the fallback "auto" is returned.
 */
function readFromStore(
  store: Map<string, string>,
  throwOnRead = false
): AnimMode {
  try {
    if (throwOnRead) throw new Error("storage unavailable");
    const saved = store.get(STORAGE_KEY);
    return saved === "click" ? "click" : "auto";
  } catch {
    return "auto";
  }
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const animModeArb = fc.constantFrom<AnimMode>("auto", "click");

/**
 * Arbitrary string that is guaranteed NOT to be exactly "click".
 * Used for the robustness sub-property (any non-click string → "auto").
 */
const nonClickStringArb = fc.string().filter((s) => s !== "click");

// ── Property 1 ────────────────────────────────────────────────────────────────

describe("Property 1: sessionStorage round-trip", () => {
  /**
   * Core round-trip property: for any valid animMode value, writing it via
   * writeToStore and reading it back via readFromStore must return the same
   * value.
   *
   * This validates that the lazy initializer correctly reconstructs the mode
   * that was persisted by the useEffect — i.e. after pressing "Ulangi" or
   * opening a new model-chip session within the same browser tab, the mode
   * preference is preserved.
   *
   * **Validates: Requirements 1.3**
   */
  it(
    "round-trip: write(mode) → read() === mode, untuk semua nilai animMode yang valid",
    () => {
      fc.assert(
        fc.property(animModeArb, (mode) => {
          const store: Map<string, string> = new Map();
          const afterWrite = writeToStore(store, mode);
          const readBack = readFromStore(afterWrite);
          expect(readBack).toBe(mode);
        }),
        { numRuns: 100 }
      );
    }
  );

  /**
   * Explicit example: "auto" round-trips correctly.
   */
  it('round-trip eksplisit: write("auto") → read() === "auto"', () => {
    const store: Map<string, string> = new Map();
    const afterWrite = writeToStore(store, "auto");
    expect(readFromStore(afterWrite)).toBe("auto");
  });

  /**
   * Explicit example: "click" round-trips correctly.
   */
  it('round-trip eksplisit: write("click") → read() === "click"', () => {
    const store: Map<string, string> = new Map();
    const afterWrite = writeToStore(store, "click");
    expect(readFromStore(afterWrite)).toBe("click");
  });

  /**
   * Lazy initializer property: reads store.get(key), returns "click" only
   * if the stored value is exactly "click", otherwise "auto".
   *
   * Tests the exact conditional in page.tsx:
   *   return saved === "click" ? "click" : "auto";
   */
  it(
    'lazy initializer: mengembalikan "click" hanya jika nilai tersimpan PERSIS "click"',
    () => {
      fc.assert(
        fc.property(animModeArb, (mode) => {
          const store: Map<string, string> = new Map([[STORAGE_KEY, mode]]);
          const result = readFromStore(store);
          expect(result).toBe(mode); // "click" → "click", "auto" → "auto"
        }),
        { numRuns: 100 }
      );
    }
  );

  /**
   * Robustness property: any arbitrary string that is NOT exactly "click"
   * must cause the initializer to return "auto".
   *
   * This covers edge cases such as corrupted values, typos, or unexpected
   * writes by other code to the same sessionStorage key.
   *
   * **Validates: Requirements 1.6 (implicit — any non-"click" value → default "auto")**
   */
  it(
    'robustness: semua string yang bukan persis "click" menghasilkan "auto"',
    () => {
      fc.assert(
        fc.property(nonClickStringArb, (arbitraryValue) => {
          const store: Map<string, string> = new Map([[STORAGE_KEY, arbitraryValue]]);
          const result = readFromStore(store);
          expect(result).toBe("auto");
        }),
        { numRuns: 100 }
      );
    }
  );

  /**
   * Empty store fallback: if the key is absent (first visit, cleared storage,
   * or after Ulangi before any write), the initializer must return "auto".
   *
   * **Validates: Requirements 1.6**
   */
  it('empty store: kunci tidak ada → fallback "auto"', () => {
    const store: Map<string, string> = new Map();
    expect(readFromStore(store)).toBe("auto");
  });

  /**
   * Error fallback property: when the read operation throws (e.g. private
   * browsing mode, storage quota exceeded, security policy), the initializer
   * must return "auto" regardless of what was previously written.
   *
   * **Validates: Requirements 1.6**
   */
  it(
    'error fallback: store.get throws → fallback "auto", untuk animMode manapun yang ditulis sebelumnya',
    () => {
      fc.assert(
        fc.property(animModeArb, (mode) => {
          // Write succeeds, but read throws
          const store: Map<string, string> = new Map();
          const afterWrite = writeToStore(store, mode);
          const result = readFromStore(afterWrite, /* throwOnRead */ true);
          expect(result).toBe("auto");
        }),
        { numRuns: 100 }
      );
    }
  );

  /**
   * Write-error safety: when the write operation throws, the store is left
   * unchanged and the next read still returns the previous value (or "auto" if
   * the key was absent before).
   */
  it(
    "write error: store tidak berubah jika writeToStore melempar; read sebelumnya tetap terjaga",
    () => {
      fc.assert(
        fc.property(animModeArb, fc.constantFrom<AnimMode>("auto", "click"), (existing, incoming) => {
          // Pre-populate store with `existing`
          const store: Map<string, string> = new Map([[STORAGE_KEY, existing]]);
          // Attempt to write `incoming` but simulate failure
          const afterFailedWrite = writeToStore(store, incoming, /* throwOnWrite */ true);
          // Store must be unchanged
          const result = readFromStore(afterFailedWrite);
          expect(result).toBe(existing);
        }),
        { numRuns: 100 }
      );
    }
  );

  /**
   * Idempotency: writing the same mode twice produces the same read result
   * as writing it once.
   *
   * Mirrors "Ulangi" being pressed and the useEffect re-firing with the same
   * animMode value.
   */
  it(
    "idempotency: write(mode) dua kali menghasilkan read yang sama dengan write sekali",
    () => {
      fc.assert(
        fc.property(animModeArb, (mode) => {
          const store: Map<string, string> = new Map();
          const afterOne = writeToStore(store, mode);
          const afterTwo = writeToStore(afterOne, mode);
          expect(readFromStore(afterTwo)).toBe(readFromStore(afterOne));
        }),
        { numRuns: 100 }
      );
    }
  );

  /**
   * Last-write-wins: the most recent write determines what is read back.
   * Simulates pressing the mode selector twice (changing from "auto" to
   * "click" or vice versa).
   */
  it(
    "last-write-wins: write kedua menimpa write pertama",
    () => {
      fc.assert(
        fc.property(animModeArb, animModeArb, (first, second) => {
          const store: Map<string, string> = new Map();
          const afterFirst = writeToStore(store, first);
          const afterSecond = writeToStore(afterFirst, second);
          expect(readFromStore(afterSecond)).toBe(second);
        }),
        { numRuns: 100 }
      );
    }
  );
});
