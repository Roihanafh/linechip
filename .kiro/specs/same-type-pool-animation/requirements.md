# Requirements Document

## Introduction

Fitur **same-type-pool-animation** menambahkan jalur animasi "pool" (gabungan kolam karakter) ke halaman materi **Penjumlahan** (`app/model-chip/page.tsx`) dan halaman materi **Pengurangan** (`app/model-chip/pengurangan/page.tsx`).

Saat ini, ketika dua bilangan memiliki *tipe sama* (keduanya positif = Antibodi, atau keduanya negatif = Kuman), animasi yang muncul adalah `AllianceStage` yang hanya menampilkan **satu** karakter dominan per sisi — bukan jumlah chip sesungguhnya. Selain itu, chip dari kedua bilangan tampil sebagai dua pool terpisah di bawah stage, bukan satu pool gabungan yang mencerminkan nilai total.

Fitur ini memperbaiki dua hal utama:

1. **Full SVG Character Display**: `ArenaPanel` menggantikan blok kolom chip dua-sisi (`ArenaBattle` layout saat ini) dengan satu kolom chip **pool gabungan** yang merender keseluruhan SVG karakter sesuai tier dan jumlah total (`|bil1| + |bil2|`), bukan nilai per bilangan secara terpisah.
2. **Alliance Phase di Pengurangan**: `useSubtractionOrchestrator` dan halaman pengurangan belum mendukung `vizPhase === "alliance"`. Setelah konversi (`bil2_converted = -bil2_original`), jika hasilnya adalah kasus tipe-sama (misalnya `5 - (−3)` → `5 + 3`; atau `−4 − 3` → `−4 + (−3)`), alur animasi harus masuk ke phase `"alliance"` (bukan skip ke `"done"` atau ke `"battle"`).

Pengurangan memanfaatkan kontrak konversi yang sudah ada: `bil2_converted = -bil2_original`. Semua keputusan "apakah kasus tipe-sama?" dibuat dari `bil1` dan `bil2_converted`.

## Glossary

- **Orchestrator**: Hook `useAnimationOrchestrator` (`hooks/model-chip/useAnimationOrchestrator.ts`) yang mengatur lifecycle animasi penjumlahan.
- **SubtractionOrchestrator**: Hook `useSubtractionOrchestrator` (`hooks/model-chip/useSubtractionOrchestrator.ts`) yang mengatur lifecycle animasi pengurangan.
- **InnerOrch**: Instance `useAnimationOrchestrator` yang digunakan secara internal di dalam `useSubtractionOrchestrator` untuk menangani fase battle.
- **VizPhaseSub**: Tipe fase visualisasi pengurangan di `lib/model-chip/subtractionTypes.ts`. Saat ini: `"idle" | "transform" | "battle" | "center" | "done"`.
- **Alliance_Case**: Kondisi di mana `bil1` dan `bil2_converted` (pada pengurangan) atau `bil1` dan `bil2` (pada penjumlahan) keduanya positif atau keduanya negatif, dan tidak ada yang nol — sudah dideteksi oleh fungsi `isAllianceCase` yang sudah ada.
- **Pool_Gabungan**: Tampilan satu kolom chip karakter SVG yang merender total `|bil1| + |bil2|` (atau `|bil1| + |bil2_converted|` pada pengurangan), dikelompokkan per tier.
- **ArenaPanel**: Komponen `components/model-chip/ArenaPanel.tsx` yang memilih sub-komponen arena berdasarkan `vizPhase`.
- **ArenaBattle**: Komponen `components/model-chip/ArenaBattle.tsx` untuk fase battle (netralisasi). Tidak boleh dimodifikasi.
- **AllianceStage**: Komponen animasi `components/game/AllianceStage.tsx` (idle → approach → bounce → settled, ~1350 ms pada speed 1×). Tidak boleh dimodifikasi.
- **CharacterColumn**: Komponen `components/model-chip/CharacterColumn.tsx` yang merender chip SVG per tier. Merupakan building block untuk Pool_Gabungan.
- **AlliancePoolPanel**: Sub-komponen baru di `ArenaPanel.tsx` (atau file terpisah) yang menampilkan animasi `AllianceStage` di atas, Pool_Gabungan di bawah, saat `vizPhase === "alliance"`.
- **Faction**: Jenis karakter — `"ab"` (Antibodi, positif) atau `"ku"` (Kuman/Virus, negatif).
- **handleAllianceDone**: Callback di orchestrator yang dipanggil saat `AllianceStage.onComplete` berakhir, mentransisikan ke `vizPhase === "center"` lalu `"done"`.
- **Timing_Contract**: Kontrak waktu `AllianceStage`: approach 750 ms + bounce→settled 600 ms = total ~1350 ms pada speed 1×.

---

## Requirements

---

### Requirement 1: Ekstensi VizPhaseSub untuk Alliance

**User Story:** Sebagai developer, saya ingin `VizPhaseSub` mencakup fase `"alliance"` sehingga halaman pengurangan bisa menggunakan jalur animasi yang sama seperti halaman penjumlahan untuk kasus tipe-sama.

#### Acceptance Criteria

1. THE `VizPhaseSub` type di `lib/model-chip/subtractionTypes.ts` SHALL diperluas dengan literal `"alliance"`, sehingga tipe menjadi `"idle" | "transform" | "alliance" | "battle" | "center" | "done"`.
2. WHEN TypeScript compiler memproses `useSubtractionOrchestrator`, `useSubtractionState`, halaman pengurangan, dan `ArenaPanel` setelah penambahan `"alliance"`, THE build SHALL menghasilkan nol type error baru.
3. THE `SubtractionSnapshot` interface di `lib/model-chip/subtractionTypes.ts` SHALL tidak diubah strukturnya — hanya `VizPhaseSub` yang berubah.

---

### Requirement 2: Deteksi Alliance Case di Pengurangan

**User Story:** Sebagai siswa, saya ingin melihat animasi persekutuan ketika saya memasukkan dua bilangan yang setelah konversi (pengurangan → penjumlahan) ternyata bertipe sama, sehingga saya memahami bahwa `a − (−b) = a + b` membuat antibodi bertambah bergabung.

#### Acceptance Criteria

1. WHEN `handleSubtract()` dipanggil DAN hasil konversi (`bil1`, `bil2_converted = -bil2`) memenuhi `isAllianceCase(bil1, bil2_converted)` (keduanya positif atau keduanya negatif, tidak ada nol), THE `SubtractionOrchestrator` SHALL menyimpan snapshot `{ bil1, bil2_original: bil2, bil2_converted }` lalu men-set `vizPhase` ke `"alliance"` — setelah fase `"transform"` selesai jika `bil2 !== 0`, atau langsung jika `bil2 === 0`.
2. WHEN `handleSubtract()` dipanggil DAN `bil2 !== 0`, THE `SubtractionOrchestrator` SHALL menjalankan fase `"transform"` terlebih dahulu (menampilkan `TransformPanel`) sebelum beralih ke `"alliance"`, menggunakan delay `Math.round(900 / animSpeed)` ms dan exit animation 400 ms yang sudah ada.
3. WHEN `handleSubtract()` dipanggil DAN `bil2 === 0` DAN `isAllianceCase(bil1, 0)` bernilai `false` (karena nol tidak memenuhi syarat Alliance), THE `SubtractionOrchestrator` SHALL men-set `vizPhase` ke `"done"` langsung tanpa snapshot, sama seperti perilaku sebelumnya.
4. IF `handleSubtract()` dipanggil saat `vizPhase !== "idle"`, THEN THE `SubtractionOrchestrator` SHALL mengabaikan panggilan tanpa mengubah state apapun.
5. WHEN `handleReset()` dipanggil saat `vizPhase === "alliance"` ATAU `vizPhase === "center"` yang dicapai melalui jalur alliance, THE `SubtractionOrchestrator` SHALL membatalkan semua timer aktif via `clearTimeout` dan men-set `vizPhase` ke `"idle"`, membersihkan snapshot.

---

### Requirement 3: Penyelesaian Alliance di Pengurangan

**User Story:** Sebagai siswa, saya ingin panel hasil muncul setelah animasi persekutuan pengurangan selesai, sehingga saya bisa melihat total gabungannya.

#### Acceptance Criteria

1. WHEN `AllianceStage.onComplete` berakhir pada jalur pengurangan, THE `SubtractionOrchestrator` SHALL men-set `vizPhase` ke `"center"` untuk menampilkan kilatan reaksi singkat.
2. WHEN fase center selesai, THE `SubtractionOrchestrator` SHALL men-set `vizPhase` ke `"done"` menggunakan delay yang sudah ada: display delay = `Math.round(2000 / animSpeed)` ms, exit delay = `Math.round(500 / animSpeed)` ms tambahan.
3. THE `SubtractionOrchestrator` SHALL menerapkan multiplier `animSpeed` secara independen pada setiap delay dalam jalur penyelesaian alliance, sama seperti yang dilakukan `handleAllianceDone` di `useAnimationOrchestrator`.
4. IF `AllianceStage` di-unmount sebelum `onComplete` berakhir (misalnya pengguna menekan "Kembali ke Input"), THEN THE `SubtractionOrchestrator` SHALL tidak memanggil `onComplete` setelah unmount dan SHALL tidak menghasilkan warning React "setState on unmounted component".

---

### Requirement 4: Replay Alliance di Pengurangan

**User Story:** Sebagai siswa, saya ingin bisa mengulang animasi persekutuan pengurangan setelah selesai, sehingga saya bisa menontonnya lagi.

#### Acceptance Criteria

1. WHEN `replayAnimation()` dipanggil DAN snapshot yang tersimpan memenuhi `isAllianceCase(snapshot.bil1, snapshot.bil2_converted)`, THE `SubtractionOrchestrator` SHALL men-set `vizPhase` ke `"alliance"` tanpa menjalankan ulang `buildBattlePlan`.
2. WHEN `replayAnimation()` dipanggil untuk kasus alliance di pengurangan DAN `snapshot.bil2_original !== 0`, THE `SubtractionOrchestrator` SHALL menampilkan kembali fase `"transform"` dengan delay otomatis (mode `"auto"`) atau menunggu klik (mode `"click"`) sesuai `animMode` sebelum beralih ke `"alliance"`.
3. IF `replayAnimation()` dipanggil saat tidak ada snapshot, THEN THE `SubtractionOrchestrator` SHALL mengabaikan panggilan tersebut.

---

### Requirement 5: AlliancePoolPanel — Pool Gabungan di ArenaPanel

**User Story:** Sebagai siswa, saya ingin melihat **semua** karakter SVG antibodi/kuman yang terlibat dalam persekutuan di bawah animasi stage, dikelompokkan dalam satu pool gabungan berdasarkan tier, sehingga saya bisa menghitung dan memahami berapa total yang bergabung.

#### Acceptance Criteria

1. WHEN `vizPhase === "alliance"`, THE `ArenaPanel` SHALL merender komponen `AllianceStage` di bagian atas arena card DAN sebuah **Pool_Gabungan** di bagian bawah arena card; kedua elemen ini dirender dalam satu layout vertikal (flex column) dalam area `vizPhase === "alliance"` di `ArenaPanel`.
2. THE `Pool_Gabungan` SHALL menghitung nilai total sebagai `totalValue = Math.abs(snapshot.bil1) + Math.abs(snapshot.bil2)` (menggunakan nilai asli setelah konversi yang tersimpan dalam snapshot) dan merender karakter SVG sesuai tier menggunakan `CharacterColumn` atau `CharacterChips` yang sudah ada.
3. THE `Pool_Gabungan` SHALL merender karakter dari tier tertinggi ke terendah (ribuan → ratusan → puluhan → satuan), menggunakan `Faction` yang sama dengan `faction` pada `AllianceStage`, dengan maksimal 12 karakter per tier (meneruskan `maxPerTier={12}` jika menggunakan `CharacterChips`, atau batas 12 chip yang sudah ada di `CharacterColumn`).
4. THE `Pool_Gabungan` SHALL menampilkan label tier (misalnya "x1000", "x100", "x10", "x1") dan hitungan per tier dalam format yang konsisten dengan tampilan `CharacterColumn` yang sudah ada.
5. WHEN `vizPhase === "alliance"` DAN `phase` `AllianceStage` berada pada fase `"idle"`, THE `Pool_Gabungan` SHALL menampilkan karakter dengan animasi `idle-float` menggunakan offset waktu per-chip (sesuai pola `chipIdleAnim` di `CharacterColumn`).
6. WHEN `vizPhase === "alliance"` DAN `phase` `AllianceStage` berada pada fase `"bounce"` atau `"settled"`, THE `Pool_Gabungan` SHALL menampilkan karakter dalam keadaan statis (tanpa `idle-float`) untuk menghindari gangguan visual selama efek burst.
7. IF `totalValue === 0`, THEN THE `Pool_Gabungan` SHALL tidak merender chip satupun dan SHALL merender pesan `"tidak ada chip"` dengan teks `font-mono text-slate-400 italic text-[9px]`.
8. THE `Pool_Gabungan` SHALL menampilkan header ringkas seperti `"Total: +N"` (faction `"ab"`) atau `"Total: −N"` (faction `"ku"`) di atas kolom chip, menggunakan warna aksen sesuai faction (`text-intblue` untuk `"ab"`, `text-intpink` untuk `"ku"`).

---

### Requirement 6: Integrasi ArenaPanel dengan Alliance di Pengurangan

**User Story:** Sebagai developer, saya ingin `ArenaPanel` dan halaman pengurangan merender `AlliancePoolPanel` dengan benar saat `vizPhase === "alliance"`, sehingga pengalaman visual pengurangan identik dengan penjumlahan untuk kasus yang sama.

#### Acceptance Criteria

1. WHEN `vizPhase === "alliance"` di halaman pengurangan, THE halaman pengurangan SHALL memetakan `arenaPhase` dari `vizPhase` yang diperluas (termasuk `"alliance"`) tanpa memfilternya ke `"idle"`, sehingga `ArenaPanel` menerima `vizPhase === "alliance"`.
2. WHEN `vizPhase === "alliance"` di halaman pengurangan, THE `ArenaPanel` SHALL menerima `onAllianceDone` callback yang diteruskan dari `SubtractionOrchestrator`, bukan callback kosong `() => {}` seperti yang sekarang ada.
3. THE `ArenaPanel` SHALL menampilkan teks header `"🤝 Persekutuan!"` dan status badge `"Bergabung"` saat `vizPhase === "alliance"`, konsisten dengan perilaku yang sudah ada untuk halaman penjumlahan.
4. THE `ArenaPanel` SHALL menampilkan top accent bar berwarna solid biru (untuk faction `"ab"`) atau merah (untuk faction `"ku"`) tanpa animasi `animate-pulse` saat `vizPhase === "alliance"`, konsisten dengan implementasi yang sudah ada.
5. THE cabang `vizPhase === "battle"` dan `vizPhase === "center"` di `ArenaPanel` SHALL tidak diubah dan tetap berfungsi identik seperti sebelumnya di kedua halaman.

---

### Requirement 7: Tampilan AllianceStage Menunjukkan Karakter yang Benar

**User Story:** Sebagai siswa, saya ingin melihat karakter SVG yang sesuai dengan nilai bilangan — bukan hanya satu karakter satuan — saat dua bilangan bergabung di stage animasi, sehingga visualisasi memberikan representasi nilai yang akurat.

#### Acceptance Criteria

1. THE `AllianceStage` SHALL menerima `bil1Value` dan `bil2Value` yang merupakan nilai asli bilangan (bukan `Math.abs`), sehingga fungsi `dominantPlace(Math.abs(bil1Value))` dan `dominantPlace(Math.abs(bil2Value))` menghasilkan tier karakter yang benar sesuai magnitude.
2. WHEN `bil1Value = 11` dan `bil2Value = 19`, THE `AllianceStage` SHALL menampilkan karakter puluhan (`"puluhan"`) di kiri (dominantPlace(11) = "puluhan") dan karakter puluhan di kanan (dominantPlace(19) = "puluhan").
3. WHEN `bil1Value = 1` dan `bil2Value = 999`, THE `AllianceStage` SHALL menampilkan karakter satuan (`"satuan"`) di kiri dan karakter ratusan (`"ratusan"`) di kanan.
4. THE `Pool_Gabungan` di bawah `AllianceStage` SHALL menampilkan dekomposisi tier lengkap dari `totalValue = |bil1Value| + |bil2Value|`, sehingga untuk `bil1Value = 11` dan `bil2Value = 19`: satu chip puluhan (x10) dan satu chip satuan (x1) untuk total 30 ditampilkan sebagai tiga chip puluhan; untuk total yang tidak round, chip per tier sesuai dekomposisi digit.
5. IF `dominantPlace` menghasilkan tier yang tidak tersedia di `CHAR_NAMES[faction]`, THEN THE `AllianceStage` SHALL tetap merender karakter tanpa melempar error, menggunakan karakter satuan sebagai fallback.

---

### Requirement 8: Backward Compatibility dan Integritas Test

**User Story:** Sebagai developer, saya ingin semua perubahan bersifat backward-compatible dan tidak merusak tes yang sudah ada, sehingga fitur baru tidak menimbulkan regresi.

#### Acceptance Criteria

1. THE `AllianceStage` SHALL tidak dimodifikasi sebagai bagian dari fitur ini — semua perubahan pada tampilan pool dan routing alliance untuk pengurangan dilakukan di luar komponen tersebut.
2. THE `ArenaBattle.tsx` SHALL tidak dimodifikasi sebagai bagian dari fitur ini.
3. THE `PairReactionStage.tsx` SHALL tidak dimodifikasi sebagai bagian dari fitur ini.
4. WHEN test suite dijalankan setelah implementasi fitur ini, THE test suite SHALL melaporkan nol kegagalan baru pada file test yang sudah ada (termasuk `AllianceStage.test.ts`, `BattleStage.test.ts`, `AnimationEffects.property.test.tsx`, `InteractionAnimation.reduced-motion.test.ts`).
5. THE halaman penjumlahan (`app/model-chip/page.tsx`) SHALL tetap berfungsi identik untuk kasus battle (tanda berlawanan) dan kasus nol setelah penambahan Pool_Gabungan di branch alliance.
6. THE prop `onAllianceDone` di `ArenaPanel` yang saat ini diteruskan sebagai `() => {}` dari halaman pengurangan SHALL diganti dengan callback yang benar dari `SubtractionOrchestrator`, dan perubahan ini SHALL tidak mempengaruhi rendering halaman penjumlahan yang sudah menggunakan callback yang benar.
7. THE fungsi `isAllianceCase` yang sudah ada di `useAnimationOrchestrator.ts` SHALL digunakan (di-import atau di-copy, tidak didefinisikan ulang) oleh `useSubtractionOrchestrator.ts` — tidak ada duplikasi logika deteksi tipe-sama.

---

### Requirement 9: Aksesibilitas Pool Gabungan

**User Story:** Sebagai pengguna dengan kebutuhan aksesibilitas, saya ingin elemen dekoratif pada pool gabungan tidak mengganggu pembaca layar, sehingga pengalaman aplikasi tetap inklusif.

#### Acceptance Criteria

1. THE `Pool_Gabungan` SHALL menandai container-nya dengan `aria-hidden="true"` karena informasi yang sama tersedia dalam panel hasil (`ResultPanel` / `SubtractionResultPanel`) yang sudah ada.
2. THE `Pool_Gabungan` SHALL menyertakan atribut `data-testid="alliance-pool"` pada elemen container-nya sehingga pengujian otomatis dapat memverifikasi keberadaannya saat `vizPhase === "alliance"`.
3. THE `Pool_Gabungan` SHALL menyertakan atribut `data-total={totalValue}` pada elemen container-nya, dengan nilai berupa string representasi integer total (misalnya `"30"` untuk total 30), sehingga assertion tes dapat memverifikasi nilai total yang dirender.
