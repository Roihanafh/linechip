export const PROFILE_ERROR_MESSAGES: Record<string, string> = {
  // Firestore / Firebase general error codes
  'permission-denied':
    'Akses ditolak. Anda tidak memiliki izin untuk operasi ini.',
  'not-found': 'Data profil tidak ditemukan.',
  unavailable: 'Layanan tidak tersedia saat ini. Coba lagi nanti.',
  cancelled: 'Operasi dibatalkan.',
  'resource-exhausted': 'Batas kuota tercapai. Coba lagi nanti.',
  unauthenticated: 'Sesi Anda telah berakhir. Silakan masuk kembali.',

  // Profile-specific validation codes
  'validation/name-too-long': 'Nama terlalu panjang. Maksimal 100 karakter.',
  'validation/school-too-long':
    'Nama sekolah terlalu panjang. Maksimal 200 karakter.',
  'validation/name-empty': 'Nama tidak boleh kosong.',
  'validation/school-empty': 'Nama sekolah tidak boleh kosong.',

  // Fallback
  unknown:
    'Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan.',
};

/**
 * Returns a user-facing Bahasa Indonesia message for a Firestore/profile error code.
 * Falls back to the generic 'unknown' message for unrecognised codes.
 */
export function getProfileErrorMessage(code: string): string {
  const msg = Object.hasOwn(PROFILE_ERROR_MESSAGES, code)
    ? PROFILE_ERROR_MESSAGES[code]
    : undefined;
  return msg || PROFILE_ERROR_MESSAGES['unknown'];
}
