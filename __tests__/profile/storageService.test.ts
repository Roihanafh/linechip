/**
 * Property-based tests untuk storageService
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 10.3, 10.4, 10.6, 11.4
 */

import * as fc from 'fast-check';
import {
  validateMimeType,
  validateFileSize,
  buildStoragePath,
  getStorageErrorMessage,
} from '@/features/profile/services/storageService';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/features/auth/services/firebase.client', () => ({
  getFirebaseClient: jest.fn(() => ({
    storage: {},
  })),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE_BYTES = 5_242_880;

const KNOWN_STORAGE_ERROR_CODES = [
  'storage/unauthorized',
  'storage/canceled',
  'storage/quota-exceeded',
  'storage/object-not-found',
  'storage/invalid-format',
];

// ─── Property 5: validateMimeType accepts iff in whitelist ───────────────────
// Validates: Requirements 3.1, 10.3

describe('Property 5 — validateMimeType menerima iff dalam daftar putih', () => {
  it('tidak throw untuk MIME type yang valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_MIME_TYPES),
        (mimeType) => {
          expect(() => validateMimeType(mimeType)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throw ProfileError dengan code storage/invalid-mime-type untuk MIME type tidak valid', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !VALID_MIME_TYPES.has(s)),
        (mimeType) => {
          expect(() => validateMimeType(mimeType)).toThrow();
          try {
            validateMimeType(mimeType);
          } catch (err) {
            const profileErr = err as { code: string };
            expect(profileErr.code).toBe('storage/invalid-mime-type');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: validateFileSize accepts iff size ≤ 5MB ─────────────────────
// Validates: Requirements 3.2, 10.4

describe('Property 6 — validateFileSize menerima iff ukuran ≤ 5MB', () => {
  it('tidak throw untuk ukuran file yang valid (≤ 5,242,880 byte)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_FILE_SIZE_BYTES }),
        (sizeBytes) => {
          expect(() => validateFileSize(sizeBytes)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throw ProfileError dengan code storage/file-too-large untuk ukuran > 5MB', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_FILE_SIZE_BYTES + 1, max: 10_000_000 }),
        (sizeBytes) => {
          expect(() => validateFileSize(sizeBytes)).toThrow();
          try {
            validateFileSize(sizeBytes);
          } catch (err) {
            const profileErr = err as { code: string };
            expect(profileErr.code).toBe('storage/file-too-large');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: buildStoragePath selalu terikat ke uid ──────────────────────
// Validates: Requirements 3.3, 10.6

describe('Property 7 — buildStoragePath selalu terikat ke uid', () => {
  it('path diawali profile-photos/, diakhiri /avatar, dan mengandung uid', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (uid) => {
          const path = buildStoragePath(uid);
          expect(path.startsWith('profile-photos/')).toBe(true);
          expect(path.endsWith('/avatar')).toBe(true);
          expect(path).toContain(uid);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9: getStorageErrorMessage returns valid message ─────────────────
// Validates: Requirements 11.4

describe('Property 9 — getStorageErrorMessage mengembalikan pesan valid', () => {
  it('untuk kode yang dikenal, mengembalikan string non-empty yang berbeda dari kode', () => {
    for (const code of KNOWN_STORAGE_ERROR_CODES) {
      const message = getStorageErrorMessage(code);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toBe(code);
    }
  });
});

// ─── Additional imports for uploadPhoto tests ────────────────────────────────
import { uploadPhoto } from '@/features/profile/services/storageService';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// ─── validateFileSize — boundary tests ───────────────────────────────────────
// Validates: Requirements 3.3, 10.4

describe('validateFileSize — boundary tests', () => {
  it('does not throw at exact boundary 5_242_880', () => {
    expect(() => validateFileSize(5_242_880)).not.toThrow();
  });

  it('throws at 5_242_881 (one over boundary)', () => {
    expect(() => validateFileSize(5_242_881)).toThrow();
    try {
      validateFileSize(5_242_881);
    } catch (err) {
      expect((err as { code: string }).code).toBe('storage/file-too-large');
    }
  });

  it('does not throw at 0', () => {
    expect(() => validateFileSize(0)).not.toThrow();
  });
});

// ─── uploadPhoto — mocked uploadBytesResumable ────────────────────────────────
// Validates: Requirements 3.3, 10.4

describe('uploadPhoto', () => {
  it('converts blob to Base64 data URL and calls onProgress', async () => {
    const progressValues: number[] = [];
    const testBlob = new Blob(['test image content'], { type: 'image/jpeg' });
    const result = await uploadPhoto('uid123', testBlob, (p) =>
      progressValues.push(p),
    );

    expect(progressValues).toContain(50);
    expect(progressValues).toContain(100);
    expect(result.downloadURL).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.storagePath).toBe('profile-photos/uid123/avatar');
  });
});

