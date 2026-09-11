export const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use':
    'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.',
  'auth/invalid-email':
    'Format email tidak valid. Periksa kembali alamat email Anda.',
  'auth/user-not-found':
    'Email atau kata sandi salah. Periksa kembali dan coba lagi.',
  'auth/wrong-password':
    'Email atau kata sandi salah. Periksa kembali dan coba lagi.',
  'auth/invalid-credential':
    'Email atau kata sandi salah. Periksa kembali dan coba lagi.',
  'auth/user-disabled':
    'Akun ini telah dinonaktifkan. Hubungi administrator untuk bantuan.',
  'auth/too-many-requests':
    'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.',
  'auth/network-request-failed':
    'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  'auth/popup-closed-by-user': '', // Silent — user intentionally closed popup
  'auth/popup-blocked':
    'Pop-up diblokir oleh browser. Izinkan pop-up untuk masuk dengan Google.',
  'auth/cancelled-popup-request': '', // Silent — ignored
  'auth/account-exists-with-different-credential':
    'Email ini sudah terdaftar dengan metode login lain. Coba masuk dengan email/kata sandi.',
  'auth/requires-recent-login':
    'Sesi Anda sudah lama tidak aktif. Silakan masuk kembali untuk melanjutkan.',
  'auth/weak-password':
    'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.',
  'auth/operation-not-allowed':
    'Metode login ini tidak diizinkan. Hubungi administrator.',
  'auth/configuration-not-found':
    'Metode login Google belum diaktifkan di Firebase Console. Silakan aktifkan provider Google di Authentication > Sign-in method.',
  'auth/session-cookie-expired':
    'Sesi Anda telah berakhir. Silakan masuk kembali.',
  'auth/session-cookie-revoked':
    'Sesi Anda telah dicabut. Silakan masuk kembali.',
  'permission-denied':
    'Akses ke Firestore ditolak. Periksa aturan keamanan (Security Rules) di Firebase Console.',
  'network-error':
    'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  unknown:
    'Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan.',
};

/**
 * Returns a user-facing Bahasa Indonesia message for a Firebase error code.
 * Falls back to the generic 'unknown' message for unrecognised or silent codes
 * (e.g. auth/popup-closed-by-user maps to an empty string and is treated as missing).
 */
export function getErrorMessage(code: string): string {
  const msg = Object.hasOwn(FIREBASE_ERROR_MESSAGES, code)
    ? FIREBASE_ERROR_MESSAGES[code]
    : undefined;
  return msg || FIREBASE_ERROR_MESSAGES['unknown'];
}

/**
 * Returns the form field associated with a Firebase error code, if any.
 * Used by hooks to route errors to the relevant input rather than a toast.
 */
export function getErrorField(
  code: string
): 'email' | 'password' | undefined {
  const emailCodes = new Set([
    'auth/email-already-in-use',
    'auth/invalid-email',
    'auth/user-not-found',
    'auth/invalid-credential',
  ]);
  const passwordCodes = new Set([
    'auth/wrong-password',
    'auth/weak-password',
  ]);
  if (emailCodes.has(code)) return 'email';
  if (passwordCodes.has(code)) return 'password';
  return undefined;
}
