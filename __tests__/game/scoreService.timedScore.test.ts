/**
 * scoreService.timedScore.test.ts
 *
 * Property-based tests untuk `awardPoints` dengan parameter `pts` opsional
 * (modifikasi timed-scoring).
 *
 * Feature: game-timed-scoring
 * Task 2.2
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * @jest-environment jsdom
 */

// ─── Module mocks (hoisted before imports) ───────────────────────────────────

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, collection: string, id: string) => ({
    path: `${collection}/${id}`,
  })),
  updateDoc: jest.fn(),
  increment: jest.fn((v: number) => ({ _type: 'increment', value: v })),
}));

jest.mock('@/features/auth/services/firebase.client', () => ({
  getFirebaseClient: jest.fn(() => ({ db: {} })),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import * as fc from 'fast-check';
import { awardPoints, POINTS_PER_CORRECT } from '@/features/game/scoreService';
import { updateDoc, increment } from 'firebase/firestore';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockIncrement = increment as jest.MockedFunction<typeof increment>;
const PENDING_KEY = (uid: string) => `linechip_pending_score_${uid}`;
const TEST_UID = 'test-uid-timed-scoring';

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockIncrement.mockImplementation(
    (v: number) => ({ _type: 'increment', value: v } as unknown as import('@firebase/firestore').FieldValue),
  );
  mockUpdateDoc.mockResolvedValue(undefined as never);
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Property 9: pts válido → increment(pts) dipanggil persis ────────────────

describe('Property 9: pts valid writes exact value to Firestore', () => {
  // Feature: game-timed-scoring, Property 9: For any integer pts >= 1, awardPoints(uid, pts) calls increment(pts) exactly
  // Validates: Requirements 6.3

  it('calls increment(pts) exactly for any integer pts in [1, 50]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (pts) => {
          // Reset state for each run
          jest.clearAllMocks();
          localStorage.clear();
          mockUpdateDoc.mockResolvedValue(undefined as never);
          mockIncrement.mockImplementation(
            (v: number) => ({ _type: 'increment', value: v } as unknown as import('@firebase/firestore').FieldValue),
          );

          const returned = awardPoints(TEST_UID, pts);
          await jest.runAllTimersAsync();

          // Return value should equal pts
          expect(returned).toBe(pts);
          // Firestore should have been called exactly once
          expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
          // increment should have been called with pts (no pending in localStorage)
          const [, updateArg] = mockUpdateDoc.mock.calls[0];
          expect(updateArg).toEqual({ totalScore: { _type: 'increment', value: pts } });
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── Property 10: pts ≤ 0 → Firestore tidak dipanggil, return 0 ──────────────

describe('Property 10: pts <= 0 skips Firestore and returns 0', () => {
  // Feature: game-timed-scoring, Property 10: For any pts <= 0, awardPoints does not write to Firestore and returns 0
  // Validates: Requirements 6.5

  it('does not write to Firestore and returns 0 for any pts in [-100, 0]', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -100, max: 0 }),
        async (pts) => {
          jest.clearAllMocks();
          localStorage.clear();

          const returned = awardPoints(TEST_UID, pts);
          await jest.runAllTimersAsync();

          expect(returned).toBe(0);
          expect(mockUpdateDoc).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── Example tests ────────────────────────────────────────────────────────────

describe('awardPoints — example tests for backward compat and timed score', () => {
  it('backward compat: awardPoints(uid) without pts → increment(10) called', async () => {
    const returned = awardPoints(TEST_UID);
    await jest.runAllTimersAsync();

    expect(returned).toBe(POINTS_PER_CORRECT); // 10
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, updateArg] = mockUpdateDoc.mock.calls[0];
    expect(updateArg).toEqual({ totalScore: { _type: 'increment', value: 10 } });
  });

  it('awardPoints(uid, 35) → increment(35) called and returns 35', async () => {
    const returned = awardPoints(TEST_UID, 35);
    await jest.runAllTimersAsync();

    expect(returned).toBe(35);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, updateArg] = mockUpdateDoc.mock.calls[0];
    expect(updateArg).toEqual({ totalScore: { _type: 'increment', value: 35 } });
  });
});
