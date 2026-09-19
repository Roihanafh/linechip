# Requirements Document

## Introduction

Fitur ini mengintegrasikan sistem soal otomatis dan poin ke dua halaman game yang sudah ada di linechip:

1. **Game Model Chip** (`/game-virus`) — menggunakan tampilan, flow, dan komponen `game-virus/page.tsx` yang sudah ada. Ditambahkan soal penjumlahan dan pengurangan acak (`a op b = ?`), validasi **chip placement** (siswa harus menyeret chip yang tepat ke zona Bilangan 1 dan Bilangan 2 sesuai soal), validasi jawaban numerik akhir, dan sistem poin. **Poin hanya diberikan jika seluruh flow diselesaikan dengan benar: chip placement benar + jawaban numerik benar.**

2. **Game Garis Bilangan** (`/intline-run`) — menggunakan tampilan, flow, dan komponen `intline-run/page.tsx` yang sudah ada. Sudah memiliki `generateQuestion()`, `checkAnswer()`, `feedback`, dan auto-advance. Ditambahkan validasi **arrow placement** (Arrow 1 dan Arrow 2 harus diposisikan sesuai soal sebelum jawaban dihitung), skor sesi di header, dan pengiriman poin ke Firestore. **Poin hanya diberikan jika posisi panah benar + jawaban numerik benar.**

Kedua game berbagi sistem poin yang sama: 10 poin per penyelesaian flow yang benar, akumulasi `Session_Score` di memori, dan penyimpanan ke `users/{uid}.totalScore` via Firestore `increment` jika pengguna login. Jika Firestore gagal, poin diantrekan ke `localStorage`. Halaman profil menampilkan `totalScore` dengan label "Total Poin".

Semua behaviour, komponen, dan animasi yang sudah ada dipertahankan sepenuhnya. Penambahan hanya berupa lapisan soal, validasi placement, validasi jawaban, skor, dan penyimpanan di atas yang sudah berjalan.

## Glossary

- **Game_Chip** (`/game-virus`): Halaman game model chip existing yang akan ditambahkan soal otomatis, validasi chip placement, dan sistem poin.
- **Game_Line** (`/intline-run`): Halaman game garis bilangan existing yang akan ditambahkan validasi arrow placement, skor sesi di header, dan penyimpanan poin ke Firestore.
- **Chip_Question**: Satu soal operasi bilangan bulat acak untuk Game_Chip, dengan operator `+` atau `−` yang ditentukan secara acak, dan operan dalam rentang −9.999 hingga +9.999.
- **Line_Question**: Satu soal operasi bilangan bulat acak untuk Game_Line, dihasilkan oleh `generateQuestion()` yang sudah ada, dengan operator `+` atau `−` acak dan operan dalam rentang −99 hingga +99.
- **Correct_Answer**: Hasil aritmetika `a op b` yang benar dari soal aktif.
- **Chip_Placement**: Kondisi di mana `bil1Value === q.a` dan `bil2Value === q.b` pada saat tombol "Hitung Hasil" diaktifkan.
- **Arrow_Placement**: Kondisi di mana Arrow 1 memenuhi `start === 0` dan `length === q.a`, serta Arrow 2 memenuhi `start === q.a` dan `length === q.b` (jika `op = '+'`) atau `length === -q.b` (jika `op = '-'`), pada saat tombol "Periksa" diaktifkan.
- **Session_Score**: Akumulasi poin dalam satu sesi game di memori; direset ke nol saat pengguna keluar dari halaman game.
- **Total_Score** (alias `totalScore`): Jumlah poin total yang tersimpan di dokumen Firestore `users/{uid}` pada field `totalScore`.
- **Score_Service**: Modul yang mengurus penambahan poin ke Firestore `users/{uid}` via `increment(10)` atomic, menggunakan `firebase.client.ts` yang sudah ada; diekspos sebagai satu fungsi yang dapat diimpor oleh kedua halaman game.
- **Pending_Queue**: Antrian poin yang gagal ditulis ke Firestore, disimpan di `localStorage` dengan key `linechip_pending_score_{uid}`.
- **Chip_Question_Generator**: Fungsi pure yang menghasilkan Chip_Question acak; analog dengan `generateQuestion()` di `useGameLineState.ts`.
- **Answer_Input**: Field input numerik di Game_Chip tempat siswa memasukkan jawaban bilangan bulat (di Game_Line sudah ada via `GameLineKeypad`).
- **Feedback_Panel**: Area UI yang menampilkan hasil evaluasi jawaban (benar/salah) beserta persamaan lengkap, atau pesan chip/arrow placement yang tidak sesuai.
- **Chip_Feedback**: Feedback spesifik di Game_Chip yang memberi tahu siswa apakah penempatan chip di Bilangan 1 dan Bilangan 2 sudah sesuai soal.
- **Arrow_Feedback**: Feedback spesifik di Game_Line yang memberi tahu siswa apakah posisi Arrow 1 dan Arrow 2 sudah sesuai soal.
- **Profil_Page**: Halaman profil pengguna di `/profile`, diimplementasikan oleh `ProfileClient.tsx`.
- **intblue**: Token warna utama linechip (`#2F6FED`).
- **intpink**: Token warna aksen linechip (`#EC4899`).

---

## Requirements

### Requirement 1: Soal Otomatis di Game Model Chip

**User Story:** Sebagai siswa, saya ingin Game Model Chip menampilkan soal penjumlahan atau pengurangan secara otomatis, sehingga saya tahu chip mana yang harus saya seret ke zona Bilangan 1 dan Bilangan 2.

#### Acceptance Criteria

1. THE Game_Chip SHALL menampilkan satu Chip_Question aktif di area header game dalam format `a op b = ?`.
2. THE Chip_Question_Generator SHALL menghasilkan operan `a` dan `b` masing-masing berupa bilangan bulat acak bukan nol dalam rentang −9.999 hingga +9.999 (inklusif, nol dikecualikan).
3. THE Chip_Question_Generator SHALL memilih operator `op` secara acak antara `+` dan `−` dengan peluang 50/50 untuk setiap soal yang dihasilkan.
4. THE Chip_Question_Generator SHALL menghitung `Correct_Answer` sebagai `a + b` bila `op = '+'`, dan `a − b` bila `op = '−'`, menggunakan aritmetika integer JavaScript.
5. WHEN Game_Chip dimuat pertama kali, THE Game_Chip SHALL menghasilkan satu Chip_Question pertama dan menampilkannya di header tanpa mengisi zona Bilangan 1 dan Bilangan 2 secara otomatis — siswa harus menyeret chip sendiri sesuai nilai `a` dan `b`.
6. IF `a` atau `b` bernilai negatif, THEN THE Game_Chip SHALL menampilkan nilai tersebut dalam kurung pada tampilan soal (contoh: `(−5)`), sesuai konvensi format yang sudah dipakai di `game-virus/page.tsx`.
7. THE Game_Chip SHALL memberi warna berbeda pada nilai operan: nilai positif menggunakan warna `intblue`, nilai negatif menggunakan warna `intpink`, dan nilai nol menggunakan warna netral.
8. THE Answer_Input SHALL direset ke kosong dan Chip_Placement SHALL direset setiap kali Chip_Question baru dimuat (baik saat auto-advance maupun saat tombol "Soal Baru" diaktifkan).

---

### Requirement 2: Validasi Chip Placement dan Jawaban di Game Model Chip

**User Story:** Sebagai siswa, saya ingin mengetahui apakah chip yang saya susun sudah sesuai soal dan apakah jawaban akhir saya benar, sehingga saya belajar cara merepresentasikan bilangan dengan chip secara akurat.

#### Acceptance Criteria

1. THE Game_Chip SHALL menyediakan Answer_Input berupa field input numerik yang menerima maksimal 6 karakter (tanda minus opsional + 5 digit), terpisah dari zona Bilangan yang menampilkan chip soal.
2. THE Answer_Input SHALL menerima karakter digit `0`–`9`, tanda minus `−` di posisi paling pertama saja, dan karakter Backspace; karakter lain diabaikan.
3. WHEN pengguna mengaktifkan tombol "Hitung Hasil", THE Game_Chip SHALL terlebih dahulu menjalankan validasi Chip_Placement sebelum memulai animasi `InteractionAnimation`.
4. IF `bil1Value` tidak sama dengan `a` dari Chip_Question aktif saat "Hitung Hasil" diaktifkan, THEN THE Game_Chip SHALL menampilkan Chip_Feedback bertipe error dengan pesan "Chip di Bilangan 1 harus bernilai [a]" pada Feedback_Panel dan tidak memulai animasi.
5. IF `bil2Value` tidak sama dengan `b` dari Chip_Question aktif saat "Hitung Hasil" diaktifkan, THEN THE Game_Chip SHALL menampilkan Chip_Feedback bertipe error dengan pesan "Chip di Bilangan 2 harus bernilai [b]" pada Feedback_Panel dan tidak memulai animasi; IF kedua nilai tidak sesuai, THE Game_Chip SHALL menampilkan satu pesan yang menyebutkan Bilangan 1 terlebih dahulu.
6. WHEN Chip_Placement valid (bil1Value === a DAN bil2Value === b), THE Game_Chip SHALL memulai animasi `InteractionAnimation` sesuai behaviour existing tanpa modifikasi pada komponen tersebut.
7. WHEN pengguna mengaktifkan tombol "Periksa" atau menekan `Enter` di Answer_Input setelah animasi selesai, THE Game_Chip SHALL membandingkan nilai di Answer_Input dengan `Correct_Answer` dari Chip_Question aktif.
8. IF Answer_Input kosong atau hanya berisi `−` saat tombol "Periksa" atau `Enter` diaktifkan, THEN THE Game_Chip SHALL menampilkan pesan "Jawaban tidak boleh kosong" pada Feedback_Panel, mempertahankan Answer_Input apa adanya, dan tidak memproses validasi lebih lanjut.
9. WHILE animasi `InteractionAnimation` sedang berjalan, THE tombol "Periksa" SHALL berada dalam kondisi dinonaktifkan sehingga validasi jawaban numerik tidak dapat dipicu.
10. WHEN Chip_Placement valid DAN jawaban numerik dinyatakan benar, THE Game_Chip SHALL menampilkan Feedback_Panel bertipe sukses memuat persamaan `a op b = jawaban`, menambahkan 10 poin ke Session_Score sebelum jeda dimulai, lalu setelah jeda 2.000 ms menghasilkan Chip_Question baru secara otomatis dan mereset Answer_Input, Feedback_Panel, serta zona Bilangan 1 dan Bilangan 2 ke kosong.
11. WHEN jawaban numerik dinyatakan salah (dengan Chip_Placement yang telah valid), THE Game_Chip SHALL menampilkan Feedback_Panel bertipe error yang memuat nilai `Correct_Answer`; tombol "Periksa" SHALL kembali diaktifkan segera setelah Feedback_Panel ditampilkan; Session_Score tidak berubah.
12. THE Game_Chip SHALL menyediakan tombol "Soal Baru" yang, saat diaktifkan, menghasilkan Chip_Question baru dan mereset Answer_Input, Feedback_Panel, serta zona Bilangan 1 dan Bilangan 2 ke kosong tanpa mengubah Session_Score.

---

### Requirement 3: Skor Sesi di Game Model Chip

**User Story:** Sebagai siswa, saya ingin melihat berapa poin yang sudah saya kumpulkan selama sesi ini di Game Model Chip, sehingga saya termotivasi untuk menyelesaikan flow chip placement dan jawaban dengan benar.

#### Acceptance Criteria

1. THE Game_Chip SHALL menampilkan Session_Score di area header game berdampingan dengan Chip_Question, dengan label "Sesi:", diformat sebagai angka bulat lokal Indonesia (contoh: `1.250` untuk nilai 1250), selama game berlangsung.
2. WHEN Chip_Placement valid DAN jawaban numerik dinyatakan benar, THE Game_Chip SHALL menambahkan 10 poin ke Session_Score di memori; nilai Session_Score SHALL diperbarui secara langsung sebelum jeda auto-advance 2.000 ms dimulai.
3. THE Game_Chip SHALL mempertahankan nilai Session_Score saat Chip_Placement tidak valid atau saat jawaban numerik dinyatakan salah.
4. WHILE pengguna login, THE Game_Chip SHALL menampilkan Total_Score dari `profile.totalScore` yang disediakan AuthProvider di header game berdampingan dengan Session_Score, dengan label "Total:"; IF `profile.totalScore` tidak terdefinisi atau `profile` belum dimuat, THEN THE Game_Chip SHALL menampilkan `0` sebagai nilai default untuk Total_Score.
5. WHEN pengguna menavigasi keluar dari `/game-virus`, THE Session_Score SHALL direset ke nol; nilai Session_Score tidak dipersist ke Firestore sebagai satu kesatuan — poin individual dikirim via Score_Service per penyelesaian flow yang benar sesuai Requirement 5.

---

### Requirement 4: Validasi Arrow Placement dan Skor Sesi di Game Garis Bilangan

**User Story:** Sebagai siswa, saya ingin game garis bilangan memeriksa apakah saya menempatkan panah di posisi yang tepat sesuai soal sebelum menerima jawaban, sehingga saya memahami representasi operasi bilangan bulat pada garis bilangan secara akurat.

#### Acceptance Criteria

1. THE Game_Line SHALL menampilkan Session_Score di area header game berdampingan dengan judul halaman, dengan label "Sesi:", diformat sebagai angka bulat lokal Indonesia (contoh: `1.250` untuk nilai 1250), selama game berlangsung.
2. WHEN pengguna mengaktifkan tombol "Periksa" di Game_Line, THE Game_Line SHALL terlebih dahulu menjalankan validasi Arrow_Placement sebelum memanggil `checkAnswer()`.
3. THE validasi Arrow_Placement SHALL memeriksa bahwa Arrow 1 memenuhi `start === 0` DAN `length === q.a`, serta Arrow 2 memenuhi `start === q.a` DAN `length === q.b` (jika `op = '+'`) atau `length === -q.b` (jika `op = '-'`).
4. IF Arrow_Placement tidak valid saat "Periksa" diaktifkan, THEN THE Game_Line SHALL menampilkan Arrow_Feedback bertipe error dengan pesan "Posisi panah belum tepat — Arrow 1 harus dimulai dari 0 dengan panjang [a], Arrow 2 dari [a] dengan panjang [expected_b]" pada Feedback_Panel dan tidak memanggil `checkAnswer()`.
5. WHEN Arrow_Placement valid, THE Game_Line SHALL memanggil `checkAnswer()` dari `useGameLineState` yang sudah ada; jika `checkAnswer()` mengembalikan `true`, THE Game_Line SHALL menambahkan 10 poin ke Session_Score di memori dan memanggil `awardPoints(user?.uid ?? null)` sebelum jeda auto-advance 2.000 ms dimulai.
6. THE Game_Line SHALL mempertahankan nilai Session_Score saat Arrow_Placement tidak valid atau saat `checkAnswer()` mengembalikan `false`.
7. WHILE pengguna login, THE Game_Line SHALL menampilkan Total_Score dari `profile.totalScore` yang disediakan AuthProvider di header game berdampingan dengan Session_Score, dengan label "Total:"; IF `profile.totalScore` tidak terdefinisi atau `profile` belum dimuat, THEN THE Game_Line SHALL menampilkan `0` sebagai nilai default untuk Total_Score.
8. THE Game_Line SHALL mempertahankan logika `generateQuestion()`, `checkAnswer()`, `feedback`, dan auto-advance 2.000 ms yang sudah ada di `useGameLineState.ts` tanpa modifikasi; validasi Arrow_Placement dan penambahan Session_Score terjadi di sisi pemanggil (`handleCheckAnswer` di `page.tsx`) sebagai lapisan di atas alur yang sudah ada.

---

### Requirement 5: Penyimpanan Poin ke Firestore

**User Story:** Sebagai siswa yang login, saya ingin poin dari setiap penyelesaian flow yang benar tersimpan ke profil Firestore saya secara otomatis, sehingga kemajuan saya terekam lintas sesi.

#### Acceptance Criteria

1. WHEN pengguna login dan flow diselesaikan dengan benar (Chip_Placement valid + jawaban benar di Game_Chip, atau Arrow_Placement valid + jawaban benar di Game_Line), THE Score_Service SHALL menambahkan 10 poin ke field `totalScore` di dokumen Firestore `users/{uid}` menggunakan operasi `increment(10)` atomic; penulisan dianggap gagal jika tidak mendapat konfirmasi dari Firestore dalam 10.000 ms.
2. IF pengguna tidak login saat flow diselesaikan dengan benar, THEN THE Score_Service SHALL menambahkan poin ke Session_Score di memori saja dan tidak menulis ke Firestore maupun Pending_Queue.
3. THE Score_Service SHALL menggunakan Firestore client dari `features/auth/services/firebase.client.ts` yang sudah ada sebagai satu-satunya sumber instance Firestore.
4. IF penulisan ke Firestore gagal, THEN THE Score_Service SHALL menambahkan nilai 10 ke Pending_Queue di `localStorage` dengan key `linechip_pending_score_{uid}`; total nilai yang tersimpan di Pending_Queue tidak boleh melebihi 99.990 poin.
5. WHEN aplikasi dimuat di sisi klien dan pengguna dalam kondisi login, THE Score_Service SHALL membaca Pending_Queue dari `localStorage` satu kali per sesi dan mengirimkan total poin tertunda ke Firestore dalam satu operasi `increment` tunggal; IF pengiriman berhasil, THEN THE Score_Service SHALL menghapus Pending_Queue dari `localStorage`; IF pengiriman gagal, THEN THE Score_Service SHALL mempertahankan Pending_Queue yang ada tanpa duplikasi.
6. THE Score_Service SHALL berupa modul yang dapat diimpor oleh Game_Chip dan Game_Line tanpa duplikasi logika penyimpanan; modul ini SHALL mengekspos satu fungsi yang menerima `uid` dan menangani seluruh alur tulis Firestore dan fallback Pending_Queue secara internal.

---

### Requirement 6: Tampilan Total Poin di Halaman Profil

**User Story:** Sebagai siswa, saya ingin melihat total poin saya di halaman profil, sehingga saya dapat melacak kemajuan belajar dari waktu ke waktu.

#### Acceptance Criteria

1. THE Profil_Page SHALL menampilkan nilai `totalScore` dari dokumen Firestore pengguna di section "Informasi Akun" sebagai satu baris baru dengan label "Total Poin", mengikuti struktur dan pola visual yang sama dengan baris `email`, `school`, dan tanggal bergabung yang sudah ada di `ProfileClient.tsx`.
2. IF field `totalScore` belum ada di dokumen Firestore pengguna, THEN THE Profil_Page SHALL menampilkan angka `0` sebagai nilai default.
3. THE `UserProfile` interface di `features/auth/types/index.ts` SHALL diperluas dengan field `totalScore?: number` yang bersifat opsional sehingga dokumen pengguna yang dibuat sebelum fitur ini tetap valid.
4. THE Profil_Page SHALL menampilkan nilai `totalScore` menggunakan format angka lokal Indonesia (contoh: `1.250` untuk nilai 1250), konsisten dengan format angka di game pages.
5. WHEN Total_Score diperbarui di Firestore, THE Profil_Page SHALL menampilkan nilai terbaru secara otomatis melalui listener Firestore real-time yang sudah ada di `AuthProvider` — setiap snapshot Firestore baru memperbarui `profile.totalScore` tanpa polling tambahan.

---

### Requirement 7: Integritas Behaviour Existing

**User Story:** Sebagai pengguna linechip yang sudah mengenal platform ini, saya ingin semua penambahan game terasa sebagai bagian alami dari aplikasi tanpa mengubah fungsionalitas yang sudah bekerja.

#### Acceptance Criteria

1. THE Game_Chip SHALL mempertahankan seluruh behaviour drag-and-drop yang ada, termasuk `BilanganZone`, `PoolButton`, undo riwayat, dan toggle target Bilangan 1/2.
2. THE animasi `InteractionAnimation`, `BattleStage`, `AllianceStage`, dan `PairReactionStage` SHALL beroperasi dengan behaviour yang identik dengan sebelum fitur ini ditambahkan.
3. THE Game_Line SHALL mempertahankan `GameLineCanvas`, `GameLineArrowControls`, `GameLineKeypad`, dan logika animasi panah dengan behaviour yang identik dengan sebelum fitur ini ditambahkan.
4. THE halaman materi (`/materi`) SHALL memperbarui teks deskripsi game pada kartu promosi game (paragraf di bawah judul "Ingin belajar sambil bermain?") sehingga mencantumkan kata "soal otomatis", dengan mempertahankan seluruh layout, link href ke `/game-virus` dan `/intline-run`, serta semua elemen visual lainnya.
5. THE Feedback_Panel di Game_Chip SHALL menggunakan class `bg-success/10 text-success border-success/20` untuk jawaban benar dan class `bg-error/10 text-error border-error/20` untuk jawaban salah atau chip/arrow placement tidak valid, konsisten dengan Feedback_Panel yang sudah dipakai di `intline-run/page.tsx`.

---

### Requirement 8: Aksesibilitas

**User Story:** Sebagai siswa, saya ingin dapat menggunakan mode game sepenuhnya dengan keyboard dan mendapat umpan balik yang dapat diakses pembaca layar.

#### Acceptance Criteria

1. THE Answer_Input di Game_Chip SHALL dapat difokus melalui navigasi keyboard `Tab` dan SHALL menerima kunci `Enter` sebagai pemicu validasi jawaban; jika Answer_Input kosong saat `Enter` ditekan, THE Game_Chip SHALL menampilkan pesan "Jawaban tidak boleh kosong" pada Feedback_Panel — setara dengan menekan tombol "Periksa" dalam kondisi yang sama.
2. THE Feedback_Panel di Game_Chip SHALL menggunakan atribut `role="alert"` sehingga pembaca layar mengumumkan hasil evaluasi (termasuk pesan chip placement tidak valid) secara otomatis, konsisten dengan atribut yang sudah dipakai di `intline-run/page.tsx`.
3. THE Chip_Question yang ditampilkan SHALL memiliki atribut `aria-label` yang mendeskripsikan soal secara lengkap dalam teks verbal; nilai negatif SHALL dibaca sebagai "negatif N" (contoh: `"Soal: 5 ditambah negatif 3 sama dengan?"`).
4. THE tombol "Periksa" dan "Soal Baru" di Game_Chip SHALL menggunakan `aria-disabled="true"` dan mempertahankan `tabIndex={0}` saat dinonaktifkan selama animasi, sehingga urutan Tab tidak terputus dan fokus keyboard tetap dapat berpindah ke elemen tersebut.
5. WHEN media query `prefers-reduced-motion` aktif, THE animasi di Game_Chip SHALL berperilaku sesuai mekanisme `prefers-reduced-motion` yang sudah diimplementasikan di `InteractionAnimation`, tanpa penanganan tambahan di layer game.
