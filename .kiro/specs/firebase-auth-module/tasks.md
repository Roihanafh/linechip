# Implementation Plan: Firebase Auth Module

## Overview

Mengintegrasikan Firebase Authentication dan Cloud Firestore ke dalam platform edukasi LineChip. Semua Firebase logic dikurung di `features/auth/` menggunakan arsitektur feature-based. UI komponen (`LoginClient.tsx`, `RegisterClient.tsx`) disambungkan ke Firebase tanpa mengubah JSX atau styling melalui hook `useLoginForm()` dan `useRegisterForm()`. Proteksi route ditangani oleh `proxy.ts` (Next.js 16) dengan optimistic JWT decode via `jose`.

## Tasks

- [x] 1. Install dependencies dan setup environment
  - [x] 1.1 Install Firebase SDK, Firebase Admin, dan jose
    - Jalankan: `npm install firebase@^11 firebase-admin@^13 jose@^5`
    - Verifikasi versi yang terinstall tidak konflik dengan React 19 / Next.js 16.3.4
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Buat file `.env.local` template dengan semua env var yang dibutuhkan
    - Buat `.env.local.example` berisi semua key yang dibutuhkan tanpa nilai aktual:
      ```
      NEXT_PUBLIC_FIREBASE_API_KEY=
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
      NEXT_PUBLIC_FIREBASE_PROJECT_ID=
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
      NEXT_PUBLIC_FIREBASE_APP_ID=
      FIREBASE_PROJECT_ID=
      FIREBASE_CLIENT_EMAIL=
      FIREBASE_PRIVATE_KEY=
      SESSION_COOKIE_NAME=__session
      ```
    - Pastikan `.env.local` sudah ada di `.gitignore`
    - _Requirements: 1.3, 1.4, 1.7_

- [x] 2. Definisikan TypeScript types dan utilities dasar
  - [x] 2.1 Buat `features/auth/types/index.ts` dengan semua type definitions
    - Implementasikan: `UserProfile`, `AuthUser`, `AuthContextValue`, `AuthError`
    - Implementasikan: `UseLoginFormReturn`, `UseRegisterFormReturn`
    - Implementasikan: `DecodedSessionClaims`, `UpdatableUserProfile`
    - _Requirements: 5.1, 8.1, 13.5_

  - [x] 2.2 Buat `features/auth/utils/errorMessages.ts`
    - Implementasikan `FIREBASE_ERROR_MESSAGES` record dengan semua kode error Firebase relevan → terjemahan Bahasa Indonesia
    - Implementasikan `getErrorMessage(code: string): string` dengan fallback ke pesan generik
    - Implementasikan `getErrorField(code: string): 'email' | 'password' | undefined`
    - Kode yang harus dicakup: `auth/email-already-in-use`, `auth/invalid-email`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, `auth/user-disabled`, `auth/too-many-requests`, `auth/network-request-failed`, `auth/popup-closed-by-user`, `auth/popup-blocked`, `auth/cancelled-popup-request`, `auth/account-exists-with-different-credential`, `auth/requires-recent-login`, `auth/weak-password`, `auth/operation-not-allowed`, `auth/session-cookie-expired`, `auth/session-cookie-revoked`, `network-error`, `unknown`
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 2.3 Tulis property test untuk Property 2 (error message mapping)
    - **Property 2: Error message mapping — setiap error code menghasilkan pesan yang dapat ditampilkan**
    - Tag: `// Feature: firebase-auth-module, Property 2: Error message mapping non-kosong`
    - Gunakan `fc.string()` untuk generate error code acak — termasuk yang tidak dikenal
    - Assert: `getErrorMessage(code)` selalu mengembalikan string non-kosong dan non-whitespace
    - **Validates: Requirements 15.1, 15.3**
    - File: `__tests__/auth/errorMessages.test.ts`

  - [x] 2.4 Buat `features/auth/utils/tokenHelpers.ts`
    - Implementasikan `getSessionCookieExpiry(rememberMe: boolean): number` — 30 hari jika true, 5 hari jika false (dalam milidetik)
    - Implementasikan `decodeSessionCookieOptimistic(cookie: string): { uid: string; role?: string; exp: number } | null` — decode JWT tanpa verifikasi signature menggunakan `jose.decodeJwt`, return null jika malformed
    - _Requirements: 3.8, 3.9, 8.7_

- [x] 3. Inisialisasi Firebase client SDK
  - [x] 3.1 Buat `features/auth/services/firebase.client.ts`
    - Implementasikan `validateClientEnv(): void` — throw Error menyebutkan nama variabel yang hilang atau whitespace-only; memeriksa ke-6 `NEXT_PUBLIC_FIREBASE_*` env vars
    - Implementasikan singleton `getFirebaseClient(): { app: FirebaseApp; auth: Auth; db: Firestore }` — panggil `initializeApp` hanya satu kali menggunakan `getApps().length` check
    - Set `browserLocalPersistence` sebagai default Auth persistence
    - _Requirements: 1.1, 1.3, 1.5, 1.7, 12.1_

  - [x] 3.2 Tulis property test untuk Property 1 (env var validation)
    - **Property 1: Validasi env var — string kosong atau whitespace-only diperlakukan sebagai tidak terdefinisi**
    - Tag: `// Feature: firebase-auth-module, Property 1: Whitespace env vars treated as missing`
    - Generate subarray non-kosong dari `REQUIRED_ENV_VARS` dan nilai whitespace-only (`fc.stringMatching(/^[\s\t\n]+$/)`)
    - Assert: `validateClientEnv()` melempar Error yang menyebutkan nama variabel
    - Assert: tidak ada objek Firebase yang dibuat sebelum validasi lulus
    - **Validates: Requirements 1.3, 1.7**
    - File: `__tests__/auth/firebase.client.test.ts`

  - [x] 3.3 Buat `features/auth/services/firebase.admin.ts`
    - Tambahkan `import 'server-only'` di baris pertama sebagai guard dari Client Component
    - Validasi env server: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — throw Error jika tidak valid
    - Implementasikan singleton Admin App initialization menggunakan `admin.apps.length` check
    - Handle `FIREBASE_PRIVATE_KEY` yang memiliki literal `\n` (replace `\\n` → `\n`)
    - Ekspor: `getAdminAuth()`, `getAdminDb()`
    - _Requirements: 1.2, 1.3, 1.6, 1.7_

- [x] 4. Implementasikan AuthService
  - [x] 4.1 Buat `features/auth/services/authService.ts` — utility dan fungsi dasar
    - Implementasikan `sanitizeInput(input: string): string` — hapus karakter kontrol `\x00-\x1F\x7F` dan tag HTML `<[^>]*>`, lalu trim
    - Implementasikan `getValidIdToken(): Promise<string>` — panggil `getIdToken(true)` dari current user; throw `AuthError` dengan pesan Indonesia jika user tidak ada atau refresh gagal
    - Implementasikan `getUserProfile(uid: string): Promise<UserProfile | null>` — fetch dokumen Firestore `users/{uid}`, return null jika tidak ada
    - Implementasikan `updateUserProfile(uid: string, partialProfile: UpdatableUserProfile): Promise<void>` — hanya boleh menulis field `name`, `email`, `school`, dan `updatedAt`; throw jika dokumen tidak ditemukan
    - _Requirements: 2.10, 5.4, 5.5, 12.3, 12.5_

  - [x] 4.2 Tulis property test untuk Property 4 (input sanitization)
    - **Property 4: Input sanitasi tidak menambah karakter berbahaya**
    - Tag: `// Feature: firebase-auth-module, Property 4: sanitizeInput menghapus chars berbahaya`
    - Gunakan `fc.string()` untuk generate semua jenis string
    - Assert: `result.length <= input.length`
    - Assert: `result` tidak mengandung `/<[^>]*>/` (HTML tags)
    - Assert: `result` tidak mengandung `/[\x00-\x1F]/` (control chars)
    - **Validates: Requirements 2.10**
    - File: `__tests__/auth/utils.test.ts`

  - [x] 4.3 Tulis property test untuk Property 6 (updateUserProfile field restriction)
    - **Property 6: updateUserProfile hanya memperbarui field yang diizinkan**
    - Tag: `// Feature: firebase-auth-module, Property 6: updateUserProfile hanya menulis field yang diizinkan`
    - Gunakan `fc.uuid()`, `fc.string()`, `fc.emailAddress()` sebagai input
    - Mock Firestore `updateDoc` dan assert bahwa keys yang ditulis hanya: `name`, `email`, `school`, `updatedAt`
    - Assert: tidak ada key `uid`, `role`, `createdAt` dalam data yang ditulis
    - **Validates: Requirements 5.5**
    - File: `__tests__/auth/authService.test.ts`

  - [x] 4.4 Implementasikan `registerWithEmail` di `authService.ts`
    - Langkah: `createUserWithEmailAndPassword` → buat dokumen Firestore `users/{uid}` dengan field lengkap (role: 'user', createdAt, updatedAt) → `sendEmailVerification`
    - Sanitasi `name` dan `school` via `sanitizeInput()` sebelum menyimpan ke Firestore
    - Wrap dalam try-catch: throw `AuthError` dengan `getErrorMessage` + `getErrorField`
    - Jika pembuatan Firestore gagal setelah Auth berhasil: hapus akun Auth yang baru dibuat (rollback), throw `AuthError` generik
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.9, 2.10_

  - [x] 4.5 Implementasikan `loginWithEmail`, `loginWithGoogle`, `logout`, dan `sendPasswordReset` di `authService.ts`
    - `loginWithEmail(email, password, rememberMe)`: `signInWithEmailAndPassword` → `getIdToken()` → `POST /api/auth/session` dengan `{ idToken, rememberMe }`; throw `AuthError` on failure
    - `loginWithGoogle()`: `signInWithPopup` dengan `GoogleAuthProvider` → buat atau merge profil Firestore → `POST /api/auth/session`; abaikan `auth/popup-closed-by-user` dan `auth/cancelled-popup-request` secara silent
    - `logout()`: `signOut(auth)` → `POST /api/auth/logout` (best-effort, jangan throw ke caller jika logout server gagal)
    - `sendPasswordReset(email)`: `sendPasswordResetEmail`; selalu return void (sembunyikan apakah email terdaftar)
    - _Requirements: 3.2, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 11.2_

- [x] 5. Checkpoint — Verifikasi layer services
  - Pastikan semua fungsi di `authService.ts` dapat di-import tanpa error TypeScript
  - Jalankan: `npx tsc --noEmit` — tidak ada type errors pada `features/auth/services/`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implementasikan AuthContext dan AuthProvider
  - [x] 6.1 Buat `features/auth/context/AuthContext.ts`
    - Definisikan `AuthContext` menggunakan `createContext<AuthContextValue | null>(null)`
    - Ekspor `AuthContext` sebagai named export
    - _Requirements: 9.2_

  - [x] 6.2 Buat `features/auth/context/AuthProvider.tsx`
    - Tambahkan `"use client"` directive
    - Implementasikan state machine AuthProvider: `loading: true` → `UNAUTHENTICATED` atau `AUTHENTICATED`
    - Setup `onAuthStateChanged` listener di `useEffect` — bersihkan di cleanup
    - Ketika FirebaseUser non-null: pasang real-time Firestore `onSnapshot` pada `users/{uid}` — bersihkan listener profil sebelumnya setiap kali user berubah
    - Ketika profil Firestore tidak ada (race condition saat registrasi): set `profile: null, loading: false` tanpa error
    - Ketika Firestore snapshot error: set `error: 'Gagal memuat data profil. Coba muat ulang halaman.'`, `profile: null`
    - Invariant: tidak pernah ada state `{ user: null, profile: non-null }`
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.7, 5.2, 5.6_

  - [x] 6.3 Tulis property test untuk Property 5 (auth state transitions)
    - **Property 5: Auth state transitions membentuk urutan yang konsisten**
    - Tag: `// Feature: firebase-auth-module, Property 5: Auth state transitions valid`
    - Generate urutan event `onAuthStateChanged` (null / FirebaseUser object) dengan `fc.array(fc.oneof(...))`
    - Mock `onAuthStateChanged` dan assert invariant-invariant state setelah setiap event
    - Assert: tidak pernah `{ user: null, profile: non-null }`
    - Assert: setelah event null → `{ user: null, profile: null, loading: false, error: null }`
    - **Validates: Requirements 9.1, 9.5, 10.3**
    - File: `__tests__/auth/AuthProvider.test.tsx`

- [x] 7. Implementasikan custom hooks
  - [x] 7.1 Buat `features/auth/hooks/useAuth.ts`
    - Implementasikan `useAuth(): AuthContextValue` — panggil `useContext(AuthContext)`, throw Error dengan pesan deskriptif jika context null (menandakan penggunaan di luar AuthProvider)
    - _Requirements: 9.3_

  - [x] 7.2 Buat `features/auth/hooks/useLoginForm.ts`
    - Tambahkan `"use client"` directive
    - State: `loading`, `errors: Record<string, string>`, `toast: { message: string; type: 'success' | 'error' } | null`
    - Gunakan `useRef<boolean>` untuk guard double-submit (`submittingRef`)
    - `onSubmit(email, password, rememberMe)`: panggil `AuthService.loginWithEmail` → on success: set toast sukses + `router.replace(redirect ?? '/')` → on AuthError: jika `err.field` ada set ke `errors`, jika tidak set ke `toast`
    - Baca `redirect` dari `useSearchParams()`
    - Return type harus sesuai `UseLoginFormReturn`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 13.1, 13.4, 13.5, 13.6_

  - [x] 7.3 Buat `features/auth/hooks/useRegisterForm.ts`
    - Identik dengan `useLoginForm` tetapi menangani field `name`, `email`, `password`, `school`
    - Validasi client-side sebelum memanggil `AuthService`: name (1–100 char non-whitespace), email (format valid), password (min 6 char), school (1–200 char non-whitespace)
    - Error per-field disimpan di `errors[fieldName]`; jangan panggil `AuthService` jika ada error validasi
    - On success: set toast 'Akun berhasil dibuat! Cek email untuk verifikasi.' + `router.replace('/login')`
    - Return type harus sesuai `UseRegisterFormReturn`
    - _Requirements: 2.5, 2.6, 2.8, 13.1, 13.4, 13.5, 13.6_

  - [x] 7.4 Tulis property test untuk Property 3 (form validation)
    - **Property 3: Validasi form — field wajib kosong atau whitespace-only selalu ditolak**
    - Tag: `// Feature: firebase-auth-module, Property 3: Whitespace fields rejected without calling AuthService`
    - Gunakan `fc.stringMatching(/^[\s\t\n]*$/)` untuk field yang kosong/whitespace
    - Spy pada `AuthService.registerWithEmail` — assert tidak pernah dipanggil ketika ada field invalid
    - Assert: `errors[field]` non-empty setelah `onSubmit` dengan field kosong
    - **Validates: Requirements 2.5, 2.6**
    - File: `__tests__/auth/useRegisterForm.test.ts`

  - [x] 7.5 Tulis unit tests untuk `useLoginForm` dan `useRegisterForm`
    - Test: submit valid → `AuthService.loginWithEmail` dipanggil → toast sukses → `router.replace` dipanggil
    - Test: `AuthService` throw `AuthError` dengan `field` → `errors[field]` non-empty, toast null
    - Test: `AuthError` tanpa `field` → `toast.type === 'error'`, `errors` kosong
    - Test: double-submit dicegah oleh `submittingRef`
    - Gunakan `renderHook` dari React Testing Library
    - File: `__tests__/auth/useLoginForm.test.ts`, `__tests__/auth/useRegisterForm.test.ts`

- [x] 8. Implementasikan Firebase Admin SDK dan API Routes
  - [x] 8.1 Implementasikan `verifySessionCookie`, `withAuth`, dan `withAdminAuth` di `firebase.admin.ts`
    - `verifySessionCookie(cookie: string): Promise<DecodedSessionClaims>` — panggil `adminAuth.verifySessionCookie(cookie, true)` (checkRevoked: true), map ke `DecodedSessionClaims`
    - `withAuth(handler)`: HOF — baca cookie `__session` dari request → `verifySessionCookie` → teruskan ke handler; return 401 jika gagal
    - `withAdminAuth(handler)`: seperti `withAuth` tetapi tambahkan check `claims.role === 'admin'`; return 403 jika bukan admin
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 8.2 Buat `app/api/auth/session/route.ts`
    - Method: `POST`
    - Validasi body: `idToken` (string non-empty) wajib ada; return 400 jika tidak
    - Panggil `adminAuth.verifyIdToken(idToken)` → return 401 jika gagal
    - Panggil `adminAuth.createSessionCookie(idToken, { expiresIn })` dengan durasi sesuai `rememberMe`
    - Set cookie `__session` di response: `httpOnly: true`, `secure: NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge` sesuai
    - Return `{ ok: true }` dengan status 200
    - _Requirements: 8.7, 8.8, 3.8, 3.9_

  - [x] 8.3 Buat `app/api/auth/logout/route.ts`
    - Method: `POST`
    - Baca cookie `__session`; jika ada, panggil `adminAuth.revokeRefreshTokens(uid)` (best-effort: jangan throw ke klien jika gagal)
    - Set cookie `__session` dengan `maxAge: 0` untuk menghapus dari browser
    - Selalu return `{ ok: true }` dengan status 200 — bahkan jika cookie tidak ada
    - _Requirements: 8.9, 8.10, 10.1_

  - [x] 8.4 Buat `app/api/auth/set-role/route.ts`
    - Method: `POST` dibungkus `withAdminAuth`
    - Validasi body: `uid` (string non-empty) dan `role` (harus tepat `'user'` atau `'admin'`); return 400 jika tidak valid
    - `adminAuth.setCustomUserClaims(uid, { role })` → update `users/{uid}.role` di Firestore
    - Return 200 jika berhasil, 500 jika salah satu operasi gagal
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7_

  - [x] 8.5 Tulis unit tests untuk API Routes
    - Test `/api/auth/session`: body valid → cookie di-set dengan atribut benar; idToken tidak valid → 401; body tanpa idToken → 400
    - Test `/api/auth/logout`: selalu return 200; cookie dihapus dari response
    - Test `/api/auth/set-role`: tanpa auth → 401; auth non-admin → 403; role tidak valid → 400; berhasil → 200
    - Gunakan `NextRequest` mock dan spy pada Admin SDK functions
    - File: `__tests__/auth/api.test.ts`

- [x] 9. Buat `proxy.ts` untuk proteksi route
  - [x] 9.1 Buat `proxy.ts` di root proyek
    - Ekspor `export function proxy(request: NextRequest)` sebagai named export (bukan default export, sesuai Next.js 16 conventions)
    - Definisikan konstanta: `PROTECTED_ROUTES`, `ADMIN_ROUTES`, `AUTH_ROUTES`
    - Baca cookie `__session` via `request.cookies.get('__session')?.value`
    - Decode optimistik via `decodeSessionCookieOptimistic(cookie)` dari `tokenHelpers.ts` (Edge-safe, tanpa Firebase Admin)
    - Validasi ekspiry: `decoded.exp > Date.now() / 1000`
    - Logic redirect:
      1. Auth routes + authenticated → redirect ke `/`
      2. Protected routes + unauthenticated → redirect ke `/login?redirect=<encoded-path>` (path max 2000 char)
      3. Admin routes + non-admin terautentikasi → redirect ke `/?error=unauthorized`
      4. Admin routes + unauthenticated → redirect ke `/login?redirect=<encoded-path>`
    - Ekspor `config.matcher` yang mengecualikan `_next/static`, `_next/image`, `favicon.ico`, `public/`, dan ekstensi file statis
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 10. Buat barrel file dan integrasikan AuthProvider ke AppShell
  - [x] 10.1 Buat `features/auth/index.ts` barrel file
    - Re-ekspor semua public API: `useAuth`, `useLoginForm`, `useRegisterForm`, `AuthProvider`, semua types dari `types/index.ts`
    - Jangan re-ekspor fungsi internal atau detail implementasi Firebase SDK
    - _Requirements: 14.3_

  - [x] 10.2 Pasang `AuthProvider` di `components/AppShell.tsx`
    - Import `AuthProvider` dari `@/features/auth`
    - Bungkus seluruh children dengan `<AuthProvider>` di dalam `AppShell`
    - `AuthProvider` harus menjadi parent dari `ShellContext.Provider` agar semua komponen dapat mengakses keduanya
    - _Requirements: 9.6_

- [x] 11. Sambungkan LoginClient dan RegisterClient ke hooks
  - [x] 11.1 Modifikasi `app/login/LoginClient.tsx` untuk menggunakan `useLoginForm()`
    - Tambah import `useLoginForm` dari `@/features/auth`
    - Hapus state lokal mock: `loading`, `errors`, `toast`, dan implementasi `handleSubmit` yang menggunakan `setTimeout`
    - Destructure `{ onSubmit, loading, errors, toast, clearToast }` dari `useLoginForm()`
    - Ubah `handleSubmit` menjadi: `e.preventDefault(); await onSubmit(email, password, rememberMe);`
    - Sesuaikan nama field toast di JSX: `toast.msg` → `toast.message` (1 tempat di prop `Toast`)
    - Tambahkan handler Google Sign-In: tombol "Masuk dengan Akun Google" memanggil `AuthService.loginWithGoogle()` via hook atau langsung
    - Tidak ada perubahan pada JSX lain, styling, atau struktur komponen
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 11.2 Modifikasi `app/register/RegisterClient.tsx` untuk menggunakan `useRegisterForm()`
    - Tambah import `useRegisterForm` dari `@/features/auth`
    - Hapus state lokal mock: `loading`, `errors`, `toast`, dan implementasi `handleSubmit` yang menggunakan `setTimeout`
    - Destructure `{ onSubmit, loading, errors, toast, clearToast }` dari `useRegisterForm()`
    - Ubah `handleSubmit` menjadi: `e.preventDefault(); await onSubmit(name, email, password, school);`
    - Sesuaikan toast di JSX: `toast` string → `toast.message` (sekarang objek), `Toast` type prop dari `toast.type`
    - Tidak ada perubahan pada JSX lain, styling, atau struktur komponen
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 12. Checkpoint — Verifikasi integrasi end-to-end
  - Jalankan: `npx tsc --noEmit` — pastikan tidak ada TypeScript error di seluruh proyek
  - Verifikasi `features/auth/` structure lengkap sesuai design (semua file ada)
  - Verifikasi `proxy.ts` ada di root proyek (sejajar dengan `app/` dan `package.json`)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Tulis semua property-based tests (jika belum)
  - [x] 13.1 Setup test infrastructure di `__tests__/auth/`
    - Buat `__tests__/auth/setup.ts` — setup Firebase SDK mocks untuk jest:
      ```ts
      jest.mock('firebase/app', () => ({ ... }))
      jest.mock('firebase/auth', () => ({ ... }))
      jest.mock('firebase/firestore', () => ({ ... }))
      ```
    - Pastikan `jest.config.ts` (atau `jest.config.js`) sudah menggunakan `ts-jest` dan mengarah ke setup file
    - Verifikasi `fast-check` v4.9.0 sudah tersedia di devDependencies
    - File: `__tests__/auth/setup.ts`, update `jest.config.ts`

  - [x] 13.2 Jalankan semua property-based tests
    - Jalankan: `npx jest --testPathPattern="__tests__/auth" --run` (single-run, bukan watch mode)
    - Semua 6 property tests harus pass dengan minimum 100 iterasi per property
    - Perbaiki implementasi jika ada property yang gagal (bukan testnya — testnya mendefinisikan kontrak)

- [x] 14. Final checkpoint — Build verification
  - Jalankan `npx tsc --noEmit` untuk verifikasi TypeScript final
  - Jalankan `npx jest --testPathPattern="__tests__/auth" --run` untuk menjalankan semua tests
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat, tetapi sangat direkomendasikan karena design memiliki 6 Correctness Properties yang terdefinisi
- Property tests menggunakan `fast-check` v4.9.0 yang sudah ada di `devDependencies`
- Proxy (task 9) menggunakan `export function proxy` sebagai named export — bukan `export default` — sesuai dengan Next.js 16 API
- `firebase.admin.ts` HARUS memiliki `import 'server-only'` di baris pertama; jangan pernah diimpor dari Client Components atau `proxy.ts`
- `proxy.ts` menggunakan decode optimistik (tanpa signature verification) via `jose.decodeJwt` — verifikasi penuh dilakukan di API Routes via Admin SDK
- Perubahan pada `LoginClient.tsx` dan `RegisterClient.tsx` minimal: hanya state wiring, tanpa perubahan JSX atau Tailwind classes
- Cookie name: `__session` — konsisten di `authService.ts`, API Routes, dan `proxy.ts`
- Untuk development, Firebase Emulator Suite dapat digunakan agar tidak membutuhkan koneksi ke Firebase production

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.4"] },
    { "id": 2, "tasks": ["2.3", "3.1", "3.3"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["4.5", "6.1"] },
    { "id": 6, "tasks": ["6.2", "7.1", "8.1"] },
    { "id": 7, "tasks": ["6.3", "7.2", "8.2", "8.3"] },
    { "id": 8, "tasks": ["7.3", "7.4", "8.4", "9.1"] },
    { "id": 9, "tasks": ["7.5", "8.5", "10.1"] },
    { "id": 10, "tasks": ["10.2"] },
    { "id": 11, "tasks": ["11.1", "11.2"] },
    { "id": 12, "tasks": ["13.1"] },
    { "id": 13, "tasks": ["13.2"] }
  ]
}
```
