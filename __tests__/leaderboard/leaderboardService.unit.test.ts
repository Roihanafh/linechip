/**
 * Unit tests for features/leaderboard/leaderboardService.ts
 *
 * Strategy:
 * - Mock `@/features/auth/services/firebase.client` to avoid real Firebase init.
 * - Override the global `firebase/firestore` mock (set by __tests__/auth/setup.ts)
 *   with this file's own jest.mock, which wins because Jest applies the
 *   last-declared factory for a given module path per test file.
 *
 * Requirements covered: 1.1, 1.2, 1.3, 1.4, 6.3, 6.4
 */

// ─── Module-level mocks ────────────────────────────────────────────────────────

jest.mock('@/features/auth/services/firebase.client', () => ({
  getFirebaseClient: jest.fn(() => ({ db: {} })),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, _path: string) => ({})),
  query: jest.fn((..._args: unknown[]) => ({})),
  orderBy: jest.fn((_field: string, _dir: string) => ({})),
  limit: jest.fn((_n: number) => ({})),
  getDocs: jest.fn(),
  doc: jest.fn((_db: unknown, _col: string, _id: string) => ({})),
  getDoc: jest.fn(),
  where: jest.fn((_field: string, _op: string, _val: unknown) => ({})),
  getCountFromServer: jest.fn(),
}));

// ─── Imports (after mocks) ─────────────────────────────────────────────────────

import {
  fetchTop10,
  fetchCurrentUserEntry,
} from '@/features/leaderboard/leaderboardService';
import { getDocs, getDoc, getCountFromServer } from 'firebase/firestore';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Build a mock QueryDocumentSnapshot-like object. */
function makeMockDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  };
}

/** Build a mock QuerySnapshot with an array of docs. */
function makeMockSnapshot(docs: ReturnType<typeof makeMockDoc>[]) {
  return { docs };
}

/** Build a mock DocumentSnapshot. */
function makeMockDocSnap(exists: boolean, data: Record<string, unknown> = {}) {
  return {
    exists: () => exists,
    data: () => data,
  };
}

/** Build a mock AggregateQuerySnapshot for getCountFromServer. */
function makeMockCountSnap(count: number) {
  return { data: () => ({ count }) };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('fetchTop10', () => {
  const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correctly-shaped LeaderboardEntry[] on success', async () => {
    // Arrange – three docs in descending score order (Firestore already sorted)
    const docs = [
      makeMockDoc('uid3', { name: 'Andi', school: 'SMP 1', photoURL: null, totalScore: 300 }),
      makeMockDoc('uid2', { name: 'Budi', school: 'SMP 2', photoURL: null, totalScore: 200 }),
      makeMockDoc('uid1', { name: 'Cici', school: 'SMP 3', photoURL: null, totalScore: 100 }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeMockSnapshot(docs) as never);

    // Act
    const result = await fetchTop10();

    // Assert – length
    expect(result).toHaveLength(3);

    // Assert – ranks are 1-indexed in array order
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
    expect(result[2].rank).toBe(3);

    // Assert – scores preserved
    expect(result[0].totalScore).toBe(300);
    expect(result[1].totalScore).toBe(200);
    expect(result[2].totalScore).toBe(100);

    // Assert – uid comes from document id
    expect(result[0].uid).toBe('uid3');
    expect(result[1].uid).toBe('uid2');
    expect(result[2].uid).toBe('uid1');

    // Assert – name / school mapped correctly
    expect(result[0].name).toBe('Andi');
    expect(result[0].school).toBe('SMP 1');
  });

  it('normalises undefined totalScore to 0 (Requirement 1.3)', async () => {
    const docs = [
      makeMockDoc('uid-no-score', { name: 'Dian', school: 'SMP 4' }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeMockSnapshot(docs) as never);

    const result = await fetchTop10();

    expect(result[0].totalScore).toBe(0);
  });

  it('rejects with the Firestore error when getDocs throws (Requirement 1.4)', async () => {
    const networkError = new Error('network error');
    mockGetDocs.mockRejectedValueOnce(networkError);

    await expect(fetchTop10()).rejects.toThrow('network error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('fetchCurrentUserEntry', () => {
  const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
  const mockGetCountFromServer = getCountFromServer as jest.MockedFunction<typeof getCountFromServer>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null immediately when uid is null (Requirement 6.4)', async () => {
    const result = await fetchCurrentUserEntry(null, 100);
    expect(result).toBeNull();
    // Guard fires before any Firestore call
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockGetCountFromServer).not.toHaveBeenCalled();
  });

  it('returns null immediately when totalScore is 0 (Requirement 1.4 / 6.4)', async () => {
    const result = await fetchCurrentUserEntry('uid-abc', 0);
    expect(result).toBeNull();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('returns null immediately when totalScore is negative (≤ 0 guard)', async () => {
    const result = await fetchCurrentUserEntry('uid-abc', -5);
    expect(result).toBeNull();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('returns a correct LeaderboardEntry with rank=6 when there are 5 higher-scoring users (Requirement 6.1, 6.3)', async () => {
    const userData = {
      name: 'Eka',
      school: 'SMP 5',
      photoURL: 'https://example.com/eka.jpg',
      totalScore: 100,
    };
    mockGetDoc.mockResolvedValueOnce(makeMockDocSnap(true, userData) as never);
    mockGetCountFromServer.mockResolvedValueOnce(makeMockCountSnap(5) as never);

    const result = await fetchCurrentUserEntry('uid-eka', 100);

    expect(result).not.toBeNull();
    expect(result!.uid).toBe('uid-eka');
    expect(result!.rank).toBe(6); // count(5) + 1
    expect(result!.name).toBe('Eka');
    expect(result!.school).toBe('SMP 5');
    expect(result!.photoURL).toBe('https://example.com/eka.jpg');
    expect(result!.totalScore).toBe(100);
  });

  it('returns null when the user document does not exist in Firestore', async () => {
    mockGetDoc.mockResolvedValueOnce(makeMockDocSnap(false) as never);

    const result = await fetchCurrentUserEntry('uid-ghost', 50);
    expect(result).toBeNull();
    // getCountFromServer should not be called if the doc doesn't exist
    expect(mockGetCountFromServer).not.toHaveBeenCalled();
  });
});
