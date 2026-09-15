# Requirements Document

## Introduction

Dokumen ini mendefinisikan persyaratan fungsional untuk perbaikan bug pada `buildBattlePlan`
di `lib/model-chip/battlePlan.ts`. Bug menyebabkan urutan langkah animasi yang tidak konsisten
dengan semantik matematika yang benar, sehingga berdampak pada kedua modul yang berbagi engine
yang sama:

- **Modul Penjumlahan** (`/model-chip` → `useAnimationOrchestrator`): input `bil1, bil2` adalah
  nilai chip raw yang langsung diteruskan ke `buildBattlePlan(bil1, bil2)`.
- **Modul Pengurangan** (`/model-chip/pengurangan` → `useSubtractionOrchestrator`): input `bil1,
  bil2` di mana lapisan konversi `bil2_converted = -bil2` sudah benar dan menghasilkan argumen
  final yang identik secara semantik sebelum memanggil `buildBattlePlan(bil1, bil2_converted)`.

Karena argumen final ke `buildBattlePlan` selalu sama terlepas dari modul pemanggil, setiap bug
di `buildBattlePlan` muncul identik di kedua modul untuk input matematika yang ekuivalen.

Tiga akar masalah yang diperbaiki:
1. **`highestAvailableAbove` mengembalikan tier tertinggi** — seharusnya terendah di atas
   `minTier`, agar chain decompose berjalan bertahap (bukan lompat langsung).
2. **Regrouping tidak perlu** — decompose dipicu bahkan ketika largerSide sudah punya chip di
   tier aktif.
3. **Urutan nilai tempat salah** — netralisasi harus ascending: Satuan → Puluhan → Ratusan →
   Ribuan.

Status saat ini: semua kasus yang terdaftar dalam regression test sudah menghasilkan output
yang benar di codebase terkini. Persyaratan ini mengunci perilaku tersebut melalui test suite
formal agar tidak terjadi regresi.

---

## Glossary

- **Antibody** — chip yang mewakili bilangan positif dalam simulasi Model-Chip
- **Kuman (Virus)** — chip yang mewakili bilangan negatif dalam simulasi Model-Chip
- **Tier** — nilai tempat chip: Satuan (1), Puluhan (10), Ratusan (100), Ribuan (1000)
- **smallerSide** — sisi (pos atau neg) dengan totalChip ≤ totalChip sisi lawan; menjadi anchor urutan netralisasi
- **largerSide** — sisi dengan totalChip lebih besar; satu-satunya sisi yang boleh melakukan decompose
- **Decompose / Decay / Regrouping** — proses 1 chip tier tinggi dipecah menjadi 10 chip tier satu tingkat di bawahnya
- **anchorGroups** — representasi chip sisi kecil (ascending: Satuan → Puluhan → Ratusan → Ribuan) yang menentukan urutan dan jumlah netralisasi
- **largerAvail** — peta tier→count chip sisi besar yang tersedia, dimutasi selama simulasi untuk melacak chip yang sudah di-decompose
- **Chain decompose** — serangkaian decompose bertahap ketika tier yang dibutuhkan tidak dapat dicapai dalam satu langkah (misal Ribuan → Ratusan → Puluhan → Satuan)
- **totalPairs** — jumlah total reaksi pasangan chip (jumlah langkah bertipe "pair" dalam BattlePlan)
- **bil2_converted** — nilai bil2 setelah konversi di modul pengurangan: `bil2_converted = -bil2_original`
- **F** — fungsi `buildBattlePlan` sebelum fix (kode asli)
- **F'** — fungsi `buildBattlePlan` setelah fix diterapkan
- **C(X)** — bug condition: predikat yang mengidentifikasi input yang memicu bug
- **¬C(X)** — non-buggy inputs: input yang tidak memicu bug, perilakunya harus dipreservasi

---

## Requirements

### 1. Urutan Nilai Tempat Ascending (Satuan → Ribuan)

**User Story:** Sebagai pengguna simulasi, saya ingin animasi memproses pasangan chip mulai
dari nilai tempat terkecil, agar urutan animasi sesuai dengan cara pengajaran pengurangan
bersusun.

#### Acceptance Criteria

1.1 WHEN pasangan berlawanan tanda diproses THEN the system SHALL memulai urutan langkah dari
    tier terkecil ke terbesar (Satuan → Puluhan → Ratusan → Ribuan) — `anchorGroups` dibangun
    dari `decomposeToTierGroups(smallerValue).reverse()` sehingga tier Satuan diproses lebih
    dahulu

1.2 WHEN `buildBattlePlan(352, -178)` dipanggil (`smallerSide="neg"`, `anchorGroups` dari 178
    ascending = `[{tier:1,count:8},{tier:10,count:7},{tier:100,count:1}]`) THEN the system SHALL
    menghasilkan urutan yang benar: Satuan diproses lebih dahulu, kemudian Puluhan, kemudian
    Ratusan — dengan decompose hanya ketika `largerAvail[T] < need`; `totalPairs=16`

1.3 WHEN `buildBattlePlan(123, -24)` dipanggil (`totalPos=123, totalNeg=24; smallerSide="neg"`,
    `anchorGroups` dari 24 = `[{tier:1,count:4},{tier:10,count:2}]`) THEN the system SHALL
    menghasilkan `[decompose pos-10, pair ×1 ×4, pair ×10 ×2]` — Satuan lebih dahulu,
    Puluhan setelahnya; `totalPairs=6`

1.4 WHEN `buildBattlePlan(4002, -1587)` dipanggil THEN the system SHALL menghasilkan langkah
    dengan urutan tier Satuan selesai terlebih dahulu sebelum tier Puluhan, Puluhan sebelum
    Ratusan, dan Ratusan sebelum Ribuan; `totalPairs=21`

#### Correctness Properties

```pascal
// Bug Condition C_order(X): anchorGroups tidak dalam urutan ascending
FUNCTION isBugCondition_order(X)
  INPUT: X = (bil1: integer, bil2: integer)
  OUTPUT: boolean
  // Bug terpicu ketika ada dua tier T_i < T_j di anchorGroups
  // sehingga langkah pair T_j muncul sebelum pair T_i di output
  RETURN EXISTS i, j WHERE anchorGroups[i].tier > anchorGroups[j].tier
                           AND i < j  // urutan descending, bukan ascending
END FUNCTION

// Property 1.A: Fix Checking — pair steps harus ascending per tier
FOR ALL (bil1, bil2) WHERE totalPos > 0 AND totalNeg > 0 DO
  plan ← buildBattlePlan'(bil1, bil2)
  pairTiers ← [step.tier FOR step IN plan.steps WHERE step.type = "pair"]
  ASSERT pairTiers IS NON-DECREASING  // Satuan pairs sebelum Puluhan, dst.
END FOR

// Property 1.B: Preservation — urutan pair tiers tidak berubah untuk input tanpa bug
FOR ALL (bil1, bil2) WHERE NOT isBugCondition_order(bil1, bil2) DO
  ASSERT buildBattlePlan(bil1, bil2).steps = buildBattlePlan'(bil1, bil2).steps
END FOR
```

---

### 2. Penentuan Sisi Decay yang Benar

**User Story:** Sebagai pengguna simulasi, saya ingin animasi menunjukkan sisi yang tepat
melakukan decay (decompose), agar simulasi mencerminkan prosedur matematika yang benar.

#### Acceptance Criteria

2.1 WHEN `buildBattlePlan(bil1, bil2)` dipanggil dengan pasangan berlawanan tanda THEN the
    system SHALL menentukan `smallerSide` dari sisi yang nilainya ≤ dan `largerSide` dari sisi
    yang nilainya lebih besar — decay/decompose HANYA terjadi pada `largerSide`

2.2 WHEN `buildBattlePlan(1, -10)` dipanggil (`totalPos=1, totalNeg=10; smallerSide="pos"`) THEN
    the system SHALL menghasilkan `[decompose neg-10, pair ×1]` — Kuman (sisi besar) yang
    melakukan decay, bukan Antibody

2.3 WHEN `buildBattlePlan(-11, 1)` dipanggil (`totalPos=1, totalNeg=11; smallerSide="pos"`,
    `largerAvail[1]=1 ≥ need=1`) THEN the system SHALL menghasilkan `[pair ×1]` tanpa langkah
    decompose — netralisasi langsung karena largerSide sudah punya chip di tier yang dibutuhkan

2.4 WHEN `buildBattlePlan(11, -2)` dipanggil (`totalPos=11, totalNeg=2; smallerSide="neg"`,
    `largerAvail` dari 11 = `{10:1,1:1}`, need=2 chip Satuan) THEN the system SHALL menghasilkan
    `[decompose pos-10, pair ×1, pair ×1]` — Antibody-Puluhan decay karena Antibody adalah
    largerSide yang kekurangan chip Satuan

2.5 WHEN `buildBattlePlan(11, -1)` dipanggil (`totalPos=11, totalNeg=1; smallerSide="neg"`,
    `largerAvail[1]=1 ≥ need=1`) THEN the system SHALL menghasilkan `[pair ×1]` tanpa decompose

#### Correctness Properties

```pascal
// Bug Condition C_side(X): decompose step terjadi pada sisi yang salah
FUNCTION isBugCondition_side(X)
  INPUT: X = (bil1: integer, bil2: integer)
  OUTPUT: boolean
  smallerSide ← IF totalPos(X) <= totalNeg(X) THEN "pos" ELSE "neg"
  largerSide  ← IF smallerSide = "pos" THEN "neg" ELSE "pos"
  plan        ← buildBattlePlan(X.bil1, X.bil2)
  // Bug terpicu jika ada decompose step dengan side = smallerSide
  RETURN EXISTS step IN plan.steps WHERE step.type = "decompose"
                                        AND step.side = smallerSide
END FUNCTION

// Property 2.A: Fix Checking — semua decompose steps milik largerSide
FOR ALL (bil1, bil2) WHERE totalPos > 0 AND totalNeg > 0 DO
  plan        ← buildBattlePlan'(bil1, bil2)
  largerSide  ← IF totalPos(bil1,bil2) <= totalNeg(bil1,bil2) THEN "neg" ELSE "pos"
  FOR ALL step IN plan.steps WHERE step.type = "decompose" DO
    ASSERT step.side = largerSide
  END FOR
END FOR

// Property 2.B: Preservation — input tanpa bug tetap identik
FOR ALL (bil1, bil2) WHERE NOT isBugCondition_side(bil1, bil2) DO
  ASSERT buildBattlePlan(bil1, bil2).steps = buildBattlePlan'(bil1, bil2).steps
END FOR
```

---

### 3. Chain Decompose Bertahap (Terendah ke Atas)

**User Story:** Sebagai pengguna simulasi, saya ingin chain decompose dilakukan secara bertahap
dari tier terdekat ke atas, agar animasi mudah dipahami secara pedagogis.

#### Acceptance Criteria

3.1 WHEN `highestAvailableAbove(avail, minTier)` dipanggil THEN the system SHALL mengembalikan
    tier *terendah* di atas `minTier` yang count-nya > 0 (bukan tertinggi), sehingga chain
    decompose berjalan dari tier terdekat

3.2 WHEN Antibody membutuhkan chip Satuan dan hanya punya chip Ribuan (`{1000:N}`) THEN the
    system SHALL menghasilkan urutan `decompose pos-1000 → decompose pos-100 → decompose pos-10`
    sebelum pair, bukan langsung `decompose pos-1000` ke Satuan dalam satu lompatan

3.3 WHEN `buildBattlePlan(10, -1)` dipanggil (`posAvail:{10:1}`, need=1 di tier 1) THEN the
    system SHALL menghasilkan `[decompose pos-10, pair ×1]`; `totalPairs=1`

3.4 WHEN `buildBattlePlan(100, -1)` dipanggil (chain decompose dua tingkat) THEN the system
    SHALL menghasilkan `[decompose pos-100, decompose pos-10, pair ×1]`; `totalPairs=1`

3.5 WHEN `buildBattlePlan(4002, -1587)` dipanggil (`largerAvail` dari 4002 = `{1000:4,1:2}`,
    need tier-1=7) THEN the system SHALL menghasilkan chain decompose bertahap untuk tier Satuan:
    `decompose pos-1000 → decompose pos-100 → decompose pos-10 → pair ×7`, dilanjutkan Puluhan,
    Ratusan, dan Ribuan; `totalPairs=21`

#### Correctness Properties

```pascal
// Bug Condition C_chain(X): chain decompose lompat tier (tidak bertahap)
FUNCTION isBugCondition_chain(X)
  INPUT: X = (bil1: integer, bil2: integer)
  OUTPUT: boolean
  plan ← buildBattlePlan(X.bil1, X.bil2)
  // Bug terpicu jika dua decompose steps berturutan pada sisi yang sama
  // dengan rasio tier > 10 (berarti lompat lebih dari satu level)
  FOR i ← 0 TO plan.steps.length - 2 DO
    s1 ← plan.steps[i]; s2 ← plan.steps[i+1]
    IF s1.type = "decompose" AND s2.type = "decompose" AND s1.side = s2.side THEN
      IF s1.tier / s2.tier > 10 THEN RETURN true
    END IF
  END FOR
  RETURN false
END FUNCTION

// Property 3.A: Fix Checking — consecutive decompose steps berurutan per faktor 10
FOR ALL (bil1, bil2) WHERE totalPos > 0 AND totalNeg > 0 DO
  plan ← buildBattlePlan'(bil1, bil2)
  FOR i ← 0 TO plan.steps.length - 2 DO
    s1 ← plan.steps[i]; s2 ← plan.steps[i+1]
    IF s1.type = "decompose" AND s2.type = "decompose" AND s1.side = s2.side THEN
      ASSERT s1.tier / s2.tier = 10  // setiap langkah hanya satu level
    END IF
  END FOR
END FOR

// Property 3.B: Preservation
FOR ALL (bil1, bil2) WHERE NOT isBugCondition_chain(bil1, bil2) DO
  ASSERT buildBattlePlan(bil1, bil2).steps = buildBattlePlan'(bil1, bil2).steps
END FOR
```

---

### 4. Tidak Ada Regrouping yang Tidak Diperlukan

**User Story:** Sebagai pengguna simulasi, saya ingin animasi tidak menampilkan langkah decompose
yang tidak perlu, agar urutan animasi tetap ringkas dan sesuai prosedur pengurangan bersusun.

#### Acceptance Criteria

4.1 WHEN `largerAvail[T] ≥ need` untuk tier T yang sedang diproses THEN the system SHALL
    menghasilkan langkah pair langsung tanpa langkah decompose di tier tersebut

4.2 WHEN `buildBattlePlan(43, -28)` dipanggil (`totalPos=43, totalNeg=28; smallerSide="neg"`,
    `anchorGroups` dari 28 ascending = `[{tier:1,count:8},{tier:10,count:2}]`, `largerAvail`
    dari 43 = `{10:4,1:3}`) THEN the system SHALL menghasilkan:
    `[decompose pos-10, pair ×1 ×8, pair ×10 ×2]` — Satuan butuh decompose karena
    `largerAvail[1]=3 < 8`, Puluhan tidak butuh decompose karena `largerAvail[10]=3 ≥ 2`;
    `totalPairs=10`

4.3 WHEN `buildBattlePlan(10, -10)` dipanggil (tier langsung cocok) THEN the system SHALL
    menghasilkan `[pair ×10]` tanpa decompose; `totalPairs=1`

4.4 WHEN `buildBattlePlan(11, -1)` dipanggil (`largerAvail` dari 11 = `{10:1,1:1}`,
    `largerAvail[1]=1 ≥ need=1`) THEN the system SHALL menghasilkan `[pair ×1]` tanpa decompose

4.5 WHEN `buildBattlePlan(-11, 1)` dipanggil (`largerAvail` dari 11 = `{10:1,1:1}`,
    `largerAvail[1]=1 ≥ need=1`) THEN the system SHALL menghasilkan `[pair ×1]` tanpa decompose

#### Correctness Properties

```pascal
// Bug Condition C_excess(X): decompose terjadi padahal largerAvail[T] >= need
FUNCTION isBugCondition_excess(X)
  INPUT: X = (bil1: integer, bil2: integer)
  OUTPUT: boolean
  // Simulasikan eksekusi — jika sebelum langkah pair di tier T ada decompose di tier T
  // padahal avail sudah cukup sebelum decompose itu, maka bug ada
  plan        ← buildBattlePlan(X.bil1, X.bil2)
  largerAvail ← initialLargerAvail(X)
  FOR each step IN plan.steps DO
    IF step.type = "decompose" THEN
      targetTier ← step.tier / 10   // tier hasil decompose
      IF largerAvail[targetTier] >= pendingNeedFor(targetTier) THEN
        RETURN true  // decompose tidak perlu
      END IF
      applyDecompose(largerAvail, step.tier)
    END IF
  END FOR
  RETURN false
END FUNCTION

// Property 4.A: Fix Checking — tidak ada decompose berlebihan
FOR ALL (bil1, bil2) WHERE totalPos > 0 AND totalNeg > 0 DO
  plan        ← buildBattlePlan'(bil1, bil2)
  largerAvail ← initialLargerAvail(bil1, bil2)
  FOR each (tier T, need N) IN anchorGroups(bil1, bil2) DO
    decomposesBeforeTier ← countDecomposesAtOrAboveTierBeforePair(plan, T)
    IF largerAvailAtStart[T] >= N THEN
      ASSERT decomposesBeforeTier = 0
    END IF
  END FOR
END FOR

// Property 4.B: Preservation — input yang sudah optimal tetap sama
FOR ALL (bil1, bil2) WHERE NOT isBugCondition_excess(bil1, bil2) DO
  ASSERT buildBattlePlan(bil1, bil2).steps = buildBattlePlan'(bil1, bil2).steps
END FOR
```

---

### 5. Kompatibilitas Mundur dan Invariant Pure Function

**User Story:** Sebagai pengembang, saya ingin `buildBattlePlan` tetap pure function dan
kompatibel dengan `buildTierGroups`, agar semua konsumen yang ada tidak perlu diubah.

#### Acceptance Criteria

5.1 WHEN `buildBattlePlan(bil1, bil2)` dipanggil dua kali dengan input yang sama THEN the system
    SHALL CONTINUE TO menghasilkan objek yang identik secara struktural (pure function,
    deterministik, tanpa side effect)

5.2 WHEN pasangan berlawanan tanda diproses THEN the system SHALL CONTINUE TO menghasilkan jumlah
    langkah bertipe `"pair"` yang tepat sama dengan `totalPairs` yang dilaporkan dalam plan

5.3 WHEN pasangan berlawanan tanda diproses THEN the system SHALL CONTINUE TO menghasilkan nilai
    `totalPairs` yang sama dengan
    `buildTierGroups(Math.min(totalPos, totalNeg)).reduce((s,g) => s+g.count, 0)`

5.4 WHEN `buildBattlePlan` dipanggil dengan kedua input bertanda sama atau salah satu 0 THEN
    the system SHALL CONTINUE TO menghasilkan `{ steps: [], totalPairs: 0 }`

5.5 WHEN `useSubtractionOrchestrator` menerima `bil1` dan `bil2` kemudian memanggil
    `handleSubtract` THEN the system SHALL CONTINUE TO mengonversi `bil2` menjadi
    `bil2_converted = -bil2` sebelum diteruskan ke `buildBattlePlan` — konversi ini sudah benar,
    tidak boleh diubah

5.6 WHEN modul penjumlahan memanggil `buildBattlePlan(bil1, bil2)` THEN the system SHALL
    CONTINUE TO meneruskan `bil1` dan `bil2` raw tanpa konversi apapun di
    `useAnimationOrchestrator`

#### Correctness Properties

```pascal
// Property 5.A: Determinisme (pure function)
FOR ALL (bil1, bil2) DO
  ASSERT buildBattlePlan'(bil1, bil2) = buildBattlePlan'(bil1, bil2)  // dua panggilan identik
END FOR

// Property 5.B: totalPairs = jumlah pair steps
FOR ALL (bil1, bil2) WHERE totalPos > 0 AND totalNeg > 0 DO
  plan ← buildBattlePlan'(bil1, bil2)
  ASSERT plan.totalPairs = COUNT(step IN plan.steps WHERE step.type = "pair")
END FOR

// Property 5.C: Kompatibilitas backward dengan buildTierGroups
FOR ALL pos > 0, neg > 0 DO
  plan       ← buildBattlePlan'(pos, -neg)
  legacyCount ← buildTierGroups(min(pos, neg)).reduce((s,g) => s + g.count, 0)
  ASSERT plan.totalPairs = legacyCount
END FOR

// Property 5.D: Input sama-tanda → plan kosong
FOR ALL (a >= 0, b >= 0) DO
  ASSERT buildBattlePlan'(a, b).steps = [] AND buildBattlePlan'(a, b).totalPairs = 0
  ASSERT buildBattlePlan'(-a, -b).steps = [] AND buildBattlePlan'(-a, -b).totalPairs = 0
END FOR

// Property 5.E: Preservation total — F = F' untuk ¬C(X) (input yang tidak memicu bug manapun)
FOR ALL (bil1, bil2) WHERE NOT (isBugCondition_order(bil1,bil2)
                                OR isBugCondition_side(bil1,bil2)
                                OR isBugCondition_chain(bil1,bil2)
                                OR isBugCondition_excess(bil1,bil2)) DO
  ASSERT buildBattlePlan(bil1, bil2) = buildBattlePlan'(bil1, bil2)
END FOR
```

---

### 6. Regression Test Suite — 11 Kasus Wajib

**User Story:** Sebagai pengguna simulasi, saya ingin semua ekspresi matematika yang tercakup
dalam regression test menghasilkan urutan animasi yang benar, agar tidak ada regresi di masa
mendatang.

#### Acceptance Criteria

6.1 WHEN regression test berikut dijalankan THEN the system SHALL menghasilkan hasil akhir yang
    benar untuk semua baris:

    | Ekspresi matematika  | Modul Penjumlahan (bil1, bil2 raw) | Modul Pengurangan (bil1, bil2 operand) | Argumen `buildBattlePlan` |
    |----------------------|------------------------------------|----------------------------------------|---------------------------|
    | `11 - 1 = 10`        | bil1=11, bil2=-1                   | bil1=11, bil2=1 → conv=-1              | `(11, -1)`                |
    | `11 - 2 = 9`         | bil1=11, bil2=-2                   | bil1=11, bil2=2 → conv=-2              | `(11, -2)`                |
    | `15 - 3 = 12`        | bil1=15, bil2=-3                   | bil1=15, bil2=3 → conv=-3              | `(15, -3)`                |
    | `43 - 28 = 15`       | bil1=43, bil2=-28                  | bil1=43, bil2=28 → conv=-28            | `(43, -28)`               |
    | `352 - 178 = 174`    | bil1=352, bil2=-178                | bil1=352, bil2=178 → conv=-178         | `(352, -178)`             |
    | `4002 - 1587 = 2415` | bil1=4002, bil2=-1587              | bil1=4002, bil2=1587 → conv=-1587      | `(4002, -1587)`           |
    | `-11 + 1 = -10`      | bil1=-11, bil2=1                   | bil1=-11, bil2=-1 → conv=1             | `(-11, 1)`                |
    | `-11 + 2 = -9`       | bil1=-11, bil2=2                   | bil1=-11, bil2=-2 → conv=2             | `(-11, 2)`                |
    | `11 + (-1) = 10`     | identik dengan `11 - 1`            | bil1=11, bil2=1 → conv=-1              | `(11, -1)`                |
    | `11 + (-2) = 9`      | identik dengan `11 - 2`            | bil1=11, bil2=2 → conv=-2              | `(11, -2)`                |
    | `1 - 10 = -9`        | bil1=1, bil2=-10                   | bil1=1, bil2=10 → conv=-10             | `(1, -10)`                |

6.2 WHEN `buildBattlePlan(11, -2)` dipanggil THEN the system SHALL menghasilkan `totalPairs=2`
    dan `steps = [decompose pos-10, pair ×1, pair ×1]`

6.3 WHEN `buildBattlePlan(-11, 1)` dipanggil THEN the system SHALL menghasilkan `totalPairs=1`
    dan `steps = [pair ×1]` tanpa langkah decompose

6.4 WHEN `buildBattlePlan(1, -10)` dipanggil THEN the system SHALL menghasilkan `totalPairs=1`
    dan `steps = [decompose neg-10, pair ×1]` — Kuman yang decay, bukan Antibody

6.5 WHEN `buildBattlePlan(43, -28)` dipanggil THEN the system SHALL menghasilkan `totalPairs=10`
    dan steps dengan satu decompose pos-10, delapan pair ×1, dua pair ×10

6.6 WHEN `buildBattlePlan(352, -178)` dipanggil THEN the system SHALL menghasilkan `totalPairs=16`
    dan steps dengan tier Satuan selesai sebelum Puluhan, Puluhan sebelum Ratusan

6.7 WHEN `buildBattlePlan(4002, -1587)` dipanggil THEN the system SHALL menghasilkan
    `totalPairs=21` dan steps dengan chain decompose bertahap:
    `decompose pos-1000 → decompose pos-100 → decompose pos-10` sebelum pair tier Satuan

#### Correctness Properties

```pascal
// Property 6.A: Semua kasus regression menghasilkan totalPairs yang benar
FOR EACH (bil1, bil2, expectedPairs) IN regressionTable DO
  plan ← buildBattlePlan'(bil1, bil2)
  ASSERT plan.totalPairs = expectedPairs
END FOR

// Di mana regressionTable = [
//   (11, -1, 1), (11, -2, 2), (15, -3, 3), (43, -28, 10),
//   (352, -178, 16), (4002, -1587, 21),
//   (-11, 1, 1), (-11, 2, 2), (1, -10, 1)
// ]

// Property 6.B: Semua kasus regression deterministik (replay menghasilkan hasil sama)
FOR EACH (bil1, bil2) IN regressionInputs DO
  ASSERT buildBattlePlan'(bil1, bil2) = buildBattlePlan'(bil1, bil2)
END FOR
```

---

### 8. Urutan Visual Chip Column (Satuan di Atas)

**User Story:** Sebagai pengguna simulasi, saya ingin chip yang sedang aktif bertarung
tampil di bagian paling atas kolom karakter, agar urutan visual chip konsisten dengan
urutan pertarungan (Satuan pertama, Ribuan terakhir).

#### Acceptance Criteria

8.1 WHEN chip column dirender THEN the system SHALL menampilkan chip dalam urutan
    Satuan (atas) → Puluhan → Ratusan → Ribuan (bawah), sehingga tier yang
    sedang aktif secara logika selalu berada di posisi paling atas kolom

8.2 WHEN tier Satuan sedang aktif (tierIdx menunjuk ke tier 1) THEN the system SHALL
    menampilkan grup chip Satuan di posisi paling atas CharacterColumn pada kedua sisi

8.3 WHEN tier Puluhan sedang aktif THEN the system SHALL menampilkan grup chip Satuan
    (yang sudah ternetralisasi) di atas grup chip Puluhan yang sedang aktif

8.4 WHEN CharacterColumn merender chip untuk nilai apapun THEN the system SHALL
    menggunakan urutan render [1, 10, 100, 1000] (ascending) bukan [1000, 100, 10, 1]
    (descending) untuk property `allTiersOrder`

8.5 WHEN urutan render dibalik THEN the system SHALL CONTINUE TO menampilkan semua
    chip yang sama (jumlah, warna, tipe, opacity) — hanya urutan vertikal yang berubah

#### Correctness Properties

```pascal
// Property 8.A: Fix Checking
FOR EACH render CharacterColumn(tierGroups, tierIdx) DO
  rows ← rendered tier groups in DOM order
  ASSERT rows[0].tier = 1 OR rows[0] is lowest tier present
  IF tierIdx = 0 (tier Satuan aktif) THEN
    ASSERT rows[0] is the active tier group
  END IF
END FOR

// Property 8.B: Preservation
ASSERT total chip count per tier unchanged
ASSERT chip styling (color, opacity, animation) unchanged
ASSERT allTiersOrder change does not affect pairedByTier or remainByTier computation
```

---

### 7. Perilaku Orchestrator Tidak Berubah

**User Story:** Sebagai pengguna simulasi, saya ingin layer orchestrator (animMode, handleReset,
finishAll, dll.) tetap berfungsi persis sama setelah fix, agar tidak ada regresi UI.

#### Acceptance Criteria

7.1 WHEN `animMode = "auto"` THEN the system SHALL CONTINUE TO maju ke langkah berikutnya secara
    otomatis (tanpa klik) setelah setiap langkah decompose maupun pair selesai

7.2 WHEN `animMode = "click"` THEN the system SHALL CONTINUE TO menunggu klik pengguna
    (`waitingForClick = true`) sebelum maju ke langkah berikutnya

7.3 WHEN semua langkah selesai THEN the system SHALL CONTINUE TO memanggil `finishAll()` yang
    mentransisikan `vizPhase` ke `"center"` lalu ke `"done"` sesuai timing yang ada

7.4 WHEN `handleReset` dipanggil THEN the system SHALL CONTINUE TO mereset semua state animasi
    dan input ke nilai awal, termasuk membatalkan semua timeout yang sedang berjalan

7.5 WHEN `useSubtractionOrchestrator.handleSubtract` dipanggil THEN the system SHALL CONTINUE TO
    menampilkan fase `"transform"` sebelum fase `"battle"` ketika `bil2 ≠ 0`, sesuai timing
    yang ada

