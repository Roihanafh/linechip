/**
 * Tests for features/profile/services/profileService.ts
 *
 * Validates: Requirements 2.2, 2.3, 10.1, 10.2, 10.5
 */

import * as fc from 'fast-check';
import {
  validateUid,
  validateProfileText,
  updateProfile,
} from '@/features/profile/services/profileService';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/features/auth/services/firebase.client', () => ({
  getFirebaseClient: jest.fn(() => ({
    db: {},
    auth: { currentUser: null },
    storage: {},
  })),
}));

// ─── validateUid ─────────────────────────────────────────────────────────────

describe('validateUid', () => {
  it('throws ProfileError for null', () => {
    expect(() => validateUid(null)).toThrow();
  });

  it('throws ProfileError for undefined', () => {
    expect(() => validateUid(undefined)).toThrow();
  });

  it('throws ProfileError for empty string', () => {
    expect(() => validateUid('')).toThrow();
  });

  it('throws ProfileError for whitespace-only string', () => {
    expect(() => validateUid('   ')).toThrow();
  });

  it('throws ProfileError for number', () => {
    expect(() => validateUid(123)).toThrow();
  });

  it('throws ProfileError for boolean', () => {
    expect(() => validateUid(true)).toThrow();
  });

  it('throws ProfileError with correct code for non-string', () => {
    try {
      validateUid(null);
      fail('Expected to throw');
    } catch (err) {
      expect((err as { code: string }).code).toBe('validation/invalid-uid');
    }
  });

  it('does not throw for a valid non-empty string', () => {
    expect(() => validateUid('valid-uid')).not.toThrow();
    expect(() => validateUid('abc')).not.toThrow();
    expect(() => validateUid('user_123')).not.toThrow();
  });
});

// ─── validateProfileText ─────────────────────────────────────────────────────

describe('validateProfileText', () => {
  /**
   * Property 3: validateProfileText menerima iff 1 ≤ len ≤ batas
   * Validates: Requirements 2.2, 2.3
   */
  it('Property 3a: name — error hadir iff trim().length < 1 || trim().length > 100', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        const result = validateProfileText({ name });
        const trimLen = name.trim().length;
        const shouldHaveError = trimLen < 1 || trimLen > 100;
        const hasError = 'name' in result && result.name !== undefined && result.name !== '';
        return shouldHaveError === hasError;
      }),
      { numRuns: 200 },
    );
  });

  it('Property 3b: school — error hadir iff trim().length < 1 || trim().length > 200', () => {
    fc.assert(
      fc.property(fc.string(), (school) => {
        const result = validateProfileText({ school });
        const trimLen = school.trim().length;
        const shouldHaveError = trimLen < 1 || trimLen > 200;
        const hasError = 'school' in result && result.school !== undefined && result.school !== '';
        return shouldHaveError === hasError;
      }),
      { numRuns: 200 },
    );
  });

  // Unit tests — boundary values for name (limit: 100)
  it('name: no error for 1-character trimmed name', () => {
    expect(validateProfileText({ name: 'A' })).not.toHaveProperty('name');
  });

  it('name: no error for exactly 100-character name', () => {
    const name = 'A'.repeat(100);
    expect(validateProfileText({ name })).not.toHaveProperty('name');
  });

  it('name: error for empty string', () => {
    const result = validateProfileText({ name: '' });
    expect(result.name).toBeTruthy();
  });

  it('name: error for whitespace-only string', () => {
    const result = validateProfileText({ name: '   ' });
    expect(result.name).toBeTruthy();
  });

  it('name: error for 101-character name', () => {
    const result = validateProfileText({ name: 'A'.repeat(101) });
    expect(result.name).toBeTruthy();
  });

  // Unit tests — boundary values for school (limit: 200)
  it('school: no error for 1-character trimmed school', () => {
    expect(validateProfileText({ school: 'A' })).not.toHaveProperty('school');
  });

  it('school: no error for exactly 200-character school', () => {
    const school = 'A'.repeat(200);
    expect(validateProfileText({ school })).not.toHaveProperty('school');
  });

  it('school: error for empty string', () => {
    const result = validateProfileText({ school: '' });
    expect(result.school).toBeTruthy();
  });

  it('school: error for 201-character school', () => {
    const result = validateProfileText({ school: 'A'.repeat(201) });
    expect(result.school).toBeTruthy();
  });

  it('returns empty object when both fields are valid', () => {
    const result = validateProfileText({ name: 'Budi', school: 'SMA Negeri 1' });
    expect(result).toEqual({});
  });

  it('returns errors for both fields when both are invalid', () => {
    const result = validateProfileText({ name: '', school: '' });
    expect(result.name).toBeTruthy();
    expect(result.school).toBeTruthy();
  });

  it('only validates provided fields — undefined fields are ignored', () => {
    // Only name provided — school should not appear in errors
    const result = validateProfileText({ name: 'Valid Name' });
    expect(result).not.toHaveProperty('school');

    // Only school provided — name should not appear in errors
    const result2 = validateProfileText({ school: 'Valid School' });
    expect(result2).not.toHaveProperty('name');
  });
});

// ─── updateProfile — Property 8: field whitelist ─────────────────────────────

describe('updateProfile', () => {
  let mockUpdateDoc: jest.Mock;
  let mockGetDoc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdateDoc = jest.fn(() => Promise.resolve());
    mockGetDoc = jest.fn(() =>
      Promise.resolve({ exists: () => true, data: () => ({}) }),
    );

    // Override the firebase/firestore mock with test-specific behaviour
    jest.mock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
      doc: jest.fn((_db: unknown, collection: string, id: string) => ({
        path: `${collection}/${id}`,
      })),
      getDoc: mockGetDoc,
      setDoc: jest.fn(),
      updateDoc: mockUpdateDoc,
      onSnapshot: jest.fn(() => jest.fn()),
      serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
      Timestamp: {
        now: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })),
        fromDate: jest.fn((d: Date) => ({
          seconds: Math.floor(d.getTime() / 1000),
          nanoseconds: 0,
        })),
      },
    }));
  });

  /**
   * Property 8: updateProfile hanya menulis field yang diizinkan
   * Validates: Requirements 10.1, 10.2, 10.5
   */
  it('Property 8: hanya menulis name/school/photoURL/updatedAt — field tidak terdaftar dibuang', async () => {
    // Re-require to pick up the per-test mock
    const { updateDoc, getDoc } = await import('firebase/firestore');
    const mockGetDocFn = getDoc as jest.Mock;
    const mockUpdateDocFn = updateDoc as jest.Mock;

    mockGetDocFn.mockResolvedValue({ exists: () => true });
    mockUpdateDocFn.mockResolvedValue(undefined);

    // Payload with forbidden fields mixed in
    await updateProfile('test-uid', {
      name: 'Test User',
      uid: 'hack',
      role: 'admin',
      createdAt: {} as unknown as string,
    } as Parameters<typeof updateProfile>[1]);

    expect(mockUpdateDocFn).toHaveBeenCalledTimes(1);
    const [, writtenData] = mockUpdateDocFn.mock.calls[0];

    // Must contain allowed fields that were in the payload
    expect(writtenData).toHaveProperty('name');
    // Must contain updatedAt (always added)
    expect(writtenData).toHaveProperty('updatedAt');

    // Must NOT contain forbidden fields
    expect(writtenData).not.toHaveProperty('uid');
    expect(writtenData).not.toHaveProperty('role');
    expect(writtenData).not.toHaveProperty('createdAt');
  });

  it('only sends school and photoURL when those are the payload fields', async () => {
    const { updateDoc, getDoc } = await import('firebase/firestore');
    const mockGetDocFn = getDoc as jest.Mock;
    const mockUpdateDocFn = updateDoc as jest.Mock;

    mockGetDocFn.mockResolvedValue({ exists: () => true });
    mockUpdateDocFn.mockResolvedValue(undefined);

    await updateProfile('uid-123', { school: 'SMA Test', photoURL: 'https://example.com/photo.jpg' });

    const [, writtenData] = mockUpdateDocFn.mock.calls[0];
    expect(writtenData).toHaveProperty('school');
    expect(writtenData).toHaveProperty('photoURL');
    expect(writtenData).toHaveProperty('updatedAt');
    expect(writtenData).not.toHaveProperty('name');
  });

  it('throws ProfileError when document does not exist', async () => {
    const { getDoc } = await import('firebase/firestore');
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

    await expect(
      updateProfile('uid-missing', { name: 'Test' }),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('throws ProfileError (validation/invalid-uid) for invalid uid', async () => {
    await expect(
      updateProfile('', { name: 'Test' }),
    ).rejects.toMatchObject({ code: 'validation/invalid-uid' });

    await expect(
      updateProfile('   ', { name: 'Test' }),
    ).rejects.toMatchObject({ code: 'validation/invalid-uid' });
  });
});
