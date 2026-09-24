/**
 * Unit tests for admin dashboard utility functions.
 * Feature: admin-dashboard
 */

import {
  validateUid,
  filterUsers,
  paginateAll,
  selectTopN,
  applySelectedReset,
} from '@/lib/admin/utils';
import type { AdminUserRow, UserScoreEntry } from '@/lib/admin/utils';

// Helpers
function makeUser(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    uid: 'uid-1',
    name: 'Test User',
    email: 'test@example.com',
    school: 'Test School',
    totalScore: 100,
    disabled: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateUid
// ---------------------------------------------------------------------------

describe('validateUid', () => {
  it('rejects empty string', () => {
    expect(validateUid('')).toBe(false);
  });

  it('accepts single character', () => {
    expect(validateUid('a')).toBe(true);
  });

  it('accepts 128-character string', () => {
    expect(validateUid('a'.repeat(128))).toBe(true);
  });

  it('rejects 129-character string', () => {
    expect(validateUid('a'.repeat(129))).toBe(false);
  });

  it('accepts typical Firebase UID (28 chars)', () => {
    expect(validateUid('abc123XYZabc123XYZabc123XYZ1')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// filterUsers
// ---------------------------------------------------------------------------

describe('filterUsers', () => {
  const users: AdminUserRow[] = [
    makeUser({ uid: '1', name: 'Alice Smith', email: 'alice@school.id' }),
    makeUser({ uid: '2', name: 'Bob Jones', email: 'bob@example.com' }),
    makeUser({ uid: '3', name: 'Charlie Brown', email: 'charlie@edu.org' }),
  ];

  it('returns all users when query is empty string', () => {
    expect(filterUsers(users, '')).toHaveLength(3);
  });

  it('returns all users when query is 1 character', () => {
    expect(filterUsers(users, 'a')).toHaveLength(3);
  });

  it('filters by name (case-insensitive)', () => {
    const result = filterUsers(users, 'alice');
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe('1');
  });

  it('filters by name uppercase', () => {
    const result = filterUsers(users, 'ALICE');
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe('1');
  });

  it('filters by email', () => {
    const result = filterUsers(users, 'example');
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe('2');
  });

  it('returns multiple matches', () => {
    const result = filterUsers(users, 'o');
    // 'Bob Jones', 'Charlie Brown'
    const uids = result.map((u) => u.uid);
    expect(uids).toContain('2');
    expect(uids).toContain('3');
  });

  it('returns empty array when no match', () => {
    expect(filterUsers(users, 'zzzzz')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// paginateAll
// ---------------------------------------------------------------------------

describe('paginateAll', () => {
  const makeUsers = (n: number): AdminUserRow[] =>
    Array.from({ length: n }, (_, i) => makeUser({ uid: `uid-${i}` }));

  it('returns empty array for empty input', () => {
    expect(paginateAll([], 20)).toEqual([]);
  });

  it('returns single page when users <= pageSize', () => {
    const result = paginateAll(makeUsers(5), 20);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(5);
  });

  it('returns exact pages for divisible length', () => {
    const result = paginateAll(makeUsers(40), 20);
    expect(result).toHaveLength(2);
    result.forEach((page) => expect(page).toHaveLength(20));
  });

  it('last page has remainder items', () => {
    const result = paginateAll(makeUsers(25), 20);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(20);
    expect(result[1]).toHaveLength(5);
  });

  it('handles single element', () => {
    const result = paginateAll(makeUsers(1), 20);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
  });

  it('preserves total count across all pages', () => {
    const users = makeUsers(47);
    const pages = paginateAll(users, 20);
    expect(pages.flat()).toHaveLength(47);
  });
});

// ---------------------------------------------------------------------------
// selectTopN
// ---------------------------------------------------------------------------

describe('selectTopN', () => {
  const users: UserScoreEntry[] = [
    { uid: 'a', totalScore: 0 },
    { uid: 'b', totalScore: 50 },
    { uid: 'c', totalScore: 200 },
    { uid: 'd', totalScore: 100 },
    { uid: 'e', totalScore: 0 },
  ];

  it('excludes users with totalScore = 0', () => {
    const result = selectTopN(users, 10);
    expect(result.every((u) => u.totalScore > 0)).toBe(true);
  });

  it('returns at most n entries', () => {
    const result = selectTopN(users, 2);
    expect(result).toHaveLength(2);
  });

  it('sorts descending', () => {
    const result = selectTopN(users, 10);
    expect(result[0].uid).toBe('c');
    expect(result[1].uid).toBe('d');
    expect(result[2].uid).toBe('b');
  });

  it('returns empty array when all scores are 0', () => {
    const allZero: UserScoreEntry[] = [
      { uid: 'a', totalScore: 0 },
      { uid: 'b', totalScore: 0 },
    ];
    expect(selectTopN(allZero, 10)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(selectTopN([], 10)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// applySelectedReset
// ---------------------------------------------------------------------------

describe('applySelectedReset', () => {
  const users: UserScoreEntry[] = [
    { uid: 'a', totalScore: 100 },
    { uid: 'b', totalScore: 200 },
    { uid: 'c', totalScore: 300 },
  ];

  it('sets totalScore to 0 for selected UIDs', () => {
    const selected = new Set(['a', 'c']);
    const result = applySelectedReset(users, selected);
    const a = result.find((u) => u.uid === 'a')!;
    const c = result.find((u) => u.uid === 'c')!;
    expect(a.totalScore).toBe(0);
    expect(c.totalScore).toBe(0);
  });

  it('leaves non-selected UIDs unchanged', () => {
    const selected = new Set(['a']);
    const result = applySelectedReset(users, selected);
    const b = result.find((u) => u.uid === 'b')!;
    expect(b.totalScore).toBe(200);
  });

  it('does not mutate the original array (immutability)', () => {
    const original = [
      { uid: 'a', totalScore: 100 },
      { uid: 'b', totalScore: 200 },
    ];
    const selected = new Set(['a', 'b']);
    applySelectedReset(original, selected);
    expect(original[0].totalScore).toBe(100);
    expect(original[1].totalScore).toBe(200);
  });

  it('handles empty selected set (no changes)', () => {
    const result = applySelectedReset(users, new Set());
    users.forEach((u) => {
      const r = result.find((x) => x.uid === u.uid)!;
      expect(r.totalScore).toBe(u.totalScore);
    });
  });

  it('handles empty users array', () => {
    expect(applySelectedReset([], new Set(['a']))).toEqual([]);
  });
});
