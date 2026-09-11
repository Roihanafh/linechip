# Implementation Plan: Profile & Account Management

## Overview

Implementasi modul Profile & Account Management secara inkremental mengikuti dependency order yang ketat: data compatibility patch → types/utils → firebase extension → services → hooks → UI components reusable → halaman profil → integrasi Navbar/AppShell → tests. Setiap task membangun di atas task sebelumnya sehingga tidak ada orphaned code.

## Tasks

- [x] 0. Audit dan patch kompatibilitas data register → profil
  - [x] 0.1 Patch `features/auth/types/index.ts` — tambah `photoURL` ke UserProfile
    - Tambahkan `photoURL?: string` ke interface `UserProfile` (optional, backward compatible)
    - Extend `UpdatableUserProfile` type agar mencakup `'photoURL'` dalam `Pick`
    - Verifikasi tidak ada type error di file yang sudah mengimpor `UserProfile`
    - _Requirements: 2.1, 3.7, 7.1, 7.3_

  - [x] 0.2 Patch `features/auth/services/authService.ts` — simpan `photoURL` Google ke Firestore
    - Di fungsi `loginWithGoogle()`, saat membuat dokumen Firestore baru (kondisi `!profileSnap.exists()`), tambahkan `photoURL: user.photoURL ?? ''` ke object yang di-`setDoc`
    - Pastikan dokumen existing (user yang sudah terdaftar) TIDAK dioverwrite — hanya insert saat `!profileSnap.exists()` (kondisi ini sudah benar, cukup tambahkan field)
    - _Requirements: 3.7, 5.6, 7.1_

  - [x] 0.3 Patch `app/register/RegisterClient.tsx` — tampilkan error validasi field school
    - Teruskan `error={errors.school}` ke prop `error` pada `FloatingInput` id="reg-school"
    - Ini memastikan pesan error dari `useRegisterForm` ("Nama sekolah harus diisi") ditampilkan ke user
    - JANGAN ubah logika validasi di `useRegisterForm.ts` — hanya fix UI yang tidak meneruskan error
    - _Requirements: 2.2, 7.1_

  - [x] 0.4 Tambahkan `formatDate(timestamp: Timestamp): string` di `features/profile/utils/`
    - Implementasikan fungsi `formatDate(timestamp: Timestamp | null | undefined): string` di `features/profile/utils/dateUtils.ts`
    - Output: format tanggal Bahasa Indonesia, contoh "12 Januari 2025"
    - Gunakan `Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })`
    - Return `'Tanggal tidak tersedia'` jika `timestamp` null/undefined
    - _Requirements: 1.3_

- [x] 1. Definisikan types dan utilities profil
  - [x] 1.1 Buat `features/profile/types/index.ts` dengan semua tipe baru
    - Definisikan `ProfileUpdatePayload`, `PhotoUploadResult`, `ProfileError`, `AsyncStatus`, `ProfileOperationState`, `UseProfileReturn`, `UseAccountDropdownReturn`
    - Pastikan import dari `@/features/auth/types` menggunakan `import type`
    - _Requirements: 8.4_

  - [x] 1.2 Buat `features/profile/utils/providerUtils.ts`
    - Implementasikan `getAuthProvider(user: FirebaseUser): 'password' | 'google.com' | 'unknown'` yang membaca `user.providerData[0].providerId`
    - Implementasikan `getInitials(name: string): string` — "Budi Santoso" → "BS", string kosong/whitespace → "?"
    - Implementasikan `getProviderLabel(provider: AuthProvider): string` dengan label Bahasa Indonesia
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.3 Buat `features/profile/utils/imageUtils.ts`
    - Implementasikan `compressImage(file: File): Promise<Blob>` menggunakan Canvas API browser
    - Cover crop ke 1:1 aspect ratio sebelum resize
    - Output: JPEG ≤ 300KB, dimensi ≤ 400×400px, iteratif reduce quality dari 0.85 hingga 0.1
    - _Requirements: 3.4_

  - [x] 1.4 Buat `features/profile/utils/errorMessages.ts`
    - Implementasikan `getProfileErrorMessage(code: string): string` dengan pemetaan kode error Firestore ke Bahasa Indonesia
    - Tambahkan fallback: "Terjadi kesalahan yang tidak terduga. Coba lagi atau hubungi dukungan."
    - _Requirements: 11.3, 11.4_

- [x] 2. Extend tipe dan Firebase client yang sudah ada
  - [x] 2.1 Verifikasi Task 0.1 dan extend `features/auth/services/firebase.client.ts` — tambah storage singleton
    - Verifikasi bahwa `photoURL?: string` dan perluasan `UpdatableUserProfile` dari Task 0.1 sudah benar dan tidak ada type error yang tersisa
    - Import `getStorage` dan `FirebaseStorage` dari `firebase/storage`
    - Tambah `cachedStorage: FirebaseStorage | null = null`
    - Update return type dan implementasi `getFirebaseClient()` agar mengembalikan `storage`
    - Sertakan `storage` di cache check dan return object
    - _Requirements: 8.5, 8.6_

- [x] 3. Implementasikan service layer profil
  - [x] 3.1 Buat `features/profile/services/profileService.ts`
    - Implementasikan `validateUid(uid: unknown): asserts uid is string` — throws `ProfileError` jika tidak valid
    - Implementasikan `validateProfileText(payload: { name?: string; school?: string }): Record<string, string>` — validasi batas 1–100 karakter untuk `name`, 1–200 untuk `school`
    - Implementasikan `updateProfile(uid: string, payload: ProfileUpdatePayload): Promise<void>` — field whitelist `['name', 'school', 'photoURL']`, sanitize dengan `sanitizeInput`, tambahkan `updatedAt: serverTimestamp()`
    - Implementasikan `sendPasswordResetWithFeedback(email: string): Promise<void>` — surface error kecuali `auth/user-not-found`
    - Implementasikan `formatDate(timestamp: Timestamp | null | undefined): string` — delegasikan ke `dateUtils.ts` dari Task 0.4
    - _Requirements: 2.4, 4.2, 10.1, 10.2, 10.5_

  - [x] 3.2 Buat `features/profile/services/storageService.ts`
    - Implementasikan `validateMimeType(mimeType: string): void` — whitelist `{'image/jpeg', 'image/png', 'image/webp', 'image/gif'}`, throws `ProfileError`
    - Implementasikan `validateFileSize(sizeBytes: number): void` — batas 5MB (5,242,880 byte), throws `ProfileError`
    - Implementasikan `buildStoragePath(uid: string): string` — mengembalikan `profile-photos/${uid}/avatar`
    - Implementasikan `uploadPhoto(uid: string, blob: Blob, onProgress?: (percent: number) => void): Promise<PhotoUploadResult>` — menggunakan `uploadBytesResumable`, content-type `image/jpeg`
    - Implementasikan `getStorageErrorMessage(code: string): string` dengan pemetaan error Storage ke Bahasa Indonesia
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 10.3, 10.4, 10.6, 11.4_

- [x] 4. Implementasikan custom hooks profil
  - [x] 4.1 Buat `features/profile/hooks/useProfile.ts`
    - State: `isEditing`, `editValues`, `editErrors`, `saveStatus`, `uploadStatus`, `uploadProgress`, `resetPasswordStatus`, `toast`
    - `startEdit()`: seed `editValues` dari `profile`, reset `editErrors`, set `isEditing = true`
    - `handleSave()`: validate → set errors atau panggil `updateProfile` → toast sukses/error, pertahankan `editValues` saat gagal
    - `handlePhotoSelect(file)`: validate MIME+size → compress → upload dengan progress → `updateProfile({photoURL})` → toast
    - `handleResetPassword()`: panggil `sendPasswordResetWithFeedback`, toast sesuai hasil
    - `cancelEdit()`: reset `isEditing` dan `editErrors` tanpa memanggil service
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 3.6, 4.2, 4.3, 4.4, 4.5, 7.4_

  - [x] 4.2 Buat `features/profile/hooks/useAccountDropdown.ts`
    - State: `isOpen`, `isLoggingOut`, `triggerRef`, `dropdownRef`
    - `handleLogout()`: panggil `logout()` dari authService, redirect ke `/`, set `isLoggingOut`
    - `useEffect` untuk close on outside click (mousedown pada `document`)
    - `useEffect` untuk `Escape` key — close dan return focus ke `triggerRef`
    - _Requirements: 6.6, 6.7, 6.8, 9.6_

- [x] 5. Checkpoint — Verifikasi layer service dan hooks
  - Pastikan TypeScript compile tanpa error di `features/profile/`, `features/auth/types/index.ts`, dan `features/auth/services/firebase.client.ts`. Jalankan `npx tsc --noEmit` dan perbaiki error yang ada. Tanyakan jika ada ambiguitas.

- [x] 6. Implementasikan UI components reusable
  - [x] 6.1 Buat `components/profile/Avatar.tsx`
    - Props: `photoURL?: string | null`, `name: string`, `size?: 'sm' | 'md' | 'lg' | 'xl'` (32/48/80/128px), `className?: string`
    - Render `<img>` jika `photoURL` ada; pada `onError` atau `photoURL` null/empty → render `<div>` dengan `getInitials(name)` berlatar `intblue`
    - `role="img"` dengan `aria-label` yang deskriptif
    - _Requirements: 3.11, 6.2, 11.2_

  - [x] 6.2 Buat `components/profile/AvatarUploadOverlay.tsx`
    - Props: `progress: number` (0–100), `isUploading: boolean`
    - Tampilkan overlay semi-transparan di atas Avatar dengan persentase progress
    - `aria-label` yang mendeskripsikan status upload
    - _Requirements: 3.6, 11.5_

  - [x] 6.3 Buat `components/profile/ProfileSkeleton.tsx`
    - Skeleton placeholder yang mencerminkan layout ProfileClient: Avatar, nama, email, school, badge, tombol
    - Gunakan animasi `animate-pulse` Tailwind
    - _Requirements: 1.5_

  - [x] 6.4 Buat `components/profile/AccountDropdown.tsx`
    - Props: `user: UserProfile`, `onClose: () => void`, `onLogout: () => Promise<void>`, `isLoggingOut: boolean`
    - `role="menu"`, tiap item `role="menuitem"`
    - `useEffect` untuk fokus ke item pertama saat mount
    - Tampilkan: nama, email, link "Profil Saya" (→ `/profile`), tombol "Keluar" dengan loading state
    - Design tokens: latar putih, `border-border`, `shadow-sm`, `rounded-xl`, animasi `.rise-in` atau `animate-fade-slide-in`
    - _Requirements: 6.4, 6.5, 6.6, 6.8, 6.10, 9.6_

- [x] 7. Buat barrel export dan halaman profil
  - [x] 7.1 Buat `features/profile/index.ts`
    - Re-export semua public API: `useProfile`, `useAccountDropdown`, `profileService`, `storageService`, `providerUtils`, types
    - _Requirements: 8.3_

  - [x] 7.2 Buat `app/profile/page.tsx` — Server Component thin shell
    - `export const metadata: Metadata = { title: 'Profil Saya' }`
    - Render `<ProfileClient />` saja, tidak ada data fetching
    - _Requirements: 1.2, 8.1_

  - [x] 7.3 Buat `app/profile/ProfileClient.tsx` — UI utama halaman profil
    - `'use client'`, konsumsi `useAuth()` dan `useProfile()`
    - Auth guard: `useEffect` yang redirect ke `/login?redirect=/profile` jika `!loading && !user`
    - State loading: render `<ProfileSkeleton />`
    - State error (profile null, user tidak null): pesan error + tombol "Muat Ulang"
    - State normal: `ProfileHeader` (Avatar + nama + badge provider), `ProfileInfoSection` (email, school, createdAt), `EditProfileForm` (kondisional, `FloatingInput`), `AccountSecuritySection` (tombol reset password untuk Password_User, info Google untuk Google_User)
    - Tampilkan `createdAt` menggunakan `formatDate()` dari `dateUtils.ts`
    - Avatar click area: `role="button"`, `aria-label="Ubah foto profil"`, dapat diaktifkan via Enter/Space, buka `<input type="file">`
    - Semua field input dengan `aria-label` dan `aria-describedby` saat ada error
    - Tampilkan `<Toast>` saat `toast !== null`
    - Tampilkan empty state untuk `school === ''` (Google User baru)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.7, 2.9, 3.1, 4.1, 4.5, 4.6, 7.5, 9.1, 9.2, 9.3, 9.4, 11.1, 11.6_

- [x] 8. Integrasi Navbar dan AppShell
  - [x] 8.1 Modifikasi `components/AppShell.tsx` — tambah `/profile` ke MAIN_ROUTES
    - Tambahkan `'/profile'` ke dalam `MAIN_ROUTES` Set agar Navbar dan Footer muncul di halaman profil
    - _Requirements: 1.1_

  - [x] 8.2 Modifikasi `components/Navbar.tsx` — integrasi Avatar + AccountDropdown
    - Import `useAuth` dari `@/features/auth`, `useAccountDropdown` dari `@/features/profile`
    - Import `Avatar` dari `@/components/profile/Avatar`, `AccountDropdown` dari `@/components/profile/AccountDropdown`
    - **Desktop**: Ganti tombol "Mulai Belajar" dengan: skeleton 32×32px saat `loading`, Avatar button + dropdown saat `user !== null`, tombol "Masuk" saat `user === null`
    - **Mobile**: Tambahkan account items di bawah LINKS dalam mobile menu yang sudah ada (bukan popup terpisah)
    - Gunakan `triggerRef` dan `dropdownRef` dari `useAccountDropdown` untuk aksesibilitas
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7, 6.9, 6.11_

- [x] 9. Checkpoint — Verifikasi UI dan integrasi
  - Pastikan TypeScript compile tanpa error di semua file yang dibuat/dimodifikasi. Jalankan `npx tsc --noEmit`. Tanyakan jika ada pertanyaan tentang implementasi sebelum melanjutkan ke tests.

- [x] 10. Implementasikan property-based tests dan unit tests
  - [x] 10.1 Buat `__tests__/profile/providerUtils.test.ts`
    - **Property 1: getAuthProvider selalu mengembalikan nilai terdefinisi** — `fc.oneof(fc.constant('password'), fc.constant('google.com'), fc.string())` untuk `providerId`, verifikasi return selalu `'password' | 'google.com' | 'unknown'`
    - **Property 2: getInitials menghasilkan representasi valid** — untuk semua string non-empty, panjang hasil 1–2 karakter uppercase; untuk empty/whitespace → `'?'`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 3.11_

  - [x] 10.2 Tulis property test tambahan untuk `getAuthProvider` dan `getInitials`
    - Verifikasi `getInitials` tidak pernah menghasilkan karakter lowercase
    - Verifikasi `getInitials` selalu menghasilkan subset karakter dari nama input (kecuali fallback `'?'`)
    - `numRuns: 200` per property
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 10.3 Buat `__tests__/profile/profileService.test.ts`
    - **Property 3: validateProfileText menerima iff 1 ≤ len ≤ batas** — `fc.string()` untuk `name` dan `school`, verifikasi error hadir iff `trim().length < 1 || trim().length > batas`
    - **Property 8: updateProfile hanya menulis field yang diizinkan** — mock Firestore `updateDoc`, kirim payload dengan field tidak terdaftar (`uid`, `role`, `createdAt`), verifikasi hanya `name`/`school`/`photoURL`/`updatedAt` yang dikirim
    - Test `validateUid` dengan nilai non-string dan string kosong
    - `numRuns: 200` per property
    - _Requirements: 2.2, 2.3, 10.1, 10.2, 10.5_

  - [x] 10.4 Buat `__tests__/profile/storageService.test.ts`
    - **Property 5: validateMimeType menerima iff dalam daftar putih** — `fc.string()` untuk MIME type, verifikasi throws iff bukan dalam `{'image/jpeg', 'image/png', 'image/webp', 'image/gif'}`
    - **Property 6: validateFileSize menerima iff ukuran ≤ 5MB** — `fc.integer({ min: 0, max: 10_000_000 })` untuk size, verifikasi boundary `5_242_880`
    - **Property 7: buildStoragePath selalu terikat ke uid** — `fc.string({ minLength: 1 })` untuk uid, verifikasi path mengandung uid, diawali `'profile-photos/'`, diakhiri `'/avatar'`
    - **Property 9: getStorageErrorMessage mengembalikan pesan valid** — untuk kode yang dikenal, verifikasi string non-empty berbeda dari kode itu sendiri
    - `numRuns: 100` per property
    - _Requirements: 3.1, 3.2, 3.3, 10.3, 10.4, 10.6, 11.4_

  - [x] 10.5 Tulis unit tests tambahan untuk edge cases storageService
    - Test `validateFileSize` pada nilai boundary tepat (5_242_880 dan 5_242_881)
    - Test `uploadPhoto` dengan mock `uploadBytesResumable` — simulasi progress dan error `storage/unauthorized`
    - _Requirements: 3.3, 10.4_

- [x] 11. Final checkpoint — Semua tests harus lulus
  - Jalankan `npx jest --testPathPattern __tests__/profile --runInBand` dan pastikan semua tests lulus. Tanyakan jika ada pertanyaan.

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk iterasi lebih cepat
- Setiap task merujuk ke requirements spesifik untuk traceability
- Checkpoint (Task 5, 9, 11) memastikan validasi inkremental sebelum melanjutkan
- Property tests menggunakan `fast-check` yang sudah terpasang di `devDependencies`
- Semua error message harus dalam Bahasa Indonesia — tidak boleh mengekspos Firebase error code ke UI
- `sanitizeInput` dari `features/auth/services/authService.ts` digunakan di `profileService.ts`
- `AuthContext` adalah single source of truth — `useProfile` tidak punya copy lokal `UserProfile`
- Firebase Storage MIME type rules di `storageService` harus konsisten dengan Firebase Storage Security Rules
- **Data compatibility**: Task 0 harus selesai sebelum task lain — patch ini memastikan `photoURL` Google User tersimpan ke Firestore sejak awal, error validasi `school` tampil ke user, dan `formatDate` tersedia untuk tampilan `createdAt`
- `dateUtils.ts` dibuat di Task 0.4 dan dikonsumsi oleh `profileService.ts` (Task 3.1) dan `ProfileClient.tsx` (Task 7.3) — jangan duplikasi logika formatting

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0.1", "0.2", "0.3", "0.4"] },
    { "id": 1, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["7.1", "7.2"] },
    { "id": 7, "tasks": ["7.3"] },
    { "id": 8, "tasks": ["8.1", "8.2"] },
    { "id": 9, "tasks": ["10.1", "10.3", "10.4"] },
    { "id": 10, "tasks": ["10.2", "10.5"] }
  ]
}
```
