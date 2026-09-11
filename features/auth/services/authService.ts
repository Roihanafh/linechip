import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from './firebase.client';
import { getErrorMessage, getErrorField } from '../utils/errorMessages';
import type { UserProfile, AuthError, UpdatableUserProfile } from '../types';

// ─── Input Sanitization ───────────────────────────────────────────────────────

export function sanitizeInput(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<[^>]*>/g, '')          // Remove HTML tags
    .trim();
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

export async function getValidIdToken(): Promise<string> {
  const { auth } = getFirebaseClient();
  const user = auth.currentUser;

  if (!user) {
    throw {
      code: 'auth/no-current-user',
      message: 'Tidak ada pengguna yang sedang masuk. Silakan masuk kembali.',
    } satisfies AuthError;
  }

  try {
    return await user.getIdToken(true);
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    throw {
      code,
      message: getErrorMessage(code),
    } satisfies AuthError;
  }
}

// ─── Firestore Helpers ────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  partialProfile: UpdatableUserProfile
): Promise<void> {
  const { db } = getFirebaseClient();
  const docRef = doc(db, 'users', uid);

  // Verify document exists first
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw {
      code: 'not-found',
      message: 'Dokumen profil pengguna tidak ditemukan.',
    } satisfies AuthError;
  }

  // Only allow writing permitted fields
  const allowedFields: (keyof UpdatableUserProfile)[] = ['name', 'email', 'school'];
  const safeUpdate: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in partialProfile && partialProfile[field] !== undefined) {
      safeUpdate[field] = partialProfile[field];
    }
  }

  safeUpdate['updatedAt'] = serverTimestamp();

  await updateDoc(docRef, safeUpdate);
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  school: string
): Promise<void> {
  const { auth, db } = getFirebaseClient();

  let userCredential: import('firebase/auth').UserCredential | null = null;

  try {
    // Step 1: Create Firebase Auth account
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // Step 2: Create Firestore document with sanitized inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedSchool = sanitizeInput(school);

    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: sanitizedName,
        email: user.email ?? email,
        school: sanitizedSchool,
        role: 'user' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (firestoreErr) {
      // Rollback: delete the Auth account we just created
      try {
        await user.delete();
      } catch {
        // Best-effort rollback — log but don't throw
        console.error(
          '[AuthService] Rollback failed — could not delete Auth account after Firestore failure'
        );
      }
      throw {
        code: 'registration-failed',
        message: 'Registrasi gagal. Silakan coba lagi.',
      } satisfies AuthError;
    }

    // Step 3: Send email verification (best-effort — non-fatal)
    try {
      await sendEmailVerification(user);
    } catch {
      console.warn('[AuthService] Email verification send failed');
    }
  } catch (err) {
    // Re-throw if already our normalized AuthError shape (e.g. rollback error above)
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      'message' in err &&
      // Pastikan message bukan raw Firebase message
      !(err as { message: string }).message.startsWith('Firebase:')
    ) {
      throw err;
    }
    throw normalizeAuthError(err);
  }
}

// ─── Silent Error Codes ───────────────────────────────────────────────────────

const SILENT_ERRORS = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
]);

/**
 * Menormalisasi semua error (Firebase SDK, AuthError, atau unknown) ke AuthError
 * dengan pesan Bahasa Indonesia yang ramah pengguna.
 */
function normalizeAuthError(err: unknown): AuthError {
  const code = (err as { code?: string }).code ?? 'unknown';
  return {
    code,
    message: getErrorMessage(code),
    field: getErrorField(code),
  };
}

// ─── Login with Email ─────────────────────────────────────────────────────────

export async function loginWithEmail(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<void> {
  try {
    const { auth } = getFirebaseClient();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();

    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, rememberMe }),
    });

    if (!res.ok) {
      throw {
        code: 'auth/session-create-failed',
        message: getErrorMessage('unknown'),
      } satisfies AuthError;
    }
  } catch (err) {
    // Selalu normalisasi — Firebase SDK error juga memiliki 'code' & 'message'
    // tapi message-nya adalah string raw seperti "Firebase: Error (auth/invalid-credential)."
    // yang tidak boleh ditampilkan langsung ke user.
    throw normalizeAuthError(err);
  }
}

// ─── Login with Google ────────────────────────────────────────────────────────

export async function loginWithGoogle(): Promise<void> {
  try {
    const { auth, db } = getFirebaseClient();
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const { user } = credential;

    // Create or merge Firestore profile
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      // New user: create profile
      await setDoc(profileRef, {
        uid: user.uid,
        name: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        school: '',
        role: 'user' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    // Existing user: don't overwrite name/school/role

    const idToken = await user.getIdToken();
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, rememberMe: false }),
    });
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    // Silent — user intentionally dismissed the popup
    if (SILENT_ERRORS.has(code)) return;
    throw normalizeAuthError(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const { auth } = getFirebaseClient();
  await signOut(auth);

  // Best-effort: don't throw if server-side logout fails
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    console.warn('[AuthService] Server-side logout failed (best-effort)');
  }
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    const { auth } = getFirebaseClient();
    await sendPasswordResetEmail(auth, email);
  } catch {
    // Swallow all errors — don't reveal whether the email is registered
  }
}
