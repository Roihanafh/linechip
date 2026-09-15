# model-chip-animation-orchestration Bugfix Design

## Overview

Bug berada di fungsi `buildBattlePlan` dalam `lib/model-chip/battlePlan.ts`. Fungsi ini
menghasilkan urutan langkah animasi (`BattlePlan`) yang digunakan oleh dua modul:

- **Modul Penjumlahan** (`useAnimationOrchestrator`) — menerima `bil1, bil2` raw
- **Modul Pengurangan** (`useSubtractionOrchestrator` → inner orchestrator) — sudah
  mengonversi `bil2_converted = -bil2` sebelum meneruskan ke `buildBattlePlan`

Karena argumen final ke `buildBattlePlan` identik untuk ekspresi matematika yang ekuivalen,
semua bug di fungsi ini muncul identik di kedua modul.

Tiga bug yang telah diidentifikasi dan diperbaiki di codebase saat ini:
1. **Urutan nilai tempat salah** — anchorGroups harus ascending (Satuan → Ribuan)
2. **Sisi decay salah** — decay hanya boleh terjadi pada `largerSide`
3. **`highestAvailableAbove` mengembalikan tier tertinggi** — seharusnya terendah

Inspeksi kode terkini mengkonfirmasi ketiga bug tersebut **sudah diperbaiki** di
implementasi. Tugas yang tersisa adalah:
- Memperbarui label test yang menyesatkan ("UNFIXED: expected to fail" → "FIXED: regression
  prevention")
- Menambahkan file regression test formal dengan 11 kasus wajib dari requirements
- Menambahkan PBT properties formal sesuai requirements.md

Tidak ada perubahan pada production code (`battlePlan.ts` sudah benar), orchestrator,
komponen, atau animasi.

---

## Glossary

- **Bug_Condition (C)**: Predikat yang mengidentifikasi input yang memicu bug di versi lama
- **Property (P)**: Perilaku yang diharapkan dari `buildBattlePlan'` (versi fix)
- **Preservation**: Perilaku `buildBattlePlan` yang tidak boleh berubah setelah fix
- **`buildBattlePlan`**: Fungsi pure di `lib/model-chip/battlePlan.ts` yang menghitung
  urutan langkah animasi dari dua bilangan integer
- **`highestAvailableAbove(avail, minTier)`**: Helper private yang menemukan tier terdekat
  di atas `minTier` untuk chain decompose bertahap
- **`decomposeToTierGroups(value)`**: Helper yang mengurai nilai integer ke `TierGroup[]`
  berurutan besar-ke-kecil
- **`anchorGroups`**: Representasi chip sisi kecil dalam urutan ascending (Satuan → Ribuan)
- **`largerAvail`**: Map `tier → count` sisi besar yang dimutasi selama simulasi
- **`smallerSide`**: Sisi (pos/neg) dengan totalChip ≤ totalChip sisi lawan; anchor urutan
- **`largerSide`**: Sisi dengan totalChip lebih besar; satu-satunya yang boleh decompose
- **Chain decompose**: Serangkaian decompose bertahap ketika target tier tidak dapat
  dicapai dalam satu langkah (misal: 1000 → 100 → 10 → 1)
- **F**: `buildBattlePlan` sebelum fix (kode asli bermasalah)
- **F'**: `buildBattlePlan` setelah fix diterapkan (implementasi saat ini)
- **C(X)**: Bug condition — predikat input yang memicu bug di F
- **¬C(X)**: Non-buggy inputs — input yang tidak memicu bug; perilakunya harus dipreservasi

---

## Bug Details

### Bug Condition

Bug termanifestasi ketika `buildBattlePlan(bil1, bil2)` dipanggil dengan pasangan
berlawanan tanda (totalPos > 0 dan totalNeg > 0). Tiga kondisi bug independen:

**Formal Specification:**

```
FUNCTION isBugCondition_order(X)
  INPUT: X = (bil1: integer, bil2: integer)
  OUTPUT: boolean
  // Bug terpicu ketika pair steps tidak dalam urutan ascending per tier
  plan ← buildBattlePlan_original(X.bil1, X.bil2)
  pairTiers ← [step.tier FOR step IN plan.steps WHERE step.type = "pair"]
  RETURN NOT (pairTiers IS NON-DECREASING)
END FUNCTION

FUNCTION isBugCondition_side(X)
  INPUT: X = (bil1: integer, bil2: integer)
  OUTPUT: boolean
  // Bug terpicu ketika decompose terjadi pada sisi yang salah (smallerSide)
  smallerSide ← IF totalPos(X) <= totalNeg(X) THEN "pos" ELSE "neg"
  plan ← buildBattlePlan_original(X.bil1, X.bil2)
  RETURN EXISTS step IN plan.steps WHERE step.type = "decompose"
                                        AND step.side = smallerSide
END FUNCTION

FUNCTION isBugCondition_chain(X)
  INPUT: X = (bil1: integer, bil2: integer)
  OUTPUT: boolean
  // Bug terpicu ketika chain decompose lompat lebih dari satu tier
  plan ← buildBattlePlan_original(X.bil1, X.bil2)
  FOR i ← 0 TO plan.steps.length - 2 DO
    s1 ← plan.steps[i]; s2 ← plan.steps[i+1]
    IF s1.type = "decompose" AND s2.type = "decompose" AND s1.side = s2.side THEN
      IF s1.tier / s2.tier > 10 THEN RETURN true
    END IF
  END FOR
  RETURN false
END FUNCTION

FUNCTION isBugCondition_excess(X)
  INPUT: X = (bil1: integer, bil2: integer)
  OUTPUT: boolean
  // Bug terpicu ketika decompose dilakukan padahal largerAvail sudah cukup
  largerAvail ← initialLargerAvail(X)
  plan ← buildBattlePlan_original(X.bil1, X.bil2)
  FOR each step IN plan.steps DO
    IF step.type = "decompose" THEN
      targetTier ← step.tier / 10
      IF largerAvail[targetTier] >= pendingNeedFor(targetTier) THEN
        RETURN true
      END IF
      applyDecompose(largerAvail, step.tier)
    END IF
  END FOR
  RETURN false
END FUNCTION
```

### Examples

**Bug Condition — Urutan Salah (`isBugCondition_order`):**
- `buildBattlePlan_original(352, -178)`: menghasilkan Ratusan diproses sebelum Satuan
  (descending), padahal seharusnya Satuan lebih dahulu (ascending)
- `buildBattlePlan_original(43, -28)`: pair tier-10 muncul sebelum pair tier-1

**Bug Condition — Sisi Decay Salah (`isBugCondition_side`):**
- `buildBattlePlan_original(1, -10)` (`smallerSide="pos"`, `totalPos=1, totalNeg=10`):
  menghasilkan `decompose pos-10` — Antibody di-decompose padahal Kuman yang seharusnya
  decay; expected: `[decompose neg-10, pair ×1]`
- `buildBattlePlan_original(-11, 1)` (`smallerSide="pos"`, `totalPos=1, totalNeg=11`):
  menghasilkan langkah decompose Kuman padahal tidak diperlukan (largerAvail[1]=1 ≥ need=1)

**Bug Condition — Chain Decompose Lompat Tier (`isBugCondition_chain`):**
- `buildBattlePlan_original(100, -1)`: menghasilkan `decompose pos-100 → pair ×1` dalam
  satu lompatan (rasio tier = 100), padahal seharusnya bertahap:
  `decompose pos-100 → decompose pos-10 → pair ×1`
- `buildBattlePlan_original(4002, -1587)`: tier Satuan butuh chain dari Ribuan, tapi
  langsung lompat tanpa melalui Ratusan dan Puluhan

**Preservation (tidak ada bug — input ¬C(X)):**
- `buildBattlePlan(10, -10)`: tier langsung cocok → `[pair ×10]`; tetap benar
- `buildBattlePlan(5, 3)`: sama tanda → `{ steps: [], totalPairs: 0 }`; tetap benar
- `buildBattlePlan(10, -1)`: posAvail:{10:1}, need tier-1 → `[decompose pos-10, pair ×1]`;
  tetap benar (sudah satu tier di atas)

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Input sama-tanda (atau salah satu 0) menghasilkan `{ steps: [], totalPairs: 0 }`
- Jumlah langkah bertipe `"pair"` selalu sama dengan `plan.totalPairs`
- `totalPairs` selalu kompatibel dengan
  `buildTierGroups(Math.min(totalPos, totalNeg)).reduce((s,g) => s+g.count, 0)`
- Fungsi bersifat deterministik: dua panggilan dengan input sama menghasilkan output identik
- Layer konversi di `useSubtractionOrchestrator` (`bil2_converted = -bil2`) tidak diubah
- `useAnimationOrchestrator` meneruskan `bil1, bil2` raw tanpa konversi apapun

**Scope:**
Semua input yang tidak memicu salah satu dari empat bug condition di atas harus menghasilkan
output yang identik antara F dan F'. Ini mencakup:
- Pasangan berlawanan tanda di mana tier sudah cocok (tidak perlu decompose)
- Pasangan berlawanan tanda di mana chain decompose hanya satu level
- Input sama-tanda
- Input dengan salah satu bernilai 0

*Catatan: Perilaku benar yang diharapkan dari F' untuk setiap bug condition case terdapat
di bagian Correctness Properties di bawah.*

---

## Hypothesized Root Cause

Berdasarkan analisis kode historis (sebelum fix diterapkan), akar masalah yang ditemukan:

1. **`highestAvailableAbove` mengembalikan tier tertinggi, bukan terendah**
   - Versi lama mengiterasi `ALL_TIERS` (descending: 1000, 100, 10, 1) dan mengembalikan
     elemen pertama yang memenuhi syarat
   - Ini menghasilkan tier tertinggi yang tersedia, bukan terendah
   - Efek: chain decompose lompat langsung dari Ribuan ke Satuan dalam satu langkah

2. **`anchorGroups` dibangun tanpa `.reverse()` — urutan descending**
   - Versi lama menggunakan `decomposeToTierGroups(smallerValue)` langsung (tanpa `.reverse()`)
   - `decomposeToTierGroups` mengembalikan kelompok besar-ke-kecil (descending)
   - Efek: tier Ribuan diproses sebelum Satuan — urutan animasi tidak pedagogis

3. **Penentuan `largerSide` terbalik**
   - Versi lama memaksa decompose selalu ke sisi pos (Antibody), bukan ke `largerSide`
   - Efek: Antibody decay bahkan ketika Kuman adalah sisi besar (misal: `buildBattlePlan(1, -10)`)

4. **Tidak ada pengecekan `largerAvail[T] >= need` sebelum decompose**
   - Versi lama memulai decompose tanpa mengecek apakah chip sudah tersedia
   - Efek: decompose tidak diperlukan dipicu bahkan ketika largerSide sudah punya chip cukup

**Status saat ini:** Semua empat akar masalah sudah diperbaiki di implementasi terkini.
Inspeksi kode mengkonfirmasi:
- `highestAvailableAbove` sekarang mengiterasi `[...ALL_TIERS].reverse()` (ascending) dan
  mengembalikan tier pertama > minTier — yaitu tier *terendah* yang tersedia di atas minTier ✓
- `anchorGroups` dibangun dengan `.reverse()` — ascending ✓
- `smallerSide`/`largerSide` ditentukan dengan benar: `smallerSide = totalPos <= totalNeg ? "pos" : "neg"` ✓
- Pengecekan `largerAvail.get(T) < need` dilakukan sebelum decompose di dalam while-loop ✓

---

## Correctness Properties

Property 1: Bug Condition — Urutan Ascending (Satuan → Ribuan)

_For any_ pasangan berlawanan tanda `(bil1, bil2)` di mana `totalPos > 0` dan `totalNeg > 0`,
fungsi `buildBattlePlan'` SHALL menghasilkan langkah "pair" dalam urutan tier non-decreasing
(ascending): tier Satuan sebelum Puluhan, Puluhan sebelum Ratusan, Ratusan sebelum Ribuan.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

Property 2: Bug Condition — Sisi Decay yang Benar

_For any_ pasangan berlawanan tanda `(bil1, bil2)`, fungsi `buildBattlePlan'` SHALL
menghasilkan semua langkah "decompose" dengan `side = largerSide` (sisi dengan totalChip
lebih besar), tidak pernah `side = smallerSide`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 3: Bug Condition — Chain Decompose Bertahap

_For any_ pasangan berlawanan tanda `(bil1, bil2)`, fungsi `buildBattlePlan'` SHALL
menghasilkan setiap pasang langkah "decompose" berturutan pada sisi yang sama dengan rasio
tier tepat 10 (satu level per langkah), tidak pernah lompat lebih dari satu level.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 4: Bug Condition — Tidak Ada Decompose Berlebihan

_For any_ tier T dan count need yang sedang diproses, jika `largerAvail[T] >= need` sebelum
langkah decompose apapun di tier tersebut, maka `buildBattlePlan'` SHALL tidak menghasilkan
langkah "decompose" sebelum pair steps di tier T tersebut.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

Property 5: Preservation — Determinisme dan Kompatibilitas Mundur

_For any_ `(bil1, bil2)` yang tidak memicu bug condition manapun (`¬C(X)`), fungsi
`buildBattlePlan'` SHALL menghasilkan output yang identik dengan `buildBattlePlan` (F = F'),
bersifat deterministik (dua panggilan identik menghasilkan output yang sama), dan `totalPairs`
SHALL selalu sama dengan `buildTierGroups(min(totalPos, totalNeg)).reduce((s,g)=>s+g.count, 0)`.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

Property 6: Preservation — 11 Kasus Regression

_For each_ dari 11 kasus dalam regression table (Requirements 6.1), fungsi `buildBattlePlan'`
SHALL menghasilkan `totalPairs` yang benar dan urutan steps yang sesuai dengan expected output
yang terdokumentasi.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

---

## Fix Implementation

### Status: Sudah Diterapkan

Inspeksi kode terkini (`lib/model-chip/battlePlan.ts`) mengkonfirmasi semua perbaikan sudah
ada di implementasi. Tidak ada perubahan production code yang diperlukan.

### Algoritma Benar (F') — Walkthrough

**File:** `lib/model-chip/battlePlan.ts`  
**Fungsi:** `buildBattlePlan(bil1, bil2)`

```
STEP 1: Hitung totalPos dan totalNeg
  totalPos = max(0, bil1) + max(0, bil2)
  totalNeg = max(0, -bil1) + max(0, -bil2)
  IF totalPos = 0 OR totalNeg = 0 THEN RETURN { steps: [], totalPairs: 0 }

STEP 2: Tentukan smallerSide dan largerSide
  smallerValue = min(totalPos, totalNeg)
  largerValue  = max(totalPos, totalNeg)
  smallerSide  = IF totalPos <= totalNeg THEN "pos" ELSE "neg"
  largerSide   = IF smallerSide = "pos" THEN "neg" ELSE "pos"

STEP 3: Bangun anchorGroups (ascending: Satuan → Ribuan)
  anchorGroups = decomposeToTierGroups(smallerValue).reverse()
  // decomposeToTierGroups mengembalikan descending → .reverse() → ascending

STEP 4: Bangun largerAvail dari sisi besar
  largerAvail = Map tier → count dari decomposeToTierGroups(largerValue)

STEP 5: Hitung totalPairs
  totalPairs = sum(group.count FOR group IN anchorGroups)

STEP 6: Iterasi anchorGroups dan bangun steps
  FOR EACH { tier: T, count: need } IN anchorGroups DO
    // Luruhkan sisi besar sampai punya cukup chip di tier T
    WHILE largerAvail[T] < need DO
      sourceTier = highestAvailableAbove(largerAvail, T)  // tier terendah > T
      IF sourceTier = null THEN BREAK  // safety
      steps.push({ type: "decompose", tier: sourceTier, side: largerSide })
      largerAvail[sourceTier] -= 1
      largerAvail[sourceTier / 10] += 10
    END WHILE
    // Pair sejumlah need di tier T
    pairCount = min(need, largerAvail[T])
    FOR i = 0 TO pairCount - 1 DO
      steps.push({ type: "pair", tier: T, side: "pos" })  // "pos" digunakan sebagai placeholder
    END FOR
    largerAvail[T] -= pairCount
  END FOR

STEP 7: RETURN { steps, totalPairs }
```

### `highestAvailableAbove` — Implementasi Benar

```typescript
function highestAvailableAbove(
  avail: Map<1 | 10 | 100 | 1000, number>,
  minTier: number,
): 1 | 10 | 100 | 1000 | null {
  // Iterasi ASCENDING [1, 10, 100, 1000] → kembalikan TERENDAH di atas minTier
  const ascending = [...ALL_TIERS].reverse() as (1 | 10 | 100 | 1000)[];
  for (const t of ascending) {
    if (t > minTier && (avail.get(t) ?? 0) > 0) return t;
  }
  return null;
}
```

Perbedaan kritis dengan versi buggy: versi lama mengiterasi `ALL_TIERS` (descending:
1000, 100, 10, 1) sehingga mengembalikan tier tertinggi. Versi benar mengiterasi
ascending sehingga mengembalikan tier terendah yang tersedia di atas `minTier`.

Ini memungkinkan chain decompose bertahap:
- Need tier-1, avail `{1000: 4}` → decompose 1000 → avail `{100: 10}` (bukan langsung ke 1)
- Need tier-1, avail `{100: 10}` → decompose 100 → avail `{10: 10}` (bukan langsung ke 1)
- Need tier-1, avail `{10: 10}` → decompose 10 → avail `{1: 10}` → pair

### Perubahan yang Diperlukan

**Production code:** Tidak ada (sudah benar)

**Test file yang diperbarui:**
`__tests__/model-chip/battlePlan.property.test.ts`

- Ganti label describe block:
  `"buildBattlePlan — bug condition cases (UNFIXED: expected to fail)"`
  → `"buildBattlePlan — regression prevention (FIXED: expected to pass)"`

**Test file baru:**
`__tests__/model-chip/battlePlanRegression.test.ts`

- 11 kasus regression wajib dari Requirements 6.1
- PBT Properties 1–5 menggunakan `fast-check`
- Import dari `@/lib/model-chip/battlePlan` dan `@/lib/model-chip/tierUtils`

---

## Testing Strategy

### Validation Approach

Strategi testing mengikuti dua fase: pertama verifikasi bahwa bug condition cases
menghasilkan output benar (fix checking), kemudian verifikasi bahwa preservation cases
tidak berubah (preservation checking). Karena implementasi sudah diperbaiki, semua test
diharapkan PASS dari awal.

### Exploratory Bug Condition Checking

**Goal**: Mengkonfirmasi bahwa bug condition cases yang sebelumnya gagal sekarang PASS.

**Test Plan**: Jalankan test di `battlePlan.property.test.ts` (describe block
"bug condition cases"). Test-test ini sebelumnya di-label "UNFIXED: expected to fail"
tetapi sekarang seharusnya PASS karena implementasi sudah benar.

**Test Cases yang Perlu Dikonfirmasi PASS:**
1. `(123, -24)`: urutan ones first (decompose pos-10, 4×pair-1, decompose pos-100, 2×pair-10)
2. `(100, -1)`: chain decompose dua tingkat (decompose pos-100, decompose pos-10, pair-1)
3. `(11, -1)`: largerSide sudah punya tier-1 → direct pair, tidak ada decompose
4. `(100, -10)`: satu decompose lalu pair (decompose pos-100, pair-10)

**Expected Outcome**: Semua test PASS — konfirmasi implementasi sudah benar.

### Fix Checking

**Goal**: Verifikasi bahwa untuk semua input di mana bug condition berlaku, F' menghasilkan
perilaku yang diharapkan.

**Pseudocode:**
```
FOR ALL (bil1, bil2) WHERE isBugCondition_order(bil1, bil2)
                        OR isBugCondition_side(bil1, bil2)
                        OR isBugCondition_chain(bil1, bil2)
                        OR isBugCondition_excess(bil1, bil2) DO
  plan ← buildBattlePlan'(bil1, bil2)
  pairTiers ← [s.tier FOR s IN plan.steps WHERE s.type = "pair"]
  ASSERT pairTiers IS NON-DECREASING                               // Property 1
  largerSide ← IF totalPos <= totalNeg THEN "neg" ELSE "pos"
  FOR ALL step IN plan.steps WHERE step.type = "decompose" DO
    ASSERT step.side = largerSide                                   // Property 2
  END FOR
  FOR consecutive decompose pairs (s1, s2) same side DO
    ASSERT s1.tier / s2.tier = 10                                   // Property 3
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verifikasi bahwa untuk input yang tidak memicu bug condition (¬C(X)), F = F'.

**Pseudocode:**
```
FOR ALL (bil1, bil2) WHERE NOT (isBugCondition_order(bil1, bil2)
                                OR isBugCondition_side(bil1, bil2)
                                OR isBugCondition_chain(bil1, bil2)
                                OR isBugCondition_excess(bil1, bil2)) DO
  ASSERT buildBattlePlan(bil1, bil2) = buildBattlePlan'(bil1, bil2)
END FOR
```

**Test Cases Preservation (describe block "preservation baseline" sudah ada):**
1. `(10, -10)`: direct tier match → `[pair×10]`, no decompose ✓
2. `(1, -1)`: direct tier match → `[pair×1]`, no decompose ✓
3. `(5, 3)`: sama tanda → `[]` ✓
4. `(-5, -3)`: sama tanda → `[]` ✓

### Unit Tests

- Test 11 kasus regression dari requirements.md (file baru `battlePlanRegression.test.ts`)
- Test edge cases: satu input nol, kedua input nol, tanda sama
- Test chain decompose bertahap untuk multi-level: `(100, -1)`, `(1000, -1)`
- Test sisi decay: `(1, -10)` (Kuman decay), `(11, -2)` (Antibody decay)
- Test tidak ada decompose berlebihan: `(11, -1)`, `(-11, 1)`, `(10, -10)`

### Property-Based Tests

Menggunakan `fast-check` (sudah ada di project):

```pascal
// PBT 1: Pair steps selalu ascending per tier
fc.property(fc.integer({min:1, max:9999}), fc.integer({min:1, max:9999}), (pos, neg) => {
  plan ← buildBattlePlan(pos, -neg)
  pairTiers ← plan.steps.filter(s => s.type="pair").map(s => s.tier)
  RETURN pairTiers IS NON-DECREASING
})

// PBT 2: Decompose selalu pada largerSide
fc.property(fc.integer({min:1, max:9999}), fc.integer({min:1, max:9999}), (pos, neg) => {
  plan ← buildBattlePlan(pos, -neg)
  largerSide ← IF pos <= neg THEN "neg" ELSE "pos"
  RETURN plan.steps.every(s => s.type != "decompose" OR s.side = largerSide)
})

// PBT 3: Consecutive decompose ratio = 10 (chain bertahap)
fc.property(fc.integer({min:1, max:9999}), fc.integer({min:1, max:9999}), (pos, neg) => {
  plan ← buildBattlePlan(pos, -neg)
  FOR consecutive (s1, s2) decompose same side DO
    IF s1.tier / s2.tier != 10 THEN RETURN false
  RETURN true
})

// PBT 4: totalPairs = jumlah pair steps
fc.property(fc.integer({min:1, max:9999}), fc.integer({min:1, max:9999}), (pos, neg) => {
  plan ← buildBattlePlan(pos, -neg)
  RETURN plan.steps.filter(s => s.type="pair").length = plan.totalPairs
})

// PBT 5: Kompatibilitas mundur dengan buildTierGroups
fc.property(fc.integer({min:1, max:9999}), fc.integer({min:1, max:9999}), (pos, neg) => {
  plan ← buildBattlePlan(pos, -neg)
  legacy ← buildTierGroups(min(pos, neg)).reduce((s,g) => s+g.count, 0)
  RETURN plan.totalPairs = legacy
})

// PBT 6: Determinisme
fc.property(fc.integer({min:-9999, max:9999}), fc.integer({min:-9999, max:9999}), (a, b) => {
  RETURN JSON.stringify(buildBattlePlan(a,b)) = JSON.stringify(buildBattlePlan(a,b))
})

// PBT 7: Sama tanda → plan kosong
fc.property(fc.integer({min:0, max:9999}), fc.integer({min:0, max:9999}), (a, b) => {
  RETURN buildBattlePlan(a,b).steps.length = 0
    AND buildBattlePlan(-a,-b).steps.length = 0
})
```

### Integration Tests

- Verifikasi label describe block di `battlePlan.property.test.ts` sudah diperbarui
  dari "UNFIXED: expected to fail" menjadi "FIXED: regression prevention"
- Jalankan seluruh test suite untuk memastikan tidak ada regresi: `jest __tests__/model-chip/`
- Konfirmasi semua 11 kasus regression di `battlePlanRegression.test.ts` PASS

---

## Files Changed

| File | Status | Deskripsi |
|------|--------|-----------|
| `lib/model-chip/battlePlan.ts` | **Tidak diubah** | Implementasi sudah benar |
| `__tests__/model-chip/battlePlan.property.test.ts` | **Diperbarui** | Ganti label "UNFIXED: expected to fail" → "FIXED: regression prevention" |
| `__tests__/model-chip/battlePlanRegression.test.ts` | **Baru** | 11 kasus regression + PBT properties formal |

## Files NOT Changed

| File | Alasan |
|------|--------|
| `hooks/model-chip/useAnimationOrchestrator.ts` | Tidak ada bug; `side` field pair steps tidak dikonsumsi untuk animasi |
| `hooks/model-chip/useSubtractionOrchestrator.ts` | Konversi `bil2_converted = -bil2` sudah benar, tidak diubah |
| Semua komponen, halaman, styles, animasi | Fix terlokalisasi di `battlePlan.ts` |

---

## Perubahan Visual: CharacterColumn Tier Order

### Bug

`CharacterColumn.tsx` merender tier dari atas ke bawah dalam urutan descending:
`[1000, 100, 10, 1]` — Ribuan di atas, Satuan di bawah.

Ini berlawanan dengan urutan pertarungan logika (Satuan diproses lebih dahulu).
Saat animasi pertarungan di tier Satuan, chip Satuan yang aktif ada di paling bawah
kolom, tidak terdepan.

### Fix

Ubah satu baris di `components/model-chip/CharacterColumn.tsx`:

```typescript
// SEBELUM (bug):
const allTiersOrder: (1 | 10 | 100 | 1000)[] = [1000, 100, 10, 1];

// SESUDAH (fix):
const allTiersOrder: (1 | 10 | 100 | 1000)[] = [1, 10, 100, 1000];
```

### Dampak

- Tier Satuan sekarang dirender di atas → chip aktif selalu terdepan
- `pairedByTier` dan `remainByTier` menggunakan `allTiersOrder` untuk iterasi dekomposisi
  nilai — urutan iterasi ini TIDAK mempengaruhi nilai yang dihasilkan (Math.floor bersifat
  commutative untuk tier-tier yang berbeda)
- Semua styling, opacity, animasi chip tidak berubah
- Tidak ada perubahan pada `ArenaBattle`, `ArenaPanel`, atau file lain

### File Changed

`components/model-chip/CharacterColumn.tsx` — **satu baris**: ubah `[1000, 100, 10, 1]` menjadi `[1, 10, 100, 1000]`
