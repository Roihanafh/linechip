# Requirements Document

## Introduction

Fitur ini menggantikan dan menyempurnakan modul garis bilangan (number line) di project **linechip** agar memiliki perilaku yang identik dengan project referensi **intline** (`add-sub-int`), khususnya:

- Animasi mobil dua-fase dengan perbedaan **arah hadap** (facing direction) dan **arah gerak** (movement direction) yang tepat untuk operasi penjumlahan dan pengurangan.
- Garis bilangan yang dapat di-scroll secara horizontal dengan jarak antar tick yang konsisten.
- Pemisahan halaman dan routing: penjumlahan di `/garis-bilangan/penjumlahan` dan pengurangan di `/garis-bilangan/pengurangan`.
- Pembaruan halaman `/materi` agar mengarahkan ke dua halaman terpisah tersebut.

Fitur ini bersifat penggantian total atas halaman `/garis-bilangan` yang ada, dengan tetap mempertahankan `NumberLineCanvas` dan `numberLineRenderer` sebagai shared library.

---

## Glossary

- **NumberLineCanvas**: Komponen React canvas berbasis hook yang merender animasi garis bilangan dua-fase.
- **NumberLineRenderer**: Modul lib (`lib/canvas/numberLineRenderer.ts`) yang berisi fungsi-fungsi drawing primitif (grid, trail, car, dll).
- **Phase 1**: Fase animasi pertama — mobil bergerak dari posisi `0` ke posisi `num1`.
- **Phase 2**: Fase animasi kedua — mobil bergerak dari posisi `num1` ke posisi hasil (`result`).
- **Facing Direction (Arah Hadap)**: Arah yang dihadap oleh mobil (kiri atau kanan), ditunjukkan oleh orientasi SVG mobil.
- **Movement Direction (Arah Gerak)**: Arah aktual pergerakan mobil di garis bilangan (kiri = nilai menurun, kanan = nilai meningkat).
- **Silhouette Car**: Mobil dengan opasitas rendah yang tersisa di posisi `num1` saat Phase 2 berlangsung, sebagai jejak visual.
- **Segment Pill**: Label berbentuk pil di atas trail Phase 2 yang menampilkan nilai delta (contoh: `+3`, `−5`).
- **Result Dot**: Marker titik bercahaya di garis bilangan yang menandai posisi hasil akhir.
- **Trail**: Jalur berwarna yang tertinggal di garis bilangan mengikuti pergerakan mobil.
- **Scrollable Canvas**: Canvas yang memungkinkan pengguna menggeser garis bilangan secara horizontal untuk melihat bilangan di luar viewport.
- **Tick**: Garis vertikal kecil di garis bilangan beserta label angkanya.
- **Tick Spacing**: Jarak piksel antar tick yang tetap konsisten saat di-scroll.
- **InputPanel**: Panel input untuk bilangan pertama, operator, dan bilangan kedua di atas canvas.
- **ResultPanel**: Panel di bawah canvas yang menampilkan persamaan dan penjelasan naratif setelah animasi selesai.
- **InstructionModal**: Modal overlay yang menampilkan panduan cara membaca animasi.
- **Materi Page**: Halaman `/materi` yang berfungsi sebagai navigation hub ke topik-topik belajar.

---

## Requirements

### Requirement 1: Pemisahan Halaman Penjumlahan dan Pengurangan

**User Story:** Sebagai siswa, saya ingin memiliki halaman terpisah untuk penjumlahan dan pengurangan garis bilangan, sehingga saya tidak bingung antara dua operasi yang berbeda.

#### Acceptance Criteria

1. THE Router SHALL menyediakan route `/garis-bilangan/penjumlahan` yang menampilkan halaman khusus penjumlahan bilangan bulat.
2. THE Router SHALL menyediakan route `/garis-bilangan/pengurangan` yang menampilkan halaman khusus pengurangan bilangan bulat.
3. WHEN pengguna mengakses `/garis-bilangan` tanpa sub-path, THE Router SHALL mengarahkan ke `/garis-bilangan/penjumlahan` dengan HTTP redirect permanen (301) sehingga URL di browser berubah menjadi `/garis-bilangan/penjumlahan`.
4. THE PenjumlahanPage SHALL menampilkan teks judul tepat "Penjumlahan Bilangan Bulat" dalam satu elemen heading (h1–h3) yang terlihat di area atas halaman sebelum konten interaktif.
5. THE PenguranganPage SHALL menampilkan teks judul tepat "Pengurangan Bilangan Bulat" dalam satu elemen heading (h1–h3) yang terlihat di area atas halaman sebelum konten interaktif.
6. THE PenjumlahanPage SHALL menampilkan simbol operator `+` secara tetap pada antarmuka input; halaman tidak menyediakan kontrol apapun yang memungkinkan pengguna mengubah operator tersebut.
7. THE PenguranganPage SHALL menampilkan simbol operator `−` secara tetap pada antarmuka input; halaman tidak menyediakan kontrol apapun yang memungkinkan pengguna mengubah operator tersebut.
8. IF route yang diakses bukan `/garis-bilangan`, `/garis-bilangan/penjumlahan`, atau `/garis-bilangan/pengurangan`, THEN THE Router SHALL menampilkan halaman not-found dengan pesan yang mengindikasikan halaman tidak ditemukan.

---

### Requirement 2: Pembaruan Routing pada Halaman `/materi`

**User Story:** Sebagai siswa, saya ingin menu "Penjumlahan" dan "Pengurangan" di halaman Materi langsung membawa saya ke mode garis bilangan yang sesuai, sehingga navigasi lebih cepat dan jelas.

#### Acceptance Criteria

1. THE MateriPage SHALL memperbarui link mode "Garis Bilangan" untuk Penjumlahan agar mengarah ke `/garis-bilangan/penjumlahan`.
2. THE MateriPage SHALL memperbarui link mode "Garis Bilangan" untuk Pengurangan agar mengarah ke `/garis-bilangan/pengurangan`.
3. THE MateriPage SHALL mempertahankan semua link lain (Model Chip, Game Virus, IntlineRun) tanpa perubahan.
4. WHEN pengguna mengklik card Penjumlahan dengan mode Garis Bilangan, THE MateriPage SHALL menavigasi ke `/garis-bilangan/penjumlahan` menggunakan Next.js Link sehingga navigasi terjadi tanpa full page reload.
5. WHEN pengguna mengklik card Pengurangan dengan mode Garis Bilangan, THE MateriPage SHALL menavigasi ke `/garis-bilangan/pengurangan` menggunakan Next.js Link sehingga navigasi terjadi tanpa full page reload.

---

### Requirement 3: InputPanel — Komponen Input Terunifikasi

**User Story:** Sebagai siswa, saya ingin mengisi bilangan pertama dan kedua dengan mudah, sehingga saya dapat langsung menjalankan simulasi tanpa kebingungan.

#### Acceptance Criteria

1. THE InputPanel SHALL menerima prop `operation` bertipe `'+' | '-'` dan menampilkan simbol operator tersebut di antara dua input bilangan.
2. THE InputPanel SHALL menyediakan input bilangan pertama (`num1`) dengan stepper `+` / `−` untuk menambah atau mengurangi nilai sebesar 1; jika nilai `num1` sudah berada di batas rentang `[−99, 99]`, tombol stepper ke arah batas tersebut SHALL dinonaktifkan (disabled).
3. THE InputPanel SHALL menyediakan input bilangan kedua (`num2`) dengan stepper `+` / `−` untuk menambah atau mengurangi nilai sebesar 1; jika nilai `num2` sudah berada di batas rentang `[−99, 99]`, tombol stepper ke arah batas tersebut SHALL dinonaktifkan (disabled).
4. THE InputPanel SHALL membatasi nilai input pada rentang integer `[−99, 99]`; nilai yang diketik langsung di luar rentang ini SHALL di-clamp ke batas terdekat (−99 atau 99) saat field kehilangan fokus (onBlur).
5. THE InputPanel SHALL menampilkan angka negatif dalam format `(n)` (dengan tanda kurung menggantikan tanda minus) di dalam elemen input, sesuai konvensi bilangan bulat; angka nol dan positif SHALL ditampilkan tanpa tanda kurung.
6. THE InputPanel SHALL menyediakan tombol "Hitung" yang memanggil callback `onCalculate` ketika ditekan; tombol "Hitung" SHALL selalu aktif (tidak disabled) terlepas dari nilai input saat ini.
7. WHEN pengguna menekan tombol Enter pada field input `num1` atau `num2`, THE InputPanel SHALL memanggil callback `onCalculate`.
8. THE InputPanel SHALL menyediakan tombol ikon 💡 yang memanggil callback `onShowInstructions` untuk membuka InstructionModal.
9. WHEN nilai input `num1` bernilai negatif (kurang dari 0), THE InputPanel SHALL menampilkan elemen input `num1` dengan warna `intpink`; IF nilai `num1` sama dengan nol atau lebih dari nol, THEN THE InputPanel SHALL menampilkan elemen input `num1` dengan warna `intblue`.
10. WHEN nilai input `num2` bernilai negatif (kurang dari 0), THE InputPanel SHALL menampilkan elemen input `num2` dengan warna `intpink`; IF nilai `num2` sama dengan nol atau lebih dari nol, THEN THE InputPanel SHALL menampilkan elemen input `num2` dengan warna `intblue`.
11. IF pengguna mengetik karakter non-integer (bukan digit 0–9 dan bukan tanda minus di posisi pertama) pada field input, THEN THE InputPanel SHALL mengabaikan karakter tersebut sehingga nilai field tidak berubah.

---

### Requirement 4: Animasi Mobil Dua-Fase — Logika Arah Hadap dan Arah Gerak

**User Story:** Sebagai siswa, saya ingin melihat mobil bergerak di garis bilangan dengan arah hadap dan gerak yang mencerminkan aturan penjumlahan/pengurangan bilangan bulat, sehingga saya benar-benar memahami konsepnya, bukan sekadar melihat animasi.

#### Acceptance Criteria

1. **Phase 1 — Arah Hadap:**
   - WHEN `num1 > 0`, THE NumberLineCanvas SHALL menampilkan mobil menghadap ke **kanan** selama Phase 1.
   - WHEN `num1 < 0`, THE NumberLineCanvas SHALL menampilkan mobil menghadap ke **kiri** selama Phase 1.
   - IF `num1 = 0`, THEN THE NumberLineCanvas SHALL melewati Phase 1 tanpa animasi gerak dan menempatkan mobil pada posisi `0` sebelum Phase 2 dimulai.

2. **Phase 1 — Arah Gerak:**
   - WHEN `num1 > 0`, THE NumberLineCanvas SHALL menggerakkan mobil ke **kanan** dari posisi `0` ke posisi `num1` dalam durasi `1200ms` dengan easing `easeOutCubic`.
   - WHEN `num1 < 0`, THE NumberLineCanvas SHALL menggerakkan mobil ke **kiri** dari posisi `0` ke posisi `num1` dalam durasi `1200ms` dengan easing `easeOutCubic`.

3. **Phase 2 — Penjumlahan (`operation = '+'`), Arah Hadap:**
   - WHEN `operation = '+'` dan `num2 >= 0`, THE NumberLineCanvas SHALL menampilkan mobil Phase 2 menghadap ke **kanan**.
   - WHEN `operation = '+'` dan `num2 < 0`, THE NumberLineCanvas SHALL menampilkan mobil Phase 2 menghadap ke **kiri**.

4. **Phase 2 — Penjumlahan (`operation = '+'`), Arah Gerak:**
   - WHEN `operation = '+'` dan `num2 > 0`, THE NumberLineCanvas SHALL menggerakkan mobil ke **kanan** dari `num1` ke `num1 + num2` dalam durasi `1200ms` dengan easing `easeOutCubic`.
   - WHEN `operation = '+'` dan `num2 < 0`, THE NumberLineCanvas SHALL menggerakkan mobil ke **kiri** dari `num1` ke `num1 + num2` dalam durasi `1200ms` dengan easing `easeOutCubic`.
   - IF `operation = '+'` dan `num2 = 0`, THEN THE NumberLineCanvas SHALL menampilkan mobil Phase 2 diam di posisi `num1` tanpa animasi gerak selama `1200ms`.

5. **Phase 2 — Pengurangan (`operation = '-'`), Arah Hadap:**
   - WHEN `operation = '-'` dan `num2 > 0`, THE NumberLineCanvas SHALL menampilkan mobil Phase 2 menghadap ke **kiri**.
   - WHEN `operation = '-'` dan `num2 < 0`, THE NumberLineCanvas SHALL menampilkan mobil Phase 2 menghadap ke **kanan**.
   - IF `operation = '-'` dan `num2 = 0`, THEN THE NumberLineCanvas SHALL menampilkan mobil Phase 2 diam di posisi `num1` menghadap ke **kanan** tanpa animasi gerak selama `1200ms`.

6. **Phase 2 — Pengurangan (`operation = '-'`), Arah Gerak:**
   - WHEN `operation = '-'` dan `num2 > 0`, THE NumberLineCanvas SHALL menggerakkan mobil ke **kiri** dari `num1` ke `num1 - num2` dalam durasi `1200ms` dengan easing `easeOutCubic`.
   - WHEN `operation = '-'` dan `num2 < 0`, THE NumberLineCanvas SHALL menggerakkan mobil ke **kanan** dari `num1` ke `num1 - num2` dalam durasi `1200ms` dengan easing `easeOutCubic`.

7. WHILE Phase 2 berlangsung, THE NumberLineCanvas SHALL menampilkan Silhouette Car dengan opasitas `0.4` pada posisi `num1` sebagai penanda posisi perantara; WHEN Phase 2 selesai, THE NumberLineCanvas SHALL menyembunyikan Silhouette Car tersebut.

8. THE NumberLineCanvas SHALL menampilkan Trail berwarna `intblue` untuk Phase 1 ketika `num1 > 0`, Trail berwarna `intpink` ketika `num1 < 0`, dan tidak menampilkan Trail ketika `num1 = 0`.

9. THE NumberLineCanvas SHALL menampilkan Trail berwarna `intblue` untuk Phase 2 ketika arah gerak ke kanan, Trail berwarna `intpink` ketika arah gerak ke kiri, dan tidak menampilkan Trail ketika `num2 = 0`.

10. THE NumberLineCanvas SHALL menampilkan Segment Pill di atas Trail Phase 2 dengan teks `+{|num2|}` ketika arah gerak ke kanan dan `−{|num2|}` ketika arah gerak ke kiri; IF `num2 = 0`, THEN THE NumberLineCanvas SHALL tidak menampilkan Segment Pill.

11. WHEN seluruh animasi dua fase selesai, THE NumberLineCanvas SHALL menampilkan Result Dot pada posisi `result` di garis bilangan; IF `result` berada di luar rentang tampilan garis bilangan yang terrender, THEN THE NumberLineCanvas SHALL menggeser tampilan sehingga Result Dot tetap terlihat.

12. WHEN animasi Phase 2 selesai, THE NumberLineCanvas SHALL memanggil callback `onResult(result)` tepat sekali per siklus animasi.

13. WHEN `runKey` berubah nilainya, THE NumberLineCanvas SHALL membatalkan animasi yang sedang berjalan, mereset posisi mobil ke `0`, menghapus semua Trail dan Segment Pill, menyembunyikan Result Dot, dan memulai ulang animasi dari Phase 1.

---

### Requirement 5: Garis Bilangan Scrollable dengan Tick Spacing Konsisten

**User Story:** Sebagai siswa, saya ingin dapat menggeser garis bilangan ke kiri atau kanan ketika angkanya sangat besar, sehingga saya tetap dapat melihat seluruh pergerakan mobil dengan jelas.

#### Acceptance Criteria

1. THE ScrollableNumberLine SHALL merender garis bilangan pada canvas dengan lebar virtual dihitung sebagai `(jumlah_tick_total + 2) × 60px`, di mana jumlah tick mencakup seluruh rentang dari nilai minimum hingga maksimum operasi yang sedang ditampilkan.
2. THE ScrollableNumberLine SHALL mempertahankan jarak antar tick tetap sebesar 60px per satuan bilangan bulat pada semua posisi scroll, sehingga jarak visual antar tick tidak berubah saat pengguna menggeser tampilan.
3. THE ScrollableNumberLine SHALL menyediakan kontrol scroll horizontal yang dapat dioperasikan dengan drag pada layar sentuh maupun klik-dan-geser pada perangkat pointer, sehingga pengguna dapat menggeser tampilan ke seluruh bagian garis bilangan.
4. WHEN animasi mobil berjalan dan posisi piksel mobil berada di luar batas `[scrollOffset, scrollOffset + viewportWidth]`, THE ScrollableNumberLine SHALL menggeser viewport secara otomatis agar posisi mobil berada dalam rentang `[scrollOffset + 60px, scrollOffset + viewportWidth - 60px]` dalam waktu tidak lebih dari 300ms.
5. THE ScrollableNumberLine SHALL menampilkan minimal 10 tick dalam satu viewport; IF lebar viewport tidak mencukupi untuk menampilkan 10 tick pada spacing 60px (yaitu lebar viewport < 600px), THEN THE ScrollableNumberLine SHALL mengurangi tick spacing hingga minimum 30px per satuan agar 10 tick tetap terlihat.
6. IF lebar canvas virtual melebihi lebar container dan terdapat konten yang belum terlihat di sisi kiri, THEN THE ScrollableNumberLine SHALL menampilkan shadow gradient dengan lebar 24px di tepi kiri canvas; IF terdapat konten yang belum terlihat di sisi kanan, THEN THE ScrollableNumberLine SHALL menampilkan shadow gradient dengan lebar 24px di tepi kanan canvas.
7. WHEN ukuran container berubah, THE ScrollableNumberLine SHALL menyesuaikan jumlah tick yang terlihat dalam viewport dalam waktu tidak lebih dari 100ms tanpa mengubah tick spacing yang sedang aktif, dan tanpa mengubah posisi scroll yang sedang aktif kecuali posisi scroll saat ini menjadi invalid karena lebar container bertambah.

---

### Requirement 6: ResultPanel — Panel Hasil dan Penjelasan Naratif

**User Story:** Sebagai siswa, saya ingin melihat hasil perhitungan dan penjelasan naratif setelah animasi selesai, sehingga saya memahami apa yang baru saja terjadi di garis bilangan.

#### Acceptance Criteria

1. WHEN animasi selesai dan `result` tersedia, THE ResultPanel SHALL menampilkan persamaan lengkap dalam format `num1 op num2 = result`, di mana `op` adalah salah satu dari operator `+` atau `-`.
2. THE ResultPanel SHALL menampilkan setiap angka (num1, num2, result) dalam warna `intblue` jika nilainya lebih dari atau sama dengan 0, dan dalam warna `intpink` jika nilainya kurang dari 0.
3. THE ResultPanel SHALL menampilkan angka negatif dalam format `(n)` (dengan tanda kurung menggantikan tanda minus) di dalam persamaan, sehingga `-3` ditampilkan sebagai `(-3)`.
4. WHEN animasi selesai dan `result` tersedia, THE ResultPanel SHALL menampilkan penjelasan naratif dua-fase secara berurutan:
   - Fase 1: deskripsi pergerakan dari titik `0` ke `num1`, menyebutkan arah (kanan jika `num1 > 0`, kiri jika `num1 < 0`) dan jarak (nilai absolut `num1`) langkah; jika `num1 === 0` maka Fase 1 menyebutkan bahwa tidak ada pergerakan.
   - Fase 2: deskripsi pergerakan dari `num1` ke `result`, menyebutkan aturan arah yang berlaku berdasarkan operator dan tanda `num2`.
5. IF `result === 0`, THEN THE ResultPanel SHALL menampilkan pesan tambahan "🔄 Kembali ke titik asal!" di bawah penjelasan naratif Fase 2.
6. WHILE animasi belum pernah dijalankan, THE ResultPanel SHALL menampilkan teks placeholder yang mengajak pengguna memasukkan angka dan menekan tombol hitung, serta tidak menampilkan persamaan maupun penjelasan naratif.

---

### Requirement 7: InstructionModal — Panduan Operasi

**User Story:** Sebagai siswa baru, saya ingin dapat membaca panduan cara membaca animasi garis bilangan, sehingga saya mengerti apa arti arah hadap dan arah gerak mobil.

#### Acceptance Criteria

1. THE InstructionModal SHALL menampilkan konten instruksi yang berbeda untuk operasi penjumlahan dan operasi pengurangan, ditentukan oleh prop operasi yang diterima saat modal dibuka.
2. WHEN InstructionModal ditampilkan dengan operasi penjumlahan, THE InstructionModal SHALL memuat keempat aturan berikut secara lengkap:
   - Bilangan pertama positif → mobil bergerak ke kanan dari 0.
   - Bilangan pertama negatif → mobil bergerak ke kiri dari 0.
   - Bilangan kedua positif → mobil menghadap kanan dan bergerak ke kanan.
   - Bilangan kedua negatif → mobil menghadap kiri dan bergerak ke kiri.
3. WHEN InstructionModal ditampilkan dengan operasi pengurangan, THE InstructionModal SHALL memuat keempat aturan berikut secara lengkap:
   - Bilangan pertama positif → mobil bergerak ke kanan dari 0.
   - Bilangan pertama negatif → mobil bergerak ke kiri dari 0.
   - Bilangan kedua positif → mobil menghadap kiri dan bergerak ke kiri.
   - Bilangan kedua negatif → mobil menghadap kiri tetapi bergerak mundur ke kanan.
4. WHEN tombol 💡 pada InputPanel ditekan, THE InstructionModal SHALL terbuka dan menampilkan overlay backdrop yang menutupi seluruh viewport di atas konten halaman.
5. WHEN InstructionModal terbuka dan pengguna menekan tombol tutup, THE InstructionModal SHALL tertutup dan overlay backdrop tidak lagi ditampilkan.
6. WHEN InstructionModal terbuka dan pengguna menekan area backdrop di luar konten modal, THE InstructionModal SHALL tertutup dan overlay backdrop tidak lagi ditampilkan.
7. IF InstructionModal terbuka dan pengguna menekan tombol Escape pada keyboard, THEN THE InstructionModal SHALL tertutup dan overlay backdrop tidak lagi ditampilkan.

---

### Requirement 8: Konsistensi Visual dengan Intline

**User Story:** Sebagai pengembang, saya ingin komponen garis bilangan di linechip terlihat dan berperilaku identik dengan intline, sehingga pengguna yang familiar dengan salah satu produk dapat langsung menggunakan yang lain tanpa belajar ulang.

#### Acceptance Criteria

1. THE NumberLineCanvas SHALL menggunakan fungsi drawing dari `lib/canvas/numberLineRenderer.ts` yang sudah ada di linechip tanpa mendefinisikan ulang fungsi-fungsi tersebut di file komponen manapun.
2. THE NumberLineCanvas SHALL menggunakan warna `intblue` (#2F6FED) untuk trail dan elemen bergerak ke kanan, dan `intpink` (#EC4899) untuk trail dan elemen bergerak ke kiri, konsisten dengan design token linechip.
3. THE PenjumlahanPage dan THE PenguranganPage SHALL menggunakan komponen layout linechip (Navbar, AppShell) dan global CSS linechip, bukan komponen Bootstrap atau custom CSS dari intline.
4. THE InputPanel SHALL menggunakan Tailwind CSS dengan class `rounded-2xl` dan warna `intblue`/`intpink` dari design token linechip, bukan style Bootstrap atau custom CSS dari intline.
5. THE NumberLineCanvas SHALL menggunakan konstanta `CANVAS_HEIGHT = 280`, `CAR_Y = 65`, `LINE_Y = 100` sehingga ketinggian canvas tetap `280px` dan posisi vertikal elemen konsisten.
6. THE Segment Pill SHALL menampilkan teks dengan font-size dan padding yang sama dengan intline; THE Result Dot SHALL memiliki radius dan warna glow yang sama dengan intline; THE Silhouette Car SHALL menggunakan opasitas `0.4`; THE Dust Particles SHALL muncul pada setiap akhir Phase 1 dan Phase 2.

---

### Requirement 9: Aksesibilitas dan UX

**User Story:** Sebagai siswa dengan kebutuhan aksesibilitas, saya ingin dapat mengoperasikan seluruh fitur menggunakan keyboard dan mendapatkan label yang deskriptif, sehingga saya tidak merasa dikecualikan.

#### Acceptance Criteria

1. THE InputPanel SHALL menyediakan atribut `aria-label` pada setiap elemen interaktif (tombol stepper, input angka, tombol hitung, tombol instruksi) dengan teks yang mengidentifikasi fungsi dan konteks elemen tersebut (contoh: "Tambah nilai pertama", "Input nilai pertama", "Hitung hasil", "Buka instruksi").
2. THE InstructionModal SHALL menyediakan atribut `aria-modal="true"`, `role="dialog"`, dan `aria-labelledby` yang mengarah ke `id` elemen judul modal yang terlihat di dalam modal.
3. WHEN InstructionModal terbuka, THE FocusTrap SHALL mempertahankan fokus keyboard di dalam modal, sehingga penekanan Tab dari elemen terakhir memindahkan fokus ke elemen interaktif pertama di dalam modal, dan penekanan Shift+Tab dari elemen pertama memindahkan fokus ke elemen interaktif terakhir di dalam modal, hingga modal ditutup.
4. WHEN InstructionModal terbuka dan pengguna menekan tombol Escape, THE InstructionModal SHALL menutup diri dan mengembalikan fokus keyboard ke elemen yang memicu pembukaan modal.
5. THE NumberLineCanvas SHALL menyediakan atribut `aria-label` yang mendeskripsikan operasi dan hasil animasi dalam format teks "Animasi garis bilangan: [operand1] [operator] [operand2] = [hasil]", dan atribut ini SHALL diperbarui setiap kali nilai operasi berubah.
6. WHEN NumberLineCanvas mendapatkan fokus keyboard, THE ScrollableNumberLine SHALL merespons penekanan tombol ArrowLeft dan ArrowRight dengan men-scroll konten canvas masing-masing sebesar 40px ke kiri atau ke kanan.
7. WHEN pengguna mengoperasikan tombol stepper atau tombol hitung menggunakan keyboard (tombol Enter atau Space), THE InputPanel SHALL merespons aksi tersebut secara identik dengan aksi klik pointer pada elemen yang sama.

