# Battle Plan Decompose Order Bugfix Design

## Overview

Bug terjadi pada fungsi `buildBattlePlan` di `lib/model-chip/battlePlan.ts`. Algoritma greedy yang ada menginisialisasi `posAvail` dari `decomposeToTierGroups(totalPos)` — semua chip sisi besar — lalu membandingkan tier tertinggi kedua sisi secara iteratif. Akibatnya, setelah chip tier tinggi luruh dan menghasilkan 10 chip tier bawah, chip-chip kelebihan yang tidak punya pasangan di sisi kecil dipaksa luruh satu per satu tanpa henti.

Strategi fix: ganti pendekatan "compare highest tier" dengan **anchor ke sisi kecil**. Iterasi dilakukan per tier group dari sisi kecil, diurutkan **ascending (kecil ke besar)** — satuan lebih dahulu, lalu puluhan, ratusan, ribuan; untuk setiap tier yang dibutuhkan, sisi besar hanya diluruhi sampai cukup menyediakan chip di tier tersebut — tidak lebih. Urutan ascending ini lebih bermakna secara pedagogis karena unit terkecil selalu bertempur lebih dahulu.

Scope perubahan terbatas pada fungsi `buildBattlePlan` saja. Tidak ada perubahan pada komponen, hook, atau file lain.

## Glossary

- **Bug_Condition (C)**: Kondisi yang memicu bug — `posAvail` (atau `negAvail` untuk kasus sisi neg lebih kecil) diinisialisasi dari nilai total penuh, bukan dari `smallerValue`, sehingga chip kelebihan hasil luruh tidak punya pasangan dan dipaksa luruh berulang
- **Property (P)**: Perilaku yang diinginkan — untuk setiap tier T yang dibutuhkan sisi kecil, sisi besar hanya diluruhi sejumlah yang diperlukan, lalu dipair tepat sebanyak kebutuhan tier tersebut
- **Preservation**: Perilaku yang tidak boleh berubah — input sama-tanda tetap menghasilkan plan kosong; jumlah pair steps tetap sama dengan `Math.min(totalPos, totalNeg)` chip-count; fungsi tetap deterministik; kompatibilitas mundur dengan `buildTierGroups`
- **`buildBattlePlan`**: Fungsi di `lib/model-chip/battlePlan.ts` yang menghitung urutan langkah decompose dan pair untuk animasi netralisasi chip
- **`decomposeToTierGroups`**: Helper yang menguraikan nilai integer ke array `TierGroup[]` dari tier terbesar ke terkecil
- **anchorGroups**: `decomposeToTierGroups(smallerValue).reverse()` — tier groups dari sisi kecil, diurutkan ascending (terkecil ke terbesar); ini menjadi acuan iterasi pada algoritma baru
- **largerAvail**: Map `tier → count` untuk sisi besar yang dimutasi selama simulasi
- **smallerSide / largerSide**: Sisi dengan `totalPos ≤ totalNeg` adalah `smallerSide = "pos"`, sebaliknya `"neg"`

## Bug Details

### Bug Condition

Bug termanifestasi ketika `buildBattlePlan` dipanggil dengan pasangan berlawanan tanda di mana sisi besar memiliki chip tier tinggi yang, setelah luruh, menghasilkan lebih banyak chip tier bawah dari yang dibutuhkan untuk dipasangkan. Algoritma lama tidak membatasi luruhan — ia hanya melihat tier tertinggi yang *tersedia*, bukan tier yang *dibutuhkan* — sehingga chip kelebihan terus dipaksa luruh.

**Formal Specification:**
```
FUNCTION isBugCondition(bil1, bil2)
  INPUT: bil1, bil2 integer
  OUTPUT: boolean

  totalPos = max(0, bil1) + max(0, bil2)
  totalNeg = max(0, -bil1) + max(0, -bil2)
  smallerValue = min(totalPos, totalNeg)
  largerValue = max(totalPos, totalNeg)

  -- Bug terpicu ketika sisi besar memiliki chip di tier T
  -- yang, setelah luruh, menghasilkan lebih banyak chip tier T/10
  -- dari yang dibutuhkan untuk pair dengan sisi kecil di tier T/10
  RETURN totalPos > 0
         AND totalNeg > 0
         AND EXISTS tier T IN [1000, 100, 10]
               SUCH THAT floor(largerValue / T) * 10 > floor(smallerValue / (T / 10))
                         AND floor(smallerValue / T) == 0
END FUNCTION
```

### Examples

- `buildBattlePlan(123, -24)` → saat ini menghasilkan decompose berlebih dan urutan salah (tier besar lebih dahulu); yang benar: `[decompose pos-10, pair ×1 ×4, decompose pos-100, pair ×10 ×2]` (satuan lebih dahulu)
- `buildBattlePlan(100, -1)` → saat ini decompose pos-100 → 10 chip pos-10 → 9 chip pos-10 dipaksa decompose satu per satu; yang benar hanya 1 decompose pos-100 lalu 1 decompose pos-10 lalu 1 pair ×1
- `buildBattlePlan(11, -1)` → sisi besar (11) sudah memiliki chip di tier 1 (nilai 11 = 1×pos-10 + 1×pos-1); tidak perlu decompose sama sekali; yang benar: langsung `[pair ×1]` — chip pos-10 ekstra cukup diabaikan karena tidak ada pasangan neg-10
- `buildBattlePlan(10, -10)` → tidak ada bug; tier langsung cocok → 1 pair ×10 (kasus ini tetap benar)

## Expected Behavior

### Preservation Requirements

**Perilaku yang tidak boleh berubah:**
- Input bertanda sama (atau salah satu 0) tetap menghasilkan `{ steps: [], totalPairs: 0 }`
- Jumlah langkah bertipe `"pair"` tetap sama persis dengan `Math.min(totalPos, totalNeg)` dihitung sebagai chip-count
- `buildBattlePlan(a, b)` dipanggil dua kali dengan input yang sama menghasilkan objek identik (deterministik, pure function)
- `plan.totalPairs` tetap sama dengan `buildTierGroups(Math.min(totalPos, totalNeg)).reduce((s,g) => s + g.count, 0)` (kompatibilitas mundur)
- Kasus di mana kedua sisi sudah memiliki chip di tier yang sama tetap tidak menghasilkan langkah decompose yang tidak perlu

**Scope:**
Semua input yang tidak memenuhi bug condition (sisi besar tidak punya kelebihan chip setelah luruh) tidak boleh terpengaruh sama sekali oleh fix ini, termasuk kasus tier-match langsung dan kasus sisi kecil adalah pos.

**Catatan:** Perilaku yang *benar* untuk input buggy didefinisikan di bagian Correctness Properties di bawah.

## Hypothesized Root Cause

Root cause sudah dikonfirmasi dari analisis:

1. **Inisialisasi `posAvail` dari nilai penuh, bukan `smallerValue`**: `posAvail` diisi dari `decomposeToTierGroups(totalPos)` alih-alih dari `decomposeToTierGroups(smallerValue)`. Ketika `totalPos > totalNeg`, sisi pos punya chip "ekstra" yang tidak akan pernah berpasangan, tapi algoritma tidak tahu itu.

2. **Algoritma "compare highest tier" tidak memiliki acuan kebutuhan**: Loop mengambil tier tertinggi dari kedua sisi lalu membandingkan secara buta. Setelah pos-100 luruh menjadi 10 chip pos-10, algoritma melihat pos-10 sebagai "tier tertinggi tersedia" — tapi neg hanya punya chip di tier yang lebih rendah, sehingga pos-10 dipaksa luruh lagi, dan lagi, sampai habis.

3. **Tidak ada target tier per iterasi**: Algoritma lama tidak memiliki konsep "sekarang saya sedang memproses tier T untuk kebutuhan sisi kecil". Tanpa target itu, luruhan bisa melampaui tier yang dibutuhkan.

4. **`MAX_ITERATIONS` yang terlalu longgar**: Batas `totalPairs + Math.max(totalPos, totalNeg) + 10` cukup besar untuk membiarkan luruhan berlebih terjadi ratusan kali sebelum loop berhenti karena `pairsGenerated >= totalPairs`.

## Correctness Properties

Property 1: Bug Condition - Decompose Hanya Sejumlah yang Dibutuhkan, Urutan Ascending

_For any_ pasangan `(bil1, bil2)` di mana `totalPos > 0` dan `totalNeg > 0` dan `isBugCondition(bil1, bil2)` bernilai true, fungsi `buildBattlePlan` yang sudah diperbaiki SHALL menghasilkan langkah-langkah decompose hanya untuk chip yang benar-benar diperlukan untuk menyediakan chip di tier yang dibutuhkan sisi kecil — tidak ada decompose tambahan pada chip kelebihan hasil luruh sebelumnya — dan langkah-langkah tersebut SHALL berurutan dari tier terkecil ke tier terbesar (satuan → puluhan → ratusan → ribuan).

**Validates: Requirements 2.1, 2.2, 2.3, 2.10**

Property 2: Preservation - Jumlah Pair dan Determinisme

_For any_ pasangan `(bil1, bil2)`, fungsi `buildBattlePlan` yang sudah diperbaiki SHALL menghasilkan jumlah pair steps yang sama dengan implementasi lama (= chip-count dari `Math.min(totalPos, totalNeg)`), menghasilkan output yang identik untuk input yang sama, dan menghasilkan plan kosong untuk input bertanda sama.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `lib/model-chip/battlePlan.ts`

**Function**: `buildBattlePlan`

**Specific Changes:**

1. **Tentukan smallerSide dan largerSide**: Bandingkan `totalPos` dan `totalNeg`; sisi yang nilainya ≤ adalah `smallerSide`, sisi yang lebih besar adalah `largerSide`.

2. **Bangun `anchorGroups` dari sisi kecil (ascending)**: `anchorGroups = decomposeToTierGroups(smallerValue).reverse()`. `decomposeToTierGroups` menghasilkan urutan descending (terbesar ke terkecil); `.reverse()` membaliknya menjadi ascending (terkecil ke terbesar: satuan → puluhan → ratusan → ribuan). Ini menentukan tier apa saja dan berapa count yang perlu dipasangkan, dengan urutan yang bermakna secara pedagogis.

3. **Bangun `largerAvail` dari sisi besar**: `largerAvail = new Map()` diisi dari `decomposeToTierGroups(largerValue)`. Hanya sisi besar yang perlu dimutasi.

4. **Ganti loop `while` dengan iterasi `for...of anchorGroups`**: Untuk setiap `{ tier: T, count: need }` di `anchorGroups`:
   - **Inner while**: Selama `largerAvail.get(T) < need`, temukan tier tertinggi > T yang tersedia di `largerAvail`, push satu langkah `decompose`, kurangi count tier itu dan tambahkan 10 ke `tier/10`.
   - **Pair**: Hitung `pairCount = min(need, largerAvail.get(T))`, push `pairCount` langkah `pair` dengan `side = smallerSide`, kurangi `largerAvail.get(T)` sebesar `pairCount`.

5. **Hapus variabel `pairsGenerated` dan `MAX_ITERATIONS`**: Tidak diperlukan lagi — iterasi sekarang di-drive oleh `anchorGroups` yang terbatas jumlahnya (maksimal 4 tier).

6. **Hitung ulang `totalPairs`** dari `anchorGroups.reduce((s, g) => s + g.count, 0)` — identik dengan implementasi lama.

**Pseudocode algoritma baru:**
```
FUNCTION buildBattlePlan(bil1, bil2):
  totalPos = max(0, bil1) + max(0, bil2)
  totalNeg = max(0, -bil1) + max(0, -bil2)

  IF totalPos == 0 OR totalNeg == 0:
    RETURN { steps: [], totalPairs: 0 }

  smallerValue = min(totalPos, totalNeg)
  largerValue  = max(totalPos, totalNeg)
  smallerSide  = IF totalPos <= totalNeg THEN "pos" ELSE "neg"

  anchorGroups = decomposeToTierGroups(smallerValue).reverse()  -- ascending: satuan → puluhan → ratusan → ribuan
  largerAvail  = Map dari decomposeToTierGroups(largerValue)

  steps = []

  FOR EACH { tier: T, count: need } IN anchorGroups:
    -- Luruhkan sisi besar sampai punya cukup chip di tier T
    -- Jika largerAvail sudah punya chip di tier T (≥ need), tidak ada decompose sama sekali
    WHILE largerAvail[T] < need:
      sourceTier = highestAvailableAbove(largerAvail, T)
      IF sourceTier == null: BREAK          -- safety; seharusnya tidak terjadi
      steps.push({ type: "decompose", tier: sourceTier, side: opposite(smallerSide) })
      largerAvail[sourceTier] -= 1
      largerAvail[sourceTier / 10] += 10

    -- Pair sejumlah `need`
    pairCount = min(need, largerAvail[T])
    FOR i IN 1..pairCount:
      steps.push({ type: "pair", tier: T, side: smallerSide })
    largerAvail[T] -= pairCount

  totalPairs = anchorGroups.reduce((s, g) => s + g.count, 0)
  RETURN { steps, totalPairs }

FUNCTION highestAvailableAbove(avail, minTier):
  FOR t IN [1000, 100, 10, 1]:
    IF t > minTier AND avail[t] > 0: RETURN t
  RETURN null
END FUNCTION
```

## Testing Strategy

### Validation Approach

Strategi dua fase: pertama, tulis unit test untuk kasus-kasus spesifik yang mendemonstrasikan bug pada kode lama (exploratory), lalu verifikasi bahwa fix menghasilkan urutan yang benar dan semua property test lama tetap lulus (fix + preservation).

### Exploratory Bug Condition Checking

**Goal**: Tulis test untuk kasus di mana isBugCondition bernilai true, jalankan pada kode **UNFIXED** untuk mengamati kegagalan dan mengonfirmasi root cause.

**Test Plan**: Simulasikan pasangan yang sisi besarnya menghasilkan chip kelebihan setelah luruh, lalu assert bahwa langkah-langkah yang dihasilkan persis sesuai spesifikasi requirements 2.1–2.9.

**Test Cases:**

1. **`(123, -24)` — kasus utama (akan gagal pada kode unfixed)**: Assert urutan `[decompose pos-10, pair 1×1, pair 1×1, pair 1×1, pair 1×1, decompose pos-100, pair 2×10]`, `totalPairs = 6`
2. **`(100, -1)` — double decompose tanpa pair tengah (akan gagal)**: Assert `[decompose 100, decompose 10, pair 1×1]`, `totalPairs = 1`
3. **`(11, -1)` — pos punya chip ekstra di tier 1, tidak perlu decompose (akan gagal pada kode unfixed)**: Assert `[pair ×1]`, `totalPairs = 1` — karena pos-11 sudah punya chip tier 1, sisi besar tidak perlu diluruhi sama sekali
4. **`(100, -10)` — satu decompose cukup (mungkin sudah benar pada kode lama, verifikasi tetap dilakukan)**

**Expected Counterexamples pada kode unfixed:**
- Untuk `(123, -24)`: akan ada 8–10 langkah `decompose pos-10` berturut-turut yang tidak perlu
- Untuk `(100, -1)`: akan ada 9 langkah `decompose pos-10` berturut-turut setelah `decompose pos-100`
- Root cause terkonfirmasi: `posAvail` diisi dari total pos penuh sehingga chip kelebihan terus di-drain

### Fix Checking

**Goal**: Verifikasi bahwa untuk semua input di mana bug condition berlaku, fungsi yang sudah diperbaiki menghasilkan urutan langkah yang benar.

**Pseudocode:**
```
FOR ALL (bil1, bil2) WHERE isBugCondition(bil1, bil2) DO
  plan := buildBattlePlan_fixed(bil1, bil2)
  ASSERT steps mengandung decompose hanya untuk chip yang dibutuhkan
  ASSERT urutan: decompose tier T muncul tepat sebelum pair di tier T/10 yang membutuhkannya
  ASSERT TIDAK ADA decompose tier T berturut-turut tanpa diselingi pair
END FOR
```

**Kasus kunci yang harus diverifikasi:**

| Input | Steps yang diharapkan | totalPairs |
|---|---|---|
| `(123, -24)` | `[decompose 10, pair 1, pair 1, pair 1, pair 1, decompose 100, pair 10, pair 10]` | 6 |
| `(10, -1)` | `[decompose 10, pair 1]` | 1 |
| `(100, -10)` | `[decompose 100, pair 10]` | 1 |
| `(10, -10)` | `[pair 10]` | 1 |
| `(100, -1)` | `[decompose 100, decompose 10, pair 1]` | 1 |
| `(11, -1)` | `[pair 1]` | 1 |

**Catatan urutan steps `(123, -24)`**: `anchorGroups` dari smallerValue=24 setelah `.reverse()` adalah `[{tier:1,count:4},{tier:10,count:2}]` (ascending). Iterasi pertama (tier 1, need 4): `largerAvail` dari 123 punya `{100:1,10:2,1:3}` → hanya ada 3 chip tier 1, butuh 4 → decompose pos-10 → `{100:1,10:1,1:13}` → pair 4×1. Iterasi kedua (tier 10, need 2): `largerAvail` sekarang `{100:1,10:1}` → hanya ada 1 chip tier 10, butuh 2 → decompose pos-100 → `{10:11}` → pair 2×10. Total steps: `[decompose 10, pair 1, pair 1, pair 1, pair 1, decompose 100, pair 10, pair 10]`.

**Catatan `(11, -1)`**: `smallerValue = 1`, `largerValue = 11`. `largerAvail` dari `decomposeToTierGroups(11)` = `{10:1, 1:1}`. `anchorGroups` = `[{tier:1, count:1}]`. Iterasi tier 1, need 1: `largerAvail[1] = 1 ≥ 1` → **tidak ada decompose**, langsung pair. Chip pos-10 yang tersisa di `largerAvail` tidak disentuh karena tidak ada kebutuhan di tier 10.

### Preservation Checking

**Goal**: Verifikasi bahwa untuk semua input di mana bug condition TIDAK berlaku, fungsi yang sudah diperbaiki menghasilkan output yang sama dengan fungsi lama.

**Pseudocode:**
```
FOR ALL (bil1, bil2) WHERE NOT isBugCondition(bil1, bil2) DO
  ASSERT buildBattlePlan_original(bil1, bil2) ≡ buildBattlePlan_fixed(bil1, bil2)
END FOR
```

**Testing Approach**: Property-based testing dengan fast-check sangat efektif di sini karena:
- Menghasilkan ratusan test case secara otomatis
- Menemukan edge case yang sulit diprediksi secara manual
- Memberikan jaminan kuat bahwa tidak ada regresi

**Test Plan**: Jalankan property tests yang sudah ada (Property 3–5, 7 dari `battlePlan.property.test.ts`) pada kode yang sudah diperbaiki — semua harus tetap lulus.

**Preservation Test Cases:**

1. **`(10, -10)` — tier match langsung, tidak ada decompose**: Verifikasi masih menghasilkan `[{type:"pair",tier:10,side:"pos"}]`
2. **`(1, -1)` — tier 1 langsung**: Verifikasi masih menghasilkan `[{type:"pair",tier:1,side:"pos"}]`
3. **Same-sign preservation**: `buildBattlePlan(5, 3)` dan `buildBattlePlan(-5, -3)` tetap `{ steps: [], totalPairs: 0 }`
4. **Kompatibilitas `totalPairs` dengan `buildTierGroups`**: Property 7 harus tetap lulus untuk semua input acak

### Unit Tests

- Test setiap kasus spesifik dari requirements 2.4–2.9 dengan assert urutan steps yang tepat
- Test edge case: input 0, kedua bertanda sama, satu negatif satu positif dengan tier match sempurna
- Test bahwa langkah `decompose` selalu mendahului langkah `pair` di tier yang membutuhkannya
- Test bahwa tidak ada dua langkah `decompose` pada tier yang sama secara berurutan tanpa pair di antaranya (kecuali memang butuh dua luruhan ke tier berbeda)

### Property-Based Tests

- **Property 1 (baru — Fix Checking)**: Untuk semua `(pos, neg)` di mana `pos > neg` dan `pos / neg > 10`, jumlah langkah `decompose` pada output ≤ jumlah tier yang perlu di-bridge dari `largerValue` ke `smallerValue`
- **Property 2 (baru — Urutan yang Benar)**: Untuk semua input berlawanan tanda, setiap langkah `decompose tier T` diikuti (segera atau setelah decompose tier T/10 lagi) oleh setidaknya satu langkah `pair` — tidak ada decompose yang "menggantung" tanpa pair
- **Property 3, 4, 5, 7 (existing — Preservation)**: Semua harus tetap lulus tanpa modifikasi

### Integration Tests

- Test bahwa perubahan `buildBattlePlan` tidak mempengaruhi rendering komponen yang mengonsumsi `BattlePlan` (tidak ada perubahan tipe `BattleStep` atau `BattlePlan`)
- Test bahwa animasi battle untuk `(123, -24)` sekarang berjalan 8 langkah, bukan 16+ langkah seperti sebelumnya
- Test switching antara input berbeda tidak menyebabkan state stale (fungsi pure, tidak ada side effect)
