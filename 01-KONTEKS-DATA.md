# Konteks Lengkap Dataset — Gelar Rasa 2026

> Dokumen ini merangkum isi dataset, tujuan kompetisi, hasil eksplorasi, temuan penting, serta daftar hal yang layak ditampilkan pada dashboard. Disusun sebagai acuan tunggal sebelum implementasi.

---

## 1. Ringkasan Eksekutif

Dataset **Synthetic Metropolitan AQMS (Air Quality Monitoring System)** adalah data sintetis kualitas udara, cuaca, dan kesehatan masyarakat Indonesia untuk periode **1 Januari 2024 – 14 Oktober 2026**.

Tiga hal yang paling penting:

1. **Pencemaran memburuk secara musiman, bukan merata.** Episode kabut asap terjadi **September–Oktober** dan intensitasnya meningkat setiap tahun, terutama di wilayah gambut Kalimantan dan Sumatra.
2. **Dampak kesehatan mengikuti pola yang sama.** Rawat inap pernapasan melonjak pada periode yang sama, dengan efek terkuat pada **lag 0–1 hari**, dan kelompok **balita serta lansia** paling terdampak.
3. **Kualitas data adalah bagian dari cerita.** Tiga stasiun memakai satuan berbeda, satu sensor macet berbulan-bulan, satu stasiun praktis mati, dan satu stasiun berpindah resolusi. Dashboard yang baik harus menampilkan keterbatasan ini secara jujur, bukan menyembunyikannya.

---

## 2. Tentang Dataset

| Aspek | Keterangan |
|---|---|
| Nama | Synthetic Metropolitan AQMS Dataset |
| Sifat | Sintetis, dirancang untuk kompetisi *Dashboard Analysis* Gelar Rasa 2026 |
| Cakupan | 27 stasiun pemantau di 5 pulau besar (Sumatra, Jawa, Kalimantan, Sulawesi, Papua) |
| Periode udara | 2024-01-01 00:00 s.d. 2026-10-14 23:00 (WIB) |
| Periode kesehatan | 2023-12-31 s.d. 2026-10-14 |
| Resolusi udara | 1 jam (nominal); PLB-01 memakai 15 menit pada Sep–Okt |
| Resolusi kesehatan | 1 hari per rumah sakit |
| Total file | 33 file |
| Total baris AQMS | 667.981 baris |
| Total baris kesehatan | 27.491 baris (27 RS × ±1.018 hari) |

**Kelompok file**

| Kelompok | File | Jumlah |
|---|---|---|
| Data udara | `[KODE]_[Lokasi]_AQMS.csv` | 27 |
| Data kesehatan | `HLT-01_health_outcomes_daily.csv` | 1 |
| Tabel master | `sites.csv`, `sensors.csv`, `hospitals.csv` | 3 |
| Metadata | `metadata_sensors.csv`, `metadata_dates.csv` | 2 |

---

## 3. Tujuan Case Study

Dashboard harus menjawab enam tujuan berikut.

| No | Tujuan | Pertanyaan kunci |
|---|---|---|
| 1 | Mengkaji kondisi kualitas udara berdasarkan waktu dan ruang | Di mana paling buruk? Sejak kapan memburuk? |
| 2 | Mengidentifikasi waktu dan wilayah paling kritis | Kapan episode terjadi? Kawasan mana yang paling terpapar? |
| 3 | Menganalisis faktor yang memengaruhi konsentrasi polutan | Cuaca, lalu lintas, jarak jalan, atau tipe lokasi? |
| 4 | Mengevaluasi dampak kesehatan, khususnya kelompok rentan | Berapa besar dampaknya? Berapa lama jedanya? Siapa paling rentan? |
| 5 | Menilai kecukupan jaringan pemantauan | Di mana perlu tambahan atau perbaikan monitor? |
| 6 | Menyajikan hasil secara interaktif dan bernilai keputusan | Apakah dashboard bercerita, bukan sekadar menampilkan angka? |

---

## 4. Struktur Data

### 4.1 Data Udara (`*_AQMS.csv`)

Satu baris = satu jendela pengukuran per stasiun.

| Kelompok | Kolom | Satuan | Catatan |
|---|---|---|---|
| Identitas | `measurement_id`, `sensor_id` | — | `sensor_id` berelasi ke `sensors.csv` |
| Waktu | `timestamp_start`, `timestamp_end` | WIB | Banyak stasiun memiliki offset detik |
| Kualitas | `qc_flag` | kategorikal | 12 nilai berbeda di seluruh dataset |
| Polutan | `pm25_ug_m3`, `pm10_ug_m3`, `so2_ug_m3`, `co_ug_m3`, `o3_ug_m3`, `no2_ug_m3` | µg/m³ | Tiga file memakai kolom `_ppm` |
| Cuaca | `temperature_c`, `humidity_pct`, `wind_speed_ms`, `wind_direction_deg` | °C, %, m/s, derajat | Arah angin 0–360 |

**Kolom `_ppm`** terdapat pada `BJB-01`, `MDN-01`, dan `PSW-01` (`pm25_ppm`, `pm10_ppm`, `so2_ppm`, `co_ppm`, `o3_ppm`, `no2_ppm`).

### 4.2 Data Kesehatan (`HLT-01_health_outcomes_daily.csv`)

Satu baris = satu hari untuk satu rumah sakit. Mengikuti pola surveilans NMMAPS.

| Kolom | Arti |
|---|---|
| `date`, `time`, `dow` | Tanggal, nomor urut hari, nama hari |
| `hospital_id` | Kode RS anonim (`RS-XXX-01` … `RS-XXX-27`) |
| `temp_c`, `dptp_c`, `rhum_pct` | Cuaca harian (bervariasi per RS) |
| `resp_admissions_under5` | Rawat inap pernapasan balita (<5 tahun) |
| `resp_admissions_over60` | Rawat inap pernapasan lansia (>60 tahun) |
| `asthma_emergency_cases` | Kasus darurat asma |
| `copd_admissions` | Rawat inap PPOK |
| `resp` | Total kasus pernapasan umum |
| `cvd` | Kasus kardiovaskular |
| `death` | Kematian |

Tidak ada nilai kosong dan tidak ada duplikasi `hospital_id`–`date`.

### 4.3 Tabel Master

**`sites.csv`** — 27 lokasi, 27 kolom:

- Identitas: `location_id`, `station_code`
- Wilayah: `provinsi`, `kota_kabupaten`, `kecamatan`, `region_group`
- Karakter: `karakteristik_wilayah`, `site_type`
- Spasial: `latitude_dd`, `longitude_dd`
- Konteks polusi: `baseline_pm25`, `distance_to_road_m`, `traffic_intensity_per_h`
- Peralatan: `pm25_equipment` … `no2_equipment`, `meteo_equipment`, `*_unit`, `notes`

**`sensors.csv`** — 27 sensor: `sensor_id`, `location_id`, `nama_sensor`, `model_sensor`, `tipe_pemasangan`, koordinat, `status_operasional`, `tanggal_instalasi`, `region_group`.

**`hospitals.csv`** — 27 RS: `hospital_id`, `nama_rumah_sakit`, kota, kecamatan, provinsi, `kelas_faskes`, `kapasitas_tempat_tidur`.

**`metadata_sensors.csv`** — 16 baris spesifikasi instrumen (supplier, tipe, parameter, header kolom, satuan).

**`metadata_dates.csv`** — 27 baris periode observasi per lokasi. Semua menyatakan `1 hour (nominal)` dan `date_end` 2026-10-14 23:00.

### 4.4 Relasi Antar Tabel

```
sites.location_id  ──1:1──  sensors.location_id
sensors.sensor_id  ──1:N──  file AQMS.sensor_id
hospitals.hospital_id ──1:N── health_outcomes.hospital_id
```

**Penting:** relasi rumah sakit ke stasiun **bukan** berbasis jarak, melainkan **urutan booklet**: `RS-XXX-01 ↔ SENS-001 ↔ JKT-01`, dst. Mapping ini harus dibuat eksplisit di ETL.

### 4.5 Peta Stasiun–Rumah Sakit

| No | Kode | Sensor | RS | Lokasi | Provinsi | Region | Tipe situs |
|---|---|---|---|---|---|---|---|
| 1 | JKT-01 | SENS-001 | RS-XXX-01 | Gambir, Jakarta Pusat | DKI Jakarta | Jakarta | Urban Background |
| 2 | JKT-02 | SENS-002 | RS-XXX-02 | Cilincing (Marunda), Jakarta Utara | DKI Jakarta | Jakarta | Industrial Perimeter |
| 3 | JKT-03 | SENS-003 | RS-XXX-03 | Cengkareng, Jakarta Barat | DKI Jakarta | Jakarta | Traffic / Roadside |
| 4 | KTG-01 | SENS-004 | RS-XXX-04 | Jekan Raya, Palangka Raya | Kalimantan Tengah | Kalimantan Tengah | Urban Background |
| 5 | KTG-02 | SENS-005 | RS-XXX-05 | Mentawa Baru (Sampit), Kotawaringin Timur | Kalimantan Tengah | Kalimantan Tengah | Peatland Boundary |
| 6 | BGR-01 | SENS-006 | RS-XXX-06 | Cisarua, Bogor | Jawa Barat | Bogor | Regional / Clean Background |
| 7 | BGR-02 | SENS-007 | RS-XXX-07 | Bogor Tengah, Bogor | Jawa Barat | Bogor | Traffic / Roadside |
| 8 | YKY-01 | SENS-008 | RS-XXX-08 | Mlati, Sleman | D.I. Yogyakarta | Yogyakarta | Urban Background |
| 9 | IDP-01 | SENS-009 | RS-XXX-09 | Indrapuri, Aceh Besar | Aceh | Aceh | Regional / Clean Background |
| 10 | KTB-01 | SENS-010 | RS-XXX-10 | Palembayan, Agam | Sumatera Barat | Sumatera Barat | Regional / Clean Background |
| 11 | PKU-01 | SENS-011 | RS-XXX-11 | Marpoyan Damai, Pekanbaru | Riau | Riau | Peatland Buffer / Urban |
| 12 | JMB-01 | SENS-012 | RS-XXX-12 | Jambi Selatan, Jambi | Jambi | Jambi | Peatland Buffer / Urban |
| 13 | BTM-01 | SENS-013 | RS-XXX-13 | Batu Besar, Batam | Kepulauan Riau | Kepulauan Riau | Industrial Perimeter / Maritime |
| 14 | BGL-01 | SENS-014 | RS-XXX-14 | Selebar, Bengkulu | Bengkulu | Bengkulu | Urban Coastal Background |
| 15 | SRG-01 | SENS-015 | RS-XXX-15 | Sorong Timur, Sorong | Papua Barat Daya | Papua Barat Daya | Coastal / Regional Background |
| 16 | MLG-01 | SENS-016 | RS-XXX-16 | Karangploso, Malang | Jawa Timur | Jawa Timur | Urban Background / Valley |
| 17 | MRS-01 | SENS-017 | RS-XXX-17 | Mandai, Maros | Sulawesi Selatan | Sulawesi Selatan | Industrial / Karst Perimeter |
| 18 | PLU-01 | SENS-018 | RS-XXX-18 | Lore Utara, Poso | Sulawesi Tengah | Sulawesi Tengah | Regional / Clean Background |
| 19 | STG-01 | SENS-019 | RS-XXX-19 | Sungai Tebelian, Sintang | Kalimantan Barat | Kalimantan Barat | Peatland Boundary / Inland |
| 20 | PKN-01 | SENS-020 | RS-XXX-20 | Arut Selatan, Kotawaringin Barat | Kalimantan Tengah | Kalimantan Tengah | Peatland Boundary / Airport |
| 21 | PLB-01 | SENS-021 | RS-XXX-21 | Sukarami, Palembang | Sumatera Selatan | Sumatera Selatan | Peatland Buffer / Urban Artery |
| 22 | PSW-01 | SENS-022 | RS-XXX-22 | Tegineneng, Pesawaran | Lampung | Lampung | Urban Background / Highway Corridor |
| 23 | MER-01 | SENS-023 | RS-XXX-23 | Merauke | Papua Selatan | Papua | Coastal / Remote Savanna |
| 24 | MDN-01 | SENS-024 | RS-XXX-24 | Medan Tuntungan, Medan | Sumatera Utara | Sumatera Utara | Urban Background |
| 25 | SM2-01 | SENS-025 | RS-XXX-25 | Sungai Pinang, Samarinda | Kalimantan Timur | Kalimantan Timur | Industrial & Deforestation Buffer |
| 26 | BJB-01 | SENS-026 | RS-XXX-26 | Landasan Ulin, Banjarbaru | Kalimantan Selatan | Kalimantan Selatan | Airport & Peatland Buffer |
| 27 | JMB-02 | SENS-027 | RS-XXX-27 | Mestong, Muaro Jambi | Jambi | Sumatera | Peatland & Plantation Hinterland |

---

## 5. Hasil Eksplorasi Data

### 5.1 Volume dan Cakupan

| File | Baris | Catatan |
|---|---|---|
| 25 file AQMS standar | 24.432 | 1.018 hari × 24 jam |
| `PLB-01` | 36.381 | 165 hari logging 15 menit |
| `MDN-01` | 20.800 | 3.632 jam hilang (±151 hari) |
| `HLT-01` | 27.491 | 1.019 tanggal, 27 RS |

- Semua `measurement_id` unik; tidak ada duplikasi ID.
- Lima RS memiliki satu hari ekstra (2023-12-31) dibanding yang lain.
- Lima stasiun (BTM, JMB-01, MLG, PKN, STG) juga memiliki data 2023-12-31 karena timestamp mulai 23:xx.
- Kualitas flag keseluruhan: **VALID 599.185 (89,7%)**, SUSPECT 19.741, MISSING 13.675, CALIBRATING 8.072, WARMUP 3.764, sisanya flag error.

### 5.2 Kualitas Data — Temuan Kritis

#### a. Satuan campur pada tiga file

`BJB-01`, `MDN-01`, `PSW-01` memakai kolom `_ppm`.

- Nilai PM2.5 berkisar 0,0035–0,3367. Jika dibaca sebagai ppm, hasilnya tidak masuk akal (0,0035 µg/m³). Skala yang konsisten adalah **mg/m³ → dikali 1.000**.
- Gas perlu konversi ppm → µg/m³ pada 25 °C, 1 atm:
  - SO₂ × 2.620
  - CO × 1.145
  - O₃ × 1.960
  - NO₂ × 1.880

Setelah konversi, nilai ketiga stasiun konsisten dengan `baseline_pm25` di `sites.csv` (rasio 0,93–1,07), kecuali BJB yang terpengaruh sensor macet.

#### b. Sensor macet — `BJB-01`

- **4.886 jam** berturut-turut bernilai tepat **336,7 µg/m³** (Sep 2024–Mar 2025).
- **2.443 jam** berturut-turut bernilai tepat **3,5 µg/m³** (Apr–Jun 2025).
- Total 306 hari terpengaruh. Semua baris berstatus `VALID` — artinya **qc_flag saja tidak cukup** untuk mendeteksi masalah ini.
- Setelah periode macet dikeluarkan: rata-rata harian BJB turun dari 102,1 menjadi **49,2 µg/m³**, maksimum 83,9.

#### c. Stasiun rusak — `JMB-02`

- Hanya **122 baris VALID** dari 24.432 (Jan–Agu 2024).
- 6.290 nilai PM2.5 berupa string: `0xDEADBEEF`, `ERR_COMM_TIMEOUT`, `ADC_SAT_FAIL`, `BAD_CHECKSUM`, `VOLT_SURGE_99V`, `#VALUE!`, `TAPE_TEAR_CRITICAL`.
- Sentinel numerik: `-999`, `-9999`, `inf`, `-1508`, `73545`, `8888`.
- 223 timestamp duplikat dan 132 baris bertanggal **1970-01-01**.
- Flag didominasi `PARSER_FAIL`, `FATAL_ERR`, `GARBAGE`, `COMM_LOST`, `CORRUPT`, `SENSOR_DEAD`.
- **Keputusan:** keluarkan dari analisis time-series, tampilkan sebagai studi kasus kegagalan telemetri.

#### d. Kategori QC lebih banyak dari booklet

Booklet menyebut 4 kategori, data aktual memiliki **12**:

`VALID`, `SUSPECT`, `CALIBRATING`, `MISSING`, `WARMUP`, `MAINTENANCE`, `COMM_LOST`, `CORRUPT`, `GARBAGE`, `FATAL_ERR`, `PARSER_FAIL`, `SENSOR_DEAD`.

#### e. Gap dan resolusi

- `MDN-01`: 3.632 jam hilang, tersebar di seluruh periode (±15% waktu).
- `MER-01`: 8.539 baris `MISSING`; hanya 4.891 jam VALID.
- `SM2-01`: 20.767 jam VALID dengan flag WARMUP/MAINTENANCE/CALIBRATING.
- `PLB-01`: Sep–Okt 2024 dan 2025 penuh, serta 1 Sep–13 Okt 2026, memakai **96 baris/hari (15 menit)**.
- Nol pada `CALIBRATING` (MDN 725, SM2 733, MER 2.448) **bukan** polusi nol.

#### f. Sinyal antarstasiun sangat mirip

- `KTG-01` dan `KTG-02`: korelasi PM2.5 harian **1,000**; PM10 0,996; CO 0,927; suhu 0,879.
- `JMB-01`–`PKU-01`–`BTM-01`: korelasi PM2.5 harian 0,996–0,999.
- `PKN-01`–`KTB-01`: 0,997 (meski beda pulau).
- `MRS-01`–`MLG-01`–`BGL-01`–`SRG-01`: 0,99+.
- Profil SO₂/CO/O₃/NO₂ identik pada banyak stasiun, menandakan **template regional** dalam pembangkitan data.

Implikasi: jangan menjumlahkan KTG-01 dan KTG-02 sebagai dua bukti independen; untuk agregasi regional gunakan rata-rata, bukan penjumlahan.

### 5.3 Pola Temporal

#### a. Musiman: dua rezim berbeda

- **Rezim gambut/industri** — naik tajam Sep–Okt, turun Des–Mar:
  KTG, PKN, SM2, STG, PLB, PSW, PKU, JMB-01, BTM, KTB.
- **Rezim datar** — hampir konstan sepanjang tahun:
  JKT, BGR, MDN, MER, MLG, MRS, BGL, SRG, PLU, IDP, YKY.

#### b. Tren tahunan PM2.5 (rata-rata harian, VALID)

| Stasiun | 2024 | 2025 | 2026* |
|---|---|---|---|
| KTG-01 Palangka Raya | 30,4 | 44,7 | **120,7** |
| KTG-02 Sampit | 30,4 | 44,9 | 120,7 |
| SM2-01 Samarinda | 81,7 | 88,2 | 99,3 |
| PLB-01 Palembang | 56,7 | 67,3 | 75,7 |
| PKN-01 Pangkalan Bun | 34,1 | 44,8 | 60,2 |
| PKU-01 Pekanbaru | 41,5 | 47,7 | 53,5 |
| PSW-01 Pesawaran | 48,1 | 51,2 | 53,4 |
| JMB-01 Jambi | 38,6 | 45,1 | 51,2 |
| STG-01 Sintang | 30,1 | 38,5 | 48,3 |
| JKT-01/02/03 | 48/60/54 | 48/60/54 | 48/60/54 |

\*s.d. 14 Oktober 2026.

Puncak ekstrem: **14 Oktober 2026, KTG-01 = 1.127,6 µg/m³** dan **KTG-02 = 1.119,6 µg/m³**.

#### c. Pola harian

| Kelompok | Jam terendah | Jam tertinggi | Rentang rata-rata |
|---|---|---|---|
| Jakarta | 14 | 9 | 46,0–64,1 |
| Gambut Kalimantan | 23 | 7 | 60,5–70,1 |
| Gambut Sumatra | 13 | 6 | 49,1–74,6 |
| Latar bersih | 14 | 7 | 12,2–18,3 |

Puncak pagi (06–09) konsisten: inversi suhu malam menahan polutan dekat permukaan.

#### d. Hari kerja vs akhir pekan

- PM2.5: perbedaan sangat kecil (±0,5%), umumnya akhir pekan sedikit lebih rendah.
- Kasus pernapasan: 24,9 vs 27,3 per RS per hari (±9% lebih rendah saat akhir pekan). Pola ini lebih mungkin **artefak pelaporan** daripada efek fisiologis, jadi jangan dijadikan klaim utama.

### 5.4 Pola Spasial

Rata-rata PM2.5 harian dan persentase hari di atas 55 µg/m³:

| Stasiun | Rata-rata | Maks harian | Hari >55 |
|---|---|---|---|
| BJB-01 (setelah bersih) | 49,2 | 83,9 | — |
| SM2-01 Samarinda | 89,0 | 311,1 | 34,7% |
| PLB-01 Palembang | 65,8 | 245,2 | 28,0% |
| KTG-02 Sampit | 61,1 | 1.119,6 | 25,8% |
| KTG-01 Palangka Raya | 61,0 | 1.127,6 | 25,0% |
| JKT-02 Marunda | 60,1 | 66,4 | 100% |
| JKT-03 Cengkareng | 54,1 | 60,3 | 34,6% |
| PSW-01 Pesawaran | 50,7 | 102,8 | 25,6% |
| JKT-01 Gambir | 48,1 | 54,4 | 0% |
| BTM-01 Batam | 47,6 | 165,5 | 25,4% |
| PKU-01 Pekanbaru | 47,1 | 175,6 | 25,4% |
| MDN-01 Medan | 45,5 | 59,5 | 9,8% |
| PKN-01 Pangkalan Bun | 45,3 | 631,6 | 25,3% |
| JMB-01 Jambi | 44,5 | 184,5 | 25,4% |
| YKY-01 Sleman | 39,7 | 55,9 | 1,0% |
| STG-01 Sintang | 38,2 | 322,0 | 22,5% |
| MRS-01 Maros | 36,8 | 48,8 | 0% |
| MLG-01 Malang | 30,7 | 41,3 | 0% |
| BGL-01 Bengkulu | 25,6 | 34,2 | 0% |
| BGR-02 Bogor | 19,2 | 20,4 | 0% |
| KTB-01 Kototabang | 18,7 | 189,0 | 0,6% |
| SRG-01 Sorong | 18,4 | 24,8 | 0% |
| MER-01 Merauke | 15,9 | 22,8 | 0% |
| BGR-01 Cisarua | 13,2 | 14,4 | 0% |
| PLU-01 Lore Lindu | 11,3 | 16,8 | 0% |
| IDP-01 Indrapuri | 9,3 | 11,8 | 0% |

Catatan: Jakarta selalu berkategori "Sedang" (46–60 µg/m³) tetapi jarang/never melewati 55 kecuali Marunda. Sebaliknya, stasiun gambut punya rata-rata tahunan lebih rendah tetapi **puncak ekstrem** yang jauh lebih berbahaya.

### 5.5 Faktor Pendorong

**Level situs (`sites.csv`)**

| Pasangan | Korelasi |
|---|---|
| `baseline_pm25` ↔ `traffic_intensity_per_h` | **+0,504** |
| `baseline_pm25` ↔ `distance_to_road_m` | **−0,595** |
| `traffic_intensity_per_h` ↔ `distance_to_road_m` | −0,684 |

Rata-rata `baseline_pm25` per tipe lokasi:

| Tipe | Rata-rata |
|---|---|
| Peatland & Plantation Hinterland | 68,9 |
| Industrial Perimeter | 55,0 |
| Urban Background / Highway Corridor | 54,3 |
| Peatland Buffer / Urban Artery | 42,0 |
| Industrial Perimeter / Maritime | 38,0 |
| Industrial / Karst Perimeter | 36,0 |
| Urban Background | 35,2 |
| Traffic / Roadside | 32,5 |
| Urban Background / Valley | 30,0 |
| Coastal / Regional Background | 18,0 |
| Regional / Clean Background | 11,6 |

**Cuaca (korelasi per stasiun, jam-jaman)**

Hubungan tidak seragam:

| Kelompok | Suhu | Kelembapan | Kecepatan angin |
|---|---|---|---|
| Jakarta | −0,26 | +0,24 | ≈0 |
| IDP-01 Indrapuri | −0,39 | +0,43 | +0,30 |
| MDN-01 Medan | **+0,60** | **−0,56** | ≈0 |
| MER-01 Merauke | +0,54 | −0,54 | +0,33 |
| Stasiun gambut | ≈0 | ≈0 | ≈0 |

Rata-rata nasional lemah (suhu −0,07; RH +0,04; angin +0,07). Artinya cuaca bukan pendorong tunggal; **tipe lokasi dan episode pembakaran** lebih dominan.

### 5.6 Dampak Kesehatan

**Total selama periode (27 RS, 1.019 hari)**

| Indikator | Total |
|---|---|
| Rawat inap pernapasan umum (`resp`) | 733.284 |
| Rawat inap pernapasan balita | 186.191 |
| Rawat inap pernapasan lansia | 225.140 |
| Kasus darurat asma | 132.839 |
| Rawat inap PPOK | 109.346 |
| Kasus kardiovaskular | 206.701 |
| Kematian | 54.636 |

**Tren**

- Rata-rata `resp` per RS per hari: 25,4 (2024) → 26,5 (2025) → 28,6 (2026).
- Total `resp` harian nasional Sep–Okt: **814** (2024) → **1.199** (2026).
- Puncak: **14 Oktober 2026 = 1.833 kasus**.
- RS di wilayah gambut Kalimantan: 34 kasus/hari (2025) → **164 kasus/hari** (Okt 2026).
- RS Jakarta relatif datar (±54 kasus/hari).

**Korelasi PM2.5–kesehatan setelah musiman dihilangkan (anomali bulanan)**

| Outcome | Lag 0 | Lag 1 | Lag 2 | Lag 3 |
|---|---|---|---|---|
| `resp` | **0,230** | 0,183 | 0,133 | 0,055 |
| `resp_admissions_under5` | 0,228 | 0,177 | 0,129 | 0,049 |
| `resp_admissions_over60` | 0,215 | 0,187 | 0,122 | 0,051 |
| `asthma_emergency_cases` | 0,194 | 0,162 | 0,123 | 0,051 |
| `copd_admissions` | 0,195 | 0,178 | 0,125 | 0,069 |
| `cvd` | 0,082 | 0,071 | 0,050 | 0,027 |
| `death` | 0,059 | 0,041 | 0,032 | 0,022 |

**Kesimpulan:** efek terkuat **lag 0–1 hari** dan menghilang setelah hari ke-3. Dampak pada pernapasan/asma/PPOK jauh lebih jelas daripada kematian dan kardiovaskular.

**Korelasi per stasiun (anomali, lag 0)**

| Stasiun | Balita | Lansia |
|---|---|---|
| PKN-01 Pangkalan Bun | **0,95** | **0,95** |
| STG-01 Sintang | 0,84 | 0,85 |
| PLB-01 Palembang | 0,82 | 0,81 |
| JMB-01 Jambi | 0,67 | 0,65 |
| KTB-01 Kototabang | 0,66 | 0,68 |
| PKU-01 Pekanbaru | 0,60 | 0,62 |
| BTM-01 Batam | 0,54 | 0,59 |
| PSW-01 Pesawaran | 0,35 | 0,39 |
| KTG-01/02 | 0,10–0,27 | 0,07–0,20 |
| Jakarta (01–03) | 0,02–0,05 | 0,02–0,05 |
| BJB-01 | −0,01 | −0,00 |

Dampak terkonsentrasi di **Sumatra dan Kalimantan**, bukan di kota-kota besar Jawa. BJB rendah karena datanya macet, bukan karena udaranya aman.

### 5.7 Kecukupan Jaringan Pemantauan

- 27 stasiun tersebar di 21 provinsi, tetapi **kepadatan tidak merata**: Jakarta 3 stasiun, Kalimantan Tengah 3, Bogor 2, sisanya 1.
- Wilayah dengan beban kesehatan tinggi namun kualitas datanya buruk: `JMB-02` (mati), `BJB-01` (macet), `KTG-01/02` (duplikatif).
- Stasiun "bersih" seperti IDP, PLU, BGR-01 tidak memerlukan prioritas perbaikan.
- Skor prioritas dapat dibangun dari: `baseline_pm25` + frekuensi episode + beban rawat inap + completeness data + tidak adanya monitor redundan.

---

## 6. Apa yang Layak Ditampilkan (Prioritas)

### P0 — Wajib, penentu penilaian

1. **KPI ringkasan**: rata-rata PM2.5, jumlah hari episode, stasiun kritis, total rawat inap, perubahan YoY.
2. **Peta stasiun** dengan warna ISPU dan ukuran konsentrasi.
3. **Ranking stasiun** berdasarkan rata-rata dan puncak PM2.5.
4. **Tren waktu** dengan penanda episode Sep–Okt.
5. **Perbandingan wilayah/pulau** (Sumatra, Jawa, Kalimantan, Sulawesi, Papua).
6. **Hubungan PM2.5–kasus kesehatan** dan kurva lag.
7. **Kualitas data**: QC flag, completeness, stasiun yang dikecualikan.

### P1 — Penting, memperkuat cerita

8. Kelompok rentan: balita vs lansia.
9. Rincian outcome: asma, PPOK, kardiovaskular, kematian.
10. Heatmap jam × hari dan kalender harian.
11. Wind rose dan scatter cuaca.
12. Scatter lalu lintas/jarak jalan vs baseline.
13. Proporsi hari per kategori ISPU.
14. Tren tahunan per stasiun.
15. Timeline status sensor dan periode macet.
16. Tabel rekomendasi lokasi monitor baru.
17. Perbandingan hari kerja vs akhir pekan.
18. Profil diurnal per tipe lokasi.

### P2 — Opsional, nilai tambah

19. Feature importance / regresi sederhana faktor polusi.
20. Clustering stasiun berdasarkan pola musiman.
21. Forecast PM2.5 jangka pendek.
22. Estimasi populasi terpapar (butuh data eksternal).
23. Estimasi beban biaya kesehatan (butuh asumsi biaya).
24. Mode perbandingan dua stasiun.
25. Unduh data terfilter (CSV).
26. Scrollytelling naratif.
27. Mode gelap/terang.
28. Peta panas grid (interpolasi spasial) — hati-hati, hanya 27 titik.

---

## 7. Definisi Metrik

### ISPU PM2.5 (Permen LHK 14/2020)

| Konsentrasi 24 jam (µg/m³) | ISPU | Kategori |
|---|---|---|
| 0–35 | 0–50 | Baik |
| 35–75 | 51–100 | Sedang |
| 75–115 | 101–150 | Tidak Sehat |
| 115–150 | 151–200 | Sangat Tidak Sehat |
| 150–250 | 201–300 | Berbahaya |
| 250–500 | 301–500 | Berbahaya |

Rumus interpolasi linear:

```
ISPU = ISPU_lo + (C - C_lo) / (C_hi - C_lo) × (ISPU_hi - ISPU_lo)
```

### Baku Mutu (PP 22/2021)

| Parameter | 24 jam | Tahunan |
|---|---|---|
| PM2.5 | 55 µg/m³ | 15 µg/m³ |
| PM10 | 75 µg/m³ | 40 µg/m³ |
| SO₂ | 75 µg/m³ | 20 µg/m³ |
| NO₂ | 65 µg/m³ | 40 µg/m³ |
| CO | 4.000 µg/m³ | — |
| O₃ | 100 µg/m³ (8 jam) | — |

### Metrik turunan

- **Hari episode**: rata-rata harian PM2.5 > 75 µg/m³.
- **Exceedance**: rata-rata harian PM2.5 > 55 µg/m³.
- **Completeness**: `valid_hours / 24 × 100%`; hari dipakai jika ≥18 jam valid.
- **Anomali musiman**: nilai harian − rata-rata bulan yang sama per stasiun.
- **Lag**: pergeseran 0–7 hari antara PM2.5 dan outcome.
- **Stuck sensor**: nilai identik berturut-turut ≥6 jam.

---

## 8. Keterbatasan dan Asumsi

1. **Data sintetis** — pola dirancang, bukan observasi lapangan. Kesimpulan berlaku untuk dataset ini, bukan untuk Indonesia secara umum.
2. **Konversi unit `_ppm`** adalah inferensi terbaik; harus ditampilkan sebagai asumsi dan divalidasi ulang.
3. **Korelasi bukan kausalitas**; musiman dan tren bersama dapat menciptakan korelasi palsu. Gunakan versi anomali untuk klaim dampak.
4. **Relasi RS–stasiun** berbasis urutan booklet, bukan jarak geografis.
5. **Data kesehatan tidak memiliki koordinat**; hanya kota/kecamatan.
6. **Tidak ada data populasi, kepadatan, atau cakupan layanan**; analisis keterpaparan hanya bisa kualitatif.
7. **Stasiun duplikatif** (KTG-01/02) membatasi independensi bukti regional.
8. **Periode 2026 tidak penuh** (s.d. 14 Oktober), sehingga perbandingan tahunan 2026 harus diberi catatan.
9. **BJB-01 dan JMB-02** tidak boleh dipakai untuk tren tanpa penjelasan eksplisit.

---

## 9. Rekomendasi Analisis Lanjutan

- Uji sensitivitas: hasil dengan `VALID` saja vs `VALID+SUSPECT`.
- Bandingkan korelasi mentah vs anomali untuk menunjukkan pentingnya kontrol musiman.
- Hitung kontribusi polutan lain (PM10, SO₂, NO₂) terhadap ISPU untuk melihat polutan penentu.
- Buat skor prioritas lokasi baru yang transparan (bobot dan normalisasi ditampilkan di UI).
- Tampilkan "data quality score" per stasiun agar juri melihat mana angka yang layak dipercaya.

---

## 10. Kesimpulan Satu Paragraf

Dataset ini bercerita tentang **krisis kabut asap yang berulang dan memburuk di wilayah gambut**, dengan konsekuensi kesehatan yang terukur pada balita dan lansia. Namun cerita itu hanya bisa dipercaya jika dashboard mampu memisahkan sinyal dari noise: satuan yang berbeda, sensor yang macet, stasiun yang mati, dan resolusi yang berubah. Dashboard yang menang adalah yang menggabungkan **peta prioritas, waktu rawan, bukti dampak kesehatan, dan kejujuran kualitas data** dalam satu alur keputusan.
