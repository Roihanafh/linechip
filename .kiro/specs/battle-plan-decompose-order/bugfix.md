# Bugfix Requirements Document

## Introduction

Fungsi `buildBattlePlan` di `lib/model-chip/battlePlan.ts` menghasilkan terlalu banyak langkah decompose yang tidak diperlukan. Algoritma greedy yang ada membandingkan tier tertinggi kedua sisi secara terus-menerus, sehingga setelah chip tier tinggi luruh dan menghasilkan lebih banyak chip tier bawah daripada yang dibutuhkan, algoritma memaksa chip-chip tier bawah yang "kelebihan" untuk luruh satu per satu tanpa ada pasangan — padahal seharusnya langkah decompose hanya terjadi ketika sisi yang lebih besar benar-benar tidak punya chip tier yang cocok dengan yang dibutuhkan sisi yang lebih kecil.

Dampak konkret: untuk `bil1 = 123, bil2_converted = -24`, animasi menampilkan 10 langkah decompose pos-10 berturut-turut yang tidak perlu, padahal yang dibutuhkan hanya 1.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `buildBattlePlan` dipanggil dengan pasangan di mana salah satu sisi memiliki chip tier tinggi yang luruh menghasilkan lebih banyak chip dari yang dibutuhkan untuk pasangan THEN the system menghasilkan langkah decompose tambahan untuk chip-chip kelebihan yang tidak memiliki pasangan

1.2 WHEN chip pos-100 luruh menjadi 10 chip pos-10 dan hanya 2 chip pos-10 yang diperlukan untuk pair THEN the system menghasilkan 8 langkah decompose pos-10 → pos-1 yang tidak diperlukan, alih-alih berhenti setelah pair 2 chip pos-10

1.3 WHEN sisi besar memiliki chip tier yang lebih tinggi dari semua chip sisi kecil di tier tersebut THEN the system melakukan decompose berulang pada chip-chip kelebihan hasil luruh sebelumnya, menghasilkan urutan langkah yang salah secara pedagogis

1.4 WHEN input `(123, -24)` diproses THEN the system menghasilkan urutan yang tidak sesuai urutan pedagogi ascending (satuan lebih dahulu dari puluhan), serta menghasilkan decompose berlebih: misalnya `[decompose pos-100, pair ×10, pair ×10, decompose pos-10, decompose pos-10, ...(×8 lebih)..., pair ×1, pair ×1, pair ×1, pair ×1]`

### Expected Behavior (Correct)

2.1 WHEN `buildBattlePlan` dipanggil dengan pasangan berlawanan tanda THEN the system SHALL menghasilkan langkah decompose hanya untuk chip-chip yang benar-benar diperlukan untuk memenuhi pasangan di setiap tier, tidak lebih

2.2 WHEN chip pos-100 luruh menjadi 10 chip pos-10 dan hanya 2 chip pos-10 yang diperlukan untuk pair THEN the system SHALL menghasilkan tepat 2 langkah pair ×10 lalu berhenti — chip pos-10 kelebihan tidak diproses lebih lanjut kecuali ada pasangan tier bawah yang membutuhkannya

2.3 WHEN sisi besar perlu luruh untuk menyediakan chip di tier tertentu THEN the system SHALL hanya melakukan decompose sejumlah yang dibutuhkan untuk memenuhi kebutuhan sisi kecil di tier tersebut

2.4 WHEN input `(123, -24)` diproses THEN the system SHALL menghasilkan urutan: `[decompose pos-10, pair ×1, pair ×1, pair ×1, pair ×1, decompose pos-100, pair ×10, pair ×10]` — total 2 decompose dan 6 pair, dengan tier terkecil (satuan) bertarung lebih dahulu

2.5 WHEN input `(10, -1)` diproses THEN the system SHALL menghasilkan: `[decompose pos-10, pair ×1]`

2.6 WHEN input `(100, -10)` diproses THEN the system SHALL menghasilkan: `[decompose pos-100, pair ×10]`

2.7 WHEN input `(10, -10)` diproses (tier match langsung) THEN the system SHALL menghasilkan: `[pair ×10]` — tanpa decompose

2.8 WHEN input `(11, -1)` diproses THEN the system SHALL menghasilkan: `[pair ×1]` — sisi besar sudah punya chip pos-1 ekstra yang langsung bisa dipasangkan, chip pos-10 yang tidak memiliki pasangan cukup diabaikan, tidak perlu decompose

2.9 WHEN input `(100, -1)` diproses THEN the system SHALL menghasilkan: `[decompose pos-100, decompose pos-10, pair ×1]`

2.10 WHEN pasangan berlawanan tanda diproses THEN the system SHALL menghasilkan langkah-langkah yang berurutan dari tier terkecil ke tier terbesar (satuan → puluhan → ratusan → ribuan), sehingga unit terkecil selalu bertarung terlebih dahulu sebelum unit yang lebih besar

### Unchanged Behavior (Regression Prevention)

3.1 WHEN kedua input bertanda sama atau salah satu adalah 0 THEN the system SHALL CONTINUE TO menghasilkan `BattlePlan` dengan `steps = []` dan `totalPairs = 0`

3.2 WHEN pasangan berlawanan tanda diproses THEN the system SHALL CONTINUE TO menghasilkan jumlah langkah bertipe `"pair"` yang sama persis dengan `Math.min(totalPos, totalNeg)` (dihitung sebagai total count chip, bukan total tier groups)

3.3 WHEN `buildBattlePlan(bil1, bil2)` dipanggil dua kali dengan input yang sama THEN the system SHALL CONTINUE TO menghasilkan objek yang identik secara struktural (deterministik, pure function tanpa side effect)

3.4 WHEN pasangan berlawanan tanda diproses THEN the system SHALL CONTINUE TO menghasilkan jumlah langkah pair yang sama dengan `buildTierGroups(Math.min(totalPos, totalNeg)).reduce((s,g) => s + g.count, 0)` (kompatibilitas mundur dengan fungsi lama)

3.5 WHEN pasangan berlawanan tanda di mana kedua sisi sudah memiliki chip di tier yang sama diproses THEN the system SHALL CONTINUE TO menghasilkan langkah pair tanpa langkah decompose yang tidak diperlukan

3.6 WHEN semua property test existing di `__tests__/model-chip/battlePlan.property.test.ts` dijalankan (Property 3, 4, 5, 7) THEN the system SHALL CONTINUE TO lulus semua properti tersebut
