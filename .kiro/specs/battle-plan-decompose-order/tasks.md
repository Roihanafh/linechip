# Implementation Plan

## Overview

Fix the `buildBattlePlan` function's over-decompose bug where chips on the larger side are broken down more times than needed, resulting in excess decompose steps. The fix reimplements the algorithm to anchor iteration on the smaller side's tier groups, ensuring the larger side is only decomposed as much as necessary to match each pairing tier.

## Tasks

- [x] 1. Write bug condition exploration test (BEFORE fixing)
  - **Property 1: Bug Condition** - Decompose Berlebih pada Chip Kelebihan
  - **CRITICAL**: Test ini HARUS GAGAL pada kode unfixed — kegagalan mengonfirmasi bug
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: Test ini mengodekan perilaku yang diharapkan — akan memvalidasi fix ketika pass setelah implementasi
  - **GOAL**: Munculkan counterexample yang mendemonstrasikan bug
  - **Scoped PBT Approach**: Scope ke kasus konkret yang gagal — input `(123, -24)`, `(100, -1)`, `(11, -1)`
  - Tambahkan test case eksplisit di `__tests__/model-chip/battlePlan.property.test.ts` (describe block baru: `"buildBattlePlan — bug condition cases (UNFIXED: expected to fail)"`)
  - Test `(123, -24)`: assert steps = `[decompose pos-10, pair×1, pair×1, pair×1, pair×1, decompose pos-100, pair×10, pair×10]`, totalPairs = 6
  - Test `(100, -1)`: assert steps = `[decompose pos-100, decompose pos-10, pair×1]`, totalPairs = 1
  - Test `(11, -1)`: assert steps = `[pair×1]`, totalPairs = 1 — sisi besar sudah punya chip pos-1, tidak perlu decompose
  - Test `(100, -10)`: assert steps = `[decompose pos-100, pair×10]`, totalPairs = 1
  - Jalankan test: `npx jest battlePlan.property --run` — **EXPECTED OUTCOME**: Test GAGAL untuk input buggy
  - Dokumentasikan counterexample dari output Jest (misal: "untuk (123,-24) ada 10 langkah decompose pos-10 berturut-turut")
  - Tandai task selesai setelah test ditulis, dijalankan, dan kegagalannya didokumentasikan
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Jumlah Pair, Determinisme, dan Plan Kosong
  - **IMPORTANT**: Ikuti observation-first methodology
  - Observe: jalankan `buildBattlePlan(10, -10)` pada kode unfixed → `[{type:"pair",tier:10,side:"pos"}]`
  - Observe: jalankan `buildBattlePlan(1, -1)` pada kode unfixed → `[{type:"pair",tier:1,side:"pos"}]`
  - Observe: `buildBattlePlan(5, 3)` → `{ steps: [], totalPairs: 0 }`
  - Tambahkan describe block baru `"buildBattlePlan — preservation baseline"` di `__tests__/model-chip/battlePlan.property.test.ts`
  - Test tier-match langsung: `(10, -10)` → 1 pair step saja, tanpa decompose
  - Test tier-match langsung: `(1, -1)` → 1 pair step saja, tanpa decompose
  - Test same-sign: `(5, 3)` dan `(-5, -3)` → steps kosong
  - Verifikasi Property 3, 4, 5, 7 yang sudah ada tetap lulus pada kode unfixed: `npx jest battlePlan.property --run`
  - **EXPECTED OUTCOME**: Test preservasi PASS pada kode unfixed (mengonfirmasi baseline)
  - Tandai task selesai setelah test ditulis, dijalankan, dan semua PASS pada kode unfixed
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix: Reimplementasi `buildBattlePlan` dengan algoritma anchor-ke-sisi-kecil

  - [x] 3.1 Implementasi ulang `buildBattlePlan` di `lib/model-chip/battlePlan.ts`
    - Tentukan `smallerValue = Math.min(totalPos, totalNeg)`, `largerValue = Math.max(totalPos, totalNeg)`, `smallerSide = totalPos <= totalNeg ? "pos" : "neg"`
    - Bangun `anchorGroups = decomposeToTierGroups(smallerValue).reverse()` — dibalik menjadi ascending (terkecil ke terbesar: satuan → puluhan → ratusan → ribuan) sebagai acuan iterasi
    - Bangun `largerAvail: Map<tier, count>` dari `decomposeToTierGroups(largerValue)`
    - Ganti loop `while (pairsGenerated < totalPairs)` dengan `for...of anchorGroups`
    - Per iterasi `{ tier: T, count: need }`: inner while luruhkan `largerAvail` sampai punya `need` chip di tier T, lalu push `need` langkah pair
    - Tambahkan helper `highestAvailableAbove(avail, minTier)` — kembalikan tier tertinggi > minTier yang count-nya > 0
    - Hapus `pairsGenerated`, `MAX_ITERATIONS`, `posAvail`, `negAvail`, dan `highestAvailable` (digantikan helper baru)
    - Hitung `totalPairs = anchorGroups.reduce((s, g) => s + g.count, 0)`
    - _Bug_Condition: `posAvail` dan `negAvail` diinisialisasi dari nilai penuh, bukan dari `smallerValue`, sehingga chip kelebihan tidak punya pasangan dan dipaksa luruh berulang_
    - _Expected_Behavior: untuk setiap tier T di `anchorGroups`, sisi besar hanya diluruhi sejumlah yang dibutuhkan untuk `need` pair di tier T; tidak ada decompose tambahan_
    - _Preservation: input sama-tanda tetap `{ steps: [], totalPairs: 0 }`; jumlah pair steps = `Math.min(totalPos, totalNeg)` chip-count; output deterministik_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Decompose Hanya Sejumlah yang Dibutuhkan
    - **IMPORTANT**: Re-run test yang SAMA dari task 1 — JANGAN tulis test baru
    - Jalankan: `npx jest battlePlan.property --run`
    - **EXPECTED OUTCOME**: Semua test di describe `"bug condition cases"` kini PASS
    - Konfirmasi untuk `(123, -24)` tidak ada lagi 10 decompose pos-10 berturut-turut, dan urutan adalah satuan lebih dahulu baru puluhan
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Jumlah Pair, Determinisme, dan Plan Kosong
    - **IMPORTANT**: Re-run test yang SAMA dari task 2 — JANGAN tulis test baru
    - Jalankan: `npx jest battlePlan.property --run`
    - **EXPECTED OUTCOME**: Semua test preservasi PASS (tidak ada regresi)
    - Konfirmasi Property 3, 4, 5, 7 yang sudah ada tetap lulus

- [x] 4. Checkpoint — Pastikan semua test lulus
  - Jalankan seluruh test suite: `npx jest --run`
  - Pastikan tidak ada test yang baru gagal di luar scope perubahan ini
  - Pastikan tidak ada perubahan pada komponen, hook, atau file selain `lib/model-chip/battlePlan.ts` dan `__tests__/model-chip/battlePlan.property.test.ts`
  - Tanyakan ke user jika ada keraguan sebelum merge

## Notes

- Perubahan kode hanya boleh menyentuh `lib/model-chip/battlePlan.ts` dan `__tests__/model-chip/battlePlan.property.test.ts`
- Jangan modifikasi komponen, hook, atau file lain di luar scope tersebut
- Ikuti observation-first methodology saat menulis test: jalankan kode unfixed terlebih dahulu, dokumentasikan output aktual, baru tulis assertion
- Test di task 1 harus gagal pada kode unfixed — kegagalan itu justru mengonfirmasi bahwa bug ada; jangan "fix" test supaya pass sebelum implementasi fix selesai
- Helper `highestAvailableAbove` menggantikan `highestAvailable` lama; `pairsGenerated`, `MAX_ITERATIONS`, `posAvail`, `negAvail` semua dihapus
- `anchorGroups` dibangun dengan `.reverse()` agar ascending (satuan → puluhan → ratusan → ribuan): unit terkecil bertarung lebih dahulu

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3"] },
    { "id": 3, "tasks": ["4"] }
  ]
}
```
