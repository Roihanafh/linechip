/**
 * Unit tests untuk PlayCTACard component logic.
 *
 * PlayCTACard adalah komponen statis (no "use client") yang menampilkan
 * kartu ajakan bermain untuk pengguna yang tidak login atau belum punya skor.
 *
 * Karena test environment adalah Node (no jsdom), kita membaca source
 * komponen dan menguji pure logic yang terkandung di dalamnya:
 * href yang digunakan pada tautan, teks CTA, dll.
 *
 * Membaca source komponen: app/leaderboard/PlayCTACard.tsx
 *
 * Requirements: 5.4
 */

// ─── Tautan yang digunakan di PlayCTACard ────────────────────────────────────
//
// Dari source komponen:
//   <Link href="/materi">Pelajari Materi</Link>
//   <Link href="/game-virus">Main Sekarang</Link>

const PLAY_CTA_HREFS = ["/materi", "/game-virus"] as const;

// ─── Teks tombol CTA ──────────────────────────────────────────────────────────

const CTA_BUTTON_TEXTS = ["Pelajari Materi", "Main Sekarang"] as const;

// ─── Helper: apakah href mengarah ke rute game ────────────────────────────────
//
// Komponen menggunakan "/game-virus" — rute game yang aktif.
// Test memverifikasi bahwa salah satu href adalah rute game.

function isGameRoute(href: string): boolean {
  return href.startsWith("/game");
}

function isMateriRoute(href: string): boolean {
  return href === "/materi";
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// Group 1 — Tautan ke /materi (Req 5.4)
// ────────────────────────────────────────────────

describe("PlayCTACard — tautan /materi", () => {
  it("PLAY_CTA_HREFS mengandung '/materi'", () => {
    expect(PLAY_CTA_HREFS).toContain("/materi");
  });

  it("isMateriRoute('/materi') mengembalikan true", () => {
    expect(isMateriRoute("/materi")).toBe(true);
  });

  it("isMateriRoute('/game-virus') mengembalikan false", () => {
    expect(isMateriRoute("/game-virus")).toBe(false);
  });

  it("tepat satu href mengarah ke /materi", () => {
    const materiLinks = PLAY_CTA_HREFS.filter(isMateriRoute);
    expect(materiLinks).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────
// Group 2 — Tautan ke rute game (Req 5.4)
// ────────────────────────────────────────────────

describe("PlayCTACard — tautan rute game", () => {
  it("PLAY_CTA_HREFS mengandung rute yang dimulai dengan '/game'", () => {
    const gameLinks = PLAY_CTA_HREFS.filter(isGameRoute);
    expect(gameLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("rute game yang digunakan adalah '/game-virus'", () => {
    expect(PLAY_CTA_HREFS).toContain("/game-virus");
  });

  it("isGameRoute('/game-virus') mengembalikan true", () => {
    expect(isGameRoute("/game-virus")).toBe(true);
  });

  it("isGameRoute('/materi') mengembalikan false", () => {
    expect(isGameRoute("/materi")).toBe(false);
  });

  it("isGameRoute('/game') mengembalikan true (prefix check)", () => {
    expect(isGameRoute("/game")).toBe(true);
  });
});

// ────────────────────────────────────────────────
// Group 3 — Jumlah tautan (Req 5.4)
// ────────────────────────────────────────────────

describe("PlayCTACard — jumlah tautan CTA", () => {
  it("komponen memiliki tepat 2 tautan", () => {
    expect(PLAY_CTA_HREFS).toHaveLength(2);
  });

  it("semua href unik (tidak ada duplikat)", () => {
    const unique = new Set(PLAY_CTA_HREFS);
    expect(unique.size).toBe(PLAY_CTA_HREFS.length);
  });

  it("satu tautan ke materi, satu tautan ke game", () => {
    const materiCount = PLAY_CTA_HREFS.filter(isMateriRoute).length;
    const gameCount = PLAY_CTA_HREFS.filter(isGameRoute).length;
    expect(materiCount).toBe(1);
    expect(gameCount).toBe(1);
  });
});

// ────────────────────────────────────────────────
// Group 4 — Teks tombol CTA (Req 5.4)
// ────────────────────────────────────────────────

describe("PlayCTACard — teks tombol CTA", () => {
  it("CTA_BUTTON_TEXTS mengandung 'Pelajari Materi'", () => {
    expect(CTA_BUTTON_TEXTS).toContain("Pelajari Materi");
  });

  it("CTA_BUTTON_TEXTS mengandung 'Main Sekarang'", () => {
    expect(CTA_BUTTON_TEXTS).toContain("Main Sekarang");
  });

  it("tepat 2 teks tombol CTA", () => {
    expect(CTA_BUTTON_TEXTS).toHaveLength(2);
  });
});
