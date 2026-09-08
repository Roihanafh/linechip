# Requirements Document

## Introduction

Fitur ini mengintegrasikan tiga modul dari project `add-sub-int` ke dalam `linechip`: modul pembelajaran penjumlahan berbasis garis bilangan interaktif, modul pembelajaran pengurangan berbasis garis bilangan interaktif, dan Game Line (game soal bilangan bulat berbasis garis bilangan). Ketiga modul diadaptasi secara native mengikuti arsitektur, desain, UI/UX, routing, konvensi kode, dan identitas visual `linechip`. Tidak ada dependency baru yang ditambahkan di luar yang sudah tersedia.

Konteks penting:
- `/garis-bilangan` di `linechip` sudah ada sebagai simulator garis bilangan SVG (mendukung operasi + dan −). Modul pembelajaran penjumlahan dan pengurangan akan **memperbarui** halaman ini agar mendukung canvas-based car animation yang lebih kaya dari `add-sub-int`, sembari tetap mempertahankan SVG fallback dan flow yang sudah ada.
- `/intline-run` di `linechip` adalah halaman placeholder yang akan menjadi implementasi penuh Game Line.
- `/game-virus` adalah game yang sudah ada dan **tidak boleh diubah**.
- `AppShell` sudah mencantumkan `/intline-run` dan `/garis-bilangan` di `MAIN_ROUTES` sehingga Navbar/Footer akan tampil secara otomatis.

## Glossary

- **LineChip**: Project target — platform edukasi bilangan bulat dengan identitas visual intblue/intpink.
- **Add-Sub-Int**: Project sumber referensi — hanya dipakai sebagai acuan logic dan flow, tidak di-copy-paste langsung.
- **NumberLine_Canvas**: Komponen canvas HTML5 baru di `linechip` yang merender garis bilangan dengan animasi dua fase (fase 1: gerak ke `num1`, fase 2: gerak ke hasil), diadaptasi dari `add-sub-int/components/Canvas/NumberLineCanvas`.
- **NumberLine_SVG**: Implementasi garis bilangan SVG yang sudah ada di `/garis-bilangan` di `linechip`.
- **Car_Animation**: Animasi elemen visual (representasi titik/penanda bergerak) di atas garis bilangan yang memperjelas dua fase perhitungan.
- **Game_Line**: Halaman game di rute `/intline-run` yang menampilkan soal operasi bilangan bulat, garis bilangan interaktif dengan dua panah yang dapat disetel pengguna, keypad jawaban, dan feedback hasil.
- **Game_Virus**: Game yang sudah ada di `/game-virus` — tidak dimodifikasi.
- **Arrow**: Vektor pada garis bilangan di Game_Line yang merepresentasikan satu bilangan operan (start dan panjang/direction).
- **Question**: Soal operasi bilangan bulat dalam format `a op b = ?` dengan `op` berupa `+` atau `−`.
- **Feedback**: Respons visual (benar/salah) setelah pengguna menyerahkan jawaban di Game_Line.
- **intblue**: Token warna utama linechip `#2F6FED`.
- **intpink**: Token warna aksen linechip `#EC4899`.
- **AppShell**: Komponen pembungkus yang mengontrol visibilitas Navbar dan Footer berdasarkan rute.

---

## Requirements

### Requirement 1: Perbaruan Modul Pembelajaran Garis Bilangan (Operasi + dan −)

**User Story:** Sebagai siswa SMP, saya ingin melihat animasi garis bilangan yang lebih kaya dan jelas saat mempelajari penjumlahan dan pengurangan bilangan bulat, sehingga saya lebih mudah memahami dua fase pergerakan dalam suatu operasi.

#### Acceptance Criteria

1. THE NumberLine_Canvas SHALL merender garis bilangan di atas elemen `<canvas>` HTML5 yang responsif (lebar menyesuaikan container, tinggi tetap 280 px).
2. WHEN pengguna menekan tombol hitung pada halaman `/garis-bilangan`, THE NumberLine_Canvas SHALL memulai animasi dua fase: fase pertama menggerakkan Car_Animation dari posisi 0 ke `num1`, fase kedua menggerakkan Car_Animation dari `num1` ke hasil operasi.
3. WHEN operasi adalah pengurangan (`−`), THE NumberLine_Canvas SHALL membalik arah gerak fase kedua sesuai aturan pengurangan bilangan bulat (kurang positif = gerak kiri, kurang negatif = gerak kanan).
4. WHEN animasi selesai, THE NumberLine_Canvas SHALL menampilkan penanda hasil (result marker) di posisi akhir pada garis bilangan dan memanggil callback `onResult` dengan nilai hasil.
5. THE NumberLine_Canvas SHALL menampilkan label segmen (pill) di atas tiap fase gerak yang menunjukkan nilai dan arah pergerakan operan.
6. WHEN pengguna mengarahkan kursor (hover) ke area label segmen atau penanda hasil, THE NumberLine_Canvas SHALL menampilkan tooltip berisi nilai tersebut.
7. THE NumberLine_Canvas SHALL menyesuaikan skala garis bilangan (rentang dan spasi tik) secara dinamis berdasarkan nilai `num1`, `num2`, dan hasil agar semua titik kunci selalu terlihat.
8. WHERE tampilan layar lebih kecil dari container ideal, THE NumberLine_Canvas SHALL me-redraw ulang garis bilangan saat ukuran window berubah (resize handler) tanpa kehilangan state animasi yang sedang berjalan.
9. THE GarisBilangan_Page SHALL menggunakan token warna `intblue` dan `intpink` dari tema linechip untuk mewarnai trail fase pertama dan fase kedua (positif = intblue, negatif = intpink), menggantikan palet ungu dari `add-sub-int`.
10. THE GarisBilangan_Page SHALL mempertahankan panel input bilangan 1, operator (+/−), bilangan 2, dan tombol hitung yang sudah ada, dengan rentang input yang kompatibel dengan NumberLine_Canvas (minimal −99 hingga +99).
11. IF nilai `num1` dan `num2` keduanya adalah 0 saat halaman pertama dimuat, THEN THE NumberLine_Canvas SHALL menampilkan garis bilangan statis dengan rentang default −5 hingga +5 tanpa memulai animasi.
12. THE GarisBilangan_Page SHALL menampilkan panel penjelasan teks yang mendeskripsikan langkah animasi secara naratif (fase 1, fase 2, dan kesimpulan) setelah animasi selesai, mengikuti pola panel yang sudah ada di halaman `/garis-bilangan`.

---

### Requirement 2: Komponen NumberLine_Canvas yang Dapat Digunakan Ulang

**User Story:** Sebagai developer linechip, saya ingin komponen garis bilangan canvas tersedia sebagai komponen mandiri yang dapat digunakan di halaman materi dan game, sehingga tidak ada duplikasi logika canvas di codebase.

#### Acceptance Criteria

1. THE NumberLine_Canvas SHALL diekspor sebagai komponen React dari direktori `components/` linechip (misalnya `components/NumberLineCanvas/`) mengikuti konvensi penamaan dan struktur direktori yang sudah ada di linechip.
2. THE NumberLine_Canvas SHALL menerima props: `num1: number`, `num2: number`, `operation: '+' | '-'`, `runKey?: number` (increment untuk re-trigger animasi), dan `onResult?: (result: number) => void`.
3. THE NumberLine_Canvas SHALL bersifat `"use client"` karena bergantung pada Web API (`canvas`, `requestAnimationFrame`, `window`).
4. IF `runKey` tidak berubah antara dua render, THEN THE NumberLine_Canvas SHALL TIDAK memulai ulang animasi yang sudah selesai, mencegah loop animasi tak terduga.
5. THE NumberLine_Canvas SHALL membersihkan `requestAnimationFrame` dan event listener saat komponen di-unmount untuk mencegah memory leak.
6. THE NumberLine_Canvas SHALL menggunakan hanya API, hook, dan library yang sudah tersedia di `package.json` linechip (Next.js 16, React 19) tanpa menambahkan dependency baru.

---

### Requirement 3: Integrasi Modul Penjumlahan ke Halaman /garis-bilangan

**User Story:** Sebagai siswa, saya ingin mempelajari penjumlahan bilangan bulat dengan visualisasi animasi garis bilangan di halaman `/garis-bilangan`, sehingga saya dapat melihat dengan jelas bagaimana dua bilangan dijumlahkan secara visual.

#### Acceptance Criteria

1. WHEN pengguna memilih operator `+` dan menekan tombol hitung di halaman `/garis-bilangan`, THE GarisBilangan_Page SHALL menjalankan NumberLine_Canvas dengan `operation="+"`.
2. THE GarisBilangan_Page SHALL menampilkan panel hasil yang memuat persamaan lengkap dalam format `a + b = hasil` setelah animasi selesai, dengan warna hasil mengikuti tanda (positif = intblue, negatif = intpink, nol = success `#22C55E`).
3. WHEN animasi penjumlahan selesai dan hasil adalah nol, THE GarisBilangan_Page SHALL menampilkan indikator khusus "kembali ke titik asal" pada panel penjelasan.
4. THE GarisBilangan_Page SHALL menyediakan tombol reset yang menghentikan animasi berjalan dan mengembalikan NumberLine_Canvas ke kondisi idle (garis statis −5 hingga +5).
5. WHEN pengguna mengganti nilai bilangan 1 atau bilangan 2 setelah animasi selesai, THE GarisBilangan_Page SHALL mereset panel hasil ke kondisi menunggu sehingga hasil lama tidak terlihat bersamaan dengan input baru.

---

### Requirement 4: Integrasi Modul Pengurangan ke Halaman /garis-bilangan

**User Story:** Sebagai siswa, saya ingin mempelajari pengurangan bilangan bulat dengan visualisasi animasi garis bilangan di halaman `/garis-bilangan`, sehingga saya dapat memahami bahwa mengurangi bilangan positif artinya bergerak ke kiri dan mengurangi bilangan negatif artinya bergerak ke kanan.

#### Acceptance Criteria

1. WHEN pengguna memilih operator `−` dan menekan tombol hitung di halaman `/garis-bilangan`, THE GarisBilangan_Page SHALL menjalankan NumberLine_Canvas dengan `operation="-"`.
2. THE NumberLine_Canvas SHALL merender trail fase kedua dengan warna yang mencerminkan arah pergerakan hasil pengurangan: intblue jika bergerak ke kanan (mengurangi bilangan negatif), intpink jika bergerak ke kiri (mengurangi bilangan positif).
3. THE GarisBilangan_Page SHALL menampilkan panel hasil yang memuat persamaan lengkap dalam format `a − b = hasil` setelah animasi selesai.
4. WHEN animasi pengurangan selesai dan hasil adalah nol, THE GarisBilangan_Page SHALL menampilkan indikator "kembali ke titik asal".
5. THE GarisBilangan_Page SHALL menyediakan penjelasan teks yang berbeda antara skenario operasi penjumlahan dan pengurangan, menggambarkan arah pergerakan yang tepat.

---

### Requirement 5: Halaman Game Line (/intline-run) — Tampilan dan Navigasi

**User Story:** Sebagai siswa, saya ingin membuka halaman Game Line di `/intline-run` dan melihat antarmuka game yang lengkap, sehingga saya dapat langsung memahami cara bermain sebelum memulai.

#### Acceptance Criteria

1. THE Game_Line SHALL dapat diakses melalui rute `/intline-run` yang sudah terdaftar di `AppShell.MAIN_ROUTES`, sehingga Navbar dan Footer linechip tampil secara otomatis.
2. THE Game_Line SHALL menampilkan header halaman dengan judul, deskripsi singkat cara bermain, dan tombol kembali ke `/materi`, mengikuti pola header halaman yang sudah ada di linechip (misalnya `/game-virus`).
3. THE Game_Line SHALL menampilkan kartu soal (Question Card) yang menampilkan soal dalam format `a op b = ?` dengan nilai `a` dan `b` dalam rentang −99 hingga +99 dan operator `+` atau `−`.
4. THE Game_Line SHALL menampilkan garis bilangan interaktif (Game Canvas) yang memvisualisasikan dua panah yang dapat disetel pengguna.
5. THE Game_Line SHALL menampilkan kontrol panah (Arrow Controls) yang memungkinkan pengguna mengatur start dan panjang masing-masing dari dua panah.
6. THE Game_Line SHALL menampilkan keypad angka yang memungkinkan pengguna memasukkan jawaban numerik (termasuk tanda negatif dan backspace).
7. THE Game_Line SHALL menampilkan panel jawaban yang menunjukkan input jawaban pengguna saat ini.
8. THE Game_Line SHALL menampilkan tombol "Soal Baru" yang menghasilkan soal acak baru dan mereset state game.
9. THE Game_Line SHALL menggunakan identitas visual linechip secara penuh: token warna `intblue`/`intpink`, font Baloo 2 untuk judul, Plus Jakarta Sans untuk teks, JetBrains Mono untuk angka dan soal.

---

### Requirement 6: Halaman Game Line — Logika Soal dan Jawaban

**User Story:** Sebagai siswa, saya ingin menjawab soal operasi bilangan bulat di Game Line dan mendapat feedback langsung, sehingga saya dapat belajar dari setiap jawaban yang saya berikan.

#### Acceptance Criteria

1. WHEN halaman Game_Line pertama kali dimuat, THE Game_Line SHALL secara otomatis menghasilkan satu Question acak untuk ditampilkan kepada pengguna.
2. THE Game_Line SHALL menghasilkan Question dengan `a` dan `b` masing-masing berupa bilangan bulat dalam rentang −99 hingga +99, dan `op` dipilih secara acak antara `+` dan `−`.
3. WHEN pengguna menekan tombol periksa jawaban dengan input kosong, THE Game_Line SHALL menampilkan Feedback bertipe error dengan pesan "Jawaban tidak boleh kosong" tanpa menghitung atau melanjutkan ke soal berikutnya.
4. WHEN pengguna menekan tombol periksa jawaban dan jawaban benar, THE Game_Line SHALL menampilkan Feedback bertipe success yang memuat persamaan lengkap beserta hasil yang benar.
5. WHEN pengguna menekan tombol periksa jawaban dan jawaban salah, THE Game_Line SHALL menampilkan Feedback bertipe error yang memuat jawaban yang benar.
6. WHEN Feedback bertipe success ditampilkan, THE Game_Line SHALL secara otomatis menghasilkan Question baru setelah jeda 2000 ms dan mereset input jawaban serta Feedback.
7. WHEN pengguna menekan tombol "Soal Baru", THE Game_Line SHALL menghasilkan Question baru, mereset input jawaban, mereset panah Arrow ke posisi awal (start 0, panjang 0), dan menghapus Feedback yang tampil.
8. IF pengguna menekan tombol periksa sementara animasi panah sedang berjalan, THEN THE Game_Line SHALL TIDAK memproses pengecekan jawaban hingga animasi selesai.

---

### Requirement 7: Halaman Game Line — Garis Bilangan Interaktif dan Animasi Panah

**User Story:** Sebagai siswa, saya ingin mengatur dua panah pada garis bilangan di Game Line dan melihat animasi gerakannya, sehingga saya dapat memvisualisasikan operasi bilangan bulat secara aktif sebelum menyerahkan jawaban.

#### Acceptance Criteria

1. THE Game_Line SHALL menampilkan Game Canvas yang merender garis bilangan dengan dua Arrow yang dapat disetel secara mandiri (Arrow 1 dan Arrow 2).
2. WHEN pengguna mengubah nilai start atau panjang Arrow melalui Arrow Controls, THE Game_Line SHALL memperbarui tampilan Arrow pada Game Canvas secara langsung (tanpa perlu menekan tombol tambahan).
3. THE Game_Line SHALL menyediakan tombol "Cek Posisi" yang memulai animasi sekuensial: Arrow 1 beranimasi terlebih dahulu hingga selesai, kemudian Arrow 2 beranimasi, menggunakan easing `easeOutCubic`.
4. WHILE animasi Arrow berjalan, THE Game_Line SHALL menonaktifkan tombol "Cek Posisi" untuk mencegah re-trigger animasi.
5. THE Game_Line SHALL mendukung pan/drag horizontal pada Game Canvas untuk menggeser viewport garis bilangan, sehingga pengguna dapat melihat angka di luar batas tampilan awal.
6. THE Game_Line SHALL mendukung zoom in/out pada garis bilangan melalui tombol `+` dan `−` yang mengubah spasi antar tik (jarak unit).
7. THE Game_Line SHALL mewarnai Arrow 1 dengan `intblue` dan Arrow 2 dengan warna yang mencerminkan arah (intblue untuk gerak ke kanan, intpink untuk gerak ke kiri), mengikuti palet linechip.

---

### Requirement 8: Konsistensi Navigasi dan Tautan Antar Halaman

**User Story:** Sebagai pengguna linechip, saya ingin dapat berpindah dengan mudah antara halaman materi, simulasi, dan game, sehingga alur belajar saya tidak terputus.

#### Acceptance Criteria

1. THE GarisBilangan_Page SHALL menyediakan tautan navigasi ke `/game-virus` atau `/intline-run` di bagian bawah halaman sebagai langkah lanjutan setelah belajar simulasi.
2. THE Game_Line SHALL menyediakan tautan kembali ke `/materi` di header dan/atau bagian bawah halaman.
3. THE MateriPage SHALL menampilkan dua pilihan game di bagian promo game: Game Virus (`/game-virus`) dan Game Line (`/intline-run`), dengan label dan deskripsi yang sesuai dengan implementasi Game_Line yang baru.
4. THE HomePage SHALL menampilkan kartu fitur Game_Line (`/intline-run`) dengan judul, deskripsi, dan CTA yang akurat mencerminkan game garis bilangan interaktif yang telah diimplementasikan (bukan placeholder).
5. WHEN pengguna mengakses `/intline-run`, THE AppShell SHALL menampilkan Navbar dan Footer linechip (sudah terpenuhi karena rute sudah ada di `MAIN_ROUTES`).

---

### Requirement 9: Tidak Merusak Fitur Existing

**User Story:** Sebagai pengguna yang sudah mengenal linechip, saya ingin semua fitur yang ada tetap berfungsi setelah integrasi, sehingga pengalaman belajar yang sudah saya bangun tidak terganggu.

#### Acceptance Criteria

1. THE Game_Virus SHALL tetap berfungsi penuh di `/game-virus` tanpa perubahan apapun pada komponen, halaman, logika, dan tampilan yang sudah ada.
2. THE ModelChip_Page SHALL tetap berfungsi penuh di `/model-chip` tanpa perubahan apapun pada komponen dan logika yang sudah ada.
3. THE Leaderboard_Page SHALL tetap dapat diakses dan menampilkan konten yang sama setelah integrasi.
4. THE AppShell SHALL tetap mengontrol visibilitas Navbar/Footer berdasarkan `MAIN_ROUTES` yang sudah ada; penambahan rute baru (jika ada) harus ditambahkan ke `MAIN_ROUTES` secara eksplisit.
5. IF komponen baru (misalnya `NumberLine_Canvas`) menggunakan nama yang sama dengan komponen existing di `linechip`, THEN THE Integration TIDAK SHALL menimpa atau mengubah komponen existing tersebut; nama direktori dan ekspor harus unik.

---

### Requirement 10: Adaptasi Visual ke Identitas linechip

**User Story:** Sebagai pengguna linechip, saya ingin semua halaman baru terasa menjadi bagian dari linechip (bukan seperti modul asing yang ditempel), sehingga pengalaman visual saya konsisten di seluruh platform.

#### Acceptance Criteria

1. THE NumberLine_Canvas SHALL menggunakan `intblue` (`#2F6FED`) untuk trail fase pertama saat nilai positif, dan `intpink` (`#EC4899`) untuk trail saat nilai negatif, menggantikan palet `#9F7AEA`/`#B794F4` dari `add-sub-int`.
2. THE Game_Line SHALL menggunakan font Baloo 2 (`var(--font-baloo2)`) untuk heading dan kartu soal, sesuai konvensi linechip.
3. THE Game_Line SHALL menggunakan Tailwind class yang sudah didefinisikan di `globals.css` linechip (misalnya `bg-surface`, `border-border`, `text-intblue`, `bg-intblue-light`) dan TIDAK menambahkan class custom baru yang bisa ditangani oleh token yang ada.
4. THE GarisBilangan_Page SHALL mengikuti pola layout halaman linechip: max-width container, padding konsisten, rounded-2xl untuk card, border-border untuk pembatas, dan pola header halaman (breadcrumb + judul).
5. WHERE linechip menggunakan elemen `bg-white rounded-2xl border border-border shadow-sm p-6` untuk panel konten, THE Game_Line dan NumberLine_Canvas SHALL menggunakan pola yang sama untuk container mereka.
6. THE Integration TIDAK SHALL menambahkan CSS global baru ke `globals.css` atau `animations.css` kecuali animasi yang benar-benar diperlukan dan belum tersedia di file tersebut.
