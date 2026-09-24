# Implementation Plan: Admin Dashboard

## Overview

Implementasi Admin Dashboard dilakukan secara bertahap: seed script sebagai prasyarat, lalu komponen bersama, layout+route guard, API routes, halaman-halaman admin beserta client components, utility functions, dan terakhir test suite (property-based dan unit). Setiap langkah membangun di atas langkah sebelumnya hingga semua komponen terhubung pada tahap akhir.

## Tasks

- [x] 1. Seed Script — `scripts/seed-admin.ts`
  - [x] 1.1 Buat file `scripts/seed-admin.ts`
    - Baca variabel environment `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_SCHOOL` dari `.env.local` menggunakan `dotenv`
    - Validasi semua variabel wajib ada dan non-empty; cetak error dan `process.exit(1)` jika tidak
    - Panggil `getAdminAuth().createUser({ email, password, displayName: name })` — tangani `auth/email-already-in-use` dengan pesan informatif
    - Panggil `getAdminAuth().setCustomUserClaims(uid, { role: 'admin' })`
    - Buat dokumen `users/{uid}` via `getAdminDb()` dengan field sesuai desain (`role: 'admin'`, `totalScore: 0`, `disabled: false`, `createdAt/updatedAt: serverTimestamp()`) menggunakan `set({ merge: false })`
    - Cetak uid, email, dan konfirmasi sukses ke stdout; `process.exit(0)`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 2. Utility Functions Murni — `lib/admin/`
  - [x] 2.1 Buat `lib/admin/utils.ts` dengan lima pure functions
    - `validateUid(uid: string): boolean` — valid jika panjang 1–128 karakter
    - `filterUsers(users: AdminUserRow[], query: string): AdminUserRow[]` — filter case-insensitive pada `name` dan `email`; kembalikan semua jika `query.length < 2`
    - `paginateAll(users: AdminUserRow[], pageSize: number): AdminUserRow[][]` — potong array menjadi potongan berukuran `pageSize`
    - `selectTopN(users: { uid: string; totalScore: number }[], n: number): { uid: string; totalScore: number }[]` — filter `totalScore > 0`, urutkan descending, ambil n teratas
    - `applySelectedReset(users: { uid: string; totalScore: number }[], selectedUids: Set<string>): { uid: string; totalScore: number }[]` — return salinan baru dengan `totalScore = 0` untuk uid yang dipilih, sisanya tidak berubah
    - _Requirements: 3.3, 3.4, 5.4, 6.3_

- [x] 3. Shared Admin Components
  - [x] 3.1 Buat `components/admin/ConfirmationDialog.tsx`
    - Implementasikan interface `ConfirmationDialogProps` sesuai desain
    - Gunakan elemen `<dialog>` native atau `ReactDOM.createPortal` ke `document.body`
    - ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="dialog-title"`, `aria-describedby="dialog-desc"`
    - Focus trap: `useEffect` pindahkan fokus ke tombol pertama saat `isOpen` berubah jadi `true` (< 100 ms); kembalikan fokus ke trigger saat ditutup
    - Tombol `Escape` memanggil `onCancel`; `Tab`/`Shift+Tab` terjebak di dalam dialog
    - Nonaktifkan tombol konfirmasi dan batal saat `isLoading === true`
    - _Requirements: 4.5, 4.7, 5.3, 5.5, 7.2, 7.3_
  - [x] 3.2 Buat `components/admin/StatCard.tsx`
    - Implementasikan interface `StatCardProps` (`label`, `value: number | null`, `icon`, `colorScheme`)
    - Saat `value === null`: tampilkan skeleton pulse `h-8 w-20 bg-slate-200 animate-pulse rounded`
    - Saat `value` ada: tampilkan angka
    - Gunakan Material Symbols icon sesuai prop `icon`
    - _Requirements: 2.1, 2.2_
  - [x] 3.3 Buat `components/admin/AdminTableSkeleton.tsx`
    - Props: `rows?: number` (default 20), `columns?: number` (default 7)
    - Tiap sel: `h-4 bg-slate-200 animate-pulse rounded` dengan lebar bervariasi (w-8, w-24, w-32 dll.)
    - _Requirements: 2.2, 3.7_
  - [x] 3.4 Buat `components/admin/AdminSidebar.tsx` (Client Component)
    - Gunakan `usePathname()` untuk highlight item aktif dengan `aria-current="page"`
    - Nav items: `/admin` → "Overview", `/admin/users` → "Pengguna", `/admin/leaderboard-reset` → "Reset Leaderboard"
    - Elemen `<nav>` dengan `aria-label="Navigasi Admin"`
    - Tombol dapat diakses via Tab, Enter/Space; `Escape` menutup submenu jika ada
    - _Requirements: 1.5, 7.1, 7.5_

- [x] 4. Checkpoint — Pastikan semua tests pass sejauh ini
  - Pastikan semua tests pass, tanya pengguna jika ada pertanyaan.

- [x] 5. Admin Layout & Route Guard
  - [x] 5.1 Buat `app/admin/layout.tsx` (Server Component)
    - Baca cookie `__session` menggunakan `cookies()` dari `next/headers`
    - Jika tidak ada cookie: `redirect('/login?redirect=/admin')`
    - Panggil `verifySessionCookie(session)` dalam try/catch; redirect ke `/login?redirect=/admin` jika throw
    - Jika `claims.role !== 'admin'`: `redirect('/')`
    - Render layout dengan `<AdminSidebar />` di kiri dan `<main>` di kanan
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. API Routes — `/api/admin/`
  - [x] 6.1 Buat `app/api/admin/stats/route.ts`
    - Wrap dengan `withAdminAuth`
    - Gunakan `Promise.all` dengan `getCountFromServer` untuk 4 metrik: total users, active users (`totalScore > 0`), disabled accounts (`disabled == true`), topScore (query 1 dokumen sorted by totalScore desc)
    - Fetch top10 entries dengan `orderBy('totalScore', 'desc')`, `where('totalScore', '>', 0)`, `limit(10)`
    - Kembalikan `AdminStatsResponse` dengan status 200
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 6.1, 6.4_
  - [x] 6.2 Buat `app/api/admin/users/route.ts`
    - Wrap dengan `withAdminAuth`
    - Query params: `limit` (default 20, max 20; nilai `'all'` mengambil semua), `cursor` (Firestore doc ID), `search` (opsional)
    - Implementasikan cursor-based pagination menggunakan `startAfter(lastDocSnapshot)`
    - Kembalikan `AdminUsersResponse` (`users`, `nextCursor`)
    - _Requirements: 3.1, 3.2, 6.1, 6.3, 6.4_
  - [x] 6.3 Buat `app/api/admin/users/[uid]/route.ts` (GET, PATCH, DELETE)
    - **GET**: Baca dokumen Firestore + `getAdminAuth().getUser(uid)` untuk flag `disabled`; kembalikan `AdminUserDetailResponse` atau 404
    - **PATCH**: Validasi `uid` (1–128 char) dan `action` enum; cek role target bukan `"admin"` → 403; `updateUser(uid, { disabled })` + update Firestore `disabled` + `updatedAt`; kembalikan `{ ok: true, disabled }`
    - **DELETE**: Validasi uid; cek role target bukan `"admin"` → 403; `deleteUser(uid)` lalu `doc.delete()`; jika Firestore delete gagal → 500 dengan `partial: true`
    - Input validation: uid non-empty string panjang 1–128; action harus `'disable' | 'enable'`; 400 untuk input tidak valid
    - _Requirements: 4.1, 4.2, 4.6, 4.8, 4.9, 4.11, 6.1, 6.3, 6.4, 6.5, 6.6_
  - [x] 6.4 Buat `app/api/admin/leaderboard/reset/route.ts`
    - Wrap dengan `withAdminAuth`
    - Validasi body: `mode` harus `'selected' | 'all'`; jika `mode === 'selected'`, `uids` wajib ada (array, max 500)
    - `mode === 'all'`: `getDocs` semua pengguna, Firestore `WriteBatch` (chunks 500) untuk set `totalScore = 0`
    - `mode === 'selected'`: `WriteBatch` hanya untuk uid yang dikirim
    - Kembalikan `{ ok: true, updatedCount }` atau 400/500 sesuai kondisi
    - _Requirements: 5.4, 5.6, 5.9, 6.1, 6.3, 6.4, 6.5_

- [x] 7. Overview Page
  - [x] 7.1 Buat `app/admin/page.tsx` (Server Component)
    - Fetch `/api/admin/stats` di server saat render awal
    - Pass `initialData` ke `<OverviewClient />`
    - _Requirements: 2.1, 2.4_
  - [x] 7.2 Buat `components/admin/OverviewClient.tsx` (Client Component)
    - Tampilkan empat `StatCard` dengan data dari `initialData`
    - State retry: tombol "Coba Lagi" memanggil ulang fetch stats
    - Tampilkan tabel top-10 dengan kolom nama (max 50 char), sekolah (max 50 char), totalScore
    - Jika pengambilan data gagal: tampilkan `ErrorBanner` + tombol "Coba Lagi"
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

- [x] 8. Users List Page
  - [x] 8.1 Buat `app/admin/users/page.tsx` (Server Component)
    - Fetch halaman pertama pengguna (`/api/admin/users?limit=20`) di server
    - Pass `initialData: PaginatedUsersResponse` ke `<UsersClient />`
    - _Requirements: 3.1_
  - [x] 8.2 Buat `components/admin/UsersClient.tsx` (Client Component)
    - Implementasikan interface `UsersClientProps` dan `PaginatedUsersResponse` sesuai desain
    - Search debounce: `useEffect` + `setTimeout(500ms)` + `clearTimeout` cleanup; minimum 2 karakter untuk filter (client-side `filterUsers`)
    - Jika query < 2 karakter: tampilkan semua pengguna
    - Pagination state: cursor stack (`useState<string[]>`) untuk prev/next; disable tombol saat tidak ada halaman
    - Tabel dengan kolom: nomor urut, nama (link ke `/admin/users/[uid]`), email, sekolah, totalScore, status, tanggal DD/MM/YYYY
    - Skeleton (`AdminTableSkeleton`) saat loading; EmptyState saat kosong/no results; ErrorBanner + retry saat error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 9. User Detail Page
  - [x] 9.1 Buat `app/admin/users/[uid]/page.tsx` (Server Component)
    - Fetch `/api/admin/users/[uid]` di server
    - Jika 404: tampilkan pesan "Pengguna tidak ditemukan" + link kembali ke `/admin/users`
    - Pass `profile` dan `isDisabled` ke `<UserDetailClient />`
    - _Requirements: 4.1, 4.2_
  - [x] 9.2 Buat `components/admin/UserDetailClient.tsx` (Client Component)
    - Implementasikan interface `UserDetailClientProps` dan `ActionState` sesuai desain
    - Tampilkan semua field UserProfile: nama, email, sekolah, foto, peran, totalScore, status, createdAt (DD/MM/YYYY HH:mm), updatedAt (DD/MM/YYYY HH:mm)
    - Tombol "Nonaktifkan Akun" / "Aktifkan Akun" mutual exclusive sesuai `isDisabled`
    - Tombol "Hapus Pengguna" selalu tampil kecuali target adalah admin
    - Klik aksi → `ConfirmationDialog` dengan nama pengguna dan deskripsi tindakan
    - `AbortController` dengan `setTimeout(5000)` untuk timeout; tampilkan error dan kembalikan state semula jika abort/error
    - Setelah konfirmasi disable/enable: `PATCH /api/admin/users/[uid]` → update UI status tanpa full reload
    - Setelah konfirmasi delete: `DELETE /api/admin/users/[uid]` → navigate ke `/admin/users` jika sukses; tampilkan error partial jika `partial: true`
    - Atribut `disabled` pada tombol saat `actionState === 'loading'`; spinner/teks status di dalam tombol
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 7.4_

- [x] 10. Leaderboard Reset Page
  - [x] 10.1 Buat `app/admin/leaderboard-reset/page.tsx` (Server Component)
    - Fetch semua pengguna (`/api/admin/users?limit=all`) di server
    - Pass `users` ke `<LeaderboardResetClient />`
    - _Requirements: 5.1, 5.2_
  - [x] 10.2 Buat `components/admin/LeaderboardResetClient.tsx` (Client Component)
    - Implementasikan `ResetMode`, `selectedUids` (`Set<string>`), `resetState` sesuai desain
    - Mode selector: tab "Reset Pengguna Tertentu" | "Reset Semua Leaderboard"
    - Mode selected: tabel dengan checkbox per baris + SelectAllCheckbox; tombol "Reset Skor Terpilih" disabled jika `selectedUids.size === 0`
    - Mode all: peringatan teks + tombol "Reset Semua Leaderboard"
    - Klik reset → `ConfirmationDialog` dengan deskripsi yang sesuai (jumlah user / peringatan semua)
    - Saat proses: `resetState = 'loading'`, semua tombol disabled, `LoadingOverlay` tampil
    - Setelah sukses: `SuccessBanner` dengan jumlah user direset; update totalScore di tabel lokal menjadi 0
    - Jika error: `ErrorBanner`; tidak ada perubahan parsial (batch atomic)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.11, 5.12_

- [x] 11. Checkpoint — Pastikan semua halaman admin terintegrasi dan route guard berfungsi
  - Pastikan semua tests pass, tanya pengguna jika ada pertanyaan.

- [x] 12. Property-Based Tests (fast-check)
  - [x] 12.1 Tulis property test untuk Property 1 — Top-N score ordering
    - File: `__tests__/admin/adminUtils.property.test.ts`
    - `// Feature: admin-dashboard, Property 1: top-N respects score ordering and limit`
    - Generator: `fc.array(fc.record({ uid: fc.string(), totalScore: fc.integer({ min: 0 }) }), { maxLength: 50 })`
    - Assert: `result.length <= 10`, semua entry `totalScore > 0`, urutan descending
    - **Property 1: Top-N user selection respects score ordering and limit**
    - **Validates: Requirements 2.5, 2.6**
  - [x] 12.2 Tulis property test untuk Property 2 — Pagination invariant
    - File: `__tests__/admin/adminUtils.property.test.ts`
    - `// Feature: admin-dashboard, Property 2: pagination invariant — page size bound`
    - Generator: `fc.array(fc.record({ uid: fc.string() }), { maxLength: 200 })`
    - Assert: setiap halaman `length <= 20`, total semua halaman = `users.length`
    - **Property 2: Pagination invariant — page size bound**
    - **Validates: Requirements 3.2**
  - [x] 12.3 Tulis property test untuk Property 3 — Search filter correctness
    - File: `__tests__/admin/adminUtils.property.test.ts`
    - `// Feature: admin-dashboard, Property 3: search filter correctness`
    - Generator: array users + `fc.string({ minLength: 2, maxLength: 50 })`
    - Assert: semua hasil match query case-insensitive; tidak ada user yang seharusnya muncul tapi tidak ada
    - **Property 3: Search filter correctness**
    - **Validates: Requirements 3.3, 3.4**
  - [x] 12.4 Tulis property test untuk Property 4 — Selected-user reset isolation
    - File: `__tests__/admin/adminUtils.property.test.ts`
    - `// Feature: admin-dashboard, Property 4: selected-user reset isolation`
    - Generator: array users dengan `totalScore >= 1` + set uid terpilih
    - Assert: uid terpilih `totalScore === 0`; uid tidak terpilih tidak berubah
    - **Property 4: Selected-user reset isolation**
    - **Validates: Requirements 5.4**
  - [x] 12.5 Tulis property test untuk Property 5 — UID validation boundary
    - File: `__tests__/admin/adminUtils.property.test.ts`
    - `// Feature: admin-dashboard, Property 5: UID input validation boundary`
    - Generator: `fc.oneof(fc.constant(''), fc.string({ maxLength: 200 }))`
    - Assert: `validateUid(uid) === (uid.length >= 1 && uid.length <= 128)`
    - **Property 5: UID input validation boundary**
    - **Validates: Requirements 6.3**

- [x] 13. Unit Tests — Components & Utilities
  - [x] 13.1 Tulis unit tests untuk `validateUid`, `filterUsers`, `paginateAll`, `selectTopN`, `applySelectedReset`
    - File: `__tests__/admin/adminUtils.unit.test.ts`
    - `validateUid`: `""` → false, `"a"` → true, `"a".repeat(128)` → true, `"a".repeat(129)` → false
    - `filterUsers`: query kosong → semua, query 1 char → semua, query valid mixed case → hasil sesuai
    - `paginateAll`: last page, empty list, single element
    - `selectTopN`: users dengan `totalScore = 0` diexclude; urutan benar
    - `applySelectedReset`: immutability — array asli tidak termutasi
    - _Requirements: 3.3, 3.4, 5.4, 6.3_
  - [x] 13.2 Tulis unit tests untuk `ConfirmationDialog`
    - File: `__tests__/admin/ConfirmationDialog.unit.test.tsx`
    - `isOpen=false` → tidak ada elemen dengan `role="dialog"`
    - `isOpen=true` → `role="dialog"` hadir, `aria-labelledby` dan `aria-describedby` ter-set
    - `isLoading=true` → tombol konfirmasi dan batal memiliki atribut `disabled`
    - _Requirements: 7.2, 7.3_
  - [x] 13.3 Tulis unit tests untuk `StatCard`
    - File: `__tests__/admin/StatCard.unit.test.tsx`
    - `value=null` → skeleton pulse hadir (class `animate-pulse`)
    - `value=42` → teks "42" ditampilkan
    - _Requirements: 2.1, 2.2_
  - [x] 13.4 Tulis unit tests untuk `UserDetailClient`
    - File: `__tests__/admin/UserDetailClient.unit.test.tsx`
    - `isDisabled=false` → tombol "Nonaktifkan Akun" hadir; tombol "Aktifkan Akun" tidak hadir
    - `isDisabled=true` → tombol "Aktifkan Akun" hadir; tombol "Nonaktifkan Akun" tidak hadir
    - _Requirements: 4.3, 4.4_

- [x] 14. Final Checkpoint — Pastikan seluruh test suite pass
  - Pastikan semua tests pass, tanya pengguna jika ada pertanyaan.

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk keterlacakan
- Utility functions di `lib/admin/utils.ts` harus pure (tanpa side effects) agar mudah di-test
- `ConfirmationDialog` digunakan bersama oleh User Detail dan Leaderboard Reset — selesaikan sebelum kedua halaman tersebut
- API routes harus menggunakan `withAdminAuth` — jangan bypass dengan implementasi auth manual
- Seed script hanya perlu dijalankan sekali di awal; **jangan** jalankan otomatis di tests
- Design menyebut `disabled: boolean` perlu disinkronkan di Firestore saat PATCH — pastikan ini ditangani di task 6.3
- Untuk WriteBatch > 500 dokumen: bagi ke dalam beberapa batch (chunks 500 operasi)
- Timestamp dari Firestore (`createdAt`, `updatedAt`) harus diformat client-side ke DD/MM/YYYY atau DD/MM/YYYY HH:mm

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 2, "tasks": ["5.1"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 4, "tasks": ["7.1", "8.1", "9.1", "10.1"] },
    { "id": 5, "tasks": ["7.2", "8.2", "9.2", "10.2"] },
    { "id": 6, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5"] },
    { "id": 7, "tasks": ["13.1", "13.2", "13.3", "13.4"] }
  ]
}
```
