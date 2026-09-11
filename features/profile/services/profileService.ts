import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/features/auth/services/firebase.client';
import { sanitizeInput } from '@/features/auth/services/authService';
import { getProfileErrorMessage } from '../utils/errorMessages';
import { formatDate as _formatDate } from '../utils/dateUtils';
import type { ProfileUpdatePayload, ProfileError } from '../types';

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Memvalidasi uid — wajib non-empty string.
 * Throws ProfileError jika tidak valid.
 */
export function validateUid(uid: unknown): asserts uid is string {
  if (typeof uid !== 'string' || uid.trim() === '') {
    throw {
      code: 'validation/invalid-uid',
      message: 'UID pengguna tidak valid.',
    } satisfies ProfileError;
  }
}

/**
 * Memvalidasi payload teks profil.
 * Returns object berisi field errors (empty jika valid).
 * - name: 1–100 karakter setelah trim
 * - school: 1–200 karakter setelah trim
 */
export function validateProfileText(payload: {
  name?: string;
  school?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (trimmed.length < 1) {
      errors.name = getProfileErrorMessage('validation/name-empty');
    } else if (trimmed.length > 100) {
      errors.name = getProfileErrorMessage('validation/name-too-long');
    }
  }

  if (payload.school !== undefined) {
    const trimmed = payload.school.trim();
    if (trimmed.length < 1) {
      errors.school = getProfileErrorMessage('validation/school-empty');
    } else if (trimmed.length > 200) {
      errors.school = getProfileErrorMessage('validation/school-too-long');
    }
  }

  return errors;
}

// ─── Firestore ────────────────────────────────────────────────────────────────

/**
 * Memperbarui profil pengguna di Firestore.
 * Hanya field name, school, photoURL yang diizinkan (whitelist).
 * String values disanitasi sebelum disimpan.
 * Throws ProfileError jika dokumen tidak ditemukan atau operasi gagal.
 */
export async function updateProfile(
  uid: string,
  payload: ProfileUpdatePayload
): Promise<void> {
  validateUid(uid);

  const { db } = getFirebaseClient();
  const docRef = doc(db, 'users', uid);

  // Verify document exists
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw {
      code: 'not-found',
      message: getProfileErrorMessage('not-found'),
    } satisfies ProfileError;
  }

  // Allow only whitelisted fields — ignore everything else in payload
  const allowedFields = ['name', 'school', 'photoURL'] as const;
  const safeUpdate: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in payload && payload[field] !== undefined) {
      const value = payload[field] as string;
      // Sanitize text fields; photoURL is a URL — sanitize it too for safety
      safeUpdate[field] = sanitizeInput(value);
    }
  }

  safeUpdate['updatedAt'] = serverTimestamp();

  try {
    await updateDoc(docRef, safeUpdate);
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    throw {
      code,
      message: getProfileErrorMessage(code),
    } satisfies ProfileError;
  }
}

// ─── Password Reset ───────────────────────────────────────────────────────────

/**
 * Mengirim email reset kata sandi dan meneruskan error ke pemanggil,
 * kecuali `auth/user-not-found` (dilemahkan demi keamanan — jangan ungkap apakah email terdaftar).
 *
 * Berbeda dari `sendPasswordReset()` di authService yang menelan semua error.
 * Gunakan fungsi ini di halaman profil di mana user sudah login dan perlu feedback.
 */
export async function sendPasswordResetWithFeedback(email: string): Promise<void> {
  const { auth } = getFirebaseClient();
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    // Swallow — security: jangan reveal apakah email terdaftar
    if (code === 'auth/user-not-found') return;
    throw {
      code,
      message: getProfileErrorMessage(code),
    } satisfies ProfileError;
  }
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

/**
 * Format Firestore Timestamp ke string tanggal Bahasa Indonesia.
 * Delegasi ke `dateUtils.formatDate`.
 * Contoh output: "12 Januari 2025"
 */
export function formatDate(timestamp: Timestamp | null | undefined): string {
  return _formatDate(timestamp);
}
