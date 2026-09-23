# Requirements Document

## Introduction

Fitur ini menambahkan sistem timer dan poin berbasis kecepatan ke dua game di aplikasi **linechip**:

1. **Game Virus** (`/game-virus`) — pemain menyusun chip Ab/Ku lalu menjawab soal bilangan bulat
2. **Game Garis Bilangan** (`/intline-run`) — pemain mengatur posisi panah pada garis bilangan lalu menjawab soal

Sistem timer berjalan sejak soal ditampilkan. Semakin cepat pemain menjawab dengan benar, semakin besar poin yang diberikan. Setelah 90 detik, poin minimal tetap diberikan untuk setiap jawaban yang benar — jawaban tidak pernah menjadi tidak valid karena timer habis.

## Glossary

- **Timer**: Pencatat waktu yang mulai berjalan ketika soal baru ditampilkan dan berhenti ketika jawaban benar dikirim.
- **Elapsed_Time**: Waktu (dalam detik, bilangan bulat, ≥ 0) yang telah berlalu sejak soal muncul.
- **Bonus_Window**: Rentang waktu grace period 0–5 detik di mana skor tetap pada nilai maksimum (50 poin). Setelah 5 detik, skor mulai menurun secara linear hingga mencapai `Min_Points` pada detik ke-90.
- **Min_Points**: Poin minimum yang selalu diberikan untuk jawaban benar, yaitu **5 poin**.
- **Base_Points**: Poin dasar yang diberikan untuk jawaban benar, yaitu **10 poin** (nilai `POINTS_PER_CORRECT` yang sudah ada).
- **Speed_Bonus**: Poin tambahan yang diberikan berdasarkan kecepatan menjawab, di atas `Base_Points`. Bernilai 0 jika `Elapsed_Time ≥ 90`. Dihitung dengan interpolasi linear: `Math.max(Min_Points + 1, Math.round(50 - ((t - 5) / 84) * 44))` untuk `t` di rentang (5, 89].
- **Timed_Score**: Total poin untuk satu jawaban benar = `Base_Points + Speed_Bonus`, dengan nilai minimum `Min_Points`.
- **Score_Service**: Modul `features/game/scoreService.ts` yang mengirim poin ke Firestore.
- **Game_Virus**: Halaman game di `/game-virus`.
- **Game_Line**: Halaman game di `/intline-run`.
- **useTimedScoring**: Custom React hook baru yang mengenkapsulasi logika timer dan kalkulasi `Timed_Score`.
- **TimerDisplay**: Komponen UI yang menampilkan waktu yang telah berlalu dan konteks kecepatan.
- **computeTimedScore**: Pure function yang menerima `Elapsed_Time` dan mengembalikan `Timed_Score`.

---

## Requirements

### Requirement 1: Kalkulasi Poin Berbasis Kecepatan

**User Story:** Sebagai pemain, saya ingin mendapatkan poin lebih banyak ketika menjawab soal dengan cepat, sehingga ada insentif untuk meningkatkan kemampuan hitung saya.

#### Acceptance Criteria

1. THE `computeTimedScore` SHALL menerima `Elapsed_Time` (detik, ≥ 0) sebagai input dan mengembalikan bilangan bulat positif sebagai `Timed_Score`.
2. WHEN `Elapsed_Time` bernilai ≤ 5 detik (grace period), THE `computeTimedScore` SHALL mengembalikan `MAX_POINTS` (50 poin).
3. WHEN `Elapsed_Time` berada di rentang 6–89 detik (inklusif), THE `computeTimedScore` SHALL mengembalikan nilai yang turun secara monoton dari 47 poin menuju 6 poin menggunakan interpolasi linear dengan formula `Math.max(Min_Points + 1, Math.round(50 - ((Elapsed_Time - 5) / 84) * 44))`.
4. WHEN `Elapsed_Time` bernilai ≥ 90 detik, THE `computeTimedScore` SHALL mengembalikan `Min_Points` (5 poin).
5. THE `computeTimedScore` SHALL selalu mengembalikan nilai dalam rentang `[Min_Points, MAX_POINTS]` (yaitu [5, 50]) untuk semua nilai `Elapsed_Time` yang valid.
6. THE `computeTimedScore` SHALL mengembalikan nilai bertipe bilangan bulat (tanpa desimal) untuk semua input.
7. FOR ALL nilai `Elapsed_Time` `t1` dan `t2` di mana `t1 < t2`, THE `computeTimedScore` SHALL mengembalikan nilai `computeTimedScore(t1) ≥ computeTimedScore(t2)` (monoton tidak naik).

#### Tabel Sampel

| t (detik) | Timed_Score |
|----------:|------------:|
|         0 |          50 |
|         5 |          50 |
|        10 |          47 |
|        20 |          42 |
|        30 |          36 |
|        45 |          29 |
|        60 |          21 |
|        75 |          13 |
|        89 |           6 |
|        90 |           5 |
|       120 |           5 |
|       200 |           5 |

### Requirement 2: Hook Timer — `useTimedScoring`

**User Story:** Sebagai developer, saya ingin hook yang mengelola lifecycle timer soal secara konsisten di kedua game, sehingga tidak ada duplikasi logika timer.

#### Acceptance Criteria

1. THE `useTimedScoring` SHALL mengekspos fungsi `startTimer()` yang mereset `Elapsed_Time` ke 0 dan memulai penghitung waktu.
2. WHEN `startTimer()` dipanggil, THE `useTimedScoring` SHALL menaikkan nilai `Elapsed_Time` sebesar 1 setiap detik menggunakan `setInterval` dengan interval 1000 ms.
3. THE `useTimedScoring` SHALL mengekspos fungsi `stopTimer()` yang menghentikan penghitung waktu dan membekukan nilai `Elapsed_Time` pada nilai saat itu.
4. THE `useTimedScoring` SHALL mengekspos fungsi `getScore()` yang memanggil `computeTimedScore(Elapsed_Time)` dan mengembalikan `Timed_Score` saat itu.
5. WHEN komponen yang menggunakan `useTimedScoring` di-unmount, THE `useTimedScoring` SHALL membersihkan interval aktif untuk mencegah memory leak.
6. WHEN `startTimer()` dipanggil saat timer sudah aktif, THE `useTimedScoring` SHALL mereset dan memulai ulang timer dari 0 (idempoten restart).
7. THE `useTimedScoring` SHALL mengekspos nilai `elapsedTime` (bilangan bulat, ≥ 0) sebagai state reaktif yang dapat digunakan UI untuk menampilkan waktu.

### Requirement 3: Integrasi Timer ke Game Virus

**User Story:** Sebagai pemain Game Virus, saya ingin melihat timer berjalan dan mengetahui berapa poin yang akan saya dapat, sehingga saya termotivasi untuk menjawab lebih cepat.

#### Acceptance Criteria

1. WHEN soal baru dimuat atau `handleNewChipQuestion()` dipanggil, THE `Game_Virus` SHALL memanggil `startTimer()` untuk memulai penghitung waktu.
2. WHEN pemain mengirim jawaban benar melalui `handleCheckChipAnswer()`, THE `Game_Virus` SHALL memanggil `stopTimer()` sebelum mengekstrak skor.
3. WHEN jawaban benar dikonfirmasi, THE `Game_Virus` SHALL menambahkan `getScore()` (bukan `POINTS_PER_CORRECT` tetap) ke `sessionScore`.
4. WHEN jawaban salah dikirim, THE `Game_Virus` SHALL membiarkan timer tetap berjalan dan tidak mereset `Elapsed_Time`.
5. THE `Game_Virus` SHALL menampilkan `TimerDisplay` di area soal yang menunjukkan `elapsedTime` dan konteks kecepatan yang berlaku saat soal sedang aktif.
6. WHEN animasi `InteractionAnimation` sedang berjalan (`animating === true`), THE `Game_Virus` SHALL membiarkan timer tetap berjalan.

### Requirement 4: Integrasi Timer ke Game Garis Bilangan

**User Story:** Sebagai pemain Game Garis Bilangan, saya ingin mendapat poin lebih saat menjawab cepat, sehingga ada tantangan tambahan selain ketepatan penempatan panah.

#### Acceptance Criteria

1. WHEN soal baru dimuat atau `newQuestion()` dipanggil, THE `Game_Line` SHALL memanggil `startTimer()` untuk memulai penghitung waktu.
2. WHEN pemain mengirim jawaban benar melalui `handleCheckAnswer()`, THE `Game_Line` SHALL memanggil `stopTimer()` sebelum mengekstrak skor.
3. WHEN jawaban benar dikonfirmasi, THE `Game_Line` SHALL menambahkan `getScore()` (bukan `POINTS_PER_CORRECT` tetap) ke `sessionScore`.
4. WHEN jawaban salah dikirim atau validasi penempatan panah gagal, THE `Game_Line` SHALL membiarkan timer tetap berjalan.
5. THE `Game_Line` SHALL menampilkan `TimerDisplay` di dekat kartu soal yang menunjukkan `elapsedTime` dan konteks kecepatan.

### Requirement 5: Komponen Tampilan Timer — `TimerDisplay`

**User Story:** Sebagai pemain, saya ingin melihat waktu yang berjalan dengan visualisasi yang jelas tentang seberapa baik kecepatan saya, sehingga saya tahu apakah perlu mempercepat jawaban.

#### Acceptance Criteria

1. THE `TimerDisplay` SHALL menerima prop `elapsedTime` (bilangan bulat, ≥ 0) dan menampilkan waktu dalam format `MM:SS` (contoh: `01:25`).
2. WHEN `elapsedTime` berada di rentang 0–29 detik, THE `TimerDisplay` SHALL menampilkan label kecepatan **"Sangat Cepat 🔥"** dengan warna hijau (`text-success`).
3. WHEN `elapsedTime` berada di rentang 30–59 detik, THE `TimerDisplay` SHALL menampilkan label kecepatan **"Cepat ⚡"** dengan warna biru (`text-intblue`).
4. WHEN `elapsedTime` berada di rentang 60–89 detik, THE `TimerDisplay` SHALL menampilkan label kecepatan **"Masih Oke 👍"** dengan warna kuning/amber (`text-amber-500`).
5. WHEN `elapsedTime` ≥ 90 detik, THE `TimerDisplay` SHALL menampilkan label kecepatan **"Waktu Habis ⏰"** dengan warna merah (`text-error`), namun soal tetap dapat dijawab.
6. THE `TimerDisplay` SHALL dapat menerima prop opsional `className` untuk penyesuaian layout di tiap halaman.
7. THE `TimerDisplay` SHALL tidak melakukan side effect (stateless presentational component).

### Requirement 6: Kompatibilitas dengan Score Service yang Ada

**User Story:** Sebagai developer, saya ingin sistem timed scoring menggunakan infrastruktur Firestore yang sudah ada, sehingga tidak ada duplikasi kode penulisan skor.

#### Acceptance Criteria

1. THE `Score_Service` (`awardPoints`) SHALL tetap digunakan untuk menulis poin ke Firestore, dengan jumlah poin yang diteruskan adalah nilai `Timed_Score` hasil `getScore()`.
2. WHEN `awardPoints` dipanggil dengan `Timed_Score` yang berbeda dari `POINTS_PER_CORRECT`, THE `Score_Service` SHALL menulis nilai `Timed_Score` tersebut ke Firestore (bukan selalu 10 poin).
3. THE `awardPoints` function SHALL menerima parameter kedua opsional `pts: number` yang menggantikan `POINTS_PER_CORRECT` sebagai nilai increment.
4. WHEN parameter `pts` tidak diberikan ke `awardPoints`, THE `Score_Service` SHALL menggunakan `POINTS_PER_CORRECT` (10 poin) sebagai default untuk menjaga kompatibilitas mundur.
5. WHEN `awardPoints` dipanggil dengan `pts = 0` atau nilai negatif, THE `Score_Service` SHALL tidak menulis ke Firestore dan mengembalikan 0 sebagai delta lokal.

### Requirement 7: Aksesibilitas Timer

**User Story:** Sebagai pemain dengan kebutuhan aksesibilitas, saya ingin timer dapat dipahami oleh screen reader, sehingga semua pemain mendapat pengalaman yang setara.

#### Acceptance Criteria

1. THE `TimerDisplay` SHALL menyertakan atribut `aria-live="polite"` pada elemen waktu sehingga perubahan nilai waktu diumumkan oleh screen reader secara berkala.
2. THE `TimerDisplay` SHALL menyertakan atribut `aria-label` yang mendeskripsikan nilai waktu dalam format yang dapat dibaca, contoh: `"Waktu berlalu: 1 menit 25 detik"`.
3. WHEN label kecepatan berubah (misalnya dari "Sangat Cepat" ke "Cepat"), THE `TimerDisplay` SHALL memperbarui `aria-label` pada elemen label kecepatan untuk mencerminkan perubahan tersebut.
