# Implementation Plan: game-virus-chip-removal

## Overview

Menambahkan kemampuan penghapusan chip individual via klik langsung pada `BilanganZone` di `app/game-virus/page.tsx`. Implementasi mencakup guard chain `removeFromBilangan`, `Chip_Overlay` wrapper dengan hover feedback dan flash rejection, page-level wiring, serta property-based dan unit tests.

## Tasks

- [x] 1. Implementasi `removeFromBilangan` useCallback di `GameVirusPage`
  - [x] 1.1 Tulis fungsi `removeFromBilangan(bil: 1 | 2, tier: Tier, onRejectFlash?: (tier: Tier) => void)` sebagai `useCallback`
    - Phase guard: return jika `phase !== "idle"` atau `resultValue !== null`
    - Tier-order guard: `smallerTiers = [1,10,100].filter(t => t < tier)` — jika ada yang masih aktif (`Math.floor(absVal/t) % 10 > 0`), panggil `onRejectFlash?.(tier)` dan return
    - Tier-presence guard: `Math.floor(absVal/tier) % 10 === 0` → return tanpa flash
    - Sign-change guard: `absVal - tier < 0` → `onRejectFlash?.(tier)`, return
    - Success path: `type = currentValue >= 0 ? "ab" : "ku"`, hitung delta, update `bil1Value`/`bil2Value`, push `{ type: undoType, tier, bil }` (tipe inversi) ke history
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.4_

- [x] 2. Tambahkan `flashTier` state lokal di `BilanganZone`
  - [x] 2.1 Tambahkan `useState<Tier | null>(null)` untuk `flashTier` di dalam `BilanganZone`
    - `useEffect`: ketika `flashTier !== null`, set `setTimeout(300ms)` → `setFlashTier(null)`, return cleanup cancel
    - Tambahkan prop opsional `onChipRemove?: (tier: Tier, onRejectFlash: (t: Tier) => void) => void` ke signature `BilanganZone`
    - Derived: `canRemove = onChipRemove !== undefined && phase === "idle" && resultValue === null`
    - _Requirements: 2.1, 3.1, 4.3, 4.4_

- [x] 3. Implementasi `Chip_Overlay` mode di `BilanganZone`
  - [x] 3.1 Ganti `<CharacterChips>` dengan loop dekomposisi lokal ketika `onChipRemove` terdefinisi
    - Loop tier `[1000, 100, 10, 1]`, `maxPerTier = 6`, cerminkan logika `CharacterChips`
    - Setiap chip: outer div `data-tier={t}`, kelas `group cursor-pointer` (canRemove) atau `pointer-events-none`
    - Inner div: `group-hover:opacity-60 group-hover:scale-95 transition-all duration-150` (hanya saat canRemove)
    - Elemen `×` span: `opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none`
    - Flash: kelas `ring-2 ring-red-500 animate-pulse rounded` ketika `flashTier === t`
    - `onClick={canRemove ? () => onChipRemove(t, setFlashTier) : undefined}`
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 3.1_
  - [x] 3.2 Pastikan fallback mode (tanpa `onChipRemove`) merender `<CharacterChips>` langsung, identik dengan tampilan sebelumnya
    - `CharacterSVGs.tsx` tidak dimodifikasi
    - _Requirements: 4.2, 4.4_

- [x] 4. Page-level wiring — oper `onChipRemove` ke kedua `BilanganZone`
  - [x] 4.1 Perbarui kedua instance `<BilanganZone>` agar menerima prop `onChipRemove`
    - `<BilanganZone bil={1} value={bil1Value} onChipRemove={(tier, onRejectFlash) => removeFromBilangan(1, tier, onRejectFlash)} />`
    - `<BilanganZone bil={2} value={bil2Value} onChipRemove={(tier, onRejectFlash) => removeFromBilangan(2, tier, onRejectFlash)} />`
    - `poolDisabled` logic dan `undoLast` tidak berubah
    - _Requirements: 4.1, 4.3_

- [x] 5. Build verification & smoke test
  - TypeScript clean, tidak ada error kompilasi
  - Smoke test manual: klik chip menghapus, undo memulihkan, phase animation memblokir interaksi

- [x] 6. Property-based tests — `removeFromBilangan`
  - [x] 6.1 Property 1: removal reduces value by exactly one tier unit
    - Generator `lowestRemovableTier(value)` untuk menghasilkan nilai valid + tier valid
    - Verifikasi `newValue = oldValue ∓ tier` (−tier untuk zona ab, +tier untuk zona ku)
    - ≥ 200 iterasi, tag `Feature: game-virus-chip-removal, Property 1`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 6.2 Property 2: removal + undo restores original value and history length
    - Generate penghapusan valid, lakukan undo, verifikasi nilai dan panjang history kembali ke semula
    - ≥ 200 iterasi, tag `Feature: game-virus-chip-removal, Property 3` (history inversion)
    - _Requirements: 1.2, 1.3_
  - [x] 6.3 Property 3: rejection preserves state atomically
    - Branch (a): sign-flip rejection — absVal − tier < 0
    - Branch (b): lower-tier-exists / not-representable rejection
    - Verifikasi `bil1Value`, `bil2Value`, dan `history` identik sebelum dan sesudah
    - 100–200 iterasi per branch, tag `Feature: game-virus-chip-removal, Property 2`
    - _Requirements: 1.4, 1.5, 3.1, 3.2, 3.4_
  - File: `__tests__/game-virus/removeFromBilangan.property.test.ts` (11 tests)

- [x] 7. Unit tests — `BilanganZone`
  - [x] 7.1 Tulis unit tests untuk semua skenario rendering dan interaksi `BilanganZone`
    - Tanpa `onChipRemove`: tidak ada `Chip_Overlay`, tidak ada `data-tier` di markup — _Req 4.4_
    - `value = 0`: tidak ada chip yang dirender — _Req 3.3_
    - `phase = "charging"` + `onChipRemove`: `pointer-events-none` pada chip — _Req 1.4, 2.2_
    - `phase = "idle"` + `value = 10` + `onChipRemove`: ada kelas hover + elemen `×` — _Req 2.1_
    - Klik chip → `onChipRemove` dipanggil dengan tier yang benar — _Req 1.1_
    - Rejection flash → kelas `ring-red-500` diterapkan, state tidak berubah — _Req 3.1_
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 3.1, 3.3, 4.3, 4.4_
  - File: `__tests__/game-virus/BilanganZone.unit.test.tsx` (43 tests)

- [x] 8. Final checkpoint — semua tests hijau
  - Jalankan seluruh test suite: 1071 tests across 66 suites — semua pass

## Notes

- Tasks yang ditandai `[x]` sudah selesai diimplementasikan
- File tests berada di `__tests__/game-virus/` (bukan `app/game-virus/__tests__/`)
- `CharacterSVGs.tsx` dan `CharacterChips` tidak dimodifikasi — isolasi perubahan terjaga
- `undoLast` tidak diubah; kompatibilitas dijamin via entri history dengan tipe inversi
- `removeFromBilangan` diimplementasikan sepenuhnya di dalam `app/game-virus/page.tsx` tanpa ekspor ke luar file

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "7.1"] }
  ]
}
```
