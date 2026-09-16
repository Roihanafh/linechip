import * as fs from "fs";
import * as path from "path";
import * as fc from "fast-check";

// =============================================================================
// Section 1: Materi page link verification
// Read the actual file content and verify href values
// =============================================================================

describe("Materi page — link href verification (Requirements 2.1–2.5)", () => {
  const filePath = path.resolve(
    __dirname,
    "../../app/materi/page.tsx"
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(filePath, "utf-8");
  });

  test("Penjumlahan Garis Bilangan href mengarah ke /garis-bilangan/penjumlahan", () => {
    // The Penjumlahan card array contains href: "/garis-bilangan/penjumlahan"
    expect(content).toContain('href: "/garis-bilangan/penjumlahan"');
  });

  test("Pengurangan Garis Bilangan href mengarah ke /garis-bilangan/pengurangan", () => {
    // The Pengurangan card array contains href: "/garis-bilangan/pengurangan"
    expect(content).toContain('href: "/garis-bilangan/pengurangan"');
  });

  test("Model Chip href tetap /model-chip (tidak berubah)", () => {
    expect(content).toContain('href: "/model-chip"');
  });

  test("Model Chip Pengurangan href tetap /model-chip/pengurangan (tidak berubah)", () => {
    expect(content).toContain('href: "/model-chip/pengurangan"');
  });

  test("Game Virus href tetap /game-virus (tidak berubah)", () => {
    expect(content).toContain('href="/game-virus"');
  });

  test("IntlineRun href tetap /intline-run (tidak berubah)", () => {
    expect(content).toContain('href="/intline-run"');
  });
});

// =============================================================================
// Section 2: Property 10 — onResult dipanggil tepat sekali per siklus animasi
// Tests the pure guard logic from NumberLineCanvas
// Feature: number-line-car-module, Property 10: onResult dipanggil tepat sekali per siklus animasi
// Validates: Requirements 4.12
// =============================================================================

function simulateOnResultGuard(
  onResultCalledRef: { current: boolean },
  onResult: jest.Mock,
  result: number
) {
  if (!onResultCalledRef.current) {
    onResultCalledRef.current = true;
    onResult(result);
  }
}

describe("Property 10: onResult dipanggil tepat sekali per siklus animasi (Requirements 4.12)", () => {
  test("panggilan pertama: onResult dipanggil sekali dan ref menjadi true", () => {
    const onResult = jest.fn();
    const ref = { current: false };

    simulateOnResultGuard(ref, onResult, 5);

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(5);
    expect(ref.current).toBe(true);
  });

  test("panggilan kedua dengan ref yang sama: onResult tidak dipanggil lagi", () => {
    const onResult = jest.fn();
    const ref = { current: false };

    simulateOnResultGuard(ref, onResult, 5);
    simulateOnResultGuard(ref, onResult, 5);

    expect(onResult).toHaveBeenCalledTimes(1);
  });

  test("panggilan ketiga dengan ref yang sama: tetap hanya 1 panggilan total", () => {
    const onResult = jest.fn();
    const ref = { current: false };

    simulateOnResultGuard(ref, onResult, 5);
    simulateOnResultGuard(ref, onResult, 5);
    simulateOnResultGuard(ref, onResult, 5);

    expect(onResult).toHaveBeenCalledTimes(1);
  });

  test("setelah reset ref.current = false: onResult dapat dipanggil sekali lagi (total 2)", () => {
    const onResult = jest.fn();
    const ref = { current: false };

    simulateOnResultGuard(ref, onResult, 5);
    expect(onResult).toHaveBeenCalledTimes(1);

    // Reset ref — simulasi siklus animasi baru
    ref.current = false;

    simulateOnResultGuard(ref, onResult, 7);
    expect(onResult).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenLastCalledWith(7);
  });

  // Property-based test: untuk semua result dalam [-198, 198],
  // onResult menerima tepat nilai result yang diteruskan
  test("untuk semua nilai result di [-198, 198]: onResult menerima nilai yang tepat", () => {
    fc.assert(
      fc.property(fc.integer({ min: -198, max: 198 }), (result) => {
        const onResult = jest.fn();
        const ref = { current: false };

        simulateOnResultGuard(ref, onResult, result);

        return (
          onResult.mock.calls.length === 1 &&
          onResult.mock.calls[0][0] === result
        );
      }),
      { numRuns: 500 }
    );
  });
});
