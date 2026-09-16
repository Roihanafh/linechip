import * as fs from "fs";
import * as path from "path";

// Feature: number-line-car-module
// Validates: Requirements 1.3, 1.4, 1.5

const ROOT = path.resolve(__dirname, "../..");

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf-8");
}

// ─── 1. app/garis-bilangan/page.tsx — redirect ke penjumlahan ───────────────

describe("app/garis-bilangan/page.tsx — server-side redirect", () => {
  let src: string;

  beforeAll(() => {
    src = readFile("app/garis-bilangan/page.tsx");
  });

  test('berisi redirect("/garis-bilangan/penjumlahan")', () => {
    expect(src).toContain('redirect("/garis-bilangan/penjumlahan")');
  });

  test('TIDAK mengandung "use client" (harus server component)', () => {
    expect(src).not.toContain('"use client"');
  });
});

// ─── 2. app/garis-bilangan/penjumlahan/page.tsx ──────────────────────────────

describe("app/garis-bilangan/penjumlahan/page.tsx — heading dan operator", () => {
  let src: string;

  beforeAll(() => {
    src = readFile("app/garis-bilangan/penjumlahan/page.tsx");
  });

  test('mengandung heading "Penjumlahan Bilangan Bulat"', () => {
    expect(src).toContain("Penjumlahan Bilangan Bulat");
  });

  test('mengandung operation="+" (operator tetap)', () => {
    expect(src).toContain('operation="+"');
  });

  test("TIDAK mengandung kontrol toggle operator (changeOp / setOp)", () => {
    expect(src).not.toMatch(/changeOp|setOp/);
  });
});

// ─── 3. app/garis-bilangan/pengurangan/page.tsx ──────────────────────────────

describe("app/garis-bilangan/pengurangan/page.tsx — heading dan operator", () => {
  let src: string;

  beforeAll(() => {
    src = readFile("app/garis-bilangan/pengurangan/page.tsx");
  });

  test('mengandung heading "Pengurangan Bilangan Bulat"', () => {
    expect(src).toContain("Pengurangan Bilangan Bulat");
  });

  test('mengandung operation="-" (operator tetap)', () => {
    expect(src).toContain('operation="-"');
  });

  test("TIDAK mengandung kontrol toggle operator (changeOp / setOp)", () => {
    expect(src).not.toMatch(/changeOp|setOp/);
  });
});

// ─── 4. Metadata title di layout ─────────────────────────────────────────────

describe("Layout metadata titles", () => {
  test('penjumlahan/layout.tsx mengandung "Penjumlahan Bilangan Bulat"', () => {
    const src = readFile("app/garis-bilangan/penjumlahan/layout.tsx");
    expect(src).toContain("Penjumlahan Bilangan Bulat");
  });

  test('pengurangan/layout.tsx mengandung "Pengurangan Bilangan Bulat"', () => {
    const src = readFile("app/garis-bilangan/pengurangan/layout.tsx");
    expect(src).toContain("Pengurangan Bilangan Bulat");
  });
});

// ─── 5. AppShell MAIN_ROUTES ─────────────────────────────────────────────────

describe("components/AppShell.tsx — MAIN_ROUTES", () => {
  let src: string;

  beforeAll(() => {
    src = readFile("components/AppShell.tsx");
  });

  test('mengandung "/garis-bilangan/penjumlahan"', () => {
    expect(src).toContain('"/garis-bilangan/penjumlahan"');
  });

  test('mengandung "/garis-bilangan/pengurangan"', () => {
    expect(src).toContain('"/garis-bilangan/pengurangan"');
  });
});
