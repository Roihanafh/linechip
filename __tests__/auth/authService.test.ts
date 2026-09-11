// Feature: firebase-auth-module, Property 6: updateUserProfile hanya menulis field yang diizinkan
import * as fc from 'fast-check';

// ─── Mocks (must be declared before any imports that use firebase) ────────────

const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockGetDoc = jest.fn();
const mockDoc = jest.fn((_db: unknown, collection: string, id: string) => ({
  path: `${collection}/${id}`,
}));
const mockServerTimestamp = jest.fn(() => ({ _serverTimestamp: true }));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: '[DEFAULT]' })),
  getApps: jest.fn(() => [{ name: '[DEFAULT]' }]),
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  browserLocalPersistence: {},
  setPersistence: jest.fn(() => Promise.resolve()),
}));
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: mockDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  serverTimestamp: mockServerTimestamp,
}));

// ─── Subject under test ───────────────────────────────────────────────────────

import { updateUserProfile } from '@/features/auth/services/authService';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('updateUserProfile', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Provide all required Firebase env vars so validateClientEnv() passes
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: document exists
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'test-uid',
        name: 'Test',
        email: 'test@test.com',
        school: 'Test School',
        role: 'user',
      }),
    });
  });

  /**
   * Property 6: updateUserProfile hanya memperbarui field yang diizinkan.
   * For any combination of uid, name, email, and school, the data passed to
   * Firestore's updateDoc must only contain keys from { name, email, school, updatedAt }.
   * Keys uid, role, and createdAt must never appear.
   *
   * Validates: Requirements 5.5
   */
  it('only writes name, email, school, and updatedAt — never uid, role, createdAt', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 200 }),
        async (uid, name, email, school) => {
          jest.clearAllMocks();
          mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
              uid,
              name: 'Old Name',
              email: 'old@test.com',
              school: 'Old School',
              role: 'user',
            }),
          });

          await updateUserProfile(uid, { name, email, school });

          expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

          const writtenData = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>;
          const writtenKeys = Object.keys(writtenData);

          // updatedAt must always be present
          expect(writtenKeys).toContain('updatedAt');

          // Forbidden keys must not appear
          expect(writtenData).not.toHaveProperty('uid');
          expect(writtenData).not.toHaveProperty('role');
          expect(writtenData).not.toHaveProperty('createdAt');

          // No keys outside the allowed set
          const allowedKeys = new Set(['name', 'email', 'school', 'updatedAt']);
          const forbiddenKeys = writtenKeys.filter((k) => !allowedKeys.has(k));
          expect(forbiddenKeys).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throws when the document does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    await expect(
      updateUserProfile('nonexistent-uid', { name: 'Test' }),
    ).rejects.toMatchObject({ code: 'not-found' });

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('only writes provided partial fields (no extras)', async () => {
    await updateUserProfile('test-uid', { name: 'New Name' });

    const writtenData = mockUpdateDoc.mock.calls[0][1] as Record<string, unknown>;

    expect(writtenData).toHaveProperty('name', 'New Name');
    expect(writtenData).toHaveProperty('updatedAt');
    // Unprovided optional fields must be absent
    expect(writtenData).not.toHaveProperty('email');
    expect(writtenData).not.toHaveProperty('school');
  });
});
