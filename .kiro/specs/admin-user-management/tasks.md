# Implementation Plan: Admin User Management

## Overview

Implementasi fitur Admin User Management mencakup dua kemampuan utama: (1) admin dapat membuat akun pengguna baru dari dashboard tanpa pengguna perlu mendaftar sendiri, dan (2) sistem melakukan redirect otomatis berbasis role setelah login berhasil. Urutan implementasi mengikuti dependensi: utility/pure functions dulu, lalu service layer, lalu API route, lalu UI components, lalu tests.

## Tasks

- [x] 1. Tambahkan utility functions ke `lib/admin/utils.ts`
  - [x] 1.1 Implementasi `validateCreateUserInput` di `lib/admin/utils.ts`
    - Ekspor interface `CreateUserInput` dan `ValidationResult`
    - Implementasi fungsi sesuai spesifikasi di design doc: validasi email (regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), password 6–256 karakter, name dan school 1–100 karakter setelah trim
    - Fungsi ini harus pure — tidak ada side effect, dipakai di sisi klien dan server
    - _Requirements: 1.3, 2.2, 6.2, 6.3, 6.4_

  - [x] 1.2 Tulis property test untuk `validateCreateUserInput`
    - **Property 1: Input validation correctness**
    - **Validates: Requirements 1.3, 2.2, 6.2, 6.3, 6.4**
    - File: `__tests__/admin/adminUsers.property.test.ts`
    - Tag komentar: `// Feature: admin-user-management, Property 1: validateCreateUserInput correctness`
    - Gunakan `fc.record` dengan `fc.string()` untuk semua field; minimum 100 iterasi
    - Verifikasi `valid === true` iff semua empat kondisi terpenuhi; verifikasi setiap `errors` key hadir saat kondisi gagal
    - _Requirements: 1.3, 2.2, 6.2, 6.3, 6.4_

- [x] 2. Tambahkan `getRoleAfterSession` dan `resolveLoginRedirect` ke `features/auth/services/authService.ts`
  - [x] 2.1 Implementasi `resolveLoginRedirect` di `features/auth/services/authService.ts`
    - Pure function: terima `role: 'user' | 'admin'` dan `redirectParam: string | null`
    - Logika: admin → redirect ke path `/admin/*` jika valid, atau ke `/admin`; user → redirect ke param jika bukan path `/admin/*`, atau ke `/`
    - Ekspor fungsi — akan dipakai oleh `useLoginForm`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7_

  - [x] 2.2 Tulis property test untuk `resolveLoginRedirect`
    - **Property 2: Role-based redirect security and correctness**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.7**
    - File: `__tests__/auth/authService.property.test.ts`
    - Tag komentar: `// Feature: admin-user-management, Property 2: resolveLoginRedirect security and correctness`
    - Gunakan `fc.constantFrom('user', 'admin')` dan `fc.option(fc.oneof(...))` untuk redirect param; minimum 100 iterasi
    - Verifikasi empat invariant: admin+admin-path→path, admin+non-admin-path→`/admin`, user+non-admin-path→path, user+admin-path→`/`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7_

  - [x] 2.3 Implementasi `getRoleAfterSession` di `features/auth/services/authService.ts`
    - Async function: baca `users/{uid}` via `getUserProfile`, race dengan timeout 5000 ms menggunakan `Promise.race`
    - Catch semua error dan timeout → kembalikan `'user'` sebagai fallback aman
    - Ekspor fungsi — akan dipakai oleh `useLoginForm`
    - _Requirements: 3.1, 3.6_

  - [x] 2.4 Ubah return type `loginWithEmail` dan `loginWithGoogle` agar mengembalikan `{ uid: string }`
    - `loginWithEmail` sekarang mengembalikan `Promise<{ uid: string }>` alih-alih `Promise<void>`
    - `loginWithGoogle` sekarang mengembalikan `Promise<{ uid: string } | null>` alih-alih `Promise<void>`
    - Pastikan `uid` diambil dari `credential.user.uid` sebelum dikembalikan
    - Update type declaration jika ada di `features/auth/types/index.ts` (`UseLoginFormReturn` tidak perlu berubah)
    - _Requirements: 3.1, 3.7_

- [x] 3. Modifikasi `features/auth/hooks/useLoginForm.ts` untuk role-based redirect
  - [x] 3.1 Update `onSubmit` di `useLoginForm.ts` untuk role-based redirect
    - Tangkap `{ uid }` dari return value `AuthService.loginWithEmail`
    - Setelah session berhasil, panggil `AuthService.getRoleAfterSession(uid)` untuk mendapatkan role
    - Gantikan `const targetUrl = redirect ? decodeURIComponent(redirect) : '/'` dengan `AuthService.resolveLoginRedirect(role, redirectParam)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Update `onGoogleSubmit` di `useLoginForm.ts` untuk role-based redirect
    - Tangkap `result` dari return value `AuthService.loginWithGoogle()` — perhatikan bisa `null` (user menutup popup)
    - Jika `result` null, hentikan (popup dismissed — silent); jika tidak, gunakan `result.uid` untuk `getRoleAfterSession`
    - Gantikan redirect langsung dengan `AuthService.resolveLoginRedirect(role, redirectParam)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Tambahkan `POST` handler ke `app/api/admin/users/route.ts`
  - [x] 4.1 Implementasi `POST` export di `app/api/admin/users/route.ts`
    - Wrap dengan `withAdminAuth` — tolak 401/403 jika tidak terotorisasi
    - Parse body JSON; panggil `validateCreateUserInput` → return 400 `{ error }` jika gagal
    - Panggil `sanitizeInput` pada `name` dan `school` sebelum disimpan
    - Panggil `getAdminAuth().createUser({ email, password, displayName: name })`; handle `auth/email-already-in-use` → 400; error lain → 500
    - Panggil `getAdminAuth().setCustomUserClaims(uid, { role: 'user' })` — best-effort, lanjut walau gagal
    - Panggil `getAdminDb().collection('users').doc(uid).set({ uid, name, email, school, role: 'user', totalScore: 0, disabled: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })`
    - Jika Firestore gagal: rollback `deleteUser(uid)` (best-effort), return 500
    - Log sukses: `[POST /api/admin/users] Admin {claims.uid} created user {uid} with email {email}`
    - Log gagal: `[POST /api/admin/users] Admin {claims.uid} failed to create user: {reason}`
    - Return 201 `{ ok: true, uid, email }` saat sukses
    - _Requirements: 2.1–2.10, 4.2–4.3, 6.1, 8.1, 8.2, 8.5_

- [x] 5. Checkpoint — Verifikasi utility, service, dan API route
  - Pastikan semua file yang dimodifikasi (utils, authService, useLoginForm, route) tidak ada TypeScript error.
  - Pastikan semua tests yang sudah ada di `__tests__/auth/` dan `__tests__/admin/` masih lulus.

- [x] 6. Buat `app/admin/users/new/page.tsx` (Server Component)
  - [x] 6.1 Buat `app/admin/users/new/page.tsx`
    - Server Component tipis — tidak ada data-fetching
    - Import dan render `<CreateUserForm />` dari `@/components/admin/CreateUserForm`
    - Dilindungi otomatis oleh `app/admin/layout.tsx` yang sudah ada (tidak perlu guard tambahan)
    - _Requirements: 1.2, 8.4_

- [x] 7. Buat `components/admin/CreateUserForm.tsx` (Client Component)
  - [x] 7.1 Implementasi state, validasi, dan submit logic di `CreateUserForm.tsx`
    - `"use client"` directive
    - State: `FormState { email, password, name, school }`, `SubmitState ('idle'|'loading'|'success'|'error')`, `FieldErrors`, `showPassword: boolean`, `globalError: string | null`
    - Client-side validation via `validateCreateUserInput` dari `@/lib/admin/utils` pada `onBlur` tiap field dan sebelum submit
    - Submit: `AbortController` dengan `setTimeout(10_000)`, `fetch('POST /api/admin/users', { signal, body: JSON.stringify({...}) })`
    - HTTP 400 → tampilkan `body.error` di bawah field email; HTTP 500 / network error / timeout → tampilkan banner merah generik
    - Sukses (201): tampilkan pesan sukses dengan email pengguna baru, kemudian `router.push('/admin/users')` setelah 2000 ms via `setTimeout`
    - `useEffect` + `keydown` listener untuk Escape → `router.push('/admin/users')`
    - Semua field dan tombol `disabled` saat `loading`; re-enable setelah response atau error
    - Nilai field dipertahankan saat error (tidak di-reset)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.4, 6.5_

  - [x] 7.2 Implementasi layout dan markup aksesibilitas di `CreateUserForm.tsx`
    - `<form noValidate aria-label="Formulir buat pengguna baru">`
    - Info banner statis di atas form (saran password sementara + saran ubah password) — sesuai Requirements 5.4
    - 4 field `FloatingInput` dari `@/components/auth/AuthShared`: Email, Password (dengan toggle visibility via `rightSlot`), Nama Lengkap, Sekolah
    - Per-field: `aria-invalid="true"` saat ada error, `aria-describedby` merujuk ke `<p id="{field}-error" role="alert">`
    - Banner sukses/error global di atas tombol dengan `role="alert"` dan `aria-live="polite"`
    - Tombol "Buat Akun": spinner SVG + teks "Membuat Akun..." saat loading, `disabled` attribute saat loading
    - Link "Batal" → `/admin/users`; valid feedback: ikon `check_circle` hijau saat field valid (konsisten dengan `LoginClient.tsx`)
    - _Requirements: 1.2, 5.1, 7.1–7.7_

- [x] 8. Modifikasi `components/admin/UsersClient.tsx` — tambah tombol "Buat Pengguna Baru"
  - [x] 8.1 Tambah `Link` "Buat Pengguna Baru" ke heading `UsersClient.tsx`
    - Di dalam `<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between ...">` pada bagian heading, tambah `<Link href="/admin/users/new">` sejajar dengan search input
    - Styling: `inline-flex items-center gap-2 rounded-xl bg-intblue px-4 py-2 text-sm font-semibold text-white hover:bg-intblue/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intblue`
    - Icon: `<span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_add</span>`
    - Teks: "Buat Pengguna Baru"
    - Tidak ada perubahan state atau logic lain
    - _Requirements: 1.1_

- [x] 9. Checkpoint — Verifikasi halaman dan komponen UI
  - Pastikan semua file baru tidak ada TypeScript error.
  - Pastikan route `/admin/users/new` dapat diakses di browser dan form merender dengan benar.
  - Pastikan tombol "Buat Pengguna Baru" muncul di halaman `/admin/users`.

- [x] 10. Tulis tests untuk semua komponen dan fungsi baru
  - [x] 10.1 Tulis property test untuk `sanitizeInput`
    - **Property 3: sanitizeInput removes control characters and HTML tags**
    - **Validates: Requirements 6.1**
    - File: `__tests__/auth/authService.property.test.ts` (tambahkan di file yang sama dengan Property 2)
    - Tag komentar: `// Feature: admin-user-management, Property 3: sanitizeInput removes control chars and HTML`
    - Gunakan `fc.string({ unit: fc.fullUnicode() })`; minimum 100 iterasi
    - Assert: tidak ada karakter `[\x00-\x1F\x7F]` dan tidak ada pola `<[^>]*>` dalam hasil
    - _Requirements: 6.1_

  - [x] 10.2 Tulis unit tests untuk `validateCreateUserInput`
    - File: `__tests__/admin/adminUsers.unit.test.ts`
    - Kasus: semua valid → `valid: true`; email kosong → error di `email`; password 5 karakter → error di `password`; password 257 karakter → error di `password`; name kosong → error di `name`; school 101 karakter → error di `school`; beberapa field gagal bersamaan → semua error hadir
    - _Requirements: 1.3, 2.2, 6.2, 6.3, 6.4_

  - [x] 10.3 Tulis unit tests untuk `resolveLoginRedirect`
    - File: `__tests__/auth/authService.unit.test.ts` (buat baru atau append ke `authService.test.ts`)
    - Kasus: admin + null → `/admin`; admin + `/admin/users` → `/admin/users`; admin + `/profile` → `/admin`; user + null → `/`; user + `/` → `/`; user + `/admin` → `/`; user + `/profile` → `/profile`
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 10.4 Tulis unit tests untuk `CreateUserForm` component
    - File: `__tests__/admin/CreateUserForm.unit.test.tsx`
    - Kasus: render 4 field + tombol + info banner; tombol disabled saat ada field kosong; loading state menonaktifkan semua field + tampilkan spinner; mock `fetch` 201 → pesan sukses → `router.push` setelah 2000 ms; mock `fetch` 400 → error di bawah field email; mock `fetch` 500 → banner merah generik; `AbortError` → banner merah; tekan Escape → `router.push('/admin/users')` dipanggil; `aria-invalid` pada field dengan error; `role="alert"` pada pesan error
    - _Requirements: 1.2–1.7, 5.1, 7.1–7.7_

  - [x] 10.5 Tulis unit tests untuk `useLoginForm` role-based redirect
    - File: `__tests__/auth/useLoginForm.test.ts` (tambahkan kasus baru ke file yang sudah ada)
    - Mock `AuthService.getRoleAfterSession` mengembalikan `'admin'` → `window.location.href` diset ke `/admin`
    - Mock `AuthService.getRoleAfterSession` mengembalikan `'user'` → `window.location.href` diset ke `/`
    - Mock `AuthService.getRoleAfterSession` melempar error → redirect ke `/` (fallback)
    - Mock Google login + admin role → redirect ke `/admin`
    - _Requirements: 3.1, 3.2, 3.4, 3.6, 3.7_

  - [x] 10.6 Tulis unit tests untuk `UsersClient` — tombol "Buat Pengguna Baru"
    - File: `__tests__/admin/UsersClient.unit.test.tsx` (buat baru atau append ke file yang ada)
    - Assert: `Link` dengan teks "Buat Pengguna Baru" hadir dan `href`-nya `/admin/users/new`
    - _Requirements: 1.1_

- [x] 11. Final checkpoint — Pastikan semua tests lulus
  - Jalankan `npx jest --testPathPattern="admin-user|adminUsers|CreateUserForm|useLoginForm|authService" --runInBand` untuk memverifikasi semua tests baru lulus.
  - Pastikan tidak ada regresi pada test suite yang sudah ada.
  - Tanyakan kepada user jika ada pertanyaan sebelum melanjutkan.

## Notes

- Tasks bertanda `*` bersifat opsional — dapat dilewati untuk MVP lebih cepat
- `validateCreateUserInput` adalah pure function yang digunakan di sisi klien (form validation) DAN sisi server (API route) — pastikan tidak mengimpor modul browser-only
- Urutan kritis di API route: validasi input → `createUser` → `setCustomUserClaims` (best-effort) → Firestore `set` → rollback jika Firestore gagal
- `loginWithEmail` dan `loginWithGoogle` perlu mengubah return type dari `Promise<void>` ke `Promise<{ uid: string }>` dan `Promise<{ uid: string } | null>` — pastikan update semua caller yang ada
- Password tidak pernah disimpan ke Firestore; hanya Firebase Auth yang mengelola password
- Halaman `/admin/users/new` dilindungi otomatis oleh `app/admin/layout.tsx` yang sudah ada — tidak perlu guard tambahan di page level

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "2.4", "10.2"] },
    { "id": 3, "tasks": ["3.1", "3.2", "4.1", "10.1", "10.3"] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["7.1", "8.1", "10.5"] },
    { "id": 6, "tasks": ["7.2", "10.6"] },
    { "id": 7, "tasks": ["10.4"] }
  ]
}
```
