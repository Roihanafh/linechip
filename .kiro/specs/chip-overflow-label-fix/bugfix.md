# Bugfix Requirements Document

## Introduction

Komponen `CharacterChips` di `components/game/CharacterSVGs.tsx` menampilkan label overflow "+N lagi" ketika jumlah chip dalam satu tier melampaui batas `maxPerTier`. Label ini menggunakan kata "lagi" yang tidak perlu, dan lebih bermasalah lagi muncul di semua state termasuk state selesai/done — padahal di state tersebut label tersebut tidak relevan secara kontekstual. Perbaikan harus menghilangkan kata "lagi" (cukup tampilkan "+N"), atau idealnya menyembunyikan label overflow sama sekali saat state adalah "selesai".

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN jumlah chip dalam satu tier melebihi `maxPerTier` DAN phase adalah `"idle"`, `"charging"`, `"exploding"`, atau `"settled"` THEN the system menampilkan label teks `"+N lagi"` (contoh: "+3 lagi") di bawah baris chip tier tersebut

1.2 WHEN jumlah chip dalam satu tier melebihi `maxPerTier` DAN phase adalah `"exploding"` atau `"settled"` (state selesai) THEN the system tetap menampilkan label `"+N lagi"` meskipun chip-chip sudah hilang atau animasi sudah selesai

### Expected Behavior (Correct)

2.1 WHEN jumlah chip dalam satu tier melebihi `maxPerTier` DAN phase bukan `"exploding"` dan bukan `"settled"` THEN the system SHALL menampilkan label overflow tanpa kata "lagi" — cukup `"+N"` (contoh: "+3")

2.2 WHEN jumlah chip dalam satu tier melebihi `maxPerTier` DAN phase adalah `"exploding"` atau `"settled"` THEN the system SHALL menyembunyikan label overflow sepenuhnya (tidak ada teks yang ditampilkan)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN jumlah chip dalam satu tier tidak melebihi `maxPerTier` THEN the system SHALL CONTINUE TO merender semua chip tanpa label overflow apapun

3.2 WHEN phase adalah `"idle"` atau `"charging"` DAN jumlah chip melebihi `maxPerTier` THEN the system SHALL CONTINUE TO menampilkan hanya `maxPerTier` chip (chip ke-N+1 dst tidak dirender sebagai elemen visual)

3.3 WHEN phase adalah `"exploding"` THEN the system SHALL CONTINUE TO memicu animasi dissolve bertahap pada chip-chip yang ditampilkan (staggered transition scale-0 opacity-0)

3.4 WHEN komponen menerima prop `dimmed={true}` THEN the system SHALL CONTINUE TO menerapkan style grayscale dan opacity-30 pada semua chip yang dirender
