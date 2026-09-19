/**
 * scoreService.test.ts
 *
 * Unit tests untuk features/game/scoreService.ts
 *
 * Feature: game-module-integration
 * Task 12.1
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
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

import { awardPoints, POINTS_PER_CORRECT } from '@/features/game/scoreService';
import { updateDoc, increment } from 'firebase/firestore';

// ─── Test helpers ──────────────────────────────────────────────────────────────

const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockIncrement = increment as jest.MockedFunction<typeof increment>;
const PENDING_KEY = (uid: string) => `linechip_pending_score_${uid}`;

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Use fake timers so setTimeout in writeIncrement doesn't actually wait
  jest.useFakeTimers();
  // Reset all mocks between tests
  jest.clearAllMocks();
  // Restore mockIncrement to its default identity (returns increment sentinel)
  mockIncrement.mockImplementation((v: number) => ({ _type: 'increment', value: v } as unknown as import('@firebase/firestore').FieldValue));
  // Default: updateDoc resolves successfully
  mockUpdateDoc.mockResolvedValue(undefined as never);
  // Clear localStorage
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── POINTS_PER_CORRECT constant ──────────────────────────────────────────────

describe('POINTS_PER_CORRECT', () => {
  it('equals 10', () => {
    expect(POINTS_PER_CORRECT).toBe(10);
  });
});

// ─── awardPoints — null / undefined uid ──────────────────────────────────────

describe('awardPoints(null)', () => {
  it('returns POINTS_PER_CORRECT (10)', () => {
    expect(awardPoints(null)).toBe(POINTS_PER_CORRECT);
  });

  it('does NOT call updateDoc', async () => {
    awardPoints(null);
    // Flush all pending microtasks / timers
    await jest.runAllTimersAsync();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('awardPoints(undefined)', () => {
  it('returns POINTS_PER_CORRECT (10)', () => {
    expect(awardPoints(undefined)).toBe(POINTS_PER_CORRECT);
  });

  it('does NOT call updateDoc', async () => {
    awardPoints(undefined);
    await jest.runAllTimersAsync();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// ─── awardPoints — valid uid, Firestore succeeds ──────────────────────────────

describe('awardPoints with valid uid — Firestore success', () => {
  const UID = 'uid123';

  it('returns POINTS_PER_CORRECT synchronously', () => {
    expect(awardPoints(UID)).toBe(POINTS_PER_CORRECT);
  });

  it('calls updateDoc with increment(10) for a fresh user (no pending)', async () => {
    awardPoints(UID);
    await jest.runAllTimersAsync();

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    // The increment sentinel should carry value 10 (no pending pts)
    const [, updateArg] = mockUpdateDoc.mock.calls[0];
    expect(updateArg).toEqual({ totalScore: { _type: 'increment', value: 10 } });
  });

  it('clears the localStorage pending key on success', async () => {
    // Pre-set some pending points to simulate prior failures
    localStorage.setItem(PENDING_KEY(UID), '30');

    awardPoints(UID);
    await jest.runAllTimersAsync();

    // After a successful write the pending key should be removed
    expect(localStorage.getItem(PENDING_KEY(UID))).toBeNull();
  });
});

// ─── awardPoints — Firestore fails 3 times → localStorage queued ─────────────

describe('awardPoints — Firestore fails 3 times, queues to localStorage', () => {
  const UID = 'uid123';

  it('sets linechip_pending_score_uid123 after 3 consecutive failures', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Network error'));

    awardPoints(UID);

    // The retry logic waits 500ms * attempt before each retry, so advance enough
    // Attempt 1 fails immediately, retry after 500ms
    // Attempt 2 fails, retry after 1000ms
    // Attempt 3 fails → queue to localStorage
    await jest.runAllTimersAsync();

    const stored = localStorage.getItem(PENDING_KEY(UID));
    expect(stored).not.toBeNull();
    expect(parseInt(stored!, 10)).toBe(POINTS_PER_CORRECT);
  });

  it('accumulates further pending points up to the 99990 cap', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('Network error'));

    // Pre-fill localStorage with existing pending close to the cap
    localStorage.setItem(PENDING_KEY(UID), '99985');

    awardPoints(UID);
    await jest.runAllTimersAsync();

    const stored = parseInt(localStorage.getItem(PENDING_KEY(UID))!, 10);
    // 99985 + 10 = 99995 → capped at 99990
    expect(stored).toBe(99990);
  });
});

// ─── awardPoints — pending queue is flushed on next successful call ───────────

describe('awardPoints — flushes pending queue on next call', () => {
  const UID = 'uid123';

  it('sends POINTS_PER_CORRECT + pending to Firestore on the next successful call', async () => {
    // Pre-set 30 pending points from prior failures
    const PENDING = 30;
    localStorage.setItem(PENDING_KEY(UID), String(PENDING));

    // Now Firestore succeeds
    mockUpdateDoc.mockResolvedValue(undefined as never);

    awardPoints(UID);
    await jest.runAllTimersAsync();

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, updateArg] = mockUpdateDoc.mock.calls[0];
    // Should flush pending + current award
    expect(updateArg).toEqual({
      totalScore: { _type: 'increment', value: POINTS_PER_CORRECT + PENDING },
    });
  });

  it('clears localStorage after a successful flush', async () => {
    localStorage.setItem(PENDING_KEY(UID), '20');

    mockUpdateDoc.mockResolvedValue(undefined as never);

    awardPoints(UID);
    await jest.runAllTimersAsync();

    expect(localStorage.getItem(PENDING_KEY(UID))).toBeNull();
  });
});
