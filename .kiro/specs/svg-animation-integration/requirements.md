# Requirements Document

## Introduction

Fitur ini mengintegrasikan animasi SVG karakter antibodi dan virus dari referensi
`SVG Antibody Virus Animation` ke halaman `/game-virus` pada project LineChip.
Tujuannya adalah mengganti efek visual placeholder (CSS flash sederhana) yang saat ini
digunakan saat pengguna menekan "Hitung Hasil" dengan animasi interaksi karakter yang
kaya: pertempuran (Battle) untuk karakter berlawanan jenis, dan penggabungan (Alliance)
untuk karakter sejenis. Animasi berlangsung sepenuhnya sebelum hasil kalkulasi
ditampilkan, sehingga pengalaman belajar menjadi lebih intuitif dan menyenangkan.

Batasan keras yang berlaku di seluruh fitur:
- **API publik `components/game/CharacterSVGs.tsx` harus tetap sama** — nama komponen,
  props, dan types tidak boleh berubah agar semua consumer yang sudah ada tidak perlu
  dimodifikasi. Hanya implementasi SVG internal yang diganti.
- `app/game-virus/page.tsx` hanya boleh diubah **secukupnya** untuk memasang komponen
  animasi baru; alur kalkulasi dan UI utama tidak berubah.
- Tidak ada dependency baru — hanya React, Next.js, dan CSS yang sudah tersedia.
- Tidak ada halaman lain selain `/game-virus` yang perlu diubah kodenya; halaman lain
  (model-chip, dll.) otomatis mendapat desain karakter baru karena mengimpor dari
  `CharacterSVGs.tsx` yang sama.

---

## Glossary

- **Tier**: Nilai tempat karakter — satuan (1), puluhan (10), ratusan (100), ribuan (1000).
- **PlaceValue**: Tipe TypeScript `"satuan" | "puluhan" | "ratusan" | "ribuan"` yang
  merepresentasikan tier karakter; didefinisikan di `CharacterSVGs.tsx`.
- **Faction**: Jenis karakter — `"ab"` (Antibodi/positif) atau `"ku"` (Kuman-Virus/negatif).
- **Dominant Tier**: Tier tertinggi yang hadir dalam nilai absolut sebuah bilangan;
  ditentukan oleh fungsi `dominantPlace` dari `CharacterSVGs.tsx`.
- **Interaksi Battle**: Animasi pertempuran yang dipicu ketika dua bilangan memiliki
  faction berbeda (satu Ab, satu Ku). Alur: `idle → approach → impact → recoil →
  dissolve → done`.
- **Interaksi Alliance**: Animasi penggabungan yang dipicu ketika dua bilangan memiliki
  faction yang sama (keduanya Ab atau keduanya Ku). Alur: `idle → approach → bounce →
  settled`.
- **Netralisasi Sempurna**: Kondisi ketika `bil1Value + bil2Value === 0`; merupakan
  kasus khusus Battle di mana kedua karakter luruh sempurna dan hasil adalah nol.
- **InteractionAnimation**: Komponen baru (`components/game/InteractionAnimation.tsx`)
  yang merangkum logika pemilihan Battle/Alliance dan mengorkestrasi animasi.
- **AnimPhase (game)**: State phase di `game-virus/page.tsx`:
  `"idle" | "charging" | "exploding" | "settled"`.
- **BattlePhase (animasi)**: Phase internal Battle:
  `"idle" | "approach" | "impact" | "recoil" | "dissolve" | "done"`.
- **AlliancePhase (animasi)**: Phase internal Alliance:
  `"idle" | "approach" | "bounce" | "settled"`.
- **onComplete**: Callback yang dipanggil komponen animasi ketika seluruh rangkaian
  animasi selesai; memicu update `resultValue` di halaman.
- **uid**: Suffix unik yang diteruskan ke setiap `AntibodyCharacter`/`VirusCharacter`
  untuk menghindari konflik `id` pada elemen `<defs>` SVG di dalam satu halaman.
- **AntibodyCharacter / VirusCharacter**: Komponen dispatcher SVG dari `CharacterSVGs.tsx`
  yang digunakan oleh komponen animasi baru. Implementasi SVG internal-nya diganti dengan
  versi referensi yang lebih kaya detail; API-nya (nama, props) tidak berubah.
- **Character API**: Antarmuka publik `CharacterSVGs.tsx` — mencakup komponen
  (`AntibodyCharacter`, `VirusCharacter`, `CharacterChips`), types (`PlaceValue`), dan
  konstanta (`CHAR_NAMES`, `TIER_TO_PLACE`, `dominantPlace`). **Tidak boleh berubah.**
- **Character SVG Implementation**: Isi SVG internal dari masing-masing komponen
  karakter (AntibodySatuan, AntibodyPuluhan, dst.). Bagian inilah yang diganti dengan
  versi dari file referensi `character-svgr.tsx` yang memiliki desain lebih kaya (wajah,
  ekspresi, detail lebih lengkap).
- **Reference Character File**: File
  `referensi/SVG Antibody Virus Animation/src/imports/pasted_text/character-svgr.tsx`
  yang menjadi sumber implementasi SVG baru untuk `CharacterSVGs.tsx`.

---

## Requirements

### Requirement 0: Pembaruan Desain Karakter SVG

**User Story:** Sebagai developer, saya ingin mengganti implementasi SVG internal di
`CharacterSVGs.tsx` dengan versi referensi yang lebih kaya detail, agar semua halaman
yang sudah ada (game-virus, model-chip, dll.) otomatis menampilkan karakter baru tanpa
perubahan kode di halaman-halaman tersebut.

#### Acceptance Criteria

1. THE Character_Update SHALL mengganti isi implementasi SVG dari delapan komponen
   (`AntibodySatuan`, `AntibodyPuluhan`, `AntibodyRatusan`, `AntibodyRibuan`,
   `VirusSatuan`, `VirusPuluhan`, `VirusRatusan`, `VirusRibuan`) di
   `components/game/CharacterSVGs.tsx` dengan versi dari file referensi
   `character-svgr.tsx`.

2. THE Character_Update SHALL mempertahankan seluruh API publik `CharacterSVGs.tsx`
   tanpa perubahan — termasuk nama komponen, tipe props, dan semua export:
   `AntibodyCharacter`, `VirusCharacter`, `CharacterChips`, `PlaceValue`, `CHAR_NAMES`,
   `TIER_TO_PLACE`, `dominantPlace`.

3. WHEN halaman yang sudah ada (`game-virus`, `model-chip`, dst.) me-render
   `AntibodyCharacter` atau `VirusCharacter`, THEN THE halaman tersebut SHALL
   menampilkan desain karakter baru secara otomatis tanpa memerlukan perubahan kode di
   file halaman tersebut.

4. THE Character_Update SHALL memastikan setiap komponen karakter baru tetap menerima
   prop `uid?: string` dan menggunakannya sebagai suffix pada semua `id` elemen `<defs>`
   SVG, sehingga tidak ada konflik ID ketika beberapa instance karakter yang sama
   di-render dalam satu halaman.

5. WHEN karakter baru di-render, THE Character_Update SHALL memastikan komponen
   `CharacterChips` tetap berfungsi normal — dekomposisi nilai, rendering per-tier,
   dan animasi phase (idle/charging/exploding/settled) tidak terpengaruh.

---

### Requirement 1: Deteksi Jenis Interaksi

**User Story:** Sebagai sistem, saya ingin mendeteksi jenis interaksi yang tepat
berdasarkan nilai dua bilangan yang dimasukkan pengguna, agar animasi yang ditampilkan
sesuai dengan konteks matematis (pertempuran vs penggabungan).

#### Acceptance Criteria

1. WHEN `bil1Value` dan `bil2Value` memiliki tanda berbeda (satu positif, satu negatif),
   THEN THE Interaction_Detector SHALL mengklasifikasikan interaksi sebagai `"battle"`.

2. WHEN `bil1Value` dan `bil2Value` keduanya bernilai positif, THEN THE
   Interaction_Detector SHALL mengklasifikasikan interaksi sebagai `"alliance"` dengan
   faction `"ab"`.

3. WHEN `bil1Value` dan `bil2Value` keduanya bernilai negatif, THEN THE
   Interaction_Detector SHALL mengklasifikasikan interaksi sebagai `"alliance"` dengan
   faction `"ku"`.

4. WHEN `bil1Value + bil2Value === 0` dan kedua nilai bukan nol, THEN THE
   Interaction_Detector SHALL mengklasifikasikan interaksi sebagai `"battle"` dengan
   flag `isPerfectNeutralization = true`.

5. WHEN salah satu dari `bil1Value` atau `bil2Value` bernilai nol, THEN THE
   Interaction_Detector SHALL melempar error dan tidak memulai animasi.

---

### Requirement 2: Komponen InteractionAnimation

**User Story:** Sebagai developer, saya ingin satu komponen terpadu
`InteractionAnimation` yang memilih dan menjalankan animasi yang tepat, agar halaman
`game-virus` tidak perlu mengetahui detail implementasi Battle atau Alliance.

#### Acceptance Criteria

1. THE InteractionAnimation_Component SHALL menerima props:
   `bil1Value: number`, `bil2Value: number`, `onComplete: () => void`, dan opsional
   `speed?: number`.

2. WHEN InteractionAnimation_Component di-mount dengan dua nilai berbeda jenis, THEN THE
   InteractionAnimation_Component SHALL merender Battle_Stage dan memulai animasi secara
   otomatis (`autoStart = true`).

3. WHEN InteractionAnimation_Component di-mount dengan dua nilai sejenis, THEN THE
   InteractionAnimation_Component SHALL merender Alliance_Stage dan memulai animasi
   secara otomatis (`autoStart = true`).

4. WHEN animasi selesai (callback `onComplete` internal dipanggil), THEN THE
   InteractionAnimation_Component SHALL memanggil prop `onComplete` tepat satu kali.

5. WHEN InteractionAnimation_Component di-unmount sebelum animasi selesai, THEN THE
   InteractionAnimation_Component SHALL membatalkan semua `setTimeout` yang tertunda agar
   tidak ada state update setelah unmount.

6. THE InteractionAnimation_Component SHALL merender `AntibodyCharacter` dan
   `VirusCharacter` dari `components/game/CharacterSVGs.tsx` — versi yang sudah
   diperbarui dengan desain referensi — menggunakan `uid` unik berbasis prefix yang
   diteruskan ke prop agar tidak ada konflik `id` SVG dalam satu halaman.

---

### Requirement 3: Battle Animation (Pertempuran)

**User Story:** Sebagai siswa, saya ingin melihat karakter Ab dan Ku saling berbenturan
dan luruh ketika saya menghitung hasil dari dua bilangan berbeda jenis, agar saya dapat
memahami konsep penjumlahan bilangan bulat positif dan negatif secara visual.

#### Acceptance Criteria

1. WHEN Battle_Stage dimulai, THEN THE Battle_Stage SHALL menampilkan `AntibodyCharacter`
   sesuai dominant tier dari bilangan positif di sisi kiri, dan `VirusCharacter` sesuai
   dominant tier dari bilangan negatif di sisi kanan — keduanya menggunakan implementasi
   SVG terbaru dari `CharacterSVGs.tsx` yang sudah diperbarui.

2. WHEN Battle_Stage memulai phase `approach`, THEN THE Battle_Stage SHALL menganimasikan
   karakter kiri bergerak ke kanan dan karakter kanan bergerak ke kiri secara bersamaan
   menuju titik tengah stage menggunakan keyframe CSS dari `app/animations.css`.

3. WHEN phase `approach` selesai, THEN THE Battle_Stage SHALL memasuki phase `impact`
   yang menampilkan flash kilat dan efek shockwave ring di titik benturan.

4. WHEN phase `impact` aktif, THEN THE Battle_Stage SHALL menampilkan animasi shake
   pada kedua karakter menggunakan keyframe `battle-shake-kf` yang sudah ada di
   `app/animations.css`.

5. WHEN phase `impact` selesai, THEN THE Battle_Stage SHALL memasuki phase `recoil` di
   mana kedua karakter mundur sedikit dari titik benturan.

6. WHEN phase `recoil` selesai, THEN THE Battle_Stage SHALL memasuki phase `dissolve`
   di mana kedua karakter menghilang dengan animasi scale-dan-fade secara bersamaan.

7. WHEN phase `dissolve` selesai, THEN THE Battle_Stage SHALL memanggil callback
   `onComplete` dan memasuki phase `done`.

8. WHEN `isPerfectNeutralization = true`, THEN THE Battle_Stage SHALL memperlihatkan
   indikator visual "NETRAL ✓" setelah kedua karakter luruh sempurna.

9. THE Battle_Stage SHALL menyelesaikan seluruh siklus animasi (approach → done) dalam
   waktu tidak lebih dari 3000ms pada kecepatan normal (`speed = 1`).

---

### Requirement 4: Alliance Animation (Penggabungan)

**User Story:** Sebagai siswa, saya ingin melihat dua karakter sejenis saling bergabung
saat saya menambahkan dua bilangan bertanda sama, agar saya memahami bahwa menggabungkan
bilangan positif menghasilkan nilai yang lebih besar dan demikian pula untuk negatif.

#### Acceptance Criteria

1. WHEN Alliance_Stage dimulai dengan faction `"ab"`, THEN THE Alliance_Stage SHALL
   menampilkan dua `AntibodyCharacter` sesuai dominant tier dari masing-masing bilangan
   di kedua sisi stage.

2. WHEN Alliance_Stage dimulai dengan faction `"ku"`, THEN THE Alliance_Stage SHALL
   menampilkan dua `VirusCharacter` sesuai dominant tier dari masing-masing bilangan di
   kedua sisi stage.

3. WHEN Alliance_Stage memulai phase `approach`, THEN THE Alliance_Stage SHALL
   menganimasikan kedua karakter bergerak menuju titik tengah stage secara bersamaan.

4. WHEN phase `approach` selesai, THEN THE Alliance_Stage SHALL memasuki phase `bounce`
   yang menampilkan animasi scale-bounce dan sparkle particle burst di titik pertemuan.

5. WHEN phase `bounce` selesai, THEN THE Alliance_Stage SHALL memasuki phase `settled`
   yang menampilkan aura glow biru (faction `"ab"`) atau merah (faction `"ku"`) pada
   kedua karakter yang telah bergabung.

6. WHEN phase `settled` aktif, THEN THE Alliance_Stage SHALL memanggil callback
   `onComplete`.

7. THE Alliance_Stage SHALL menyelesaikan seluruh siklus animasi (approach → settled)
   dalam waktu tidak lebih dari 2500ms pada kecepatan normal (`speed = 1`).

---

### Requirement 5: Integrasi dengan game-virus/page.tsx

**User Story:** Sebagai pengguna halaman game virus, saya ingin pengalaman visual
seamless saat menekan tombol "Hitung Hasil" — animasi tampil, selesai, lalu hasil
muncul — tanpa perubahan pada cara saya berinteraksi dengan game.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol "Hitung Hasil" dan `canCompute === true`, THEN THE
   Game_Page SHALL me-mount `InteractionAnimation` dengan `bil1Value` dan `bil2Value`
   saat ini, serta menunda penetapan `resultValue` hingga `onComplete` dipanggil.

2. WHEN `InteractionAnimation` sedang berjalan, THEN THE Game_Page SHALL menonaktifkan
   tombol "Hitung Hasil", pool karakter, dan semua kontrol input agar pengguna tidak
   dapat mengubah state selama animasi berlangsung.

3. WHEN `onComplete` dipanggil oleh `InteractionAnimation`, THEN THE Game_Page SHALL
   menetapkan `resultValue = bil1Value + bil2Value` dan meng-unmount
   `InteractionAnimation`.

4. WHEN animasi selesai dan `resultValue` ditetapkan, THEN THE Game_Page SHALL
   menampilkan panel hasil dengan karakter, nilai, dan persamaan lengkap persis seperti
   yang terjadi sebelum integrasi animasi (tidak ada perubahan UI hasil).

5. WHEN pengguna menekan "Hitung Lagi" setelah hasil tampil, THEN THE Game_Page SHALL
   mereset semua state ke kondisi idle tanpa sisa animasi yang aktif.

6. WHILE `InteractionAnimation` sedang berjalan, THE Game_Page SHALL menampilkan
   `InteractionAnimation` sebagai overlay atau pengganti area reaktor, sehingga tidak ada
   karakter duplikat yang terlihat di stage dan di zona bilangan secara bersamaan.

---

### Requirement 6: Keyframes CSS dan Aset Animasi

**User Story:** Sebagai developer, saya ingin semua keyframe yang dibutuhkan animasi baru
tersedia di `app/animations.css` tanpa menambah file baru, agar konsistensi pengelolaan
CSS terjaga.

#### Acceptance Criteria

1. THE Animation_CSS SHALL mendefinisikan keyframe `battle-approach-left-kf` yang
   menganimasikan karakter dari luar batas kiri stage ke titik benturan.

2. THE Animation_CSS SHALL mendefinisikan keyframe `battle-approach-right-kf` yang
   menganimasikan karakter dari luar batas kanan stage ke titik benturan.

3. THE Animation_CSS SHALL mendefinisikan keyframe `battle-recoil-left-kf` dan
   `battle-recoil-right-kf` untuk gerakan mundur setelah benturan.

4. THE Animation_CSS SHALL mendefinisikan keyframe `dissolve-ccw-kf` dan
   `dissolve-cw-kf` untuk animasi luruh dengan rotasi berlawanan arah jarum jam dan
   searah jarum jam.

5. THE Animation_CSS SHALL mendefinisikan keyframe `alliance-approach-left-kf` dan
   `alliance-approach-right-kf` untuk gerakan mendekat pada mode alliance.

6. THE Animation_CSS SHALL mendefinisikan keyframe `bounce-merge-kf` untuk animasi
   scale-bounce saat dua karakter bertemu pada Alliance.

7. THE Animation_CSS SHALL mendefinisikan keyframe `settled-glow-blue-kf` dan
   `settled-glow-red-kf` untuk aura glow pada phase `settled` Alliance.

8. THE Animation_CSS SHALL mendefinisikan keyframe `particle-fly-kf` yang menggunakan
   custom property CSS `--tx`, `--ty`, `--r` untuk arah dan rotasi partikel yang
   dikontrol per-elemen dari JavaScript.

9. THE Animation_CSS SHALL mendefinisikan keyframe `shockwave-kf` untuk ring ekspansi
   di titik benturan/pertemuan.

10. THE Animation_CSS SHALL mendefinisikan keyframe `popup-rise-kf` untuk teks popup
    hasil (misal "NETRAL ✓", "+ KUAT!") yang muncul dan menghilang ke atas.

11. THE Animation_CSS SHALL mendefinisikan keyframe `idle-float-kf` untuk animasi
    mengambang karakter saat dalam state idle.

12. IF sebuah keyframe dengan nama yang setara sudah ada di `app/animations.css`, THEN
    THE Animation_CSS SHALL menggunakan keyframe yang sudah ada tanpa duplikasi,
    menyesuaikan nama dengan konvensi suffix `-kf` yang sudah berlaku.

---

### Requirement 7: Kontrol Kecepatan Animasi

**User Story:** Sebagai developer/tester, saya ingin bisa mengontrol kecepatan animasi
melalui prop `speed`, agar pengujian dan debugging animasi dapat dilakukan dengan lebih
cepat tanpa menunggu durasi penuh.

#### Acceptance Criteria

1. THE InteractionAnimation_Component SHALL menerima prop opsional `speed: number`
   dengan nilai default `1` (kecepatan normal).

2. WHEN `speed` ditetapkan ke nilai `n`, THEN THE InteractionAnimation_Component SHALL
   membagi semua durasi `setTimeout` dan durasi animasi CSS dengan `n`, sehingga animasi
   berjalan `n` kali lebih cepat.

3. WHEN `speed` berubah saat animasi sedang berjalan, THEN THE
   InteractionAnimation_Component SHALL tidak mengubah durasi animasi yang sudah berjalan
   dan menerapkan kecepatan baru pada langkah berikutnya.

---

### Requirement 8: Tidak Ada Regresi UI

**User Story:** Sebagai pengguna yang sudah terbiasa dengan halaman `/game-virus`, saya
ingin fitur drag-drop, penambahan karakter, undo, dan tampilan hasil tetap bekerja persis
seperti sebelumnya setelah animasi diintegrasikan.

#### Acceptance Criteria

1. THE Game_Page SHALL mempertahankan fungsionalitas drag-drop karakter dari kolam ke zona
   bilangan tanpa perubahan perilaku.

2. THE Game_Page SHALL mempertahankan fungsionalitas tombol "Urungkan terakhir" yang
   mengembalikan satu karakter terakhir yang ditambahkan.

3. THE Game_Page SHALL mempertahankan tampilan zona bilangan, kolam Ab, kolam Ku, header
   VS preview, dan panel hasil persamaan lengkap tanpa perubahan visual.

4. WHEN fase animasi sedang berjalan, THE Game_Page SHALL menjaga `bil1Value` dan
   `bil2Value` tetap pada nilai saat "Hitung Hasil" ditekan, sehingga karakter di zona
   bilangan tidak berubah secara tiba-tiba.

5. THE Game_Page SHALL tidak menampilkan elemen duplikat karakter (satu di zona bilangan
   dan satu di stage animasi secara bersamaan) pada layout yang sama; salah satu
   disembunyikan atau digantikan saat animasi aktif.

---

### Requirement 9: Aksesibilitas dan Kinerja Animasi

**User Story:** Sebagai pengguna dengan kebutuhan aksesibilitas atau perangkat
berspesifikasi rendah, saya ingin animasi tidak memblokir interaksi dan menghormati
preferensi sistem saya.

#### Acceptance Criteria

1. THE InteractionAnimation_Component SHALL menggunakan elemen dengan role presentasional
   yang tepat sehingga screen reader tidak mengumumkan detail visual animasi kepada
   pengguna.

2. WHEN `prefers-reduced-motion: reduce` aktif di sistem pengguna, THEN THE
   InteractionAnimation_Component SHALL mempercepat atau melewatkan animasi visual dan
   langsung memanggil `onComplete` setelah jeda minimal (tidak lebih dari 300ms).

3. THE InteractionAnimation_Component SHALL tidak membuat lebih dari 30 elemen DOM
   partikel dalam satu siklus animasi burst agar performa pada perangkat menengah tetap
   terjaga.


---

### Requirement 10: Kontrol Kecepatan dan Loop (User-Facing)

**User Story:** Sebagai guru atau siswa yang ingin mempelajari animasi secara detail,
saya ingin bisa mengatur kecepatan animasi dan mengaktifkan loop, agar saya bisa
mengamati setiap fase dengan nyaman.

#### Acceptance Criteria

1. WHEN stage animasi ditampilkan dalam mode preview/standalone (baik Battle maupun
   Alliance), THE Stage SHALL menampilkan speed control dengan tiga opsi kecepatan yang
   bisa diklik: `0.5×` (setengah kecepatan), `1×` (normal, default), `2×` (dua kali
   kecepatan).

2. WHEN user mengklik opsi kecepatan pada speed control, THE Stage SHALL menerapkan
   multiplier tersebut pada seluruh durasi `setTimeout` dan durasi animasi CSS untuk
   semua fase animasi berikutnya.

3. WHEN stage animasi ditampilkan dalam mode preview/standalone, THE Stage SHALL
   menampilkan tombol loop toggle yang bisa diaktifkan dan dinonaktifkan oleh user.

4. WHEN loop aktif dan satu siklus animasi selesai, THE Stage SHALL memulai ulang
   animasi secara otomatis tanpa memanggil `onComplete` — `onComplete` hanya dipanggil
   pada iterasi terakhir saat loop dinonaktifkan atau stage di-unmount.

5. WHEN stage digunakan dalam konteks game (dipicu oleh tombol "Hitung Hasil" di
   `game-virus/page.tsx`), THE Stage SHALL menyembunyikan speed control dan loop toggle
   sepenuhnya — kedua kontrol ini hanya tersedia di mode preview/standalone.

6. WHERE prop `speed` diteruskan dari luar (Requirement 7), THE Stage SHALL
   mengombinasikan nilai prop tersebut dengan pilihan user dari speed control menggunakan
   perkalian, sehingga keduanya dapat digunakan secara bersamaan tanpa saling menimpa.
