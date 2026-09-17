# Requirements Document

## Introduction

Fitur ini meningkatkan kualitas visual `AllianceStage.tsx` agar setara dengan `BattleStage.tsx` — dua komponen animasi karakter inti dalam aplikasi edukasi LineChip. AllianceStage menggambarkan momen dua karakter *sama tanda* (dua antibodi atau dua virus) yang saling bertemu dan bergabung membentuk kekuatan gabungan. Saat ini kerangka animasinya sudah ada (approach → bounce → settled), tetapi detail visual masih jauh di bawah standar BattleStage. Peningkatan ini meliputi: idle hover pop, star particles saat bounce, aura dinamis pada settled phase, tampilan nama karakter saat idle, WaitingLine antrian karakter, dan SparkTrail berbasis star particles. Timing contract (750 ms approach, 600 ms bounce→settled) tidak berubah, sehingga semua tes yang sudah ada tetap lulus.

## Glossary

- **AllianceStage**: Komponen React di `components/game/AllianceStage.tsx` yang menampilkan animasi dua karakter sama tanda yang bergabung.
- **BattleStage**: Komponen acuan di `components/game/BattleStage.tsx` dengan kualitas animasi lengkap.
- **AllianceAnimation**: Implementasi referensi di `referensi/SVG Antibody Virus Animation/src/animations/CharacterAnimations.tsx` yang menjadi target parity.
- **Faction**: Jenis karakter — `"ab"` (antibodi/positif) atau `"ku"` (virus/negatif).
- **PlaceValue**: Nilai tempat karakter — `"satuan"`, `"puluhan"`, `"ratusan"`, atau `"ribuan"`.
- **CHAR_NAMES**: Objek konstanta di `CharacterSVGs.tsx` yang memetakan faction + PlaceValue ke nama karakter (misal: Monoab, Mikrovir).
- **idle-float**: Animasi `idle-float` CSS yang membuat karakter melayang naik-turun lembut saat fase idle.
- **idle-hover-pop**: Animasi `idle-hover-pop` CSS yang membuat karakter sedikit membesar saat di-hover pada fase idle.
- **Star Particle**: Partikel berbentuk bintang (`✦`) yang dihasilkan `useParticles` dengan `star: true`.
- **WaitingLine**: Sub-komponen yang menampilkan antrian karakter berikutnya di dalam stage, diadopsi dari AllianceAnimation referensi.
- **SparkTrail**: Elemen percik yang mengikuti karakter selama fase approach.
- **Burst**: Komponen `Burst` dari `AnimationEffects.tsx` yang merender partikel meledak saat bounce.
- **Shockwave**: Komponen `Shockwave` dari `AnimationEffects.tsx` yang merender cincin ekspansi saat bounce.
- **Timing_Contract**: Durasi tetap animasi — approach: 750 ms, bounce→settled: 600 ms — yang tidak boleh diubah.
- **AllianceStage_Test**: File `__tests__/game/AllianceStage.test.ts` yang memverifikasi `onComplete` dipanggil tepat 1x pada waktu yang tepat.

---

## Requirements

---

### Requirement 1: Idle Hover Pop untuk Karakter Saat Fase Idle

**User Story:** Sebagai pengguna anak-anak, saya ingin karakter merespons saat saya mengarahkan kursor ke atasnya pada fase idle, sehingga aplikasi terasa lebih interaktif dan menyenangkan.

#### Acceptance Criteria

1. WHILE `AllianceStage` berada pada phase `"idle"`, THE `AllianceStage` SHALL mendeteksi hover pada inner-div karakter kiri dan karakter kanan secara terpisah melalui event `onMouseEnter` dan `onMouseLeave`, dengan state hover masing-masing karakter bersifat independen satu sama lain.
2. WHEN pengguna meng-hover karakter kiri pada phase `"idle"`, THE `AllianceStage` SHALL menerapkan animasi `idle-hover-pop` pada inner-div karakter kiri dan menghentikan animasi `idle-float` pada karakter kiri dalam waktu tidak lebih dari 1 frame render (≤ 16 ms).
3. WHEN pengguna meng-hover karakter kanan pada phase `"idle"`, THE `AllianceStage` SHALL menerapkan animasi `idle-hover-pop` pada inner-div karakter kanan dan menghentikan animasi `idle-float` pada karakter kanan dalam waktu tidak lebih dari 1 frame render (≤ 16 ms).
4. WHEN pengguna memindahkan kursor keluar dari karakter kiri atau kanan pada phase `"idle"`, THE `AllianceStage` SHALL memulihkan animasi `idle-float` pada inner-div karakter yang ditinggalkan dalam waktu tidak lebih dari 1 frame render (≤ 16 ms), dengan delay 0 ms untuk karakter kiri dan delay 700 ms untuk karakter kanan.
5. WHEN phase berubah dari `"idle"` ke `"approach"`, THE `AllianceStage` SHALL mereset state hover kedua karakter menjadi tidak-hover sebelum frame animasi `"approach"` pertama dirender, sehingga event `onMouseEnter` dan `onMouseLeave` tidak mempengaruhi animasi selanjutnya.
6. IF `onMouseEnter` atau `onMouseLeave` terpicu pada karakter saat phase bukan `"idle"`, THEN THE `AllianceStage` SHALL mengabaikan event tersebut tanpa mengubah state animasi yang sedang berjalan.

---

### Requirement 2: Star Particles Saat Fase Bounce

**User Story:** Sebagai pengguna anak-anak, saya ingin melihat percikan bintang yang meriah saat dua karakter bertemu dan bergabung, sehingga momen penggabungan terasa berkesan dan kuat.

#### Acceptance Criteria

1. WHEN `AllianceStage` memasuki phase `"bounce"`, THE `AllianceStage` SHALL memanggil `useParticles` dengan konfigurasi `star: true` untuk menghasilkan partikel berbentuk `✦`, dengan jumlah partikel antara 8 hingga 32 buah.
2. THE `AllianceStage` SHALL mengonfigurasi `useParticles` dengan palette warna faction-aware: untuk faction `"ab"` gunakan palet `["#93c5fd", "#60a5fa", "#bfdbfe", "#38bdf8"]`; untuk faction `"ku"` gunakan palet `["#fca5a5", "#f87171", "#fecaca", "#fb7185"]`; jika faction tidak dikenal, THE `AllianceStage` SHALL menggunakan palet default `["#ffffff", "#d1d5db"]`.
3. WHEN `AllianceStage` memasuki phase `"bounce"` dan `showBurst` bernilai `true`, THE `AllianceStage` SHALL merender komponen `Burst` dengan `particles` bertipe star dan komponen `Shockwave` di tengah stage; posisi tengah stage didefinisikan sebagai titik koordinat `(stageWidth / 2, stageHeight / 2)` dalam piksel relatif terhadap batas komponen `AllianceStage`.
4. THE `AllianceStage` SHALL mengonfigurasi ukuran shockwave saat bounce menggunakan nilai `size` dalam rentang 130 hingga 300 piksel.
5. WHEN durasi burst berakhir setelah 600 ms sejak fase `"bounce"` dimulai, THE `AllianceStage` SHALL menyembunyikan `Burst` dan `Shockwave` dengan mengeset `showBurst` ke `false`, dan komponen `Burst` serta `Shockwave` SHALL tidak lagi dirender di DOM.
6. THE `AllianceStage` SHALL mempertahankan Timing_Contract: fase `"bounce"` dimulai tepat 750 ms setelah `play()` dipanggil, dan `onComplete` dipanggil tepat 600 ms setelah fase `"bounce"` dimulai; toleransi pengukuran untuk kedua nilai waktu ini adalah ±50 ms.
7. IF `AllianceStage` memasuki phase `"bounce"` dan `useParticles` gagal menghasilkan partikel (mengembalikan array kosong), THEN THE `AllianceStage` SHALL tetap merender komponen `Shockwave` dan memanggil `onComplete` sesuai Timing_Contract tanpa menampilkan `Burst`.

---

### Requirement 3: Aura Dinamis pada Fase Settled

**User Story:** Sebagai pengguna anak-anak, saya ingin melihat efek cahaya yang berdenyut di sekitar karakter yang sudah bergabung, sehingga saya merasakan "kekuatan gabungan" yang nyata setelah penggabungan berhasil.

#### Acceptance Criteria

1. WHEN `AllianceStage` memasuki phase `"settled"`, THE `AllianceStage` SHALL merender elemen aura dengan animasi `settled-glow-blue` untuk faction `"ab"` atau `settled-glow-red` untuk faction `"ku"`, dalam waktu tidak lebih dari 100 ms setelah transisi phase terjadi.
2. THE `AllianceStage` SHALL merender aura sebagai div dengan posisi `absolute` di tengah stage (terpusat secara horizontal dan vertikal terhadap area stage) dengan lebar minimum 230 px dan tinggi minimum 140 px, menggunakan `radial-gradient` dengan warna sesuai faction (`"ab"` atau `"ku"`).
3. WHILE phase adalah `"settled"`, THE `AllianceStage` SHALL menerapkan animasi `settled-glow-blue` (untuk faction `"ab"`) atau `settled-glow-red` (untuk faction `"ku"`) pada inner-div karakter kiri dan kanan menggunakan `allianceInnerAnim()`, dengan durasi satu siklus animasi antara 800 ms dan 2000 ms.
4. WHEN `AllianceStage` memasuki phase `"settled"`, THE `AllianceStage` SHALL merender komponen `Popup` dengan teks `"+ KUAT!"` menggunakan warna aksen sesuai faction (`"ab"` atau `"ku"`).
5. WHILE phase adalah `"settled"`, THE `AllianceStage` SHALL mempertahankan komponen `Popup` tetap terlihat tanpa auto-dismiss, dan SHALL menyembunyikan komponen `Popup` segera ketika phase berubah dari `"settled"` ke phase lain.
6. IF faction yang diterima `AllianceStage` bukan `"ab"` maupun `"ku"`, THEN THE `AllianceStage` SHALL merender aura dan popup menggunakan warna aksen fallback netral tanpa melempar error, dan SHALL tetap menampilkan elemen aura serta teks `"+ KUAT!"` selama phase `"settled"`.

---

### Requirement 4: Tampilan Nama Karakter Saat Fase Idle

**User Story:** Sebagai pengguna anak-anak, saya ingin melihat nama karakter yang tampil di bawah stage saat fase idle, sehingga saya bisa mengenali karakter yang akan bergabung.

#### Acceptance Criteria

1. WHILE `AllianceStage` berada pada phase `"idle"` dan prop `queueAhead` adalah array kosong atau tidak diberikan, THE `AllianceStage` SHALL menampilkan nama karakter kiri menggunakan `CHAR_NAMES[faction][dominantPlace(Math.abs(bil1Value))]` dan nama karakter kanan menggunakan `CHAR_NAMES[faction][dominantPlace(Math.abs(bil2Value))]` di bagian bawah stage.
2. THE `AllianceStage` SHALL menampilkan nama karakter kiri dan kanan dengan warna teks aksen sesuai faction: faction `"ab"` menggunakan warna biru dan faction `"ku"` menggunakan warna merah.
3. WHEN phase berubah dari `"idle"` ke `"approach"`, THE `AllianceStage` SHALL memulai transisi opacity nama karakter dari 1 menuju 0 dalam durasi maksimal 300 ms.
4. WHEN prop `queueAhead` berisi satu atau lebih elemen, THE `AllianceStage` SHALL tidak merender elemen nama karakter meskipun phase adalah `"idle"`.
5. IF `dominantPlace(Math.abs(bil1Value))` atau `dominantPlace(Math.abs(bil2Value))` menghasilkan tier yang tidak tersedia di `CHAR_NAMES[faction]`, THEN THE `AllianceStage` SHALL menampilkan string kosong sebagai nama karakter tanpa melempar error.

---

### Requirement 5: WaitingLine — Antrian Karakter Berikutnya

**User Story:** Sebagai pengguna anak-anak, saya ingin melihat karakter-karakter yang menunggu giliran di bawah stage, sehingga saya bisa mempersiapkan diri untuk penggabungan berikutnya.

#### Acceptance Criteria

1. THE `AllianceStage` SHALL menerima prop opsional `queueAhead` bertipe `PlaceValue[]` dengan nilai default array kosong, tanpa mengubah prop yang sudah ada.
2. WHEN prop `queueAhead` berisi satu atau lebih elemen, THE `AllianceStage` SHALL merender satu komponen `WaitingLine` di sisi kiri bawah stage dan satu komponen `WaitingLine` di sisi kanan bawah stage, masing-masing menampilkan karakter dengan faction yang sama.
3. THE `WaitingLine` SHALL menampilkan maksimal 6 karakter dari awal array `queueAhead`, dengan opasitas karakter ke-i (0-indexed) dihitung sebagai `max(0.75 - i * 0.09, 0.28)`, sehingga karakter pertama memiliki opasitas 0.75 dan karakter keenam memiliki opasitas 0.30.
4. THE `WaitingLine` SHALL menerapkan animasi `idle-float` pada setiap karakter dalam antrian dengan `animation-delay` sebesar `i * 120 ms` di mana `i` adalah indeks 0-based karakter tersebut.
5. WHEN jumlah elemen dalam `queueAhead` melebihi 6, THE `WaitingLine` SHALL merender label berteks `"+N"` di samping karakter keenam (terakhir yang ditampilkan), di mana N adalah jumlah total elemen `queueAhead` dikurangi 6.
6. THE `WaitingLine` SHALL memosisikan antrian di sudut bawah kiri ketika prop `side` bernilai `"left"` dengan urutan karakter kiri-ke-kanan (indeks 0 paling kiri), dan di sudut bawah kanan ketika prop `side` bernilai `"right"` dengan urutan karakter kanan-ke-kiri (indeks 0 paling kanan, menggunakan `flex-direction: row-reverse`).
7. IF prop `queueAhead` adalah array kosong atau tidak diberikan, THEN THE `AllianceStage` SHALL tidak merender komponen `WaitingLine` manapun.

---

### Requirement 6: SparkTrail Berbasis Star Particles Selama Approach

**User Story:** Sebagai pengguna anak-anak, saya ingin melihat jejak percikan bintang di belakang karakter saat mereka mendekati satu sama lain, sehingga gerakan pendekatan terasa lebih hidup dan dramatis.

#### Acceptance Criteria

1. WHEN `AllianceStage` memasuki phase `"approach"` dan `showTrail` bernilai `true`, THE `SparkTrail` SHALL merender 6 partikel dengan diameter antara 6 px dan 10 px, menggunakan karakter `✦` atau lingkaran berwarna aksen faction.
2. THE `SparkTrail` SHALL memosisikan setiap partikel ke-i (0-indexed) dengan offset horizontal sebesar `i * 12 px` menjauh dari posisi karakter sesuai sisi (`left` atau `right`) sehingga membentuk pola jejak linier.
3. THE `SparkTrail` SHALL menerapkan animasi `idle-float` dan `popup-rise` pada setiap partikel dengan delay `(i - 1) * 80 ms` (di mana i adalah 1-indexed) untuk menciptakan efek berurutan.
4. THE `SparkTrail` SHALL menggunakan warna aksen faction — biru untuk `"ab"`, merah untuk `"ku"` — dan menerapkan efek `box-shadow` glow dengan warna yang sama.
5. WHEN `showTrail` berubah menjadi `false` (saat phase beralih ke `"bounce"`), THE `AllianceStage` SHALL berhenti merender komponen `SparkTrail` dalam satu render cycle berikutnya.
6. IF phase adalah `"approach"` tetapi `showTrail` bernilai `false`, THEN THE `AllianceStage` SHALL tidak merender komponen `SparkTrail`.
7. IF prop `side` pada `SparkTrail` memiliki nilai selain `"left"` atau `"right"`, THEN `SparkTrail` SHALL merender tanpa offset horizontal (offset = 0) dan tidak melempar error.

---

### Requirement 7: Backward Compatibility dan Integritas Test

**User Story:** Sebagai developer, saya ingin semua perubahan bersifat backward-compatible dan semua tes yang ada tetap lulus, sehingga peningkatan ini tidak merusak integrasi yang sudah ada.

#### Acceptance Criteria

1. THE `AllianceStage` SHALL mempertahankan semua prop yang sudah ada (`bil1Value`, `bil2Value`, `faction`, `onComplete`, `autoStart`, `hideControls`, `speed`) dengan tipe TypeScript yang identik dan nilai default yang tidak berubah dari implementasi sebelumnya.
2. THE `AllianceStage` SHALL mempertahankan Timing_Contract sehingga `onComplete` dipanggil tepat 1x dalam rentang 1350 ms ± 50 ms pada speed=1 (750 ms approach + 600 ms bounce→settled), diukur dari saat komponen di-mount atau `autoStart` bernilai `true`.
3. IF komponen `AllianceStage` di-unmount sebelum animasi selesai, THEN THE `AllianceStage` SHALL membatalkan semua timer aktif dengan `clearTimeout` sehingga `onComplete` tidak dipanggil setelah unmount.
4. THE `AllianceStage` SHALL tidak mengubah signature prop, tipe return, atau perilaku observable dari `BattleStage.tsx` maupun file tes yang sudah ada.
5. WHERE prop `hideControls` bernilai `true`, THE `AllianceStage` SHALL tidak merender elemen tombol play dan speed buttons ke DOM, serta tidak memanggil handler apapun sebagai respons terhadap klik pada area stage.
6. THE `AllianceStage` SHALL hanya menggunakan nama keyframe CSS yang sudah terdefinisi (`idle-float`, `idle-hover-pop`, `bounce-merge`, `settled-glow-blue`, `settled-glow-red`, `particle-fly`, `shockwave`, `popup-rise`) dan tidak mendefinisikan blok `@keyframes` baru dengan nama selain yang tercantum tersebut.
7. WHEN `AllianceStage_Test` dijalankan, THE test suite SHALL melaporkan seluruh test case lulus (0 failures) tanpa modifikasi pada file tes.

---

### Requirement 8: Aksesibilitas dan Rendering Non-Dekoratif

**User Story:** Sebagai pengguna dengan kebutuhan aksesibilitas, saya ingin elemen animasi yang murni dekoratif tidak mengganggu pembaca layar, sehingga pengalaman aplikasi tetap inklusif.

#### Acceptance Criteria

1. THE `AllianceStage` SHALL menandai elemen stage utama dengan atribut `aria-hidden="true"` dan `role="presentation"` agar pembaca layar mengabaikan konten animasi.
2. THE `AllianceStage` SHALL menandai semua elemen efek visual (partikel, shockwave, sparktrail, aura) dengan `aria-hidden="true"` dan `pointerEvents: "none"`.
3. THE `AllianceStage` SHALL mempertahankan elemen tersembunyi dengan `data-testid="alliance-phase-label"` yang berisi nilai teks phase saat ini (panjang maksimum 50 karakter) untuk keperluan pengujian otomatis, di mana nilai tersebut harus dapat dibaca oleh DOM query tanpa memerlukan interaksi pengguna.
4. THE `AllianceStage` SHALL mempertahankan atribut `data-testid="alliance-stage"`, `data-phase`, dan `data-faction` pada elemen stage root, di mana nilai `data-phase` dan `data-faction` harus diperbarui dalam satu siklus render setelah perubahan phase atau faction terjadi.
5. IF `AllianceStage` dirender tanpa nilai phase yang valid, THEN THE `AllianceStage` SHALL menetapkan nilai `data-phase` ke string kosong dan nilai `data-testid="alliance-phase-label"` ke string kosong, sehingga elemen tetap ada di DOM tanpa memunculkan error.
6. WHILE `AllianceStage` dalam kondisi reduced-motion (berdasarkan `prefers-reduced-motion: reduce`), THE `AllianceStage` SHALL tetap merender elemen efek visual dengan `aria-hidden="true"` tanpa memicu animasi bergerak, sehingga atribut aksesibilitas tidak berubah.
