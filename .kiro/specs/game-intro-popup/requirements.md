# Requirements Document

## Introduction

Fitur ini menambahkan popup intro ke dua halaman game di linechip:

1. **Game Virus** (`/game-virus`) — game model chip drag-and-drop dengan soal penjumlahan/pengurangan bilangan bulat menggunakan representasi Antibodi (positif) dan Kuman (negatif).
2. **Game Garis Bilangan** (`/intline-run`) — game garis bilangan dengan penempatan panah dan soal bilangan bulat.

Sebelum game dapat dimainkan, sebuah modal popup ditampilkan di atas antarmuka game yang menjelaskan cara bermain. Timer scoring (dari fitur `game-timed-scoring`) **tidak mulai berjalan** hingga pengguna secara eksplisit menutup popup dengan menekan tombol "Mulai". Setelah popup ditutup, timer dimulai dan game dapat dimainkan seperti biasa.

Popup ini hanya ditampilkan sekali per kunjungan halaman (bukan per sesi browser): jika pengguna menavigasi keluar lalu kembali, popup muncul lagi karena state disimpan di memori komponen, bukan di `localStorage`.

## Glossary

- **Intro_Popup**: Modal overlay yang muncul saat halaman game pertama kali dimuat, berisi penjelasan cara bermain dan tombol "Mulai".
- **Game_Virus**: Halaman game di `/game-virus` menggunakan komponen drag-and-drop chip Ab/Ku.
- **Game_Line**: Halaman game di `/intline-run` menggunakan komponen garis bilangan dan panah.
- **Timer**: Sistem pencatat waktu dari `useTimedScoring` yang menghitung `elapsedTime` sejak soal dimulai.
- **startTimer**: Fungsi dari hook `useTimedScoring` yang mereset `elapsedTime` ke 0 dan memulai interval timer.
- **Game_Active_State**: Kondisi di mana Intro_Popup telah ditutup, timer sedang berjalan, dan pengguna dapat berinteraksi dengan elemen game.
- **Overlay_Backdrop**: Lapisan semi-transparan gelap di belakang Intro_Popup yang menghalangi interaksi dengan elemen game di bawahnya.
- **Instructions_Section**: Bagian di dalam Intro_Popup yang berisi langkah-langkah cara bermain dalam format daftar terurut.
- **Start_Button**: Tombol di dalam Intro_Popup yang, saat ditekan, menutup popup dan memulai timer.
- **intblue**: Token warna utama linechip (`#2F6FED`).
- **intpink**: Token warna aksen linechip (`#EC4899`).

---

## Requirements

### Requirement 1: Tampilan Intro_Popup saat Halaman Game Dimuat

**User Story:** Sebagai siswa yang baru membuka halaman game, saya ingin melihat penjelasan cara bermain sebelum timer dimulai, sehingga saya dapat memahami aturan game sebelum dinilai kecepatannya.

#### Acceptance Criteria

1. WHEN halaman Game_Virus atau Game_Line pertama kali dimuat, THE Intro_Popup SHALL ditampilkan secara otomatis di atas antarmuka game sebelum pengguna melakukan interaksi apapun.
2. WHILE Intro_Popup ditampilkan, THE Timer SHALL berada dalam kondisi belum dimulai sehingga `elapsedTime` tetap bernilai 0 dan `TimerDisplay` tidak menghitung naik.
3. WHILE Intro_Popup ditampilkan, THE Overlay_Backdrop SHALL menutupi seluruh elemen interaktif game (zona chip, kanvas garis bilangan, keypad, tombol aksi) sehingga elemen-elemen tersebut tidak dapat diklik atau difokus via keyboard.
4. THE Intro_Popup SHALL menampilkan judul halaman game yang sesuai: "Antibodi vs Kuman" untuk Game_Virus dan "Game Garis Bilangan" untuk Game_Line.
5. THE Intro_Popup SHALL menampilkan Instructions_Section berisi langkah-langkah cara bermain yang relevan untuk masing-masing game, dalam format daftar terurut (`<ol>`).
6. THE Intro_Popup SHALL menampilkan Start_Button dengan label "Mulai" yang dapat difokus via keyboard `Tab` sebagai elemen pertama yang dapat difokus saat popup terbuka (focus trap).
7. IF pengguna menekan tombol Back browser atau menavigasi ke halaman lain, THE Intro_Popup state SHALL tidak dipersist — saat pengguna kembali ke halaman game, Intro_Popup SHALL tampil kembali dari awal.

---

### Requirement 2: Konten Instructions_Section untuk Game Virus

**User Story:** Sebagai siswa yang membuka Game Virus, saya ingin membaca cara bermain yang jelas sebelum mulai, sehingga saya tahu cara menyusun chip dan menjawab soal dengan benar.

#### Acceptance Criteria

1. THE Instructions_Section di Game_Virus SHALL menampilkan minimal lima langkah cara bermain yang mencakup: (a) membaca soal di banner, (b) menyeret chip Ab (+) ke Bilangan 1 sesuai nilai `a`, (c) menyeret chip Ku (−) ke Bilangan 2 sesuai nilai `b`, (d) menekan tombol "Hitung Hasil" untuk memulai animasi pertempuran, dan (e) mengetikkan jawaban numerik lalu menekan "Periksa".
2. THE Instructions_Section SHALL menyebutkan bahwa poin diberikan berdasarkan kecepatan menjawab — semakin cepat, semakin besar poin yang diperoleh.
3. THE Instructions_Section SHALL menyebutkan bahwa chip placement di Bilangan 1 dan Bilangan 2 harus sesuai nilai soal sebelum animasi dapat dijalankan.

---

### Requirement 3: Konten Instructions_Section untuk Game Garis Bilangan

**User Story:** Sebagai siswa yang membuka Game Garis Bilangan, saya ingin membaca cara bermain yang jelas sebelum mulai, sehingga saya tahu cara mengatur posisi panah dan menjawab soal dengan benar.

#### Acceptance Criteria

1. THE Instructions_Section di Game_Line SHALL menampilkan minimal empat langkah cara bermain yang mencakup: (a) membaca soal di kartu soal, (b) mengatur Panah 1 dan Panah 2 pada garis bilangan sesuai nilai soal, (c) menekan "Cek Posisi" untuk melihat animasi panah, dan (d) mengetikkan jawaban numerik lalu menekan "Periksa".
2. THE Instructions_Section SHALL menyebutkan bahwa poin diberikan berdasarkan kecepatan menjawab — semakin cepat, semakin besar poin yang diperoleh.
3. THE Instructions_Section SHALL menyebutkan bahwa posisi Panah 1 dan Panah 2 harus sesuai soal sebelum jawaban dapat diterima.

---

### Requirement 4: Penutupan Intro_Popup dan Mulainya Timer

**User Story:** Sebagai siswa, saya ingin timer baru mulai berjalan setelah saya menekan tombol "Mulai", sehingga waktu saya tidak terbuang saat membaca instruksi.

#### Acceptance Criteria

1. WHEN Start_Button ditekan, THE Intro_Popup SHALL ditutup secara langsung tanpa jeda animasi yang melebihi 300 ms.
2. WHEN Start_Button ditekan, THE Timer SHALL memulai dengan memanggil `startTimer()` tepat setelah Intro_Popup ditutup, sehingga `elapsedTime` mulai menghitung dari 0.
3. WHEN Start_Button ditekan, THE Game_Active_State SHALL dimulai sehingga semua elemen interaktif game kembali dapat diklik dan difokus via keyboard.
4. WHEN Start_Button ditekan, THE `TimerDisplay` SHALL mulai menampilkan waktu yang berjalan secara real-time.
5. IF pengguna menggunakan keyboard, THE Start_Button SHALL dapat diaktifkan dengan menekan tombol `Enter` atau `Space` saat tombol tersebut difokus.

---

### Requirement 5: Aksesibilitas Intro_Popup

**User Story:** Sebagai siswa dengan kebutuhan aksesibilitas, saya ingin popup intro dapat digunakan sepenuhnya dengan keyboard dan screen reader, sehingga semua siswa mendapat pengalaman yang setara.

#### Acceptance Criteria

1. THE Intro_Popup SHALL menggunakan atribut `role="dialog"` dan `aria-modal="true"` sehingga screen reader mengidentifikasi elemen ini sebagai modal dialog.
2. THE Intro_Popup SHALL menggunakan atribut `aria-labelledby` yang menunjuk ke elemen judul game di dalam popup, sehingga screen reader mengumumkan judul saat fokus memasuki dialog.
3. WHEN Intro_Popup ditampilkan, THE fokus keyboard SHALL dipindahkan secara otomatis ke Start_Button (atau elemen pertama yang dapat difokus di dalam popup).
4. WHILE Intro_Popup ditampilkan, THE navigasi `Tab` SHALL terkunci di dalam popup sehingga fokus tidak keluar ke elemen game di belakang Overlay_Backdrop (focus trap).
5. WHEN Intro_Popup ditutup, THE fokus keyboard SHALL dikembalikan ke elemen pertama yang dapat difokus di area utama game (misalnya kartu soal atau zona chip).
6. WHERE media query `prefers-reduced-motion` aktif, THE animasi masuk/keluar Intro_Popup SHALL menggunakan transisi opacity saja tanpa transform translate atau scale.
