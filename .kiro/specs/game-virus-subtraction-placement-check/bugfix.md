# Bugfix Requirements Document

## Introduction

Game Virus (`app/game-virus/page.tsx`) memiliki fungsi `validateChipPlacement` di `lib/game/chipHelpers.ts` yang memvalidasi apakah chip yang diletakkan user di Bilangan 1 dan Bilangan 2 sudah sesuai soal yang aktif. Investigasi ini meneliti apakah logika validasi untuk soal pengurangan (`op === "-"`) sudah benar, dan mendokumentasikan kontrak yang tepat agar tidak terjadi regresi di masa depan.

**Konteks penting**: Materi Model Chip Pengurangan (`app/model-chip/pengurangan`) menggunakan konversi `bil2_converted = -bil2_original` sebelum arena pertarungan (logika `a − b = a + (−b)`). Game Virus **tidak** menggunakan konversi ini — `handleCompute` langsung menghitung `bil1Value - bil2Value`, sehingga `bil2Value` harus sama dengan `question.b` asli (pengurang original), bukan nilai yang sudah dibalik.

**Bug yang terdokumentasi**: Berdasarkan investigasi kode, validasi saat ini (`bil2Value !== question.b`) secara fungsional sudah benar untuk kedua operator. Namun, tidak ada perlindungan eksplisit terhadap regresi: tidak ada komentar kode, tidak ada tes, dan tidak ada guardrail yang menjelaskan mengapa operator pengurangan **tidak** memerlukan perlakuan berbeda. Risiko nyata adalah seseorang yang familiar dengan konvensi model-chip akan "memperbaiki" validasi menjadi `bil2Value !== -question.b` untuk soal pengurangan — yang justru akan memperkenalkan bug fungsional.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN soal adalah pengurangan (`op === "-"`) dan user memasukkan chip senilai `question.b` di Bilangan 2, THEN `validateChipPlacement` tidak memiliki tes yang memverifikasi bahwa perilaku ini benar, sehingga kontrak implisit tidak terdokumentasi dan tidak dilindungi

1.2 WHEN `validateChipPlacement` dipanggil dengan soal pengurangan, THEN fungsi tidak membedakan antara operator `+` dan `-` dalam logika validasinya — kontrak ini benar secara fungsional tetapi tidak terdokumentasi secara eksplisit, meninggalkan celah untuk miskonsepsi

1.3 WHEN `handleComputeWithValidation` memanggil `validateChipPlacement` pada soal pengurangan `a − b`, THEN tidak ada mekanisme yang mencegah refactor masa depan yang keliru membalik `question.b` menjadi `-question.b` mengikuti konvensi model-chip

### Expected Behavior (Correct)

2.1 WHEN soal adalah pengurangan (`op === "-"`) dengan `question.b = b_asli`, THEN `validateChipPlacement` SHALL menerima `bil2Value === b_asli` sebagai valid (bukan `bil2Value === -b_asli`)

2.2 WHEN soal adalah penambahan (`op === "+"`), THEN `validateChipPlacement` SHALL terus menerima `bil2Value === question.b` sebagai valid — perilaku ini tidak berubah

2.3 WHEN `validateChipPlacement` menolak penempatan chip yang salah pada soal pengurangan, THEN sistem SHALL menampilkan pesan error yang menyebut nilai `question.b` (pengurang asli), bukan nilai yang dibalik

### Unchanged Behavior (Regression Prevention)

3.1 WHEN soal adalah penambahan (`op === "+"`), THEN sistem SHALL CONTINUE TO memvalidasi `bil1Value === question.a` dan `bil2Value === question.b` tanpa perubahan

3.2 WHEN `handleCompute` menghitung hasil soal pengurangan, THEN sistem SHALL CONTINUE TO menggunakan `bil1Value - bil2Value` (bukan `bil1Value + (-bil2Value)`) — tidak ada perubahan pada logika kalkulasi

3.3 WHEN `BilanganZone` menampilkan karakter chip di Bilangan 2, THEN sistem SHALL CONTINUE TO menentukan tipe karakter (Antibodi/Kuman) berdasarkan tanda `bil2Value` saja — tidak ada pembalikan visual untuk soal pengurangan

3.4 WHEN `validateChipAnswer` memvalidasi jawaban yang diketik user, THEN sistem SHALL CONTINUE TO membandingkan terhadap `question.answer` yang dihitung sebagai `a - b` untuk soal pengurangan
