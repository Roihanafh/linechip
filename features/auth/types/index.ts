import type { Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

/** Dokumen Firestore di koleksi users/{uid} */
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  school: string;
  photoURL?: string;
  role: 'user' | 'admin';
  totalScore?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Subset aman dari FirebaseUser yang diekspos ke komponen */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoURL: string | null;
}

/** Shape dari AuthContext */
export interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

/** Error terstruktur dari AuthService */
export interface AuthError {
  code: string;           // Firebase error code, mis. 'auth/email-already-in-use'
  message: string;        // Pesan Bahasa Indonesia yang sudah diterjemahkan
  field?: 'email' | 'password' | 'name' | 'school'; // Field spesifik jika ada
}

export interface UseLoginFormReturn {
  onSubmit: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  onGoogleSubmit: () => Promise<void>;
  loading: boolean;
  errors: Record<string, string>;
  toast: { message: string; type: 'success' | 'error' } | null;
  clearToast: () => void;
}

/** Return type useRegisterForm */
export interface UseRegisterFormReturn {
  onSubmit: (
    name: string,
    email: string,
    password: string,
    school: string
  ) => Promise<void>;
  loading: boolean;
  errors: Record<string, string>;
  toast: { message: string; type: 'success' | 'error' } | null;
  clearToast: () => void;
}

/** Decoded claims dari Session Cookie yang diverifikasi Admin SDK */
export interface DecodedSessionClaims {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  email_verified: boolean;
  exp: number;
  iat: number;
}

/** Partial profile yang boleh diupdate via updateUserProfile */
export type UpdatableUserProfile = Partial<Pick<UserProfile, 'name' | 'email' | 'school' | 'photoURL'>>;
