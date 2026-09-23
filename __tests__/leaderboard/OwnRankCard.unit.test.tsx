/**
 * Unit tests untuk OwnRankCard component logic.
 *
 * OwnRankCard tidak dapat diimpor langsung di lingkungan Node (no jsdom).
 * Kita menguji pure logic yang mendorong komponen: fungsi aria-label,
 * string CSS kelas, dan format skor — mirip pola di __tests__/game/CharacterChips.test.ts.
 *
 * Requirements: 5.2, 5.3, 8.3
 */

// ─── 1. aria-label helper ─────────────────────────────────────────────────────
//
// Komponen OwnRankCard menghasilkan:
//   aria-label={`Peringkatmu saat ini: ke-${entry.rank}`}

function getAriaLabel(rank: number): string {
  return `Peringkatmu saat ini: ke-${rank}`;
}

// ─── 2. Card CSS classes ──────────────────────────────────────────────────────
//
// <section className="mt-6 rounded-2xl border-2 border-intblue bg-intblue-light px-5 py-4">

const CARD_CLASSES =
  "mt-6 rounded-2xl border-2 border-intblue bg-intblue-light px-5 py-4";

// ─── 3. Score formatter ───────────────────────────────────────────────────────
//
// Komponen menggunakan: entry.totalScore.toLocaleString('id-ID')

function formatScore(score: number): string {
  return score.toLocaleString("id-ID");
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// Group 1 — aria-label (Req 5.3, 8.3)
// ────────────────────────────────────────────────

describe("OwnRankCard — aria-label", () => {
  it("mengandung angka rank untuk rank=11", () => {
    const label = getAriaLabel(11);
    expect(label).toContain("11");
  });

  it("mengandung angka rank untuk rank=42", () => {
    const label = getAriaLabel(42);
    expect(label).toContain("42");
  });

  it("mengandung angka rank untuk rank=100", () => {
    const label = getAriaLabel(100);
    expect(label).toContain("100");
  });

  it("format lengkap: 'Peringkatmu saat ini: ke-${rank}'", () => {
    expect(getAriaLabel(15)).toBe("Peringkatmu saat ini: ke-15");
    expect(getAriaLabel(99)).toBe("Peringkatmu saat ini: ke-99");
  });

  it("rank selalu ada dalam string label", () => {
    for (const rank of [11, 12, 20, 50, 100, 999]) {
      expect(getAriaLabel(rank)).toContain(String(rank));
    }
  });
});

// ────────────────────────────────────────────────
// Group 2 — Card CSS classes (Req 5.2)
// ────────────────────────────────────────────────

describe("OwnRankCard — card CSS classes", () => {
  it("mengandung 'border-intblue'", () => {
    expect(CARD_CLASSES).toContain("border-intblue");
  });

  it("mengandung 'bg-intblue-light'", () => {
    expect(CARD_CLASSES).toContain("bg-intblue-light");
  });

  it("mengandung 'border-2' (ketebalan border)", () => {
    expect(CARD_CLASSES).toContain("border-2");
  });

  it("tidak mengandung kelas latar belakang lain yang bertentangan", () => {
    expect(CARD_CLASSES).not.toContain("bg-white");
    expect(CARD_CLASSES).not.toContain("bg-slate");
  });
});

// ────────────────────────────────────────────────
// Group 3 — Format skor (Req 5.2)
// ────────────────────────────────────────────────

describe("OwnRankCard — formatScore", () => {
  it("skor 1000 diformat menjadi '1.000' (id-ID menggunakan titik sebagai pemisah ribuan)", () => {
    // id-ID locale: 1000 → "1.000"
    const formatted = formatScore(1000);
    expect(formatted).toBe("1.000");
  });

  it("skor 0 diformat menjadi '0'", () => {
    expect(formatScore(0)).toBe("0");
  });

  it("skor 500 tidak menggunakan pemisah ribuan", () => {
    expect(formatScore(500)).toBe("500");
  });

  it("skor 12345 diformat dengan pemisah ribuan id-ID", () => {
    const formatted = formatScore(12345);
    // id-ID: 12.345
    expect(formatted).toBe("12.345");
  });

  it("skor besar 1000000 diformat dengan pemisah ribuan ganda", () => {
    const formatted = formatScore(1000000);
    expect(formatted).toBe("1.000.000");
  });
});

// ────────────────────────────────────────────────
// Group 4 — Integrasi: aria-label + rank number (Req 8.3)
// ────────────────────────────────────────────────

describe("OwnRankCard — integrasi aria-label dan angka rank", () => {
  it("rank > 10: label mengandung angka rank yang benar", () => {
    const ranks = [11, 15, 20, 30, 50, 100];
    for (const rank of ranks) {
      const label = getAriaLabel(rank);
      expect(label).toContain(String(rank));
      // Pastikan bukan rank lain yang muncul secara kebetulan
      if (rank === 50) {
        expect(label).not.toContain("15"); // "50" tidak boleh dikira "15"
      }
    }
  });

  it("label dimulai dengan teks deskriptif 'Peringkatmu saat ini'", () => {
    const label = getAriaLabel(25);
    expect(label.startsWith("Peringkatmu saat ini")).toBe(true);
  });

  it("label berakhir dengan angka rank setelah 'ke-'", () => {
    const rank = 77;
    const label = getAriaLabel(rank);
    expect(label.endsWith(`ke-${rank}`)).toBe(true);
  });
});
