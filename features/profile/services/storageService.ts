import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { getFirebaseClient } from '@/features/auth/services/firebase.client';
import type { PhotoUploadResult, ProfileError } from '@/features/profile/types';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** 5MB in bytes */
const MAX_FILE_SIZE_BYTES = 5_242_880;

/**
 * Memvalidasi tipe MIME file foto profil.
 * Throws ProfileError dengan code 'storage/invalid-mime-type' jika tidak diizinkan.
 */
export function validateMimeType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    const err: ProfileError = {
      code: 'storage/invalid-mime-type',
      message:
        'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.',
      field: 'photoURL',
    };
    throw err;
  }
}

/**
 * Memvalidasi ukuran file sebelum kompresi.
 * Throws ProfileError dengan code 'storage/file-too-large' jika melebihi 5MB (5,242,880 byte).
 */
export function validateFileSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const err: ProfileError = {
      code: 'storage/file-too-large',
      message:
        'Ukuran file maksimal 5MB. File yang dipilih melebihi batas tersebut.',
      field: 'photoURL',
    };
    throw err;
  }
}

/**
 * Membangun Storage path untuk foto profil pengguna.
 * Path selalu terikat ke uid pengguna yang terautentikasi.
 * @returns `profile-photos/{uid}/avatar`
 */
export function buildStoragePath(uid: string): string {
  return `profile-photos/${uid}/avatar`;
}

/**
 * Mengonversi Blob gambar ke string Base64 Data URL (`data:image/jpeg;base64,...`).
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const mimeType = blob.type || 'image/jpeg';
  if (typeof blob.arrayBuffer === 'function') {
    const arrayBuffer = await blob.arrayBuffer();
    const base64 =
      typeof Buffer !== 'undefined'
        ? Buffer.from(arrayBuffer).toString('base64')
        : btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:${mimeType};base64,${base64}`;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal mengonversi gambar ke Base64'));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(blob);
  });
}


/**
 * Mengupload blob foto sebagai Base64 Data URL.
 * Mengonversi foto hasil kompresi ke Base64 Data URL dan menyimpannya secara gratis
 * di Firestore tanpa tergantung pada Firebase Storage (membuat proses upload bebas CORS error).
 *
 * @param uid        UID pengguna terautentikasi saat ini
 * @param blob       Blob hasil kompresi dari imageUtils.compressImage()
 * @param onProgress Callback persentase upload (0–100)
 * @returns          PhotoUploadResult berisi downloadURL (base64), storagePath, dan uploadedAt
 */
export async function uploadPhoto(
  uid: string,
  blob: Blob,
  onProgress?: (percent: number) => void,
): Promise<PhotoUploadResult> {
  const path = buildStoragePath(uid);

  try {
    onProgress?.(50);
    const dataUrl = await blobToBase64(blob);
    onProgress?.(100);

    return {
      downloadURL: dataUrl,
      storagePath: path,
      uploadedAt: new Date(),
    };
  } catch (_err) {
    const profileErr: ProfileError = {
      code: 'storage/unknown',
      message: getStorageErrorMessage('storage/unknown'),
      field: 'photoURL',
    };
    throw profileErr;
  }
}

/**
 * Memetakan Firebase Storage error codes ke pesan Bahasa Indonesia.
 * Fallback: 'Gagal mengupload foto. Coba lagi.'
 */
export function getStorageErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'storage/unauthorized': 'Anda tidak memiliki izin untuk mengupload foto.',
    'storage/canceled': 'Upload foto dibatalkan.',
    'storage/quota-exceeded': 'Batas penyimpanan tercapai. Hubungi dukungan.',
    'storage/object-not-found': 'File tidak ditemukan di storage.',
    'storage/invalid-format': 'Format file tidak didukung.',
  };
  return messages[code] ?? 'Gagal mengupload foto. Coba lagi.';
}


