import type { User as FirebaseUser } from 'firebase/auth';

/** Auth provider yang didukung platform */
export type AuthProvider = 'password' | 'google.com' | 'unknown';

/**
 * Membaca provider autentikasi dari FirebaseUser.
 * Membaca `user.providerData[0].providerId` untuk menentukan provider.
 *
 * @param user - Instance FirebaseUser dari Firebase Auth
 * @returns `'password'` | `'google.com'` | `'unknown'`
 */
export function getAuthProvider(user: FirebaseUser): AuthProvider {
  const providerId = user.providerData[0]?.providerId;

  if (providerId === 'password' || providerId === 'google.com') {
    return providerId;
  }

  return 'unknown';
}

/**
 * Menghasilkan inisial dari nama lengkap.
 * - "Budi Santoso" → "BS"
 * - "Budi" → "BU"
 * - String kosong atau hanya whitespace → "?"
 * Selalu huruf kapital.
 *
 * @param name - Nama lengkap pengguna
 * @returns Inisial 1–2 karakter huruf kapital, atau "?" untuk input kosong/whitespace
 */
export function getInitials(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return '?';
  }

  const words = trimmed.split(/\s+/);

  if (words.length === 1) {
    // Satu kata: ambil 1–2 karakter pertama
    return words[0].slice(0, 2).toUpperCase();
  }

  // Dua kata atau lebih: huruf pertama dari kata pertama dan kata terakhir
  const first = words[0][0];
  const last = words[words.length - 1][0];

  return (first + last).toUpperCase();
}

/**
 * Menghasilkan label Bahasa Indonesia untuk provider autentikasi.
 *
 * @param provider - Nilai AuthProvider
 * @returns Label Bahasa Indonesia yang dapat ditampilkan ke pengguna
 */
export function getProviderLabel(provider: AuthProvider): string {
  switch (provider) {
    case 'password':
      return 'Email & Kata Sandi';
    case 'google.com':
      return 'Google';
    case 'unknown':
      return 'Tidak diketahui';
  }
}
