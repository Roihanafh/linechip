# Bugfix Requirements Document

## Introduction

Flow orchestrasi animasi Model-Chip menghasilkan urutan langkah yang tidak konsisten dengan
semantik matematika yang benar. Bug berada di **`buildBattlePlan`** sendiri — bukan di lapisan
konversi manapun — sehingga berdampak pada **dua modul** yang berbagi engine yang sama:

- **Modul Penjumlahan** (`/model-chip` → `useAnimationOrchestrator` langsung): input pengguna
  `bil1, bil2` adalah nilai chip *raw* yang langsung diteruskan ke `buildBattlePlan(bil1, bil2)`.
- **Modul Pengurangan** (`/model-chip/pengurangan` → `useSubtractionOrchestrator`): input
  pengguna `bil1, bil2` di mana `bil2` adalah pengurang; lapisan konversi `bil2_converted = -bil2`
  sudah benar dan menghasilkan argumen final yang identik secara semantik sebelum memanggil
  `buildBattlePlan(bil1, bil2_converted)`.

Karena argumen final ke `buildBattlePlan` selalu sama terlepas dari modul mana yang memanggil,
setiap bug di `buildBattlePlan` muncul identik di kedua modul untuk input matematika yang
ekuivalen.

Tiga masalah utama di `buildBattlePlan`:

1. **Sisi yang melakukan decay salah** — decay selalu dipaksakan ke sisi pos (Antibody / Bilangan 1),
   padahal seharusnya decay hanya terjadi pada sisi yang *kekurangan chip* di nilai tempat aktif.
2. **Regrouping dipicu padahal tidak perlu** — ketika kedua sisi sudah memiliki chip di nilai tempat
   aktif dan bisa langsung dinetralisasi, tidak boleh ada langkah decompose sama sekali.
3. **Urutan nilai tempat salah** — netralisasi harus dimulai dari nilai tempat terkecil
   (Satuan → Puluhan → Ratusan → Ribuan), bukan dari yang terbesar.

Dampak konkret mencakup seluruh regression test:
`11−2`, `43−28`, `352−178`, `4002−1587`, `-11+1`, `-11+2`, `1−10`, dan lainnya
menghasilkan urutan animasi yang salah secara pedagogis atau hasil akhir yang keliru —
baik diakses melalui modul penjumlahan maupun pengurangan.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `buildBattlePlan(bil1, bil2_converted)` dipanggil (dari modul manapun) dan sisi *pos*
    adalah sisi yang lebih besar THEN the system selalu memilih sisi pos sebagai `largerSide`
    (yang didekomposes), sehingga Antibody melakukan decay bahkan ketika seharusnya Kuman
    yang melakukan decay

1.2 WHEN `buildBattlePlan(1, -10)` dipanggil — terjadi di modul penjumlahan saat `bil1=1,
    bil2=-10`, maupun di modul pengurangan saat `bil1=1, bil2=10 → bil2_converted=-10`
    (ekspresi `1 − 10 = −9`) — THEN the system menghasilkan urutan yang salah: memaksa
    Antibody decay padahal Antibody tidak memiliki chip Puluhan, sehingga hasil netralisasi
    tidak mencerminkan matematika `1 − 10 = −9`

1.3 WHEN `buildBattlePlan(-11, 1)` dipanggil — terjadi di modul penjumlahan saat `bil1=-11,
    bil2=1`, maupun di modul pengurangan saat `bil1=-11, bil2=-1 → bil2_converted=1`
    (ekspresi `-11 − (-1) = -10`) — (`totalPos=1, totalNeg=11`; Satuan: 1 Antibody vs 1 Kuman
    → langsung netralisasi) THEN the system menghasilkan langkah decompose Kuman-Puluhan
    yang tidak diperlukan, padahal kedua sisi sudah punya chip Satuan dan bisa netralisasi
    langsung tanpa decay

1.4 WHEN `buildBattlePlan(11, -2)` dipanggil — terjadi di modul penjumlahan saat `bil1=11,
    bil2=-2`, maupun di modul pengurangan saat `bil1=11, bil2=2 → bil2_converted=-2`
    (ekspresi `11 − 2 = 9`) — (`totalPos=11, totalNeg=2`; `largerAvail` dari 11 = `{10:1, 1:1}`;
    Antibody sudah punya 1 chip Satuan, butuh 2) THEN the system tidak melakukan decompose
    Antibody-Puluhan padahal Antibody perlu meminjam dari Puluhan untuk menyediakan 1 chip
    Satuan tambahan, sehingga netralisasi Satuan hanya menghasilkan 1 pair, bukan 2

1.5 WHEN `buildBattlePlan` dipanggil dengan pasangan berlawanan tanda dari modul manapun
    THEN the system memulai urutan dari nilai tempat *terbesar* alih-alih terkecil, menghasilkan
    animasi yang tidak sesuai dengan cara pengajaran nilai tempat (satuan lebih dahulu)

1.6 WHEN `buildBattlePlan(43, -28)` dipanggil — terjadi di modul penjumlahan saat `bil1=43,
    bil2=-28`, maupun di modul pengurangan saat `bil1=43, bil2=28 → bil2_converted=-28`
    (ekspresi `43 − 28 = 15`) — (`totalPos=43, totalNeg=28`; anchorGroups dari 28 ascending =
    `[{tier:1,count:8},{tier:10,count:2}]`) THEN the system menghasilkan urutan decompose/pair
    yang tidak mencerminkan prosedur pengurangan bersusun: Satuan bertarung sebelum Puluhan,
    dengan Antibody meminjam dari Puluhan jika perlu

1.7 WHEN `buildBattlePlan(352, -178)` dipanggil — terjadi di modul penjumlahan saat
    `bil1=352, bil2=-178`, maupun di modul pengurangan saat `bil1=352, bil2=178 →
    bil2_converted=-178` (ekspresi `352 − 178 = 174`) — THEN the system menghasilkan terlalu
    banyak langkah decompose atau urutan yang tidak ascending (Satuan → Puluhan → Ratusan),
    sehingga animasi tidak mencerminkan prosedur pengurangan bersusun tiga digit

1.8 WHEN `buildBattlePlan(4002, -1587)` dipanggil — terjadi di modul penjumlahan saat
    `bil1=4002, bil2=-1587`, maupun di modul pengurangan saat `bil1=4002, bil2=1587 →
    bil2_converted=-1587` (ekspresi `4002 − 1587 = 2415`) — (Antibody 4002 vs Kuman 1587;
    Satuan: Antibody 2 vs Kuman 7 → Antibody perlu decay dari Ribuan secara berantai karena
    Puluhan dan Ratusan bernilai 0) THEN the system tidak menghasilkan chain decompose yang
    benar: `decompose pos-1000 → decompose pos-100 → decompose pos-10 → pair ×7` untuk
    tier Satuan, dilanjutkan tier Puluhan, Ratusan, dan Ribuan

1.9 WHEN `highestAvailableAbove(avail, minTier)` dipanggil THEN the system mengembalikan tier
    *tertinggi* yang tersedia, padahal seharusnya mengembalikan tier *terendah* di atas
    `minTier` agar chain decompose dilakukan secara bertahap (misal: decompose 10→1
    sebelum decompose 100→10), menghasilkan animasi yang lebih mudah dipahami secara pedagogis

1.10 WHEN modul penjumlahan memanggil `buildBattlePlan(bil1, bil2)` dengan `bil1` dan `bil2`
     adalah nilai chip raw (misalnya `bil1=-11, bil2=2` untuk ekspresi `-11 + 2 = -9`) THEN
     the system menghasilkan urutan langkah yang salah karena bug 1.1–1.9 berlaku identik
     pada input raw tanpa konversi

1.11 WHEN modul penjumlahan memanggil `buildBattlePlan(1, -10)` (ekspresi `1 + (-10) = -9`,
     input `bil1=1, bil2=-10`) THEN the system menghasilkan urutan decay yang sama salahnya
     seperti yang didescribe di 1.2, karena argumen final ke `buildBattlePlan` identik

### Expected Behavior (Correct)

*Catatan: Semua expected behavior berikut berlaku untuk **kedua modul** (penjumlahan dan
pengurangan), karena keduanya akhirnya memanggil `buildBattlePlan` dengan argumen yang sama
untuk ekspresi matematika yang ekuivalen.*

2.1 WHEN `buildBattlePlan(bil1, bil2)` dipanggil dengan pasangan berlawanan tanda THEN the
    system SHALL menentukan `smallerSide` dari sisi yang nilainya lebih kecil (`totalPos ≤ totalNeg`
    → `smallerSide = "pos"`), dan `largerSide` adalah sisi yang lebih besar — decay/decompose
    hanya terjadi pada `largerSide` untuk menyediakan chip di nilai tempat yang dibutuhkan

2.2 WHEN `buildBattlePlan(1, -10)` dipanggil (totalPos=1, totalNeg=10; `smallerSide="pos"`,
    anchorGroups dari 1 ascending = `[{tier:1,count:1}]`; `largerAvail` dari 10 = `{10:1}`) THEN
    the system SHALL menghasilkan: `[decompose neg-10, pair ×1]`, `totalPairs=1` — Kuman
    yang melakukan decay, bukan Antibody, karena Kuman adalah sisi besar yang perlu menyediakan
    chip Satuan

2.3 WHEN `buildBattlePlan(-11, 1)` dipanggil (totalPos=1, totalNeg=11; `smallerSide="pos"`,
    anchorGroups dari 1 = `[{tier:1,count:1}]`; `largerAvail` dari 11 = `{10:1,1:1}`) THEN
    the system SHALL menghasilkan: `[pair ×1]`, `totalPairs=1` — tidak ada decompose
    karena `largerAvail[1]=1 ≥ need=1`, netralisasi langsung

2.4 WHEN `buildBattlePlan(11, -2)` dipanggil (totalPos=11, totalNeg=2; `smallerSide="neg"`,
    anchorGroups dari 2 ascending = `[{tier:1,count:2}]`; `largerAvail` dari 11 = `{10:1,1:1}`) THEN
    the system SHALL menghasilkan: `[decompose pos-10, pair ×1, pair ×1]`, `totalPairs=2` —
    Antibody-Puluhan decay karena Antibody adalah sisi besar yang kekurangan chip Satuan

2.5 WHEN `buildBattlePlan(43, -28)` dipanggil (totalPos=43, totalNeg=28; `smallerSide="neg"`,
    anchorGroups dari 28 ascending = `[{tier:1,count:8},{tier:10,count:2}]`; `largerAvail` dari 43
    = `{10:4,1:3}`) THEN the system SHALL menghasilkan:
    `[decompose pos-10, pair ×1 ×8, pair ×10 ×2]`, `totalPairs=10`
    — Satuan: `largerAvail[1]=3 < need=8` → decompose pos-10 → `{10:3,1:13}` → pair 8×1;
    Puluhan: `largerAvail[10]=3 ≥ need=2` → pair 2×10 tanpa decompose

2.6 WHEN `buildBattlePlan(352, -178)` dipanggil (totalPos=352, totalNeg=178; `smallerSide="neg"`,
    anchorGroups dari 178 ascending = `[{tier:1,count:8},{tier:10,count:7},{tier:100,count:1}]`) THEN
    the system SHALL menghasilkan urutan yang benar dengan decompose hanya ketika dibutuhkan,
    dimulai dari tier Satuan, diikuti Puluhan, lalu Ratusan — `totalPairs=16`

2.7 WHEN `buildBattlePlan(4002, -1587)` dipanggil (totalPos=4002, totalNeg=1587; `smallerSide="neg"`,
    anchorGroups dari 1587 ascending = `[{tier:1,count:7},{tier:10,count:8},{tier:100,count:5},{tier:1000,count:1}]`) THEN
    the system SHALL menghasilkan chain decompose yang benar untuk tier Satuan:
    `decompose pos-1000 → decompose pos-100 → decompose pos-10 → pair ×7` karena `largerAvail`
    dari 4002 = `{1000:4,1:2}` hanya punya 2 chip Satuan untuk butuh 7 — `totalPairs=21`

2.8 WHEN `highestAvailableAbove(avail, minTier)` dipanggil THEN the system SHALL mengembalikan
    tier *terendah* di atas `minTier` yang count-nya > 0 (bukan tertinggi), agar chain decompose
    berjalan bertahap dari tier terdekat ke atas

2.9 WHEN `buildBattlePlan(11, -1)` dipanggil (totalPos=11, totalNeg=1; `smallerSide="neg"`,
    anchorGroups dari 1 = `[{tier:1,count:1}]`; `largerAvail` dari 11 = `{10:1,1:1}`) THEN
    the system SHALL menghasilkan: `[pair ×1]`, `totalPairs=1` — tidak ada decompose

2.10 WHEN `buildBattlePlan(10, -10)` dipanggil THEN the system SHALL menghasilkan: `[pair ×10]`,
     `totalPairs=1` — tier langsung cocok, tidak ada decompose

2.11 WHEN pasangan berlawanan tanda diproses THEN the system SHALL menghasilkan urutan langkah
     dari tier terkecil ke terbesar (Satuan → Puluhan → Ratusan → Ribuan), sehingga unit
     terkecil selalu netralisasi sebelum unit yang lebih besar

2.12 WHEN `useSubtractionOrchestrator` mengonversi `bil2_converted = -bil2` sebelum meneruskan
     ke `buildBattlePlan` THEN the system SHALL mempertahankan lapisan konversi ini sebagaimana
     adanya — lapisan konversi sudah benar dan bukan bagian dari bug yang perlu diperbaiki;
     perbaikan hanya dilakukan di dalam `buildBattlePlan`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN kedua input bertanda sama atau salah satu adalah 0 THEN the system SHALL CONTINUE TO
    menghasilkan `BattlePlan` dengan `steps = []` dan `totalPairs = 0`

3.2 WHEN pasangan berlawanan tanda diproses THEN the system SHALL CONTINUE TO menghasilkan
    jumlah langkah bertipe `"pair"` yang tepat sama dengan nilai chip-count terkecil
    (`Math.min(totalPos, totalNeg)` dihitung sebagai jumlah chip, bukan jumlah tier)

3.3 WHEN `buildBattlePlan(bil1, bil2)` dipanggil dua kali dengan input yang sama THEN the system
    SHALL CONTINUE TO menghasilkan objek yang identik secara struktural (pure function,
    deterministik, tanpa side effect)

3.4 WHEN pasangan berlawanan tanda diproses THEN the system SHALL CONTINUE TO menghasilkan nilai
    `totalPairs` yang sama dengan
    `buildTierGroups(Math.min(totalPos, totalNeg)).reduce((s,g) => s+g.count, 0)`
    (kompatibilitas mundur dengan `tierUtils`)

3.5 WHEN kedua sisi sudah memiliki chip di nilai tempat yang sama THEN the system SHALL CONTINUE TO
    menghasilkan langkah pair tanpa langkah decompose di nilai tempat tersebut

3.6 WHEN `useSubtractionOrchestrator` menerima `bil1` dan `bil2` kemudian memanggil
    `handleSubtract` THEN the system SHALL CONTINUE TO mengonversi `bil2` menjadi
    `bil2_converted = -bil2` sebelum diteruskan ke `buildBattlePlan` — konversi ini sudah
    benar, tidak boleh diubah, dan nilai konversi tetap ditampilkan di `TransformPanel`

3.7 WHEN `animMode = "auto"` THEN the system SHALL CONTINUE TO maju ke langkah berikutnya
    secara otomatis (tanpa klik) setelah setiap langkah decompose maupun pair selesai

3.8 WHEN `animMode = "click"` THEN the system SHALL CONTINUE TO menunggu klik pengguna
    (`waitingForClick = true`) sebelum maju ke langkah berikutnya

3.9 WHEN semua langkah selesai THEN the system SHALL CONTINUE TO memanggil `finishAll()`
    yang mentransisikan `vizPhase` ke `"center"` lalu ke `"done"` sesuai timing yang ada

3.10 WHEN `handleReset` dipanggil THEN the system SHALL CONTINUE TO mereset semua state animasi
     dan input ke nilai awal, termasuk membatalkan semua timeout yang sedang berjalan

3.11 WHEN regression test berikut dijalankan THEN the system SHALL CONTINUE TO menghasilkan hasil
     akhir yang benar:

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

3.12 WHEN modul penjumlahan memanggil `buildBattlePlan` THEN the system SHALL CONTINUE TO
     meneruskan `bil1` dan `bil2` raw tanpa konversi apapun — tidak boleh ada transformasi
     nilai input di `useAnimationOrchestrator` sebelum diteruskan ke `buildBattlePlan`
