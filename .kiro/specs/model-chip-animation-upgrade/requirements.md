# Requirements Document

## Introduction

Fitur ini meningkatkan kualitas visual dua komponen animasi dalam alur model-chip: `PairReactionStage.tsx` dan `CharacterColumn.tsx`. `PairReactionStage` adalah animasi pertarungan antar karakter berbeda tanda (antibodi vs virus) yang digunakan dalam halaman model-chip. Saat ini animasinya sudah fungsional (approach → impact → recoil → dissolve), tetapi kualitas visual jauh di bawah standar `AllianceStage` yang baru di-upgrade. Peningkatan meliputi: idle hover pop saat fase approach, SparkTrail berbasis `✦`, star particles dengan palet campuran biru+merah, tampilan nama karakter, dan atribut aksesibilitas. Selain itu, chip-chip di `CharacterColumn.tsx` akan mendapat animasi `idle-float` saat fase menunggu. Timing contract `pairCycleDuration()` tidak berubah, sehingga semua tes yang ada tetap lulus.

## Glossary

- **PairReactionStage**: Komponen React di `components/game/PairReactionStage.tsx` yang menampilkan animasi pertarungan satu pasang karakter berbeda tanda.
- **CharacterColumn**: Komponen React di `components/model-chip/CharacterColumn.tsx` yang menampilkan kolom chip karakter dalam UI model-chip.
- **Faction**: Jenis karakter — `"ab"` (antibodi/positif) atau `"ku"` (virus/negatif).
- **PlaceValue**: Nilai tempat karakter — `"satuan"`, `"puluhan"`, `"ratusan"`, atau `"ribuan"`.
- **CHAR_NAMES**: Objek konstanta di `CharacterSVGs.tsx` yang memetakan faction + PlaceValue ke nama karakter (misal: Monoab, Mikrovir).
- **idle-float**: Animasi CSS `idle-float` yang membuat elemen melayang naik-turun lembut.
- **idle-hover-pop**: Animasi CSS `idle-hover-pop` yang membuat karakter sedikit membesar saat di-hover.
- **Star Particle**: Partikel berbentuk bintang (`✦`) yang dihasilkan `useParticles` dengan `star: true`.
- **SparkTrail**: Elemen percik `✦` yang mengikuti karakter selama fase approach, dirender sebagai deretan `<span>` dengan offset linier.
- **Timing_Contract**: Durasi total animasi yang dikembalikan `pairCycleDuration(speed)` — tidak boleh berubah.
- **PairReactionStage_Test**: File `__tests__/game/BattleStage.test.ts` dan test relevan lainnya yang memverifikasi timing dan perilaku `PairReactionStage`.
- **stepPhase**: Prop `StepPhase` pada `CharacterColumn` yang merepresentasikan fase langkah saat ini dalam alur model-chip.
- **Mixed_Palette**: Palet warna campuran biru+merah untuk partikel pertarungan: `["#93c5fd", "#f87171", "#60a5fa", "#fca5a5", "#bfdbfe", "#fecaca"]`.

---

## Requirements

---

### Requirement 1: Idle Hover Pop pada PairReactionStage saat Fase Approach

**User Story:** Sebagai pengguna anak-anak, saya ingin karakter merespons saat saya mengarahkan kursor ke atasnya selama fase approach, sehingga animasi pertarungan terasa lebih interaktif sebelum benturan terjadi.

#### Acceptance Criteria

1. WHILE `PairReactionStage` berada pada phase `"approach"`, THE `PairReactionStage` SHALL mendeteksi hover pada inner-div karakter kiri dan karakter kanan secara terpisah melalui event `onMouseEnter` dan `onMouseLeave`, dengan state hover masing-masing karakter bersifat independen satu sama lain.
2. WHEN pengguna meng-hover karakter kiri pada phase `"approach"`, THE `PairReactionStage` SHALL menerapkan animasi `idle-hover-pop` pada inner-div karakter kiri dan menghentikan animasi `idle-float` pada karakter kiri dalam waktu tidak lebih dari 1 frame render (≤ 16 ms).
3. WHEN pengguna meng-hover karakter kanan pada phase `"approach"`, THE `PairReactionStage` SHALL menerapkan animasi `idle-hover-pop` pada inner-div karakter kanan dan menghentikan animasi `idle-float` pada karakter kanan dalam waktu tidak lebih dari 1 frame render (≤ 16 ms).
4. WHEN pengguna memindahkan kursor keluar dari karakter kiri atau kanan pada phase `"approach"`, THE `PairReactionStage` SHALL memulihkan animasi `idle-float` pada inner-div karakter yang ditinggalkan dalam waktu tidak lebih dari 1 frame render (≤ 16 ms), dengan delay 0 ms untuk karakter kiri dan delay 700 ms untuk karakter kanan.
5. WHEN phase berubah dari `"approach"` ke `"impact"`, THE `PairReactionStage` SHALL mereset state hover kedua karakter menjadi tidak-hover sebelum frame animasi `"impact"` pertama dirender, sehingga event `onMouseEnter` dan `onMouseLeave` tidak mempengaruhi animasi selanjutnya.
6. IF `onMouseEnter` atau `onMouseLeave` terpicu pada karakter saat phase bukan `"approach"`, THEN THE `PairReactionStage` SHALL mengabaikan event tersebut tanpa mengubah state animasi yang sedang berjalan.

---

### Requirement 2: Star Particles dengan Mixed Palette pada PairReactionStage

**User Story:** Sebagai pengguna anak-anak, saya ingin melihat partikel bintang merah dan biru yang meriah saat benturan terjadi, sehingga efek pertarungan terasa dramatis dan berwarna.

#### Acceptance Criteria

1. THE `PairReactionStage` SHALL memanggil `useParticles` dengan konfigurasi `star: true` untuk menghasilkan partikel berbentuk `✦`, dengan jumlah partikel antara 8 hingga 32 buah.
2. THE `PairReactionStage` SHALL mengonfigurasi `useParticles` dengan Mixed_Palette: `["#93c5fd", "#f87171", "#60a5fa", "#fca5a5", "#bfdbfe", "#fecaca"]` — gabungan warna biru (ab) dan merah (ku) — karena pertarungan selalu melibatkan kedua faction.
3. WHEN `PairReactionStage` memasuki phase `"impact"` dan `showFlash` bernilai `true`, THE `PairReactionStage` SHALL merender komponen `Burst` dengan `particles` bertipe star dan komponen `Shockwave` di tengah stage.
4. WHEN durasi burst berakhir setelah phase `"impact"` selesai, THE `PairReactionStage` SHALL menyembunyikan `Burst` dan `Shockwave` dengan mengeset `showFlash` ke `false`, dan komponen tersebut SHALL tidak lagi dirender di DOM.
5. IF `PairReactionStage` memasuki phase `"impact"` dan `useParticles` gagal menghasilkan partikel (mengembalikan array kosong), THEN THE `PairReactionStage` SHALL tetap merender komponen `Shockwave` dan memanggil `onDone` sesuai Timing_Contract tanpa menampilkan `Burst`.

---

### Requirement 3: SparkTrail `✦` pada PairReactionStage saat Fase Approach

**User Story:** Sebagai pengguna anak-anak, saya ingin melihat jejak bintang di belakang setiap karakter saat mereka saling mendekati, sehingga gerakan pendekatan terasa lebih hidup dan dramatis.

#### Acceptance Criteria

1. WHEN `PairReactionStage` berada pada phase `"approach"`, THE `PairReactionStage` SHALL merender 6 partikel `✦` di belakang karakter kiri dan 6 partikel `✦` di belakang karakter kanan sebagai `SparkTrail`.
2. THE `SparkTrail` SHALL memosisikan setiap partikel ke-i (0-indexed) dengan offset horizontal sebesar `i * 12 px` menjauh dari posisi tengah stage: ke kiri untuk karakter kiri (arah berlawanan approach), ke kanan untuk karakter kanan.
3. THE `SparkTrail` SHALL menerapkan kombinasi animasi `particle-fly` dan `popup-rise` pada setiap partikel dengan delay `i * 80 ms` (0-indexed) untuk menciptakan efek berurutan.
4. THE `SparkTrail` SHALL menggunakan warna faction-aware: biru (`#93c5fd`) untuk karakter dengan faction `"ab"`, merah (`#f87171`) untuk karakter dengan faction `"ku"`, dan menerapkan efek `text-shadow` glow dengan warna yang sama.
5. WHEN phase berubah dari `"approach"` ke `"impact"`, THE `PairReactionStage` SHALL berhenti merender komponen `SparkTrail` dalam satu render cycle berikutnya.
6. IF phase adalah selain `"approach"`, THEN THE `PairReactionStage` SHALL tidak merender komponen `SparkTrail` manapun.
7. IF prop `side` pada `SparkTrail` memiliki nilai selain `"left"` atau `"right"`, THEN `SparkTrail` SHALL merender tanpa offset horizontal (offset = 0) dan tidak melempar error.

---

### Requirement 4: Char Name Bar pada PairReactionStage saat Fase Approach

**User Story:** Sebagai pengguna anak-anak, saya ingin melihat nama karakter yang bertarung di bawah stage saat mereka saling mendekati, sehingga saya bisa mengenali karakter yang terlibat dalam pertarungan.

#### Acceptance Criteria

1. WHILE `PairReactionStage` berada pada phase `"approach"`, THE `PairReactionStage` SHALL menampilkan nama karakter kiri menggunakan `CHAR_NAMES[leftFaction][leftType]` dan nama karakter kanan menggunakan `CHAR_NAMES[rightFaction][rightType]` di bagian bawah stage.
2. THE `PairReactionStage` SHALL menampilkan nama karakter kiri dengan warna teks biru (`"ab"`) atau merah (`"ku"`) sesuai `leftFaction`, dan nama karakter kanan dengan warna teks sesuai `rightFaction`.
3. WHEN phase berubah dari `"approach"` ke `"impact"`, THE `PairReactionStage` SHALL memulai transisi opacity nama karakter dari 1 menuju 0 dalam durasi maksimal 300 ms.
4. WHEN phase bukan `"approach"`, THE `PairReactionStage` SHALL menampilkan char name bar dengan `opacity: 0` (tidak terlihat namun tetap ada di DOM).
5. IF `CHAR_NAMES[leftFaction]?.[leftType]` atau `CHAR_NAMES[rightFaction]?.[rightType]` tidak menghasilkan nilai yang valid, THEN THE `PairReactionStage` SHALL menampilkan string kosong sebagai nama karakter tanpa melempar error.

---

### Requirement 5: Aksesibilitas PairReactionStage

**User Story:** Sebagai pengguna dengan kebutuhan aksesibilitas, saya ingin elemen animasi yang murni dekoratif tidak mengganggu pembaca layar, sehingga pengalaman aplikasi tetap inklusif.

#### Acceptance Criteria

1. THE `PairReactionStage` SHALL menandai elemen stage root (div terluar yang berisi area animasi) dengan atribut `aria-hidden="true"` dan `role="presentation"` agar pembaca layar mengabaikan konten animasi.
2. THE `PairReactionStage` SHALL menandai semua elemen efek visual (flash, shockwave, burst, sparktrail, char name bar, divider VS) dengan `aria-hidden="true"` dan `pointerEvents: "none"`.
3. THE `PairReactionStage` SHALL mempertahankan elemen tersembunyi dengan `data-testid="pair-reaction-phase"` yang berisi nilai teks phase saat ini untuk keperluan pengujian otomatis, di mana nilai tersebut dapat dibaca oleh DOM query tanpa memerlukan interaksi pengguna.
4. THE `PairReactionStage` SHALL mempertahankan atribut `data-phase` pada elemen stage root, di mana nilai `data-phase` diperbarui dalam satu siklus render setelah perubahan phase terjadi.
5. IF `PairReactionStage` dirender tanpa nilai phase yang valid, THEN THE `PairReactionStage` SHALL menetapkan nilai `data-phase` ke string kosong tanpa memunculkan error.

---

### Requirement 6: Idle-Float Animasi pada Chip CharacterColumn

**User Story:** Sebagai pengguna anak-anak, saya ingin chip karakter terlihat melayang lembut saat menunggu giliran bereaksi, sehingga UI model-chip terasa lebih hidup dan tidak statis.

#### Acceptance Criteria

1. WHILE `stepPhase` adalah `"idle"` atau `CharacterColumn` baru di-mount (sebelum menerima stepPhase yang berbeda), THE `CharacterColumn` SHALL menerapkan animasi `idle-float` pada setiap chip yang ditampilkan.
2. THE `CharacterColumn` SHALL menerapkan animasi `idle-float` pada setiap chip ke-i (0-indexed, dihitung lintas semua tier dalam kolom) dengan `animation-delay` sebesar `(i % 6) * 120 ms`, sehingga chip dengan indeks berbeda bergerak dengan fase yang bergeser.
3. WHEN `stepPhase` berubah dari `"idle"` ke nilai lain (misal `"approach"`, `"approach-wait"`, `"decompose"`, `"clear"`), THE `CharacterColumn` SHALL menghentikan animasi `idle-float` pada semua chip dalam satu siklus render.
4. IF `stepPhase` bukan `"idle"` dan chip tidak sedang dalam kondisi khusus (decomposing, reacting, gone, dimmed), THEN THE `CharacterColumn` SHALL merender chip tanpa animasi idle-float dan dengan `opacity: 1`.
5. THE `CharacterColumn` SHALL mempertahankan semua kondisi visual chip yang sudah ada (decomposing, gone, dimmed, approach-wait pulse) dengan prioritas lebih tinggi daripada animasi `idle-float` — kondisi khusus menimpa `idle-float`.

---

### Requirement 7: Backward Compatibility dan Integritas Test

**User Story:** Sebagai developer, saya ingin semua perubahan bersifat backward-compatible dan semua tes yang ada tetap lulus, sehingga peningkatan ini tidak merusak integrasi yang sudah ada.

#### Acceptance Criteria

1. THE `PairReactionStage` SHALL mempertahankan semua prop yang sudah ada (`leftType`, `rightType`, `leftFaction`, `onDone`, `runKey`, `isPerfect`, `width`, `height`, `speed`) dengan tipe TypeScript yang identik dan nilai default yang tidak berubah dari implementasi sebelumnya.
2. THE `PairReactionStage` SHALL mempertahankan Timing_Contract sehingga nilai yang dikembalikan `pairCycleDuration(speed)` tidak berubah untuk semua nilai `speed` yang valid — `Math.round((APPROACH + IMPACT + RECOIL + DISSOLVE) / speed) + 160`.
3. IF komponen `PairReactionStage` di-unmount sebelum animasi selesai, THEN THE `PairReactionStage` SHALL membatalkan semua timer aktif sehingga `onDone` tidak dipanggil setelah unmount.
4. THE `CharacterColumn` SHALL mempertahankan semua prop yang sudah ada dengan tipe TypeScript yang identik dan nilai default yang tidak berubah dari implementasi sebelumnya.
5. THE `PairReactionStage` dan `CharacterColumn` SHALL hanya menggunakan nama keyframe CSS yang sudah terdefinisi (`idle-float`, `idle-hover-pop`, `particle-fly`, `shockwave`, `popup-rise`, `battle-approach-left`, `battle-approach-right`, `battle-recoil-left`, `battle-recoil-right`, `battle-shake`, `dissolve-ccw`, `dissolve-cw`) dan tidak mendefinisikan blok `@keyframes` baru.
6. WHEN semua test yang ada dijalankan setelah implementasi, THE test suite SHALL melaporkan seluruh test case lulus (0 failures) tanpa modifikasi pada file tes.
