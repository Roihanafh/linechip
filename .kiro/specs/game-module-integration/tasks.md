# Implementation Plan: game-module-integration

## Overview

Tambahkan lapisan soal otomatis, validasi placement, validasi jawaban, dan sistem poin ke `/game-virus` (Game Model Chip) dan `/intline-run` (Game Garis Bilangan) tanpa mengubah komponen animasi, hook, atau logic yang sudah ada. Semua perubahan bersifat additive overlay di atas infrastruktur existing.

## Tasks

- [x] 1. Buat pure functions dan tipe untuk Game Model Chip
  - [x] 1.1 Buat `lib/game/chipQuestion.ts` dengan `ChipQuestion` interface dan `generateChipQuestion()` pure function
    - Definisikan `ChipQuestion` dengan field `a`, `b`, `op`, `answer`
    - Implementasikan `generateChipQuestion()`: loop `while (v === 0)` untuk memastikan `a !== 0` dan `b !== 0`, rentang `[-9999, 9999]`, operator 50/50
    - Ekspor `ChipQuestion` dan `generateChipQuestion`
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 1.2 Buat `lib/game/chipHelpers.ts` dengan semua helper pure functions
    - `formatOperand(n)`: wrap negatif dalam tanda kurung, positif/nol tidak
    - `getOperandColorClass(n)`: `'text-intblue'` jika positif, `'text-intpink'` jika negatif, class netral jika nol
    - `getFeedbackClass(type)`: kembalikan class `bg-success/10 text-success border-success/20` atau `bg-error/10 text-error border-error/20`
    - `formatScore(n)`: `n.toLocaleString('id-ID')`
    - `resolveDisplayScore(v)`: kembalikan `0` jika nullish, `v` jika valid
    - `validateChipAnswer(input, question)`: tangani empty, hanya `-`, NaN, salah, benar — kembalikan `{ correct, feedback }`
    - `validateChipPlacement(bil1Value, bil2Value, question)`: kembalikan `{ valid: true }` atau `{ valid: false, message }`, Bilangan 1 disebut lebih dulu jika keduanya salah
    - `generateAriaLabel(question)`: string verbal dengan operator dan nilai negatif sebagai "negatif N"
    - `filterAnswerInput(raw)`: hanya digit 0-9, satu minus opsional di posisi 0, maks 6 karakter
    - Import `ChipQuestion` dari `./chipQuestion`
    - _Requirements: 1.6, 1.7, 2.2, 2.4, 2.5, 2.7, 2.8, 3.1, 4.1, 6.4, 7.5, 8.3_

- [x] 2. Buat pure function untuk validasi arrow placement
  - [x] 2.1 Buat `lib/game/arrowHelpers.ts` dengan `validateArrowPlacement()` pure function
    - Import `GameArrow` dan `GameQuestion` dari `../../components/game-line/useGameLineState`
    - Definisikan `ArrowPlacementResult` interface dengan `valid`, `message?`, `expectedArrow2Length?`
    - Implementasikan aturan: Arrow 1 `start === 0` dan `length === q.a`; Arrow 2 `start === q.a` dan `length === q.b` (jika `op='+'`) atau `length === -q.b` (jika `op='-'`)
    - Kembalikan pesan yang menyebutkan Arrow yang salah beserta nilai yang diharapkan
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 3. Verifikasi dan validasi `scoreService.ts`
  - [x] 3.1 Verifikasi `features/game/scoreService.ts` sudah lengkap
    - Konfirmasi `awardPoints(uid)` mengembalikan `POINTS_PER_CORRECT` tanpa menulis ke Firestore ketika `uid` null/undefined
    - Konfirmasi retry 3x dengan backoff 500ms sudah ada
    - Konfirmasi fallback ke `localStorage` key `linechip_pending_score_{uid}` sudah ada
    - Konfirmasi flush pending queue digabungkan ke panggilan `awardPoints()` berikutnya sudah ada
    - Konfirmasi cap 99990 poin: tambahkan guard `Math.min(getPending(uid) + pts, 99990)` di `setPending` jika belum ada
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 4. Perluas `UserProfile` interface
  - [x] 4.1 Modifikasi `features/auth/types/index.ts` — tambah field `totalScore?: number` ke `UserProfile`
    - Tambahkan `totalScore?: number` sebagai field opsional di `UserProfile` interface
    - Field bersifat opsional agar dokumen pengguna yang dibuat sebelum fitur ini tetap valid
    - _Requirements: 6.3_

- [x] 5. Tambahkan baris "Total Poin" ke halaman profil
  - [x] 5.1 Modifikasi `app/profile/ProfileClient.tsx` — tambah baris "Total Poin" di section "Informasi Akun"
    - Import `resolveDisplayScore` dari `@/lib/game/chipHelpers`
    - Tambahkan baris baru setelah baris "Bergabung" dengan ikon `emoji_events`, label "Total Poin"
    - Tampilkan `resolveDisplayScore(profile.totalScore).toLocaleString('id-ID')` dengan `aria-label` yang sesuai
    - Ikuti pola visual yang sama dengan baris `email`, `school`, dan tanggal bergabung
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 6. Checkpoint — pastikan semua layer utility berjalan
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

- [x] 7. Modifikasi `app/game-virus/page.tsx` — integrasi soal, validasi, dan skor
  - [x] 7.1 Tambah state dan imports baru ke `app/game-virus/page.tsx`
    - Import `generateChipQuestion`, `ChipQuestion` dari `@/lib/game/chipQuestion`
    - Import `validateChipPlacement`, `validateChipAnswer`, `formatOperand`, `getOperandColorClass`, `getFeedbackClass`, `formatScore`, `resolveDisplayScore`, `filterAnswerInput`, `generateAriaLabel` dari `@/lib/game/chipHelpers`
    - Import `awardPoints`, `POINTS_PER_CORRECT` dari `@/features/game/scoreService`
    - Import `useAuth` dari `@/features/auth`
    - Tambah state: `currentQuestion`, `answerInput`, `chipFeedback`, `sessionScore`
    - Tambah `autoAdvanceRef` untuk cleanup `setTimeout`
    - Tambah `useEffect` cleanup untuk `autoAdvanceRef`
    - Ambil `user` dan `profile` via `useAuth()`
    - _Requirements: 1.1, 1.5, 3.1, 3.4_

  - [x] 7.2 Implementasikan `handleComputeWithValidation` dan ganti tombol "Hitung Hasil"
    - Buat `handleComputeWithValidation()`: panggil `validateChipPlacement`, set `chipFeedback` error jika tidak valid dan STOP, lalu `setChipFeedback(null)` dan panggil `handleCompute()` existing jika valid
    - Ganti tombol "Hitung Hasil" untuk memanggil `handleComputeWithValidation` alih-alih `handleCompute`
    - `handleCompute` original TIDAK dimodifikasi
    - `InteractionAnimation` TIDAK dimodifikasi
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 7.1, 7.2_

  - [x] 7.3 Implementasikan Answer_Input, `handleCheckChipAnswer`, dan `handleNewChipQuestion`
    - Tambah `<input>` Answer_Input dengan: `type="text"`, `inputMode="numeric"`, maks 6 karakter, `onChange` menggunakan `filterAnswerInput`, `onKeyDown` untuk Enter, `aria-label` dari `generateAriaLabel(currentQuestion)`, `disabled` saat `animating`
    - Buat `handleCheckChipAnswer()`: guard `animating`, panggil `validateChipAnswer`, set `chipFeedback`, jika benar `sessionScore += 10` → `awardPoints(user?.uid ?? null)` → `setTimeout(2000ms)` → generate soal baru dan reset semua state
    - Buat `handleNewChipQuestion()`: cancel timeout, generate soal baru, reset `bil1Value`, `bil2Value`, `resultValue`, `phase`, `history`, `answerInput`, `chipFeedback`; `sessionScore` TIDAK berubah
    - Tambah tombol "Periksa" dengan `aria-disabled="true"` dan `tabIndex={0}` saat disabled
    - Tambah tombol "Soal Baru" yang memanggil `handleNewChipQuestion`
    - _Requirements: 2.1, 2.2, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 3.5, 8.1, 8.4_

  - [x] 7.4 Tambah Chip_Question header dan skor sesi ke UI `game-virus`
    - Tambah tampilan Chip_Question di area header dalam format `a op b = ?` dengan `aria-label` verbal
    - Terapkan `formatOperand` dan `getOperandColorClass` untuk warna intblue/intpink pada nilai operan
    - Bungkus nilai negatif dalam tanda kurung sesuai konvensi `game-virus/page.tsx` existing
    - Tampilkan `sessionScore` di header dengan label "Sesi:" diformat `formatScore(sessionScore)`
    - Jika user login, tampilkan `resolveDisplayScore(profile?.totalScore)` dengan label "Total:"
    - Tampilkan `Feedback_Panel` dengan `role="alert"` menggunakan `getFeedbackClass` untuk class kondisional
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 3.1, 3.2, 3.3, 3.4, 8.2, 8.3_

- [x] 8. Modifikasi `app/intline-run/page.tsx` — validasi arrow placement dan skor sesi
  - [x] 8.1 Tambah state, imports, dan skor sesi ke `app/intline-run/page.tsx`
    - Import `validateArrowPlacement` dari `../../lib/game/arrowHelpers`
    - Import `awardPoints`, `POINTS_PER_CORRECT` dari `../../features/game/scoreService`
    - Import `resolveDisplayScore`, `formatScore` dari `../../lib/game/chipHelpers`
    - Import `useAuth` dari `../../features/auth`
    - Tambah state `sessionScore` (awal 0) dan `arrowFeedback` (awal null)
    - Ambil `user` dan `profile` via `useAuth()`
    - Tampilkan `sessionScore` di area header game berdampingan dengan judul, label "Sesi:", format `formatScore`
    - Jika user login, tampilkan `resolveDisplayScore(profile?.totalScore)` dengan label "Total:"
    - `useGameLineState.ts` TIDAK dimodifikasi
    - _Requirements: 4.1, 4.7, 4.8_

  - [x] 8.2 Wrap `handleCheckAnswer` dengan validasi arrow placement dua lapis
    - Modifikasi `handleCheckAnswer` yang sudah ada menjadi wrapper dua lapis:
      - Lapis 1: panggil `validateArrowPlacement(arrows, currentQuestion)`, jika tidak valid set `arrowFeedback` error dan return
      - Lapis 2 (jika valid): `setArrowFeedback(null)`, panggil `checkAnswer()` existing, jika benar `sessionScore += 10` → `awardPoints(user?.uid ?? null)` → `setTimeout(2000ms)` → `newQuestion()`
    - Tampilkan `arrowFeedback` di area feedback dengan prioritas: jika `arrowFeedback` ada tampilkan itu; jika tidak tampilkan `feedback` dari hook
    - Reset `arrowFeedback` ke null saat `newQuestion()` dipanggil
    - `checkAnswer()` dari `useGameLineState` TIDAK dimodifikasi
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

- [x] 9. Update teks promo game di halaman materi
  - [x] 9.1 Modifikasi `app/materi/page.tsx` — update teks deskripsi promo game
    - Ubah paragraf deskripsi di kartu promosi game sehingga mencantumkan "soal otomatis"
    - Teks baru: "Coba dua game seru dengan soal otomatis: Antibodi vs Kuman dan Game Garis Bilangan — susun chip dan panah, lalu kumpulkan poin dari setiap jawaban benar!"
    - Pertahankan seluruh layout, link href ke `/game-virus` dan `/intline-run`, serta semua elemen visual lainnya
    - _Requirements: 7.4_

- [x] 10. Tulis unit tests untuk chipHelpers dan arrowHelpers
  - [x] 10.1 Buat `__tests__/game/chipHelpers.test.ts` — unit tests example-based
    - Test `formatOperand`: positif tidak ada kurung, negatif ada kurung
    - Test `getOperandColorClass`: positif `'text-intblue'`, negatif `'text-intpink'`, nol class netral
    - Test `getFeedbackClass`: `'success'` mengandung `'bg-success'`, `'error'` mengandung `'bg-error'`
    - Test `formatScore`: `1250` → `'1.250'`, `0` → `'0'`
    - Test `resolveDisplayScore`: `undefined` → `0`, `null` → `0`, `500` → `500`
    - Test `validateChipAnswer`: empty → error, hanya `'-'` → error, jawaban benar → correct true, jawaban salah → error dengan `q.answer` dalam pesan
    - Test `validateChipPlacement`: exact match → `{ valid: true }`, Bilangan 1 salah → menyebut "Bilangan 1", Bilangan 2 salah → menyebut "Bilangan 2", keduanya salah → Bilangan 1 disebut lebih dulu
    - Test `generateAriaLabel`: `{ a: 5, b: -3, op: '+' }` mengandung `'negatif 3'` dan `'ditambah'`
    - Test `filterAnswerInput`: strip non-digit, satu minus di posisi 0, maks 6 karakter
    - _Requirements: 1.6, 1.7, 2.2, 2.4, 2.5, 2.7, 2.8, 7.5, 8.3_

  - [x] 10.2 Buat `__tests__/game/arrowHelpers.test.ts` — unit tests example-based
    - Test placement valid `op='+'`: `{1:{start:0,length:3}, 2:{start:3,length:4}}` dengan `{a:3,b:4,op:'+'}` → `{ valid: true }`
    - Test placement invalid: Arrow 1 `start !== 0` → `{ valid: false }`, pesan menyebut "Arrow 1"
    - Test placement valid `op='-'`: Arrow 2 `length === -b` → `{ valid: true }`
    - Test placement salah `op='-'`: Arrow 2 `length === +b` (positif) → `{ valid: false }`
    - Test Arrow 2 `start !== q.a` → `{ valid: false }`, pesan menyebut "Arrow 2"
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 11. Tulis property-based tests
  - [x] 11.1 Buat `__tests__/game/chipHelpers.property.test.ts` — property tests dengan fast-check
    - **Property 1: generateChipQuestion invariant** — `a !== 0`, `b !== 0`, rentang `[-9999, 9999]`, `op` valid, `answer` konsisten (100 runs)
    - **Validates: Requirements 1.2, 1.3, 1.4**
    - **Property 2: formatOperand parenthesizes negatives** — kurung jika dan hanya jika `n < 0` (200 runs)
    - **Validates: Requirements 1.6**
    - **Property 3: getOperandColorClass mapping** — `'text-intblue'` ↔ `n > 0`, `'text-intpink'` ↔ `n < 0` (200 runs)
    - **Validates: Requirements 1.7**
    - **Property 4: validateChipPlacement exactness** — `valid === true` jika dan hanya jika `v1 === a && v2 === b` (200 runs)
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - **Property 10: formatScore correctness** — identik dengan `n.toLocaleString('id-ID')` (100 runs)
    - **Validates: Requirements 3.1, 4.1, 6.4**
    - **Property 11: resolveDisplayScore defaults to 0** — nullish → 0, valid → identitas (100 runs)
    - **Validates: Requirements 3.4, 4.7, 6.2**
    - **Property 12: validateChipAnswer correctness** — `correct === true` jika dan hanya jika input sama dengan `q.answer`; pesan error mengandung `q.answer` jika salah (100 runs)
    - **Validates: Requirements 2.7, 2.10, 2.11**
    - **Property 15: Answer input character filter** — hasil selalu cocok `/^-?\d*$/` dan panjang ≤ 6 (100 runs)
    - **Validates: Requirements 2.2**
    - **Property 16: getFeedbackClass mapping** — `'success'` → mengandung `'bg-success'`, `'error'` → mengandung `'bg-error'` (100 runs)
    - **Validates: Requirements 7.5**
    - **Property 17: generateAriaLabel completeness** — mengandung representasi verbal `q.a`, `q.b`, dan operator; negatif sebagai `"negatif N"` (100 runs)
    - **Validates: Requirements 8.3**

  - [x] 11.2 Buat `__tests__/game/arrowHelpers.property.test.ts` — property tests dengan fast-check
    - **Property 5: validateArrowPlacement correctness** — `valid === true` jika dan hanya jika Arrow 1 dan Arrow 2 memenuhi semua kondisi (200 runs)
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - **Property 6: validateArrowPlacement subtraction direction** — Arrow 2 `length === -b` → valid, `length === +b` → invalid untuk semua `op='-'` (100 runs)
    - **Validates: Requirements 4.3**
    - Test tambahan: `valid === false` selalu menghasilkan `message` string yang tidak kosong (200 runs)
    - **Validates: Requirements 4.4**

- [x] 12. Tulis unit tests untuk scoreService
  - [x] 12.1 Buat `__tests__/game/scoreService.test.ts` — unit tests untuk scoreService
    - Mock `firebase/firestore` dan `@/features/auth/services/firebase.client`
    - Test `awardPoints(null)` → mengembalikan 10, tidak memanggil `updateDoc`
    - Test `awardPoints(undefined)` → mengembalikan 10, tidak memanggil `updateDoc`
    - Test `awardPoints('uid123')` → memanggil `updateDoc` dengan `increment(10)`
    - Test Firestore gagal 3x → `localStorage` `linechip_pending_score_uid123` diupdate
    - Test pending queue di-flush pada panggilan `awardPoints` berikutnya
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 13. Checkpoint Final — pastikan semua tests pass
  - Pastikan semua tests pass, tanyakan ke user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan bisa dilewati untuk MVP yang lebih cepat
- `useGameLineState.ts` TIDAK dimodifikasi sama sekali — semua perubahan Game_Line terjadi di `page.tsx`
- `InteractionAnimation`, `BattleStage`, `AllianceStage`, `PairReactionStage` TIDAK dimodifikasi
- `handleCompute` di `game-virus/page.tsx` TIDAK dimodifikasi — dibungkus oleh `handleComputeWithValidation`
- `scoreService.ts` sudah ada dan lengkap di `features/game/scoreService.ts` — hanya perlu diverifikasi
- `lib/game/` directory perlu dibuat (belum ada)
- Untuk `op='-'` di Game_Line: Arrow 2 `length === -b` (negatif), bukan `+b`
- `autoAdvanceRef` cleanup via `useEffect` diperlukan di kedua halaman untuk mencegah memory leak
- `awardPoints()` adalah fire-and-forget — halaman game tidak perlu menangani error Firestore secara eksplisit
- `profile.totalScore` dibaca real-time via listener Firestore yang sudah ada di `AuthProvider`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "3.1"] },
    { "id": 2, "tasks": ["4.1", "10.1", "10.2"] },
    { "id": 3, "tasks": ["5.1", "7.1", "8.1"] },
    { "id": 4, "tasks": ["7.2", "8.2"] },
    { "id": 5, "tasks": ["7.3", "7.4", "9.1"] },
    { "id": 6, "tasks": ["11.1", "11.2", "12.1"] }
  ]
}
```
