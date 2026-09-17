# Implementation Plan: model-chip-animation-upgrade

## Overview

Meningkatkan kualitas visual `PairReactionStage.tsx` (idle hover pop, SparkTrail `✦`, star particles Mixed_Palette, char name bar, aksesibilitas) dan `CharacterColumn.tsx` (idle-float pada chip). Hanya dua file yang dimodifikasi. Tidak ada keyframe CSS baru. Timing_Contract `pairCycleDuration()` tidak berubah.

## Tasks

- [ ] 1. Tambah `idleInner()` dan state `hover` di `PairReactionStage.tsx`
  - [ ] 1.1 Definisikan pure function `idleInner(isApproach: boolean, hovered: boolean, delayMs: number): React.CSSProperties` di atas komponen `SpeedButtons`
    - Jika `hovered = true`: kembalikan `{ animation: "idle-hover-pop 220ms ease-out forwards" }`
    - Jika `isApproach = true` dan `hovered = false`: kembalikan `{ animation: \`idle-float 2800ms ease-in-out ${delayMs}ms infinite\` }`
    - Jika keduanya false: kembalikan `{}`
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 1.2 Tambah state `const [hover, setHover] = useState<null | "l" | "r">(null)` di dalam `PairReactionStage`
    - Letakkan setelah state `internalSpeed`
    - _Requirements: 1.1_

  - [ ] 1.3 Update `useEffect` yang sudah ada: tambah `setHover(null)` sebagai baris pertama setelah `setPhase("approach")`
    - Memastikan hover state di-reset saat `runKey` atau `effectiveSpeed` berubah
    - _Requirements: 1.5_

- [ ] 2. Pasang hover events pada inner-div karakter di `PairReactionStage.tsx`
  - [ ] 2.1 Update inner-div karakter kiri: pasang `onMouseEnter`, `onMouseLeave`, dan gunakan `idleInner()` untuk menentukan animasi
    - `onMouseEnter`: `if (phase === "approach") setHover("l")`
    - `onMouseLeave`: `setHover(null)`
    - Ganti logika animasi lama: `inCombat ? innerAnim(phase, "left", scale) : idleInner(phase === "approach", hover === "l", 0)`
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [ ] 2.2 Update inner-div karakter kanan: pasang `onMouseEnter`, `onMouseLeave`, dan gunakan `idleInner()` dengan `delayMs=700`
    - `onMouseEnter`: `if (phase === "approach") setHover("r")`
    - `onMouseLeave`: `setHover(null)`
    - Ganti logika animasi: `inCombat ? innerAnim(phase, "right", scale) : idleInner(phase === "approach", hover === "r", 700)`
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

- [ ] 3. Upgrade `useParticles` ke star particles Mixed_Palette di `PairReactionStage.tsx`
  - [ ] 3.1 Update konfigurasi `useParticles` dengan `star: true` dan Mixed_Palette
    - Ganti `colors: ["#fbbf24", "#f87171", "#fb923c", "#facc15", "#fde68a", "#ffffff"]` dengan `colors: ["#93c5fd", "#f87171", "#60a5fa", "#fca5a5", "#bfdbfe", "#fecaca"]`
    - Tambah `star: true` ke opsi
    - Pertahankan `count: 22` dan `spread: 110`
    - _Requirements: 2.1, 2.2_

- [ ] 4. Tambah sub-komponen `SparkTrail` di `PairReactionStage.tsx`
  - [ ] 4.1 Tulis function component `SparkTrail({ side, faction }: { side: "left" | "right"; faction: "ab" | "ku" })` di atas `SpeedButtons`
    - Warna aksen: `#93c5fd` untuk `"ab"`, `#f87171` untuk `"ku"`
    - Offset horizontal partikel ke-i: `side === "left" ? i * 12 : -(i * 12)` px (default 0 untuk side tidak valid)
    - Delay: `i * 80ms` (0-indexed)
    - Ukuran teks: `${8 + (i % 3)}px`
    - Animasi: `particle-fly 600ms ease-out ${i * 80}ms forwards, popup-rise 600ms ease-out ${i * 80}ms forwards`
    - Tambah `aria-hidden="true"` dan `pointerEvents: "none"` pada setiap span dan container
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7_

  - [ ] 4.2 Render dua `SparkTrail` di dalam stage div, hanya saat `phase === "approach"`
    - Kiri: `{phase === "approach" && <SparkTrail side="left" faction={leftFaction} />}`
    - Kanan: `{phase === "approach" && <SparkTrail side="right" faction={rightFaction} />}`
    - Posisikan SparkTrail menggunakan `position: "absolute"` relatif terhadap posisi karakter
    - _Requirements: 3.1, 3.5, 3.6_

- [ ] 5. Tambah char name bar dan atribut aksesibilitas di `PairReactionStage.tsx`
  - [ ] 5.1 Tambah import `CHAR_NAMES` dari `./CharacterSVGs` dan definisikan konstanta `leftAccent`/`rightAccent`
    - `leftAccent  = leftFaction  === "ab" ? "rgba(96,165,250,0.8)" : "rgba(248,113,113,0.8)"`
    - `rightAccent = rightFaction === "ab" ? "rgba(96,165,250,0.8)" : "rgba(248,113,113,0.8)"`
    - _Requirements: 4.2_

  - [ ] 5.2 Render char name bar di dalam stage div (sebelum penutup `</div>` stage)
    - `position: "absolute", bottom: 8, left: 16, right: 16, display: "flex", justifyContent: "space-between"`
    - `opacity: phase === "approach" ? 1 : 0, transition: "opacity 300ms", pointerEvents: "none"`
    - `aria-hidden="true"`
    - Teks kiri: `{CHAR_NAMES[leftFaction]?.[leftType] ?? ""}` dengan warna `leftAccent`
    - Teks kanan: `{CHAR_NAMES[rightFaction]?.[rightType] ?? ""}` dengan warna `rightAccent`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 5.3 Tambah atribut aksesibilitas pada stage root div dan elemen efek visual
    - Stage root: tambah `aria-hidden="true"` dan `role="presentation"`
    - Tambah `data-phase={phase}` pada stage root
    - Tambah `data-testid="pair-reaction-phase"` pada phase label (div teks fase, sudah ada)
    - Semua efek visual (flash div, VS divider, energy bars, grid): tambah `aria-hidden="true"` jika belum ada
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6. Checkpoint — Pastikan semua test yang ada tetap lulus
  - Jalankan `npx jest --testPathPattern=game --run` dan pastikan 0 failures
  - `BattleStage.test.ts` tidak terpengaruh
  - `AnimationEffects.property.test.tsx` tetap lulus
  - Pastikan tidak ada TypeScript error dengan `npx tsc --noEmit`

- [ ] 7. Tambah animasi `idle-float` pada chip di `CharacterColumn.tsx`
  - [ ] 7.1 Definisikan helper function `chipIdleAnim(stepPhase: StepPhase, globalIdx: number): string | undefined` di luar komponen `CharacterColumn`
    - Kembalikan `` `idle-float 2800ms ease-in-out ${(globalIdx % 6) * 120}ms infinite` `` jika `stepPhase === "idle"`
    - Kembalikan `undefined` untuk semua stepPhase lainnya
    - _Requirements: 6.1, 6.2_

  - [ ] 7.2 Tambah variabel counter `let globalChipIdx = 0` sebelum loop render di `CharacterColumn`
    - Increment setiap kali sebuah chip (elemen dalam `Array.from({ length: Math.min(count, 12) }`) dirender
    - Gunakan nilai counter sebelum increment sebagai `globalIdx` untuk `chipIdleAnim()`
    - _Requirements: 6.2_

  - [ ] 7.3 Update logika className dan style pada chip div untuk menyertakan idle-float
    - Hitung `idleAnim = !isDecomposingChip && !isGone && !isDimmed ? chipIdleAnim(stepPhase, globalChipIdx) : undefined`
    - Tambah `animation: idleAnim` ke `style` prop chip div (kondisi khusus tetap dikontrol oleh className dan transition)
    - Kondisi prioritas: `isDecomposingChip` > `isGone` > `isDimmed` > `idleAnim`
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [ ] 8. Tulis property-based tests untuk model-chip-animation-upgrade
  - [ ] 8.1 Buat file `__tests__/game/PairReactionStage.property.test.ts` dengan struktur dasar dan import `fast-check`
    - Ikuti pola dari `AnimationEffects.property.test.tsx` dan `AllianceStage.property.test.ts`
    - Definisikan versi pure dari `idleInner()`, formula offset SparkTrail, formula delay SparkTrail, formula chip idle delay
    - _Requirements: 7.6_

  - [ ]* 8.2 Tulis property test untuk `idleInner` — Property 1: deterministik dan hover priority
    - `fc.property(fc.boolean(), fc.boolean(), fc.nat())` → dua panggilan dengan input sama menghasilkan objek yang sama (stringify comparison); jika `hovered=true` maka animasi mengandung `"idle-hover-pop"`
    - Tag: `// Feature: model-chip-animation-upgrade, Property 1: idleInner consistent and hover priority`
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 8.3 Tulis property test untuk `idleInner` — Property 2: kosong di luar approach
    - `fc.property(fc.nat())` → `idleInner(false, false, n)` menghasilkan objek tanpa key `animation`
    - Tag: `// Feature: model-chip-animation-upgrade, Property 2: idleInner empty outside approach`
    - _Requirements: 1.6_

  - [ ]* 8.4 Tulis property test untuk SparkTrail offset — Property 4
    - `fc.property(fc.integer({min:0, max:5}), fc.constantFrom("left","right"))` → `|offset[i]| === i * 12`, tanda sesuai side; side tidak valid → offset 0
    - Tag: `// Feature: model-chip-animation-upgrade, Property 4: sparktrail offset linear by side`
    - _Requirements: 3.2, 3.7_

  - [ ]* 8.5 Tulis property test untuk SparkTrail delay — Property 5
    - `fc.property(fc.integer({min:0, max:5}))` → `delay[i] === i * 80`
    - Tag: `// Feature: model-chip-animation-upgrade, Property 5: sparktrail delay sequential`
    - _Requirements: 3.3_

  - [ ]* 8.6 Tulis property test untuk SparkTrail warna faction — Property 6
    - `fc.property(fc.constantFrom("ab","ku"))` → `"ab"` → `"#93c5fd"`, `"ku"` → `"#f87171"`
    - Tag: `// Feature: model-chip-animation-upgrade, Property 6: sparktrail color matches faction`
    - _Requirements: 3.4_

  - [ ]* 8.7 Tulis property test untuk `CHAR_NAMES` lookup — Property 7
    - `fc.property(fc.constantFrom("ab","ku"), fc.constantFrom("satuan","puluhan","ratusan","ribuan"))` → selalu mengembalikan string non-kosong, tidak pernah throw
    - Tag: `// Feature: model-chip-animation-upgrade, Property 7: char name lookup safe`
    - _Requirements: 4.1, 4.5_

  - [ ]* 8.8 Tulis property test untuk char name bar opacity — Property 8
    - `fc.property(fc.constantFrom("approach","impact","recoil","dissolve","done"))` → approach → 1, lainnya → 0
    - Tag: `// Feature: model-chip-animation-upgrade, Property 8: char name bar opacity by phase`
    - _Requirements: 4.4_

  - [ ]* 8.9 Tulis property test untuk chip idle delay — Property 9
    - `fc.property(fc.integer({min:0, max:100}))` → `delay(i) === (i % 6) * 120`, nilai dalam `[0, 600)`
    - Tag: `// Feature: model-chip-animation-upgrade, Property 9: chip idle float delay formula`
    - _Requirements: 6.2_

  - [ ]* 8.10 Tulis property test untuk `pairCycleDuration` — Property 11
    - `fc.property(fc.float({min:0.1, max:5}))` → `pairCycleDuration(s) === Math.round(2120 / s) + 160`
    - Tag: `// Feature: model-chip-animation-upgrade, Property 11: pairCycleDuration formula invariant`
    - _Requirements: 7.2_

- [ ] 9. Checkpoint akhir — Verifikasi regression dan TypeScript
  - Jalankan `npx jest --testPathPattern="game|model-chip" --run` — semua test lulus (0 failures)
  - Pastikan `CharacterChips.test.ts` lulus tanpa modifikasi pada file tes tersebut
  - Pastikan tidak ada TypeScript error dengan `npx tsc --noEmit`

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk implementasi MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk keterlacakan
- Timing_Contract `pairCycleDuration()` **tidak boleh diubah** — nilai total D_BASE = 700+480+260+680 = 2120 ms
- Hanya dua file yang dimodifikasi: `components/game/PairReactionStage.tsx` dan `components/model-chip/CharacterColumn.tsx`
- Tidak ada keyframe CSS baru, tidak ada file komponen baru
- `AnimationEffects.tsx` tidak perlu diubah — `star?: boolean` di `ParticleOptions` sudah ada dari `alliance-animation-upgrade`
- SparkTrail diposisikan relatif terhadap stage (position absolute), bukan terhadap karakter — karena karakter bergerak via CSS animation, JS tidak mengetahui posisi absolutnya
- `globalChipIdx` di CharacterColumn adalah counter yang di-increment satu kali per chip yang dirender (bukan per tier)
- Property tests (task 8) mengikuti pola inline re-implementation tanpa React hooks, sesuai `AnimationEffects.property.test.tsx`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2"] },
    { "id": 8, "tasks": ["7.3"] },
    { "id": 9, "tasks": ["8.1"] },
    { "id": 10, "tasks": ["8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9", "8.10"] }
  ]
}
```
