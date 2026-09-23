# Implementation Plan: Game Leaderboard

## Overview

Menggantikan halaman `/leaderboard` yang saat ini menggunakan data statis (`constants/leaderboard`) dengan implementasi nyata berbasis Firestore. Arsitektur mengikuti pola Next.js Server Component + Client Component: `page.tsx` murni server, seluruh interaktivitas dan pengambilan data di `LeaderboardClient`. Dua query Firestore berjalan paralel: top-10 dan peringkat pengguna aktif.

Implementasi menggunakan **TypeScript** sesuai dengan desain dan codebase yang ada.

---

## Tasks

- [x] 1. Buat tipe dan service layer leaderboard
  - [x] 1.1 Buat `features/leaderboard/types.ts` dengan interface `LeaderboardEntry`
    - Definisikan interface: `uid`, `rank` (number, 1-indexed), `name`, `school`, `photoURL` (string | null | undefined), `totalScore` (number, normalized dari undefined → 0)
    - _Requirements: 1.2, 1.3_

  - [x] 1.2 Buat `features/leaderboard/leaderboardService.ts` dengan fungsi `fetchTop10` dan `fetchCurrentUserEntry`
    - Import `getFirebaseClient` dari `features/auth/services/firebase.client.ts`
    - `fetchTop10()`: query koleksi `users` dengan `orderBy('totalScore', 'desc')` dan `limit(10)`, map dokumen ke `LeaderboardEntry[]` dengan `rank` 1-indexed, normalisasi `totalScore` undefined → 0
    - `fetchCurrentUserEntry(uid, userScore)`: kembalikan `null` jika uid null atau userScore ≤ 0; gunakan `getCountFromServer` dengan `where('totalScore', '>', userScore)` untuk hitung rank; kembalikan `LeaderboardEntry`
    - Propagate error dari Firestore agar bisa ditangani oleh caller
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 6.1, 6.2, 6.3, 6.4_

  - [x] 1.3 Buat `features/leaderboard/index.ts` sebagai barrel export
    - Re-export `fetchTop10`, `fetchCurrentUserEntry` dari `leaderboardService`
    - Re-export tipe `LeaderboardEntry` dari `types`
    - _Requirements: 1.5_

- [x] 2. Buat Server Component dan skeleton loading
  - [x] 2.1 Buat `app/leaderboard/page.tsx` sebagai Server Component murni
    - Hapus `"use client"` dan semua static data dari versi lama
    - Export `metadata` dengan `title: 'Leaderboard'` dan `description` dalam Bahasa Indonesia
    - Render `<LeaderboardClient />` tanpa props Firestore
    - Pastikan ada satu `<h1>` heading lewat `LeaderboardClient`
    - _Requirements: 7.1, 7.5_

  - [x] 2.2 Buat `app/leaderboard/LeaderboardSkeleton.tsx`
    - Render skeleton untuk area Podium (3 blok avatar + tiang), tabel (10 baris skeleton), dan `OwnRankCard` secara bersamaan
    - Gunakan `animate-pulse` dengan warna `bg-slate-200`
    - _Requirements: 2.4, 7.3_

- [x] 3. Buat komponen visual Podium
  - [x] 3.1 Buat `app/leaderboard/Podium.tsx`
    - Terima prop `entries: LeaderboardEntry[]` (0–3 items)
    - Layout `flex items-end justify-center`: rank 1 di tengah (`order-2`, `h-36`), rank 2 di kiri (`order-1`, `h-24`), rank 3 di kanan (`order-3`, `h-20`)
    - Render `Avatar` dengan `size="lg"` untuk rank 1, `size="md"` untuk rank 2 dan 3
    - Tampilkan ikon mahkota 👑 hanya di atas slot rank 1
    - Tampilkan `name`, `school`, dan `totalScore` (format `toLocaleString('id-ID')`) untuk setiap entri
    - Render hanya slot yang ada datanya — jangan render slot kosong jika array < 3 elemen
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Tulis unit test `Podium.unit.test.tsx`
    - Test: ikon 👑 muncul hanya di slot rank 1
    - Test: rank 1 menggunakan `Avatar` dengan `size="lg"`, rank 2 dan 3 dengan `size="md"`
    - Test: array kosong → tidak ada slot yang dirender
    - _Requirements: 3.2, 3.5_

- [x] 4. Buat komponen LeaderboardTable
  - [x] 4.1 Buat `app/leaderboard/LeaderboardTable.tsx`
    - Terima prop `entries: LeaderboardEntry[]` dan `currentUid: string | null`
    - Gunakan elemen HTML semantik: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
    - Render `Avatar` untuk setiap entri dengan prop `name` terisi
    - `Rank_Badge`: rank 1–3 → warna emas/perak/perunggu; rank 4–10 → `bg-slate-100 text-slate-500`
    - Format skor dengan `toLocaleString('id-ID')`
    - Baris dengan `entry.uid === currentUid`: tambahkan `className="bg-intblue-light border-intblue"`, `aria-label="Peringkatmu"`, dan label teks **"Kamu"** di samping nama
    - `currentUid === null` → tidak ada baris yang mendapat highlight
    - Tampilkan empty state dalam Bahasa Indonesia jika `entries` kosong
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 4.1, 4.2, 4.3, 4.4, 8.1, 8.2, 8.5_

  - [x] 4.2 Tulis unit test `LeaderboardTable.unit.test.tsx`
    - Test: rank 1–3 → badge warna emas/perak/perunggu
    - Test: baris highlight → class `bg-intblue-light`, `aria-label="Peringkatmu"`, teks "Kamu"
    - Test: guest (uid null) → tidak ada baris ter-highlight
    - Test: empty state → pesan Bahasa Indonesia muncul
    - _Requirements: 2.3, 2.6, 4.1, 4.4_

- [x] 5. Buat OwnRankCard dan PlayCTACard
  - [x] 5.1 Buat `app/leaderboard/OwnRankCard.tsx`
    - Terima prop `entry: LeaderboardEntry` (dijamin `rank > 10`)
    - Tampilkan: peringkat, `Avatar`, nama, sekolah, `totalScore` terformat
    - Style: `border-intblue`, `bg-intblue-light`
    - Sertakan `aria-label` dinamis: `"Peringkatmu saat ini: ke-${entry.rank}"`
    - _Requirements: 5.2, 5.3, 8.3_

  - [x] 5.2 Buat `app/leaderboard/PlayCTACard.tsx`
    - Tampilkan kartu ajakan bermain untuk pengguna tidak login atau skor = 0
    - Sertakan tautan ke `/materi` dan `/game`
    - _Requirements: 5.4_

  - [x] 5.3 Tulis unit test `OwnRankCard.unit.test.tsx` dan `PlayCTACard.unit.test.tsx`
    - `OwnRankCard`: verifikasi style `border-intblue`, `bg-intblue-light`, dan `aria-label` mengandung angka rank
    - `PlayCTACard`: verifikasi tautan ke `/materi` dan `/game`
    - _Requirements: 5.2, 5.3, 5.4, 8.3_

- [x] 6. Checkpoint — Pastikan semua tes unit lulus, tanya pengguna jika ada pertanyaan.

- [x] 7. Buat LeaderboardClient sebagai orchestrator
  - [x] 7.1 Buat `app/leaderboard/LeaderboardClient.tsx`
    - Gunakan `'use client'` directive
    - State shape: `{ top10, currentEntry, loadingTop10, loadingCurrentUser, error }`
    - Panggil `useAuth()` dari `features/auth` untuk mendapat `user`, `profile`, `loading`
    - Ketika `useAuth` loading → tampilkan `LeaderboardSkeleton`
    - Di `useEffect`: jalankan `fetchTop10()` dan `fetchCurrentUserEntry(user.uid, profile.totalScore)` secara paralel menggunakan `Promise.all` atau dua state update terpisah
    - Jangan panggil `fetchCurrentUserEntry` jika `user === null` atau `profile?.totalScore` falsy/0
    - Error state top-10: tampilkan banner error Bahasa Indonesia + tombol "Coba Lagi"
    - Error state current user: silent — `currentEntry` tetap null, tanpa error global
    - Render: `<h1>` judul halaman, `<h2>` untuk Podium dan tabel
    - Render `Podium` dengan `entries={top10.slice(0, 3)}`
    - Render `LeaderboardTable` dengan `entries={top10}` dan `currentUid={user?.uid ?? null}`
    - Render `OwnRankCard` jika `currentEntry !== null && currentEntry.rank > 10`
    - Render `PlayCTACard` jika `user === null` atau `profile?.totalScore` falsy/0
    - Tidak render `OwnRankCard` jika pengguna berada di rank 1–10
    - _Requirements: 2.4, 2.5, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 8.4, 9.1, 9.2, 9.3_

- [x] 8. Tulis property-based tests dengan fast-check
  - [x] 8.1 Tulis `leaderboardService.property.test.ts` — Property 1 dan 6
    - **Property 1**: `mapDocsToEntries` — generator: `fc.array(fc.record({uid: fc.string(), name: fc.string(), school: fc.string(), totalScore: fc.option(fc.nat())}), {maxLength: 10})` — verifikasi panjang output = input, rank 1-indexed, totalScore undefined → 0
    - **Property 6**: `calculateRank` — generator: `fc.nat()` untuk userScore, `fc.array(fc.nat())` untuk scores — verifikasi rank = `scores.filter(s => s > userScore).length + 1`, termasuk tie-handling
    - Konfigurasi `numRuns: 100`
    - Tag: `// Feature: game-leaderboard, Property N: <teks>`
    - _Requirements: 1.2, 1.3, 5.1, 6.1, 6.2_

  - [x] 8.2 Tulis `LeaderboardTable.property.test.tsx` — Property 2 dan 5
    - **Property 2**: generator `fc.array(leaderboardEntryArb, {minLength: 0, maxLength: 10})` — verifikasi jumlah `<tr>` = jumlah entri, setiap baris mengandung name, school, totalScore terformat
    - **Property 5**: generator yang memastikan minimal satu entri memiliki `uid === currentUid` — verifikasi tepat satu baris mendapat highlight, baris lain tidak
    - _Requirements: 2.1, 2.2, 4.1, 4.4, 9.3_

  - [x] 8.3 Tulis `Podium.property.test.tsx` — Property 3 dan 4
    - **Property 3**: generator `fc.array(leaderboardEntryArb, {minLength: 0, maxLength: 3})` — verifikasi jumlah slot yang dirender = jumlah entri
    - **Property 4**: generator `fc.array(leaderboardEntryArb, {minLength: 1, maxLength: 3})` — verifikasi setiap entri menampilkan name, school, dan skor terformat
    - _Requirements: 3.3, 3.4_

  - [x] 8.4 Tulis `OwnRankCard.property.test.tsx` — Property 7
    - **Property 7**: generator `leaderboardEntryArb` dengan `rank` di-override > 10 — verifikasi name, school, totalScore terformat muncul; verifikasi `aria-label` mengandung angka rank
    - _Requirements: 5.2, 8.3_

  - [x] 8.5 Tulis `leaderboardService.unit.test.ts`
    - Mock `getFirebaseClient` → mock Firestore SDK
    - Test: query berhasil → entri terformat benar
    - Test: query gagal → promise rejected dengan pesan yang bisa ditangani
    - Test: uid null → `fetchCurrentUserEntry` mengembalikan `null`
    - Test: totalScore = 0 → `fetchCurrentUserEntry` mengembalikan `null`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.3, 6.4_

- [x] 9. Final checkpoint — Pastikan semua tes lulus dan build berjalan tanpa error, tanya pengguna jika ada pertanyaan.

---

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk implementasi MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk keterlacakan
- `leaderboardService` adalah pure-function module tanpa state, tidak mengimpor `firebase-admin`
- Property tests dikonfigurasi dengan `numRuns: 100` menggunakan `fast-check`
- Skor selalu diformat dengan `toLocaleString('id-ID')` untuk tampilan angka yang konsisten
- `fetchCurrentUserEntry` tidak dipanggil jika `user === null` atau `totalScore` falsy/0
- `OwnRankCard` hanya dirender jika `currentEntry.rank > 10`; jika rank 1–10, posisi sudah terlihat di tabel

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 3, "tasks": ["3.1", "4.1", "5.1", "5.2"] },
    { "id": 4, "tasks": ["3.2", "4.2", "5.3", "7.1"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] }
  ]
}
```
