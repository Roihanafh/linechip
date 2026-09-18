# chip-overflow-label-fix Bugfix Design

## Overview

Komponen `CharacterChips` di `components/game/CharacterSVGs.tsx` menampilkan label overflow
`"+N lagi"` ketika jumlah chip suatu tier melampaui `maxPerTier`. Label ini memiliki dua masalah:

1. Kata "lagi" redundan — cukup tampilkan `"+N"`.
2. Label tetap muncul saat phase `"exploding"` atau `"settled"`, padahal chip sudah tidak
   relevan secara kontekstual di state tersebut.

Perbaikan bersifat minimal: hanya mengubah satu blok JSX di dalam `CharacterChips` tanpa
menyentuh logika dekomposisi, animasi, maupun rendering chip individual.

## Glossary

- **Bug_Condition (C)**: Kondisi yang memicu bug — label overflow muncul dengan teks salah
  atau muncul di waktu yang salah.
- **Property (P)**: Perilaku yang diharapkan saat kondisi bug terpenuhi — label menampilkan
  `"+N"` (tanpa "lagi") pada phase aktif, atau tidak ditampilkan sama sekali pada phase selesai.
- **Preservation**: Perilaku yang tidak boleh berubah — rendering chip, animasi dissolve,
  dimmed state, dan kasus tanpa overflow tetap identik sebelum dan sesudah fix.
- **`CharacterChips`**: Komponen di `components/game/CharacterSVGs.tsx` yang merender SVG
  karakter berdasarkan dekomposisi nilai per tier.
- **`phase`**: Prop string pada `CharacterChips` yang menentukan state animasi:
  `"idle" | "charging" | "exploding" | "settled"`.
- **`maxPerTier`**: Prop number (default 9) yang membatasi jumlah chip yang dirender per tier.
- **overflow label**: Elemen `<span>` yang ditampilkan ketika `count > maxPerTier`,
  memberitahu user ada chip yang tidak terlihat.

## Bug Details

### Bug Condition

Bug muncul ketika `count > maxPerTier` untuk suatu tier. Dalam kondisi ini, blok label
selalu dirender tanpa mempertimbangkan `phase`, dan teks selalu mengandung kata "lagi"
yang tidak perlu.

**Formal Specification:**
```
FUNCTION isBugCondition(tierCount, maxPerTier, phase)
  INPUT: tierCount: number, maxPerTier: number, phase: string
  OUTPUT: boolean

  RETURN tierCount > maxPerTier
         AND (
           phase IN ["exploding", "settled"]           -- label shouldn't render at all
           OR labelText CONTAINS "lagi"                -- label text is wrong
         )
END FUNCTION
```

### Examples

- **Bug 1 — Teks salah di phase aktif**: `count=12, maxPerTier=9, phase="idle"` →
  saat ini menampilkan `"+3 lagi"`, seharusnya `"+3"`
- **Bug 2 — Teks salah di phase charging**: `count=15, maxPerTier=9, phase="charging"` →
  saat ini menampilkan `"+6 lagi"`, seharusnya `"+6"`
- **Bug 3 — Label muncul di phase selesai**: `count=12, maxPerTier=9, phase="exploding"` →
  saat ini menampilkan `"+3 lagi"`, seharusnya tidak menampilkan apapun
- **Bug 4 — Label muncul di phase settled**: `count=20, maxPerTier=9, phase="settled"` →
  saat ini menampilkan `"+11 lagi"`, seharusnya tidak menampilkan apapun
- **Normal (no bug)**: `count=7, maxPerTier=9, phase="idle"` → tidak ada label, tetap tidak ada label ✓

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Rendering chip individual (SVG karakter) tidak boleh terpengaruh — jumlah, posisi, dan
  tampilan chip tetap sama.
- Animasi dissolve bertahap (`isExploding`, `staggered transition`) tetap berjalan identik.
- Prop `dimmed={true}` tetap menerapkan `grayscale` dan `opacity-30` pada semua chip.
- Kasus `count <= maxPerTier` tidak menampilkan label apapun — tidak boleh berubah.
- Dekomposisi nilai ke tier (satuan, puluhan, ratusan, ribuan) tidak berubah.

**Scope:**
Semua input yang tidak memenuhi `count > maxPerTier` tidak terpengaruh sama sekali.
Perubahan hanya menyentuh blok kondisional `{count > maxPerTier && (<span>...)}`.

## Hypothesized Root Cause

Berdasarkan analisis kode di `CharacterChips` (baris label overflow):

```tsx
{count > maxPerTier && (
  <span className={`text-xs font-mono font-bold ${
    type === "ab" ? "text-blue-500" : "text-rose-500"
  }`}>
    +{(count - maxPerTier).toLocaleString("id-ID")} lagi
  </span>
)}
```

1. **Teks hardcoded "lagi"**: String `" lagi"` dimasukkan langsung ke JSX tanpa kondisi
   apapun — tidak ada mekanisme untuk menghilangkan kata tersebut berdasarkan phase.

2. **Tidak ada guard berdasarkan `phase`**: Blok `count > maxPerTier &&` tidak
   mempertimbangkan nilai `phase`. Variabel `isExploding` sudah ada di komponen namun
   tidak digunakan untuk label ini. Tidak ada pengecekan `isExploding || phase === "settled"`.

3. **Tidak ada variabel `isSettled`**: Komponen mendefinisikan `isCharging` dan `isExploding`
   tetapi tidak mendefinisikan `isSettled`, sehingga meski developer ingin menyembunyikan
   label di state settled, tidak ada shorthand yang tersedia.

## Correctness Properties

Property 1: Bug Condition — Label Teks Tepat di Phase Aktif

_For any_ tier di mana `count > maxPerTier` dan `phase` adalah `"idle"` atau `"charging"`,
komponen yang sudah diperbaiki SHALL menampilkan label overflow dengan teks `"+N"` (tanpa
kata "lagi"), di mana N adalah `count - maxPerTier`.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Label Disembunyikan di Phase Selesai

_For any_ tier di mana `count > maxPerTier` dan `phase` adalah `"exploding"` atau
`"settled"`, komponen yang sudah diperbaiki SHALL tidak merender label overflow apapun
(elemen `<span>` tidak ada di DOM).

**Validates: Requirements 2.2**

Property 3: Preservation — Rendering Non-Overflow Tidak Berubah

_For any_ tier di mana `count <= maxPerTier` (kondisi bug TIDAK terpenuhi), komponen
yang sudah diperbaiki SHALL menghasilkan output identik dengan komponen original — tidak
ada label overflow, semua chip dirender, animasi dan dimmed state tidak berubah.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `components/game/CharacterSVGs.tsx`

**Component**: `CharacterChips`

**Specific Changes**:

1. **Tambah variabel `isSettled`**: Di blok deklarasi variabel setelah `isExploding`,
   tambahkan:
   ```ts
   const isSettled = phase === "settled";
   ```

2. **Ubah kondisi render label**: Ganti `count > maxPerTier &&` menjadi
   `count > maxPerTier && !isExploding && !isSettled &&` agar label disembunyikan
   saat phase selesai.

3. **Hapus kata "lagi" dari teks label**: Ubah string template dari:
   ```tsx
   +{(count - maxPerTier).toLocaleString("id-ID")} lagi
   ```
   menjadi:
   ```tsx
   +{(count - maxPerTier).toLocaleString("id-ID")}
   ```

Tiga perubahan ini bersifat lokal dan tidak menyentuh logika lain di komponen.

## Testing Strategy

### Validation Approach

Strategi dua fase: pertama, verifikasi bug terjadi di kode yang belum diperbaiki (exploratory),
lalu verifikasi fix benar dan tidak merusak perilaku yang sudah ada (fix + preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Konfirmasi bahwa label menampilkan teks salah dan/atau muncul di phase yang salah
SEBELUM fix diterapkan. Pastikan root cause sesuai analisis.

**Test Plan**: Render `CharacterChips` dengan `count > maxPerTier` di berbagai phase, kemudian
periksa teks dan keberadaan elemen label di output render.

**Test Cases**:
1. **Teks "lagi" di phase idle**: `value=12, maxPerTier=9, phase="idle"` → cek apakah teks
   mengandung "lagi" (akan gagal setelah fix, menunjukkan bug ada)
2. **Label muncul di phase exploding**: `value=12, maxPerTier=9, phase="exploding"` → cek
   apakah label `<span>` ada di DOM (akan gagal setelah fix)
3. **Label muncul di phase settled**: `value=12, maxPerTier=9, phase="settled"` → cek
   apakah label `<span>` ada di DOM (akan gagal setelah fix)

**Expected Counterexamples**:
- Label `<span>` ditemukan di DOM saat phase `"exploding"` atau `"settled"`
- Teks label mengandung kata "lagi" untuk phase `"idle"` atau `"charging"`

### Fix Checking

**Goal**: Verifikasi bahwa untuk semua input di mana kondisi bug terpenuhi, komponen
yang sudah diperbaiki menghasilkan perilaku yang benar.

**Pseudocode:**
```
FOR ALL (count, maxPerTier, phase) WHERE isBugCondition(count, maxPerTier, phase) DO
  output := render CharacterChips_fixed(value, phase, maxPerTier)
  IF phase IN ["exploding", "settled"] THEN
    ASSERT overflowLabel NOT IN output.DOM
  ELSE -- phase IN ["idle", "charging"]
    ASSERT overflowLabel IN output.DOM
    ASSERT overflowLabel.text = "+" + (count - maxPerTier).toLocaleString("id-ID")
    ASSERT overflowLabel.text NOT CONTAINS "lagi"
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verifikasi bahwa untuk semua input di mana kondisi bug TIDAK terpenuhi, output
komponen identik sebelum dan sesudah fix.

**Pseudocode:**
```
FOR ALL (value, phase, maxPerTier) WHERE NOT isBugCondition(count, maxPerTier, phase) DO
  ASSERT render(CharacterChips_original) = render(CharacterChips_fixed)
END FOR
```

**Testing Approach**: Property-based testing direkomendasikan untuk preservation checking karena:
- Menghasilkan banyak kombinasi input secara otomatis (value kecil, besar, tier tunggal, multi-tier)
- Menangkap edge case yang mungkin terlewat oleh unit test manual
- Memberikan jaminan kuat bahwa chip rendering tidak berubah untuk semua input non-buggy

**Test Cases**:
1. **Preservation chip count**: `count <= maxPerTier` di semua phase → semua chip dirender,
   tidak ada label
2. **Preservation dimmed**: `dimmed=true` dengan berbagai phase → opacity dan grayscale tetap
3. **Preservation dissolve**: `phase="exploding"` dengan `count <= maxPerTier` → animasi
   stagger tetap berjalan
4. **Preservation multi-tier**: Value seperti 123 (ratusan + puluhan + satuan) tanpa overflow
   → semua tier dirender dengan benar

### Unit Tests

- Render label `"+N"` (tanpa "lagi") saat `count > maxPerTier` dan phase `"idle"`
- Render label `"+N"` saat phase `"charging"`
- Tidak ada label saat phase `"exploding"` dan `count > maxPerTier`
- Tidak ada label saat phase `"settled"` dan `count > maxPerTier`
- Tidak ada label saat `count <= maxPerTier` (semua phase)
- Format angka menggunakan `toLocaleString("id-ID")` tetap benar (contoh: `"+1.000"`)

### Property-Based Tests

- Generate random `value` dan `maxPerTier` di mana `count > maxPerTier`: verifikasi label
  text tidak mengandung "lagi" untuk phase `"idle"` dan `"charging"`
- Generate random `value` dan `maxPerTier` di mana `count > maxPerTier` dengan phase
  `"exploding"` atau `"settled"`: verifikasi tidak ada label di DOM
- Generate random `value` di mana semua tier `count <= maxPerTier`: verifikasi tidak ada
  perubahan output dibanding komponen original

### Integration Tests

- Render `CharacterChips` dalam skenario battle penuh dengan transisi phase idle → charging →
  exploding → settled: verifikasi label berperilaku sesuai di setiap phase
- Verifikasi bahwa penggantian label tidak mempengaruhi layout keseluruhan komponen
- Test dengan nilai besar (misal 9999) yang memiliki overflow di semua tier sekaligus
