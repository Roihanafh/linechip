# Implementation Plan: Game Virus Subtraction Placement Check

## Overview

Bugfix untuk mendokumentasikan dan melindungi kontrak `validateChipPlacement` dari regresi. Fix mencakup penulisan test explorasi bug condition, preservation property test, penambahan JSDoc, dan verifikasi semua test lulus.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** — Subtraction Placement Accepts Original Subtractor
  - **CRITICAL**: Test ini HARUS GAGAL pada kode yang sengaja salah (buggy version) — kegagalan membuktikan bahwa bug condition nyata
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: Test ini mengenkode expected behavior — ketika dipasangkan dengan implementasi benar, test akan LULUS setelah fix
  - **GOAL**: Tulis fungsi `validateChipPlacementBuggy` yang sengaja menggunakan `-question.b` untuk soal pengurangan, lalu jalankan assertion berikut terhadapnya
  - **Scoped PBT Approach**: Scope ke kasus konkret: soal `{a:5, b:3, op:"-", answer:2}`, `bil1Value=5`, `bil2Value=3` (nilai benar user)
  - Tulis test di file baru: `__tests__/game-virus/chipHelpers.placement.test.ts`
  - Implementasikan `validateChipPlacementBuggy` dalam file test (tidak di production code):
    ```ts
    function validateChipPlacementBuggy(bil1Value, bil2Value, question) {
      const bil2Expected = question.op === '-' ? -question.b : question.b;
      if (bil1Value !== question.a && bil2Value !== bil2Expected) { ... }
      if (bil1Value !== question.a) { ... }
      if (bil2Value !== bil2Expected) { ... }
      return { valid: true };
    }
    ```
  - Assert: `validateChipPlacementBuggy(5, 3, {a:5, b:3, op:"-", answer:2})` menghasilkan `{ valid: false }` (false negative)
  - Jalankan test terhadap `validateChipPlacementBuggy` — test harus mendemonstrasikan false negative
  - **EXPECTED OUTCOME**: Test GAGAL pada `validateChipPlacementBuggy` karena `bil2Value=3` ditolak padahal seharusnya diterima (ini BENAR — membuktikan bug condition nyata)
  - Dokumentasikan counterexample: `validateChipPlacementBuggy(5, 3, subtractQ)` → rejected, seharusnya accepted
  - Mark task complete ketika test sudah ditulis, dijalankan, dan kegagalan sudah terdokumentasi
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** — Operator-Independent Validation Contract
  - **IMPORTANT**: Ikuti observation-first methodology
  - Observasi pada kode UNFIXED (kode asli yang benar): jalankan `validateChipPlacement(5, 3, {a:5, b:3, op:"+", answer:8})` → returns `{ valid: true }`
  - Observasi: `validateChipPlacement(5, 3, {a:5, b:3, op:"-", answer:2})` → returns `{ valid: true }` (ini sudah benar di kode asli)
  - Observasi: `validateChipPlacement(5, 99, {a:5, b:3, op:"-", answer:2})` → returns `{ valid: false }` dengan message menyebut `3`
  - Tulis property-based test (menggunakan `@fast-check/jest` atau loop manual jika fc tidak tersedia):
    ```
    FOR ALL a, b ∈ [-9999, 9999] \ {0}, op ∈ ["+", "-"]
      validateChipPlacement(a, b, {a, b, op, answer: op==="+"?a+b:a-b})
      ASSERT valid = true
    ```
  - Tulis property test tambahan:
    ```
    FOR ALL a, b ∈ [-9999, 9999] \ {0}, op="-"
      validateChipPlacement(a, -b, {a, b, op:"-", answer:a-b})
      ASSERT valid = false  // -b (flipped) bukan nilai yang valid
    ```
  - Verifikasi semua preservation test LULUS pada kode UNFIXED (kode asli, bukan buggy)
  - **EXPECTED OUTCOME**: Test LULUS pada kode asli (mengkonfirmasi baseline behavior untuk dipreserve)
  - Mark task complete ketika test sudah ditulis, dijalankan, dan LULUS pada kode unfixed
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 3. Fix for undocumented subtraction placement contract

  - [x] 3.1 Tambahkan JSDoc ke `validateChipPlacement` yang menjelaskan kontrak subtraction
    - Buka `lib/game/chipHelpers.ts`
    - Tambahkan JSDoc di atas fungsi `validateChipPlacement`:
      - Jelaskan bahwa `bil2Value` harus selalu sama dengan `question.b` terlepas dari `question.op`
      - Jelaskan perbedaan dengan model-chip: di model-chip, `bil2_original` dikonversi ke `bil2_converted = -bil2_original` sebelum arena. Di Game Virus, `handleCompute` menggunakan `bil1Value - bil2Value` secara langsung — tidak ada konversi. Sehingga `bil2Value === question.b` benar untuk kedua operator.
      - Sertakan contoh: soal `5 − 3` → valid jika `bil2Value = 3`, **bukan** `-3`
    - Tidak ada perubahan pada logika implementasi — hanya JSDoc
    - _Bug_Condition: isBugCondition(input) where input.question.op = "-" AND validateChipPlacement menggunakan -question.b_
    - _Expected_Behavior: validateChipPlacement(a, b, {a,b,op:"-"}) → { valid: true }_
    - _Preservation: semua logika validasi tetap identik_
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** — Subtraction Placement Accepts Original Subtractor
    - **IMPORTANT**: Jalankan KEMBALI test yang sama dari task 1 — JANGAN tulis test baru
    - Test dari task 1 mengenkode expected behavior
    - Catatan: test di task 1 dijalankan terhadap `validateChipPlacementBuggy` (fungsi sengaja salah); sekarang tambahkan assertion tambahan yang memverifikasi `validateChipPlacement` (fungsi asli/fixed) mengembalikan `{ valid: true }` untuk input yang sama
    - Jalankan: `validateChipPlacement(5, 3, {a:5, b:3, op:"-", answer:2})` → `{ valid: true }`
    - **EXPECTED OUTCOME**: Test LULUS pada `validateChipPlacement` asli (mengkonfirmasi bug sudah terdokumentasi dengan benar)
    - _Requirements: 2.1, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** — Operator-Independent Validation Contract
    - **IMPORTANT**: Jalankan KEMBALI test yang sama dari task 2 — JANGAN tulis test baru
    - Jalankan preservation property tests dari step 2
    - **EXPECTED OUTCOME**: Semua test LULUS (mengkonfirmasi tidak ada regresi)
    - Konfirmasi semua test lulus setelah penambahan JSDoc (tidak ada perubahan perilaku)

- [x] 4. Checkpoint — Ensure all tests pass
  - Jalankan `npx jest __tests__/game-virus/chipHelpers.placement.test.ts --no-coverage`
  - Pastikan semua test lulus, tanyakan ke user jika ada pertanyaan.

## Notes

- Task 1 harus dijalankan terlebih dahulu karena menyiapkan file test yang digunakan task 3.2
- Task 2 harus selesai sebelum task 3.1 agar preservation baseline terkonfirmasi sebelum perubahan apapun
- Task 3.2 dan 3.3 bergantung pada task 3.1 (JSDoc harus sudah ditambahkan)
- Task 4 adalah checkpoint final yang bergantung pada semua task sebelumnya

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3"] }
  ]
}
```
