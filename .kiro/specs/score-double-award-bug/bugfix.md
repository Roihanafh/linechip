# Bugfix Requirements Document

## Introduction

Setiap jawaban benar pada halaman Game Virus (`/game-virus`) menambahkan 20 poin ke session score dan ke Firestore `totalScore`, padahal seharusnya hanya 10 poin per jawaban benar. Bug ini terjadi karena `handleCheckChipAnswer` dapat terpanggil dua kali dalam satu render cycle yang sama: sekali melalui `onKeyDown` (Enter) pada input field, dan sekali lagi melalui `onClick` pada button "Periksa" yang masih `enabled` saat React belum sempat memperbarui state `chipFeedback`. Akibatnya `awardPoints()` dipanggil dua kali, menghasilkan penambahan 20 poin alih-alih 10 poin — baik secara lokal (sessionScore) maupun di Firestore (`totalScore`).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN user mengetik jawaban di input field lalu menekan Enter THEN the system memanggil `handleCheckChipAnswer` dua kali dalam satu event cycle (sekali via `onKeyDown`, sekali via `onClick` pada button "Periksa"), menghasilkan penambahan 20 poin meski hanya satu jawaban benar yang dikirimkan

1.2 WHEN `handleCheckChipAnswer` terpanggil saat `chipFeedback?.correct` sudah bernilai `true` THEN the system tidak memblokir eksekusi dan kembali memanggil `awardPoints()`, sehingga poin diberikan untuk kedua kalinya

1.3 WHEN `awardPoints(uid)` dipanggil dua kali untuk satu jawaban benar THEN the system mengirim dua operasi `increment(10)` ke Firestore `totalScore`, menambahkan 20 poin pada dokumen user di database

### Expected Behavior (Correct)

2.1 WHEN user mengetik jawaban di input field lalu menekan Enter THEN the system SHALL memanggil `handleCheckChipAnswer` tepat satu kali dan memberikan tepat 10 poin untuk jawaban benar tersebut

2.2 WHEN `handleCheckChipAnswer` terpanggil saat `chipFeedback?.correct` sudah bernilai `true` THEN the system SHALL menghentikan eksekusi lebih awal (early return) tanpa memanggil `awardPoints()` kembali

2.3 WHEN satu jawaban benar dikirimkan (baik via Enter maupun klik button) THEN the system SHALL mengirim tepat satu operasi `increment(10)` ke Firestore `totalScore` dan menambahkan tepat 10 poin pada session score

### Unchanged Behavior (Regression Prevention)

3.1 WHEN user menekan button "Periksa" dengan jawaban benar (tanpa menggunakan Enter) THEN the system SHALL CONTINUE TO memberikan tepat 10 poin dan menampilkan feedback benar

3.2 WHEN user menekan button "Periksa" dengan jawaban salah THEN the system SHALL CONTINUE TO menampilkan feedback salah tanpa memberikan poin

3.3 WHEN user mengirimkan jawaban benar dan auto-advance timer berjalan THEN the system SHALL CONTINUE TO berpindah ke soal baru setelah 2 detik

3.4 WHEN user tidak login (uid null) THEN the system SHALL CONTINUE TO menambahkan 10 poin ke session score lokal tanpa mencoba menulis ke Firestore

3.5 WHEN user mengklik button "Soal Baru" secara manual THEN the system SHALL CONTINUE TO mereset state soal tanpa mengubah session score
