# Design Document: Profile & Account Management

## Overview

Modul **Profile & Account Management** menambahkan kemampuan manajemen akun pengguna ke platform edukasi LineChip. Ia dibangun sebagai feature module baru di `features/profile/` yang berjalan berdampingan dengan `features/auth/` yang sudah ada — tidak mengubah internal auth, tapi memperluas beberapa kontrak tipe dan mengintegrasikan diri ke Navbar dan AppShell.

### Prinsip Utama

- **AuthContext sebagai single source of truth**: `useProfile` tidak punya state Firestore tersendiri — ia membaca dari `AuthContext.profile` dan men-dispatch ke service layer yang kemudian memicu onSnapshot listener yang sudah ada.
- **Isolasi Firebase SDK**: Tidak ada import Firebase SDK langsung dari komponen UI (`app/` atau `components/`); semua I/O Firebase harus melalui `profileService.ts` atau `storageService.ts`.
- **Backward compatibility**: Perubahan pada `UserProfile` type dan `getFirebaseClient()` bersifat additive — tidak ada breaking change ke modul auth.
- **Design system consistency**: Semua UI baru memakai design tokens yang sudah ada (`intblue`, `intblue-light`, `border`, `surface`), animasi `.rise-in` / `.animate-fade-slide-in`, komponen `FloatingInput` dan `Toast` dari `AuthShared.tsx`.

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer (app/ & components/)                                  │
│  app/profile/page.tsx        — ProfilePage (Server shell)       │
│  app/profile/ProfileClient.tsx — Profile UI (Client Component)  │
│  components/Navbar.tsx       — modified: AccountDropdown mount  │
├─────────────────────────────────────────────────────────────────┤
│  Custom Hooks (features/profile/hooks/)                         │
│  useProfile()       — form state, edit mode, save/cancel        │
│  useAccountDropdown() — dropdown open/close, keyboard nav       │
│  ↓ calls ProfileService / StorageService, reads AuthContext     │
├─────────────────────────────────────────────────────────────────┤
│  AuthContext (features/auth/context/ — UNCHANGED)               │
│  Real-time onSnapshot → profile data flows to all consumers     │
│  photoURL changes propagated automatically within ~5 sec        │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer (features/profile/services/)                     │
│  profileService.ts  — Firestore: readProfile, updateProfile     │
│  storageService.ts  — Firebase Storage: uploadPhoto             │
│  ↓ calls getFirebaseClient() (extended to expose storage)       │
├─────────────────────────────────────────────────────────────────┤
│  Firebase Client SDK (features/auth/services/firebase.client.ts)│
│  EXTENDED: getFirebaseClient() now also returns storage         │
├─────────────────────────────────────────────────────────────────┤
│  Utility Layer (features/profile/utils/)                        │
│  providerUtils.ts — getAuthProvider(), getInitials()            │
│  imageUtils.ts    — compressImage() via Canvas API              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Profile Update

```
User edits name/school in ProfileClient
  → useProfile.handleSave()
    → validates locally (validateProfileText)
    → ProfileService.updateProfile(uid, payload)
      → sanitizeInput on each field
      → Firestore updateDoc(users/{uid}, { name, school, updatedAt })
        → onSnapshot in AuthProvider fires
          → AuthContext.profile updated
            → ProfileClient re-renders with new data
            → Navbar Avatar re-renders with new name
```

### Data Flow: Photo Upload

```
User selects file in ProfileClient
  → useProfile.handlePhotoSelect(file)
    → StorageService.validateFile(file)   [MIME + size check]
    → imageUtils.compressImage(file)      [Canvas API, max 400×400, 300KB]
    → StorageService.uploadPhoto(uid, blob)
      → Firebase Storage: profile-photos/{uid}/avatar
        → on('state_changed') → progress updates → UI overlay
      → getDownloadURL()
    → ProfileService.updateProfile(uid, { photoURL })
      → Firestore updateDoc fires onSnapshot
        → AuthContext.profile.photoURL updated everywhere
```

### Route Guard Flow

```
User navigates to /profile
  → proxy.ts (Next.js Proxy / middleware)
    → reads session cookie
    → IF no valid session → redirect /login?redirect=/profile
    → IF valid session → allow through
  → app/profile/page.tsx renders ProfileClient
    → useAuth() reads from AuthContext
    → IF user null (edge case) → router.replace('/login?redirect=/profile')
```

---

## Components and Interfaces

### Komponen Baru

#### `app/profile/page.tsx` (Server Component)
Thin server shell yang merender `ProfileClient`. Tidak ada data fetching — semua state dari AuthContext.

```tsx
import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = { title: 'Profil Saya' };

export default function ProfilePage() {
  return <ProfileClient />;
}
```

#### `app/profile/ProfileClient.tsx` (Client Component)
Komponen utama halaman profil. Mengkonsumsi `useAuth()` dan `useProfile()`.

**Props**: none (reads from AuthContext)

**Sections yang dirender**:
1. `ProfileHeader` — Avatar + nama + badge Auth_Provider
2. `ProfileInfoSection` — field display: email, school, createdAt
3. `EditProfileForm` — form edit (name, school) — kondisional saat mode edit aktif
4. `AccountSecuritySection` — tombol reset password (Password_User) atau info Google (Google_User)
5. `ErrorState` / `SkeletonState` — state alternatif

#### `components/profile/Avatar.tsx` (Client Component)
Reusable avatar component dengan fallback inisial.

**Props**:
```typescript
interface AvatarProps {
  photoURL?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';  // 32 | 48 | 80 | 128 px
  className?: string;
}
```

**Behavior**: Render `<img>` jika `photoURL` ada; pada `onError` atau `photoURL` null/empty → render `<div>` dengan inisial dari `getInitials(name)` berlatar `intblue`.

#### `components/profile/AccountDropdown.tsx` (Client Component)
Dropdown menu akun yang dipasang di Navbar.

**Props**:
```typescript
interface AccountDropdownProps {
  user: UserProfile;
  onClose: () => void;
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
}
```

**Accessibility**: `role="menu"`, tiap item `role="menuitem"`, `onKeyDown` untuk `Escape` dan `Tab` trap, focus management (`useEffect` untuk fokus ke item pertama saat mount).

#### `components/profile/ProfileSkeleton.tsx`
Skeleton placeholder untuk halaman profil saat loading.

#### `components/profile/AvatarUploadOverlay.tsx`
Overlay progress saat upload foto. Ditampilkan di atas `Avatar` component.

**Props**:
```typescript
interface AvatarUploadOverlayProps {
  progress: number;  // 0–100
  isUploading: boolean;
}
```

### Modifikasi Komponen Existing

#### `components/Navbar.tsx`
Tambahkan `AccountDropdown` dan `Avatar` di sisi kanan navbar:

- Import `useAuth` untuk membaca `user` dan `profile`
- Import `useAccountDropdown` untuk state dropdown
- Kondisional: `loading` → skeleton 32×32px, `user` → Avatar + dropdown, `!user` → tombol "Masuk"
- Mobile: tambahkan account items ke mobile menu yang sudah ada (bukan popup terpisah)

#### `components/AppShell.tsx`
Tambahkan `'/profile'` ke `MAIN_ROUTES` Set agar Navbar dan Footer muncul di halaman profil.

```typescript
const MAIN_ROUTES = new Set([
  '/',
  '/game-virus',
  '/garis-bilangan',
  '/intline-run',
  '/leaderboard',
  '/materi',
  '/model-chip',
  '/tentang',
  '/profile',   // ← tambahkan ini
]);
```

---

## Data Models

### Perubahan pada `features/auth/types/index.ts`

Tambahkan `photoURL` sebagai optional field di `UserProfile` (backward compatible — dokumen lama yang tidak punya field ini akan baca sebagai `undefined`):

```typescript
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  school: string;
  role: 'user' | 'admin';
  photoURL?: string;       // ← BARU: optional, tidak merusak dokumen lama
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Extend UpdatableUserProfile untuk include photoURL
export type UpdatableUserProfile = Partial<Pick<UserProfile, 'name' | 'email' | 'school' | 'photoURL'>>;
```

### Tipe Baru di `features/profile/types/index.ts`

```typescript
import type { Timestamp } from 'firebase/firestore';

/**
 * Payload yang dikirim ke ProfileService.updateProfile.
 * Hanya field yang diizinkan: name, school, photoURL.
 */
export interface ProfileUpdatePayload {
  name?: string;
  school?: string;
  photoURL?: string;
}

/**
 * Hasil upload foto profil dari StorageService.
 */
export interface PhotoUploadResult {
  downloadURL: string;
  storagePath: string;   // 'profile-photos/{uid}/avatar'
  uploadedAt: Date;
}

/**
 * Error terstruktur dari Profile Module.
 */
export interface ProfileError {
  code: string;           // e.g. 'storage/unauthorized', 'validation/name-too-long'
  message: string;        // Pesan Bahasa Indonesia siap tampil
  field?: 'name' | 'school' | 'photoURL';
}

/**
 * State untuk operasi async di useProfile.
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * State lengkap untuk operasi update profil.
 */
export interface ProfileOperationState {
  status: AsyncStatus;
  error: string | null;
}

/**
 * Return type dari useProfile hook.
 */
export interface UseProfileReturn {
  // Data (read from AuthContext)
  profile: import('@/features/auth/types').UserProfile | null;
  authProvider: 'password' | 'google.com' | 'unknown';

  // Edit mode
  isEditing: boolean;
  editValues: { name: string; school: string };
  editErrors: { name?: string; school?: string };

  // Operations
  saveStatus: AsyncStatus;
  uploadStatus: AsyncStatus;
  uploadProgress: number;
  resetPasswordStatus: AsyncStatus;

  // Actions
  startEdit: () => void;
  cancelEdit: () => void;
  setEditField: (field: 'name' | 'school', value: string) => void;
  handleSave: () => Promise<void>;
  handlePhotoSelect: (file: File) => Promise<void>;
  handleResetPassword: () => Promise<void>;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null;
  clearToast: () => void;
}

/**
 * Return type dari useAccountDropdown hook.
 */
export interface UseAccountDropdownReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  isLoggingOut: boolean;
  handleLogout: () => Promise<void>;
  triggerRef: React.RefObject<HTMLButtonElement>;
  dropdownRef: React.RefObject<HTMLDivElement>;
}
```

---

## Service Layer

### Extension: `features/auth/services/firebase.client.ts`

Tambahkan `storage` ke return type `getFirebaseClient()`. Perubahan ini minimal dan backward-compatible — caller yang tidak butuh `storage` cukup mengabaikannya.

```typescript
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Tambahkan ke cache
let cachedStorage: FirebaseStorage | null = null;

// Return type baru
export function getFirebaseClient(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;   // ← BARU
}
```

**Implementasi**: Setelah `const db = getFirestore(app)`, tambahkan:
```typescript
const storage = getStorage(app);
cachedStorage = storage;
// ... sertakan storage di return dan cache
```

### `features/profile/services/profileService.ts`

```typescript
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/features/auth/services/firebase.client';
import { sanitizeInput } from '@/features/auth/services/authService';
import type { ProfileUpdatePayload, ProfileError } from '../types';

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
 */
export function validateProfileText(payload: {
  name?: string;
  school?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (trimmed.length < 1) errors.name = 'Nama lengkap tidak boleh kosong.';
    else if (trimmed.length > 100) errors.name = 'Nama lengkap maksimal 100 karakter.';
  }
  if (payload.school !== undefined) {
    const trimmed = payload.school.trim();
    if (trimmed.length < 1) errors.school = 'Kelas & sekolah tidak boleh kosong.';
    else if (trimmed.length > 200) errors.school = 'Kelas & sekolah maksimal 200 karakter.';
  }
  return errors;
}

/**
 * Memperbarui profil pengguna di Firestore.
 * Hanya field name, school, photoURL yang diizinkan.
 * Throws ProfileError jika operasi gagal.
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
      message: 'Profil pengguna tidak ditemukan.',
    } satisfies ProfileError;
  }

  // Allow only permitted fields — ignore everything else
  const allowedFields = ['name', 'school', 'photoURL'] as const;
  const safeUpdate: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in payload && payload[field] !== undefined) {
      const value = payload[field] as string;
      // Sanitize text fields (not photoURL — it's a URL)
      safeUpdate[field] = field !== 'photoURL'
        ? sanitizeInput(value)
        : value;
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
```

### `features/profile/services/storageService.ts`

```typescript
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { getFirebaseClient } from '@/features/auth/services/firebase.client';
import type { PhotoUploadResult, ProfileError } from '../types';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB = 5,242,880 bytes

/**
 * Memvalidasi tipe MIME file.
 * Throws ProfileError jika tidak diizinkan.
 */
export function validateMimeType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw {
      code: 'validation/invalid-mime',
      message: `Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.`,
      field: 'photoURL',
    } satisfies ProfileError;
  }
}

/**
 * Memvalidasi ukuran file sebelum kompresi.
 * Throws ProfileError jika melebihi 5MB.
 */
export function validateFileSize(sizeBytes: number): void {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw {
      code: 'validation/file-too-large',
      message: `Ukuran file maksimal 5MB. File yang dipilih melebihi batas tersebut.`,
      field: 'photoURL',
    } satisfies ProfileError;
  }
}

/**
 * Membangun Storage path untuk foto profil pengguna.
 * Path selalu terikat ke uid pengguna yang terautentikasi.
 */
export function buildStoragePath(uid: string): string {
  return `profile-photos/${uid}/avatar`;
}

/**
 * Mengupload blob foto ke Firebase Storage.
 * @param uid  UID pengguna terautentikasi saat ini
 * @param blob Blob hasil kompresi dari imageUtils.compressImage()
 * @param onProgress Callback persentase upload (0–100)
 * @returns PhotoUploadResult berisi downloadURL dan storagePath
 */
export async function uploadPhoto(
  uid: string,
  blob: Blob,
  onProgress?: (percent: number) => void
): Promise<PhotoUploadResult> {
  const { storage } = getFirebaseClient();
  const path = buildStoragePath(uid);
  const storageRef = ref(storage, path);

  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(percent);
      },
      (err) => {
        const code = (err as { code?: string }).code ?? 'unknown';
        reject({
          code,
          message: getStorageErrorMessage(code),
          field: 'photoURL',
        } satisfies ProfileError);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          downloadURL,
          storagePath: path,
          uploadedAt: new Date(),
        });
      }
    );
  });
}

/**
 * Memetakan Firebase Storage error codes ke pesan Bahasa Indonesia.
 */
export function getStorageErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'storage/unauthorized':
      'Akses ke penyimpanan ditolak. Silakan masuk kembali dan coba lagi.',
    'storage/quota-exceeded':
      'Kuota penyimpanan penuh. Hubungi administrator.',
    'storage/retry-limit-exceeded':
      'Upload gagal setelah beberapa percobaan. Periksa koneksi internet dan coba lagi.',
    'storage/object-not-found':
      'File tidak ditemukan di penyimpanan.',
    'storage/bucket-not-found':
      'Konfigurasi penyimpanan tidak ditemukan. Hubungi administrator.',
    'storage/canceled':
      'Upload dibatalkan.',
  };
  return messages[code] ?? 'Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan.';
}
```

---

## Hook Design

### `features/profile/hooks/useProfile.ts`

Hook utama yang mengorkestrasi semua state dan aksi halaman profil.

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { updateProfile, validateProfileText } from '../services/profileService';
import { validateMimeType, validateFileSize, uploadPhoto } from '../services/storageService';
import { compressImage } from '../utils/imageUtils';
import { getAuthProvider } from '../utils/providerUtils';
import { sendPasswordReset } from '@/features/auth/services/authService';
import { getProfileErrorMessage } from '../utils/errorMessages';
import type { UseProfileReturn, AsyncStatus } from '../types';

export function useProfile(): UseProfileReturn {
  const { user, profile } = useAuth();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ name: '', school: '' });
  const [editErrors, setEditErrors] = useState<{ name?: string; school?: string }>({});

  // Async operation states
  const [saveStatus, setSaveStatus] = useState<AsyncStatus>('idle');
  const [uploadStatus, setUploadStatus] = useState<AsyncStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resetPasswordStatus, setResetPasswordStatus] = useState<AsyncStatus>('idle');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const authProvider = user ? getAuthProvider(user) : 'unknown';

  // ...action implementations (handleSave, handlePhotoSelect, handleResetPassword, etc.)

  return {
    profile,
    authProvider,
    isEditing,
    editValues,
    editErrors,
    saveStatus,
    uploadStatus,
    uploadProgress,
    resetPasswordStatus,
    startEdit: () => {
      setEditValues({ name: profile?.name ?? '', school: profile?.school ?? '' });
      setEditErrors({});
      setIsEditing(true);
    },
    cancelEdit: () => {
      setIsEditing(false);
      setEditErrors({});
    },
    setEditField: (field, value) =>
      setEditValues((prev) => ({ ...prev, [field]: value })),
    handleSave,
    handlePhotoSelect,
    handleResetPassword,
    toast,
    clearToast: () => setToast(null),
  };
}
```

**`handleSave` logic**:
1. Validasi `editValues` via `validateProfileText`
2. Jika ada error → set `editErrors`, return (tidak memanggil service)
3. Set `saveStatus = 'loading'`, disable form
4. Panggil `updateProfile(user.uid, sanitized)`
5. On success: `saveStatus = 'success'`, `setIsEditing(false)`, toast sukses
6. On error: `saveStatus = 'error'`, toast error, **pertahankan `editValues`**

**`handlePhotoSelect` logic**:
1. Validasi MIME dan ukuran file
2. Set `uploadStatus = 'loading'`, `uploadProgress = 0`
3. Panggil `compressImage(file)` → blob
4. Panggil `uploadPhoto(user.uid, blob, onProgress)`
5. On success: panggil `updateProfile(user.uid, { photoURL: downloadURL })`, toast sukses
6. On error: `uploadStatus = 'error'`, toast error, foto lama tidak berubah (AuthContext tidak dimodifikasi)

**`handleResetPassword` logic**:
1. Set `resetPasswordStatus = 'loading'`
2. Panggil versi baru `sendPasswordResetWithFeedback(user.email)` (lihat bagian Password Reset di bawah)
3. On success: `resetPasswordStatus = 'success'`, toast sukses
4. On error: `resetPasswordStatus = 'error'`, toast error

### `features/profile/hooks/useAccountDropdown.ts`

```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/features/auth/services/authService';
import type { UseAccountDropdownReturn } from '../types';

export function useAccountDropdown(): UseAccountDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Escape key closes and returns focus to trigger
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsOpen(false);
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    isLoggingOut,
    handleLogout,
    triggerRef,
    dropdownRef,
  };
}
```

---

## Utility Design

### `features/profile/utils/providerUtils.ts`

```typescript
import type { User as FirebaseUser } from 'firebase/auth';

export type AuthProvider = 'password' | 'google.com' | 'unknown';

/**
 * Membaca providerData dari FirebaseUser dan mengembalikan Auth_Provider.
 * Membaca provider pertama — sesuai dengan model single-provider LineChip.
 */
export function getAuthProvider(user: FirebaseUser): AuthProvider {
  const providerId = user.providerData?.[0]?.providerId;
  if (providerId === 'password') return 'password';
  if (providerId === 'google.com') return 'google.com';
  return 'unknown';
}

/**
 * Menghasilkan inisial dari nama lengkap.
 * "Budi Santoso" → "BS", "Budi" → "B"
 * String kosong → "?"
 */
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Mengembalikan label tampilan untuk Auth_Provider.
 */
export function getProviderLabel(provider: AuthProvider): string {
  if (provider === 'password') return 'Email & Kata Sandi';
  if (provider === 'google.com') return 'Google Account';
  return 'Tidak Diketahui';
}
```

### `features/profile/utils/imageUtils.ts`

Kompresi gambar menggunakan Canvas API browser — zero external dependencies.

```typescript
/**
 * Mengompresi gambar ke JPEG dengan dimensi maksimal 400×400px dan ukuran ≤ 300KB.
 * Menggunakan cover crop — gambar dipotong ke aspect ratio 1:1 sebelum di-resize.
 * 
 * @param file File gambar yang dipilih pengguna
 * @returns Blob JPEG hasil kompresi
 */
export async function compressImage(file: File): Promise<Blob> {
  const MAX_DIMENSION = 400;
  const MAX_SIZE_BYTES = 300 * 1024; // 300KB
  const INITIAL_QUALITY = 0.85;

  const bitmap = await createImageBitmap(file);
  const { width: origW, height: origH } = bitmap;

  // Cover crop ke 1:1 aspect ratio
  const cropSize = Math.min(origW, origH);
  const cropX = (origW - cropSize) / 2;
  const cropY = (origH - cropSize) / 2;

  // Output size: tidak lebih dari MAX_DIMENSION
  const outputSize = Math.min(cropSize, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(bitmap, cropX, cropY, cropSize, cropSize, 0, 0, outputSize, outputSize);
  bitmap.close();

  // Iteratif reduce quality sampai ukuran ≤ 300KB
  let quality = INITIAL_QUALITY;
  let blob: Blob | null = null;

  while (quality > 0.1) {
    blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
    );
    if (blob.size <= MAX_SIZE_BYTES) break;
    quality -= 0.1;
  }

  return blob ?? (await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.1)
  ));
}
```

### `features/profile/utils/errorMessages.ts`

```typescript
/**
 * Memetakan profile/Firestore error codes ke pesan Bahasa Indonesia.
 */
export function getProfileErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'not-found': 'Profil pengguna tidak ditemukan.',
    'permission-denied': 'Akses ditolak. Silakan masuk kembali dan coba lagi.',
    'unavailable': 'Layanan tidak tersedia saat ini. Coba lagi nanti.',
    'deadline-exceeded': 'Koneksi ke server timeout. Periksa koneksi internet Anda.',
    'validation/invalid-uid': 'UID pengguna tidak valid.',
    'validation/name-too-long': 'Nama lengkap maksimal 100 karakter.',
    'validation/school-too-long': 'Kelas & sekolah maksimal 200 karakter.',
  };
  return messages[code] ?? 'Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan.';
}
```

---

## Firebase Integration

### Storage Instance di `getFirebaseClient()`

**Cara yang dipilih**: Extend `getFirebaseClient()` agar mengembalikan `storage` bersama `app`, `auth`, dan `db`. Ini mempertahankan pola singleton yang sudah ada dan mencegah duplikasi inisialisasi Firebase App.

Perubahan di `features/auth/services/firebase.client.ts`:

```typescript
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Tambah cache variable
let cachedStorage: FirebaseStorage | null = null;

// Update return type
export function getFirebaseClient(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
} {
  if (cachedApp && cachedAuth && cachedDb && cachedStorage) {
    return { app: cachedApp, auth: cachedAuth, db: cachedDb, storage: cachedStorage };
  }
  // ... inisialisasi existing ...
  const storage = getStorage(app);
  cachedStorage = storage;
  return { app, auth, db, storage };
}
```

### Firebase Storage Path Convention

```
profile-photos/{uid}/avatar
```

- Path selalu terikat ke `uid` pengguna terautentikasi saat ini
- Menggantikan file sebelumnya secara otomatis (same path = overwrite di Storage)
- Content-Type: `image/jpeg` (selalu, setelah kompresi)

### Firestore Security Rules (Implikasi)

Aturan Firestore yang sudah ada harus memastikan:
```
// users/{uid} — hanya owner yang bisa write
match /users/{uid} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow update: if request.auth != null
    && request.auth.uid == uid
    // Cegah update field sensitif dari client
    && !('role' in request.resource.data.diff(resource.data).affectedKeys())
    && !('createdAt' in request.resource.data.diff(resource.data).affectedKeys());
}
```

Firebase Storage Rules (tambah):
```
match /profile-photos/{uid}/avatar {
  allow read: if true;  // Foto profil bisa dilihat publik
  allow write: if request.auth != null
    && request.auth.uid == uid
    && request.resource.size < 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

### Password Reset dengan Error Feedback

`authService.sendPasswordReset()` yang ada menelan semua error. Profile module butuh versi yang surface error. Tambahkan di `features/profile/services/profileService.ts`:

```typescript
import { sendPasswordResetEmail } from 'firebase/auth';

/**
 * Variant sendPasswordReset yang melempar error — untuk dipakai dari halaman profil
 * di mana user sudah login dan kita ingin memberi feedback jika gagal.
 */
export async function sendPasswordResetWithFeedback(email: string): Promise<void> {
  const { auth } = getFirebaseClient();
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'unknown';
    if (code === 'auth/user-not-found') return; // Swallow — security: jangan reveal email terdaftar
    throw {
      code,
      message: getProfileErrorMessage(code),
    } satisfies ProfileError;
  }
}
```

---

## Navbar Integration

### Strategy

Navbar saat ini adalah Client Component sederhana. Kita tambahkan AccountDropdown sebagai bagian dari Navbar yang dikontrol oleh `useAccountDropdown` dan data dari `useAuth`.

Karena `AuthProvider` dipasang di `AppShell` (parent dari `Navbar`), `useAuth()` bisa dipanggil langsung di dalam Navbar.

### Desktop Layout (≥ 768px)

```
[Logo] [Links...] [Avatar Button]
                        ↓ klik
                 [Dropdown Menu]
                 ┌─────────────────┐
                 │ Nama Pengguna   │
                 │ email@...       │
                 │ ─────────────── │
                 │ 👤 Profil Saya  │
                 │ ─────────────── │
                 │ 🚪 Keluar       │
                 └─────────────────┘
```

Tombol "Mulai Belajar" digantikan oleh Avatar button jika `user !== null`. Jika `user === null`, tampilkan tombol "Masuk" (menggantikan "Mulai Belajar").

### Mobile Layout (< 768px)

Account items ditambahkan ke dalam mobile menu yang sudah ada (bukan popup terpisah), di bawah LINKS:

```
[Beranda] [Materi] [Leaderboard] [Tentang]
─────────────────────────────────────────
[👤 Nama Pengguna]
[   Profil Saya    ]
[   Keluar         ]
```

### Skeleton Loading State

Saat `AuthContext.loading === true`, tampilkan `<div>` 32×32px berlatar `#e2e8f0` dengan sudut membulat penuh, animasi pulse Tailwind atau custom:

```tsx
<div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
```

---

## Routing

### Auth Guard

Auth guard diterapkan di dua level:

**Level 1 — Proxy (`proxy.ts` / middleware)**:
Proxy yang sudah ada membaca session cookie. Tambahkan `/profile` sebagai protected route. Jika tidak ada session cookie valid → redirect ke `/login?redirect=/profile`.

**Level 2 — Client Component Fallback**:
Di `ProfileClient.tsx`, tambahkan:
```typescript
const { user, loading } = useAuth();
const router = useRouter();

useEffect(() => {
  if (!loading && !user) {
    router.replace('/login?redirect=/profile');
  }
}, [loading, user, router]);
```

Ini menangani edge case jika session expire saat user sudah di halaman.

### `/profile` Route Structure

```
app/
  profile/
    page.tsx          ← Server Component (metadata, thin shell)
    ProfileClient.tsx ← "use client", semua UI dan hooks
```

Tidak ada `layout.tsx` khusus untuk `/profile` — layout global (`app/layout.tsx`) + AppShell sudah cukup. Dengan `'/profile'` ditambahkan ke `MAIN_ROUTES`, Navbar dan Footer akan muncul otomatis.

---

## State Flow

### AuthContext Propagation

```
Pengguna menyimpan perubahan profil
  ↓
ProfileService.updateProfile() → Firestore updateDoc()
  ↓
Firebase Cloud Firestore processes write
  ↓
onSnapshot() di AuthProvider terpanggil (biasanya < 2 detik)
  ↓
setState({ profile: newData }) di AuthProvider
  ↓
React re-renders semua consumer AuthContext:
  • ProfileClient  → menampilkan data baru
  • Navbar         → Avatar menampilkan nama/foto baru
  • (komponen lain jika ada)
```

Tidak ada manual state sync — `useProfile` tidak punya copy lokal `UserProfile`. Ia hanya membaca `AuthContext.profile` dan memberi aksi ke service layer.

### Upload Photo State Machine

```
                    ┌─────────┐
                    │  idle   │
                    └────┬────┘
            handlePhotoSelect(file)
                         ↓
                    ┌─────────┐
          ┌────────>│ loading │<────────┐
          │         └────┬────┘         │
          │         valid/invalid        │
          │         ↓         ↓         │
          │   ┌─────────┐ ┌───────┐    │
          │   │ success │ │ error │    │
          │   └────┬────┘ └───┬───┘    │
          │        │          │         │
          │    new select   retry       │
          └────────┴──────────┘─────────┘
```

---

## Error Handling Strategy

### Hierarki Error

1. **Validation Error** (client-side): `validateProfileText`, `validateMimeType`, `validateFileSize` → tampil sebagai inline field error atau Toast langsung
2. **ProfileError** (service-level): dilempar oleh `profileService` dan `storageService` → ditangkap oleh hooks → ditampilkan via Toast
3. **Unknown Error** (fallback): semua error yang tidak dikenali → pesan generik "Terjadi kesalahan yang tidak terduga..."

### Error Code Mapping

| Kode | Sumber | Pesan Bahasa Indonesia |
|------|--------|------------------------|
| `permission-denied` | Firestore | "Akses ditolak. Silakan masuk kembali dan coba lagi." |
| `not-found` | Firestore | "Profil pengguna tidak ditemukan." |
| `unavailable` | Firestore | "Layanan tidak tersedia saat ini. Coba lagi nanti." |
| `storage/unauthorized` | Storage | "Akses ke penyimpanan ditolak. Silakan masuk kembali dan coba lagi." |
| `storage/quota-exceeded` | Storage | "Kuota penyimpanan penuh. Hubungi administrator." |
| `storage/retry-limit-exceeded` | Storage | "Upload gagal setelah beberapa percobaan. Periksa koneksi internet dan coba lagi." |
| `storage/object-not-found` | Storage | "File tidak ditemukan di penyimpanan." |
| `auth/requires-recent-login` | Auth | sudah ada di `FIREBASE_ERROR_MESSAGES` |
| `unknown` / catch-all | Semua | "Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan." |

---

## File Structure

Berikut semua file baru dan yang dimodifikasi:

```
linechip/
├── features/
│   ├── auth/
│   │   ├── services/
│   │   │   └── firebase.client.ts        ← MODIFIKASI: tambah storage
│   │   └── types/
│   │       └── index.ts                  ← MODIFIKASI: tambah photoURL, extend UpdatableUserProfile
│   └── profile/                          ← BARU (semua file di bawah)
│       ├── services/
│       │   ├── profileService.ts         # Firestore ops + validateUid, validateProfileText
│       │   └── storageService.ts         # Storage upload + validateMimeType, validateFileSize
│       ├── hooks/
│       │   ├── useProfile.ts             # State dan aksi halaman profil
│       │   └── useAccountDropdown.ts     # Dropdown Navbar state
│       ├── types/
│       │   └── index.ts                  # ProfileUpdatePayload, PhotoUploadResult, ProfileError, AsyncStatus
│       ├── utils/
│       │   ├── providerUtils.ts          # getAuthProvider, getInitials, getProviderLabel
│       │   ├── imageUtils.ts             # compressImage via Canvas API
│       │   └── errorMessages.ts          # getProfileErrorMessage, getStorageErrorMessage
│       └── index.ts                      # Barrel export
├── app/
│   └── profile/                          ← BARU
│       ├── page.tsx                      # Server Component thin shell + metadata
│       └── ProfileClient.tsx             # "use client" — semua UI halaman profil
├── components/
│   ├── profile/                          ← BARU
│   │   ├── Avatar.tsx                    # Reusable avatar + fallback inisial
│   │   ├── AccountDropdown.tsx           # Dropdown menu akun
│   │   ├── ProfileSkeleton.tsx           # Skeleton loading state
│   │   └── AvatarUploadOverlay.tsx       # Progress overlay saat upload
│   ├── AppShell.tsx                      ← MODIFIKASI: tambah '/profile' ke MAIN_ROUTES
│   └── Navbar.tsx                        ← MODIFIKASI: tambah Avatar + AccountDropdown
└── __tests__/
    └── profile/                          ← BARU
        ├── setup.ts                      # Shared mocks untuk profile tests
        ├── providerUtils.test.ts         # Property tests: getAuthProvider, getInitials
        ├── profileService.test.ts        # Property tests: validateProfileText, validateUid, field filtering
        ├── storageService.test.ts        # Property tests: validateMimeType, validateFileSize, buildStoragePath
        ├── imageUtils.test.ts            # Tests: compressImage (dengan Canvas mock)
        └── errorMessages.test.ts        # Property tests: getStorageErrorMessage
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: getAuthProvider selalu mengembalikan nilai yang terdefinisi

*For any* `FirebaseUser` object, `getAuthProvider(user)` SHALL selalu mengembalikan salah satu dari `'password'`, `'google.com'`, atau `'unknown'` — tidak pernah `null`, `undefined`, atau string lain.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 2: getInitials menghasilkan representasi valid untuk semua nama

*For any* nama pengguna non-empty string, `getInitials(name)` SHALL mengembalikan string dengan panjang 1–2 karakter yang seluruhnya huruf besar (uppercase). Untuk string kosong atau whitespace-only, mengembalikan `'?'`.

**Validates: Requirements 3.11, 6.2**

---

### Property 3: validateProfileText menerima iff 1 ≤ len ≤ batas

*For any* string `name`, `validateProfileText({ name })` SHALL mengembalikan error untuk `name` jika dan hanya jika `name.trim().length < 1` atau `name.trim().length > 100`. Untuk `school`, batas atas adalah 200 karakter.

**Validates: Requirements 2.2, 2.3**

---

### Property 4: sanitizeInput menghilangkan karakter berbahaya

*For any* string `s`, `sanitizeInput(s)` SHALL mengembalikan string yang: (a) tidak mengandung tag HTML (`<...>`), (b) tidak mengandung karakter kontrol (kode `0x00–0x1F` dan `0x7F`), dan (c) selalu menghasilkan string yang panjangnya ≤ panjang input asli.

**Validates: Requirements 2.8, 10.5**

---

### Property 5: validateMimeType menerima iff dalam daftar putih

*For any* MIME type string `m`, `validateMimeType(m)` SHALL tidak melempar error jika dan hanya jika `m` adalah salah satu dari `{'image/jpeg', 'image/png', 'image/webp', 'image/gif'}`. Untuk semua string lain (termasuk string kosong), SHALL melempar `ProfileError`.

**Validates: Requirements 3.2, 10.3**

---

### Property 6: validateFileSize menerima iff ukuran ≤ 5MB

*For any* nilai integer non-negatif `size`, `validateFileSize(size)` SHALL tidak melempar error jika dan hanya jika `size ≤ 5_242_880`. Untuk `size > 5_242_880`, SHALL melempar `ProfileError` dengan `code === 'validation/file-too-large'`.

**Validates: Requirements 3.3, 10.4**

---

### Property 7: buildStoragePath selalu terikat ke uid

*For any* string `uid`, `buildStoragePath(uid)` SHALL mengembalikan string yang: (a) mengandung `uid` sebagai substring, (b) diawali dengan `'profile-photos/'`, dan (c) diakhiri dengan `'/avatar'` — sehingga tidak pernah bisa menulis ke path milik pengguna lain.

**Validates: Requirements 10.6**

---

### Property 8: updateProfile hanya menulis field yang diizinkan

*For any* `ProfileUpdatePayload` yang berisi field arbitrer (termasuk `uid`, `role`, `createdAt`, dsb.), `updateProfile` SHALL hanya meneruskan field `name`, `school`, `photoURL`, dan `updatedAt` ke Firestore — semua field lain SHALL diabaikan.

**Validates: Requirements 10.2**

---

### Property 9: getStorageErrorMessage mengembalikan pesan valid untuk semua kode dikenal

*For any* Firebase Storage error code dari set `{'storage/unauthorized', 'storage/quota-exceeded', 'storage/retry-limit-exceeded', 'storage/object-not-found'}`, `getStorageErrorMessage(code)` SHALL mengembalikan string non-empty yang berbeda dari kode itu sendiri dan mengandung setidaknya satu kata dalam Bahasa Indonesia.

**Validates: Requirements 11.4**

---

## Error Handling

### Prinsip

- **Layer-specific throws**: Service layer melempar `ProfileError`, hook layer menangkap dan mengubah ke Toast state — komponen UI tidak pernah langsung menangani Firebase errors.
- **Never expose technical codes**: Pesan yang ditampilkan ke user selalu dalam Bahasa Indonesia; kode error Firebase tidak pernah dirender di UI.
- **Best-effort operations**: Operasi non-kritis (Toast dismiss, password reset) menggunakan best-effort — kegagalan tidak crash aplikasi.

### Error Cascade

```
Firebase SDK throws
  → Service layer catches
  → Throws ProfileError { code, message }
    → Hook catches
    → Sets toast state + operation status
      → Component renders Toast
```

### Fallback UI States

| Kondisi | UI yang Ditampilkan |
|---------|---------------------|
| `AuthContext.loading = true` | `ProfileSkeleton` |
| `user = null` (client-side) | Redirect ke `/login` |
| `profile = null`, `user ≠ null` | Error state + tombol "Muat Ulang" |
| `photoURL` broken | `Fallback_Avatar` (inisial) via `img.onError` |
| `school = ''` | Empty state + ajakan melengkapi profil |
| Upload gagal | Toast error, foto lama dipertahankan |
| Save gagal | Toast error, nilai input dipertahankan |

---

## Testing Strategy

### Dual Testing Approach

Semua operasi async di modul ini menggunakan pendekatan dual:
- **Unit tests** (Jest + `fast-check`): validasi logika murni, error mapping, state machine transitions
- **Property-based tests** (fast-check yang sudah terpasang): coverage exhaustif untuk fungsi-fungsi pure

### Unit Tests — Fokus

- Mounting dan rendering komponen dalam berbagai state (skeleton, error, edit mode)
- Auth guard redirect behavior
- Keyboard accessibility (Escape menutup dropdown, fokus kembali ke trigger)
- Toast lifecycle (muncul saat operasi selesai, dismiss setelah 3 detik)
- `img.onError` fallback ke `Fallback_Avatar`

### Property-Based Tests — Implementasi

Menggunakan `fast-check` (sudah terpasang di `package.json` sebagai `devDependencies`). Jalankan via Jest (`jest --testPathPattern profile`).

Setiap property test dikonfigurasi dengan minimal 100 runs (`numRuns: 100`).

Contoh implementasi untuk Property 3 (validateProfileText):

```typescript
// __tests__/profile/profileService.test.ts
import fc from 'fast-check';
import { validateProfileText } from '@/features/profile/services/profileService';

describe('validateProfileText', () => {
  // Feature: profile-account-management, Property 3: validateProfileText menerima iff 1 ≤ len ≤ batas
  it('accepts name iff 1 ≤ trimmed.length ≤ 100', () => {
    fc.assert(fc.property(
      fc.string(),
      (name) => {
        const errors = validateProfileText({ name });
        const trimmedLen = name.trim().length;
        if (trimmedLen >= 1 && trimmedLen <= 100) {
          return !('name' in errors);
        } else {
          return 'name' in errors && typeof errors.name === 'string';
        }
      }
    ), { numRuns: 200 });
  });

  // Feature: profile-account-management, Property 3: school batas 200 karakter
  it('accepts school iff 1 ≤ trimmed.length ≤ 200', () => {
    fc.assert(fc.property(
      fc.string(),
      (school) => {
        const errors = validateProfileText({ school });
        const trimmedLen = school.trim().length;
        if (trimmedLen >= 1 && trimmedLen <= 200) {
          return !('school' in errors);
        } else {
          return 'school' in errors && typeof errors.school === 'string';
        }
      }
    ), { numRuns: 200 });
  });
});
```

Contoh implementasi untuk Property 7 (buildStoragePath):

```typescript
// __tests__/profile/storageService.test.ts
import fc from 'fast-check';
import { buildStoragePath } from '@/features/profile/services/storageService';

describe('buildStoragePath', () => {
  // Feature: profile-account-management, Property 7: path selalu terikat ke uid
  it('always contains uid and follows expected structure', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1 }),
      (uid) => {
        const path = buildStoragePath(uid);
        return (
          path.includes(uid) &&
          path.startsWith('profile-photos/') &&
          path.endsWith('/avatar')
        );
      }
    ), { numRuns: 100 });
  });
});
```

### Accessibility Testing

- Semua elemen interaktif diverifikasi memiliki `aria-label` via DOM queries
- `role="button"` pada avatar upload area
- `aria-describedby` terhubung ke error message saat validasi gagal
- Keyboard navigation diuji via `@testing-library/user-event` (tambahkan jika belum ada)

> **Catatan**: Full WCAG 2.1 AA validation — termasuk contrast ratio 4.5:1 — memerlukan pengujian manual dengan assistive technology dan audit aksesibilitas oleh expert. Unit tests hanya memverifikasi kehadiran atribut ARIA yang benar.

### Test Configuration

Tag format per property test (sesuai workflow requirement):
```
// Feature: profile-account-management, Property {N}: {property_text}
```

Jalankan test:
```bash
# Single run (bukan watch mode)
npx jest --testPathPattern __tests__/profile --runInBand
```
