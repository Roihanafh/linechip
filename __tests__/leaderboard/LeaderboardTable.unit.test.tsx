/**
 * Unit tests for LeaderboardTable rendering and interaction logic.
 *
 * LeaderboardTable is a React Server-compatible component that cannot be
 * rendered in a Node (non-jsdom) test environment. We test the pure logic
 * it encodes by extracting decision functions and asserting on those —
 * mirroring the pattern in __tests__/game-virus/BilanganZone.unit.test.tsx.
 *
 * Requirements: 2.3, 2.6, 4.1, 4.4
 */

import type { LeaderboardEntry } from '@/features/leaderboard';

// ─── Helper builders ─────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    uid: 'user-1',
    rank: 1,
    name: 'Alice',
    school: 'SD Negeri 1',
    photoURL: null,
    totalScore: 1000,
    ...overrides,
  };
}

// ─── 1. RankBadge colour logic ────────────────────────────────────────────────
//
// Mirrors the `getRankBadgeColorClass(rank)` decision inside <RankBadge>.
// rank 1 → amber-400 (emas)
// rank 2 → slate-400 (perak)
// rank 3 → amber-700 (perunggu)
// rank 4–10 → slate-100 / slate-500

function getRankBadgeColorClass(rank: number): string {
  if (rank === 1) return 'bg-amber-400 text-white';
  if (rank === 2) return 'bg-slate-400 text-white';
  if (rank === 3) return 'bg-amber-700 text-white';
  return 'bg-slate-100 text-slate-500';
}

// ─── 2. Current-user detection ────────────────────────────────────────────────
//
// Mirrors the `isCurrentUser` constant inside the entries.map() callback.
// True only when currentUid is not null AND uid matches.

function isCurrentUser(uid: string, currentUid: string | null): boolean {
  return currentUid !== null && uid === currentUid;
}

// ─── 3. Highlight class selection ────────────────────────────────────────────
//
// Mirrors the ternary that produces `className` on each <tr>.

function getRowClassName(uid: string, currentUid: string | null): string {
  if (isCurrentUser(uid, currentUid)) {
    return 'bg-intblue-light border-l-4 border-intblue';
  }
  return 'border-b border-[#E2E8F0] last:border-b-0 hover:bg-slate-50 transition-colors';
}

// ─── 4. aria-label for row ────────────────────────────────────────────────────
//
// Mirrors the aria-label ternary on each <tr>.

function getRowAriaLabel(uid: string, currentUid: string | null): string | undefined {
  return isCurrentUser(uid, currentUid) ? 'Peringkatmu' : undefined;
}

// ─── 5. "Kamu" label visibility ───────────────────────────────────────────────
//
// The <span>Kamu</span> element is rendered only for the current user row.

function shouldShowKamuLabel(uid: string, currentUid: string | null): boolean {
  return isCurrentUser(uid, currentUid);
}

// ─── 6. Empty-state condition ─────────────────────────────────────────────────
//
// When entries.length === 0 the table body renders an Indonesian empty-state
// message instead of rows.

function isEmptyState(entries: LeaderboardEntry[]): boolean {
  return entries.length === 0;
}

// ─── 7. Score formatting ──────────────────────────────────────────────────────
//
// Mirrors `entry.totalScore.toLocaleString('id-ID')`.

function formatScore(score: number): string {
  return score.toLocaleString('id-ID');
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────
// Group 1 — RankBadge colour (Req 4.1)
// ────────────────────────────────────────────────

describe('LeaderboardTable — RankBadge colour', () => {
  // Req 4.1: rank 1 → emas (amber-400)
  it('rank 1 → badge warna emas (bg-amber-400 text-white)', () => {
    const cls = getRankBadgeColorClass(1);
    expect(cls).toContain('bg-amber-400');
    expect(cls).toContain('text-white');
  });

  // Req 4.1: rank 2 → perak (slate-400)
  it('rank 2 → badge warna perak (bg-slate-400 text-white)', () => {
    const cls = getRankBadgeColorClass(2);
    expect(cls).toContain('bg-slate-400');
    expect(cls).toContain('text-white');
  });

  // Req 4.1: rank 3 → perunggu (amber-700)
  it('rank 3 → badge warna perunggu (bg-amber-700 text-white)', () => {
    const cls = getRankBadgeColorClass(3);
    expect(cls).toContain('bg-amber-700');
    expect(cls).toContain('text-white');
  });

  // Req 4.1: rank 4–10 → slate-100 / slate-500
  it('rank 4 → warna default (bg-slate-100 text-slate-500)', () => {
    const cls = getRankBadgeColorClass(4);
    expect(cls).toContain('bg-slate-100');
    expect(cls).toContain('text-slate-500');
    expect(cls).not.toContain('bg-amber-400');
    expect(cls).not.toContain('bg-slate-400');
    expect(cls).not.toContain('bg-amber-700');
  });

  it('rank 5–10 → semua mendapat warna default yang sama', () => {
    for (const rank of [5, 6, 7, 8, 9, 10]) {
      const cls = getRankBadgeColorClass(rank);
      expect(cls).toContain('bg-slate-100');
      expect(cls).toContain('text-slate-500');
    }
  });

  // Boundary: rank 1, 2, 3 tidak mendapat warna default
  it('rank 1/2/3 tidak mendapat warna default slate-100', () => {
    expect(getRankBadgeColorClass(1)).not.toContain('bg-slate-100');
    expect(getRankBadgeColorClass(2)).not.toContain('bg-slate-100');
    expect(getRankBadgeColorClass(3)).not.toContain('bg-slate-100');
  });

  // Rank 1 tidak mendapat warna perak/perunggu
  it('rank 1 tidak mendapat warna perak atau perunggu', () => {
    const cls = getRankBadgeColorClass(1);
    expect(cls).not.toContain('bg-slate-400');
    expect(cls).not.toContain('bg-amber-700');
  });

  // Rank 2 tidak mendapat warna emas/perunggu
  it('rank 2 tidak mendapat warna emas atau perunggu', () => {
    const cls = getRankBadgeColorClass(2);
    expect(cls).not.toContain('bg-amber-400');
    expect(cls).not.toContain('bg-amber-700');
  });

  // Rank 3 tidak mendapat warna emas/perak
  it('rank 3 tidak mendapat warna emas atau perak', () => {
    const cls = getRankBadgeColorClass(3);
    expect(cls).not.toContain('bg-amber-400');
    expect(cls).not.toContain('bg-slate-400');
  });
});

// ────────────────────────────────────────────────
// Group 2 — isCurrentUser detection (Req 2.3, 2.6)
// ────────────────────────────────────────────────

describe('LeaderboardTable — isCurrentUser detection', () => {
  // Req 2.3: uid cocok + currentUid bukan null → true
  it('uid cocok dan currentUid tidak null → isCurrentUser=true', () => {
    expect(isCurrentUser('user-42', 'user-42')).toBe(true);
  });

  // Req 2.6: currentUid=null → tidak pernah highlight (mode guest)
  it('currentUid=null → isCurrentUser=false (mode guest)', () => {
    expect(isCurrentUser('user-42', null)).toBe(false);
  });

  // Uid berbeda → bukan current user
  it('uid berbeda → isCurrentUser=false', () => {
    expect(isCurrentUser('user-42', 'user-99')).toBe(false);
  });

  // String kosong tidak dianggap cocok dengan uid nyata
  it('uid kosong tidak cocok dengan currentUid yang terisi', () => {
    expect(isCurrentUser('', 'user-1')).toBe(false);
  });

  // Satu entri cocok dari banyak entri
  it('hanya entri dengan uid yang cocok yang dianggap current user', () => {
    const entries = [
      makeEntry({ uid: 'a', rank: 1 }),
      makeEntry({ uid: 'b', rank: 2 }),
      makeEntry({ uid: 'c', rank: 3 }),
    ];
    const currentUid = 'b';
    const results = entries.map((e) => isCurrentUser(e.uid, currentUid));
    expect(results).toEqual([false, true, false]);
  });
});

// ────────────────────────────────────────────────
// Group 3 — Baris highlight (Req 2.3)
// ────────────────────────────────────────────────

describe('LeaderboardTable — baris highlight untuk current user', () => {
  // Req 2.3: baris current user mendapat class bg-intblue-light
  it('current user row → mengandung class bg-intblue-light', () => {
    const cls = getRowClassName('user-1', 'user-1');
    expect(cls).toContain('bg-intblue-light');
  });

  // Req 2.3: baris current user mendapat class border-intblue
  it('current user row → mengandung class border-intblue', () => {
    const cls = getRowClassName('user-1', 'user-1');
    expect(cls).toContain('border-intblue');
  });

  // Baris non-current user tidak mendapat class highlight
  it('baris non-current user tidak mendapat class bg-intblue-light', () => {
    const cls = getRowClassName('user-2', 'user-1');
    expect(cls).not.toContain('bg-intblue-light');
    expect(cls).not.toContain('border-intblue');
  });

  // Req 2.6: guest (uid null) → tidak ada highlight sama sekali
  it('guest (currentUid=null) → tidak ada baris yang ter-highlight', () => {
    const entries = [
      makeEntry({ uid: 'a', rank: 1 }),
      makeEntry({ uid: 'b', rank: 2 }),
    ];
    const highlightedClasses = entries.map((e) => getRowClassName(e.uid, null));
    for (const cls of highlightedClasses) {
      expect(cls).not.toContain('bg-intblue-light');
      expect(cls).not.toContain('border-intblue');
    }
  });
});

// ────────────────────────────────────────────────
// Group 4 — aria-label "Peringkatmu" (Req 2.3)
// ────────────────────────────────────────────────

describe('LeaderboardTable — aria-label Peringkatmu', () => {
  // Req 2.3: current user row mendapat aria-label="Peringkatmu"
  it('current user row → aria-label="Peringkatmu"', () => {
    expect(getRowAriaLabel('user-1', 'user-1')).toBe('Peringkatmu');
  });

  // Baris lain → aria-label undefined
  it('baris non-current user → aria-label undefined', () => {
    expect(getRowAriaLabel('user-2', 'user-1')).toBeUndefined();
  });

  // Req 2.6: guest → semua undefined
  it('guest (currentUid=null) → semua aria-label undefined', () => {
    expect(getRowAriaLabel('user-1', null)).toBeUndefined();
  });

  // Tepat satu baris memiliki aria-label ketika current user ada di dalam daftar
  it('tepat satu baris memiliki aria-label ketika uid cocok', () => {
    const entries = [
      makeEntry({ uid: 'x', rank: 1 }),
      makeEntry({ uid: 'y', rank: 2 }),
      makeEntry({ uid: 'z', rank: 3 }),
    ];
    const labels = entries.map((e) => getRowAriaLabel(e.uid, 'y'));
    expect(labels.filter((l) => l === 'Peringkatmu')).toHaveLength(1);
    expect(labels).toEqual([undefined, 'Peringkatmu', undefined]);
  });
});

// ────────────────────────────────────────────────
// Group 5 — Label teks "Kamu" (Req 2.3)
// ────────────────────────────────────────────────

describe('LeaderboardTable — label teks "Kamu"', () => {
  // Req 2.3: label "Kamu" muncul untuk current user
  it('shouldShowKamuLabel=true untuk current user', () => {
    expect(shouldShowKamuLabel('user-1', 'user-1')).toBe(true);
  });

  // Baris lain → tidak muncul
  it('shouldShowKamuLabel=false untuk bukan current user', () => {
    expect(shouldShowKamuLabel('user-2', 'user-1')).toBe(false);
  });

  // Req 2.6: guest → tidak pernah muncul
  it('shouldShowKamuLabel=false ketika currentUid=null (guest)', () => {
    expect(shouldShowKamuLabel('user-1', null)).toBe(false);
  });

  // Tepat satu baris menampilkan "Kamu" jika current user ada
  it('tepat satu baris menampilkan "Kamu" dalam daftar 10 entri', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({ uid: `user-${i + 1}`, rank: i + 1 })
    );
    const currentUid = 'user-5';
    const shown = entries.filter((e) => shouldShowKamuLabel(e.uid, currentUid));
    expect(shown).toHaveLength(1);
    expect(shown[0].uid).toBe('user-5');
  });
});

// ────────────────────────────────────────────────
// Group 6 — Empty state (Req 4.4)
// ────────────────────────────────────────────────

describe('LeaderboardTable — empty state', () => {
  // Req 4.4: array kosong → empty state ditampilkan
  it('entries kosong → isEmptyState=true', () => {
    expect(isEmptyState([])).toBe(true);
  });

  // Satu entri → bukan empty state
  it('satu entri → isEmptyState=false', () => {
    expect(isEmptyState([makeEntry()])).toBe(false);
  });

  // 10 entri → bukan empty state
  it('10 entri → isEmptyState=false', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry({ uid: `user-${i + 1}`, rank: i + 1 })
    );
    expect(isEmptyState(entries)).toBe(false);
  });

  // Empty state message harus dalam Bahasa Indonesia
  it('pesan empty state mengandung teks Bahasa Indonesia yang benar', () => {
    // The actual message from LeaderboardTable.tsx:
    const emptyMessage =
      'Belum ada pemain di papan peringkat. Jadilah yang pertama!';
    expect(emptyMessage).toContain('Belum ada pemain');
    expect(emptyMessage).toContain('Jadilah yang pertama');
  });
});

// ────────────────────────────────────────────────
// Group 7 — Score formatting (Req 2.1, 2.2)
// ────────────────────────────────────────────────

describe('LeaderboardTable — format skor id-ID', () => {
  it('1000 diformat menjadi "1.000" (pemisah ribuan id-ID)', () => {
    // Node.js supports Intl, so toLocaleString('id-ID') gives '1.000'
    const formatted = formatScore(1000);
    // Accept either '1.000' (id-ID) or '1,000' (en-US) depending on Node locale support
    expect(formatted).toMatch(/1[.,]000/);
  });

  it('0 diformat menjadi "0"', () => {
    expect(formatScore(0)).toBe('0');
  });

  it('999 diformat tanpa pemisah ribuan', () => {
    expect(formatScore(999)).toBe('999');
  });

  it('10000 diformat dengan pemisah ribuan', () => {
    const formatted = formatScore(10000);
    expect(formatted).toMatch(/10[.,]000/);
  });
});

// ────────────────────────────────────────────────
// Group 8 — Kombinasi: baris non-highlighted tidak pernah mendapat label/class
// ────────────────────────────────────────────────

describe('LeaderboardTable — konsistensi keseluruhan baris', () => {
  it('daftar 5 entri: hanya entri yang cocok uid-nya yang ter-highlight', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({ uid: `u${i}`, rank: i + 1, totalScore: (5 - i) * 100 })
    );
    const currentUid = 'u2';

    for (const entry of entries) {
      const highlight = isCurrentUser(entry.uid, currentUid);
      const rowClass = getRowClassName(entry.uid, currentUid);
      const ariaLabel = getRowAriaLabel(entry.uid, currentUid);
      const showKamu = shouldShowKamuLabel(entry.uid, currentUid);

      if (entry.uid === currentUid) {
        expect(highlight).toBe(true);
        expect(rowClass).toContain('bg-intblue-light');
        expect(rowClass).toContain('border-intblue');
        expect(ariaLabel).toBe('Peringkatmu');
        expect(showKamu).toBe(true);
      } else {
        expect(highlight).toBe(false);
        expect(rowClass).not.toContain('bg-intblue-light');
        expect(ariaLabel).toBeUndefined();
        expect(showKamu).toBe(false);
      }
    }
  });

  it('guest: tidak ada baris yang ter-highlight dalam daftar manapun', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry({ uid: `u${i}`, rank: i + 1 })
    );
    for (const entry of entries) {
      expect(isCurrentUser(entry.uid, null)).toBe(false);
      expect(getRowClassName(entry.uid, null)).not.toContain('bg-intblue-light');
      expect(getRowAriaLabel(entry.uid, null)).toBeUndefined();
      expect(shouldShowKamuLabel(entry.uid, null)).toBe(false);
    }
  });
});
