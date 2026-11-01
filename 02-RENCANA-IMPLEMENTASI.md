# Rencana Implementasi Dashboard — Gelar Rasa 2026

> Dokumen ini adalah rencana teknis untuk membangun dashboard interaktif berbasis **Next.js + Recharts/D3** dengan cakupan **enam tujuan case study**, disajikan dalam **Bahasa Indonesia** untuk **juri umum**.

---

## 1. Prinsip Desain

1. **Storytelling sebelum dekorasi.** Setiap halaman dimulai dengan satu kalimat *takeaway*, lalu visual yang mendukungnya.
2. **Satu layar, satu pesan.** Jangan menumpuk 10 grafik tanpa hierarki.
3. **Jujur soal data.** Konversi unit, stasiun yang dikecualikan, dan keterbatasan ditampilkan, bukan disembunyikan.
4. **Interaktif tapi ringan.** Filter global, klik stasiun, dan drill-down tanpa backend.
5. **Aksesibel.** Kontras AA, palet aman buta warna, navigasi keyboard, angka dengan satuan jelas.

---

## 2. Arsitektur

Dashboard berupa **static site** (SSG). Tidak ada server aplikasi; seluruh agregasi dilakukan sekali oleh skrip Python, hasilnya disajikan sebagai file statis.

```
┌─────────────────────────────┐
│  Dataset mentah (33 CSV)    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  scripts/etl.py (Python)    │
│  - normalisasi unit         │
│  - pembersihan & QC         │
│  - resample & agregasi      │
│  - join dimensi             │
│  - hitung metrik turunan    │
└──────────────┬──────────────┘
               │  menulis
               ▼
┌─────────────────────────────┐
│  dashboard/public/data/     │
│  JSON + CSV teragregasi     │
└──────────────┬──────────────┘
               │  fetch (build/runtime)
               ▼
┌─────────────────────────────┐
│  Next.js App Router         │
│  Recharts + D3 + MapLibre   │
└─────────────────────────────┘
```

**Alasan tidak memakai database:** total data setelah agregasi <10 MB, cukup untuk static hosting (Vercel/Netlify/GitHub Pages). Tidak perlu server, biaya nol, dan cepat.

---

## 3. Stack

| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | static export memungkinkan |
| Styling | Tailwind CSS | token desain terpusat |
| Grafik standar | Recharts | line, bar, area, scatter, composed |
| Grafik kustom | D3 (`d3-scale`, `d3-shape`, `d3-array`) | heatmap kalender, wind rose, matriks korelasi |
| Peta | MapLibre GL JS + OpenFreeMap | tanpa API key |
| Tabel | TanStack Table | sorting/filter ranking |
| Parsing CSV | PapaParse | untuk file `daily_*.csv` |
| Ikon | Lucide React | konsisten |
| ETL | Python 3.11 + pandas + numpy | sudah tersedia di lingkungan |
| Deployment | Vercel (atau `next build && next export`) | gratis untuk static |

**Alternatif peta:** `react-simple-maps` bila ingin tanpa basemap eksternal. Default: MapLibre.

---

## 4. Struktur Folder

```
Dataset/
├── *.csv                         # data mentah, JANGAN diubah
├── metadata/
└── dashboard/
    ├── 01-KONTEKS-DATA.md
    ├── 02-RENCANA-IMPLEMENTASI.md
    ├── README.md                 # cara menjalankan
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── scripts/
    │   ├── etl.py                # pipeline utama
    │   └── validate.py           # cek kualitas output
    ├── public/
    │   └── data/
    │       ├── stations.geojson
    │       ├── daily_air.csv
    │       ├── daily_health.csv
    │       ├── monthly.json
    │       ├── hourly_profile.json
    │       ├── windrose.json
    │       ├── correlations.json
    │       ├── lag.json
    │       ├── dq.json
    │       └── priority_sites.json
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── globals.css
    │   │   ├── page.tsx                 # 1. Ringkasan
    │   │   ├── peta/page.tsx            # 2. Peta & Prioritas
    │   │   ├── waktu/page.tsx           # 3. Waktu Rawan
    │   │   ├── pendorong/page.tsx       # 4. Pendorong
    │   │   ├── kesehatan/page.tsx       # 5. Dampak Kesehatan
    │   │   └── kualitas-data/page.tsx   # 6. Kualitas Data
    │   ├── components/
    │   │   ├── layout/                  # navbar, footer, page-header
    │   │   ├── ui/                      # kpi-card, chart-card, callout, badge
    │   │   ├── filters/                 # date-range, region, site-type, qc-mode
    │   │   ├── charts/                  # wrapper Recharts & D3
    │   │   └── map/                     # station-map, map-legend, station-panel
    │   ├── lib/
    │   │   ├── metrics.ts               # ISPU, kategori, format
    │   │   ├── data.ts                  # loader + tipe
    │   │   ├── constants.ts             # ambang, warna, label
    │   │   └── filters.ts               # logika filter & URL state
    │   └── types/
    │       └── data.ts
    └── tests/
        └── metrics.test.ts
```

---

## 5. Kontrak Data Hasil ETL

### 5.1 `stations.geojson`

Merupakan GeoJSON `FeatureCollection`, satu fitur per stasiun.

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [106.827153, -6.175392] },
  "properties": {
    "station_id": "JKT-01",
    "sensor_id": "SENS-001",
    "hospital_id": "RS-XXX-01",
    "name": "Gambir",
    "city": "Kota Administrasi Jakarta Pusat",
    "province": "DKI Jakarta",
    "region": "Jakarta",
    "island": "Jawa",
    "site_type": "Urban Background",
    "baseline_pm25": 37.5,
    "traffic_per_h": 1850,
    "distance_to_road_m": 45,
    "status": "excluded | flagged | ok",
    "status_reason": "sensor macet Sep 2024–Jun 2025",
    "data_completeness": 0.98
  }
}
```

### 5.2 `daily_air.csv`

Satu baris = satu stasiun × satu tanggal.

```
date, station_id, pm25, pm10, so2, co, o3, no2,
temp, rh, ws, wd, valid_hours, completeness_pct,
ispu_pm25, category, exceed_55, episode, is_stuck
```

Aturan:

- Semua polutan sudah dalam µg/m³.
- `valid_hours` hanya menghitung baris `VALID`.
- Baris tetap ada meskipun `valid_hours < 18`, tetapi `pm25 = null` dan diberi `completeness_pct`.
- `is_stuck = 1` untuk hari yang mengandung nilai macet.

### 5.3 `daily_health.csv`

```
date, hospital_id, station_id, dow,
temp_c, dptp_c, rhum_pct,
resp, resp_under5, resp_over60,
asthma, copd, cvd, death, is_weekend
```

### 5.4 `monthly.json`

Agregat bulanan per stasiun dan per region:

```json
{
  "byStation": [
    { "month": "2026-09", "station_id": "KTG-01", "pm25": 420.3, "valid_days": 30 }
  ],
  "byRegion": [
    { "month": "2026-09", "region": "Kalimantan Tengah", "pm25": 420.3 }
  ]
}
```

### 5.5 `hourly_profile.json`

Rata-rata PM2.5 per kombinasi `station_id × month × hour × day_type` (kerja/libur). Dipakai untuk heatmap dan profil diurnal. Ukuran ±27 × 34 × 24 × 2 ≈ 44 ribu angka.

### 5.6 `windrose.json`

```json
{
  "JKT-01": {
    "bins": [0, 1, 2, 4, 6, 8],
    "directions": ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"],
    "counts": [[...], ...]
  }
}
```

### 5.7 `correlations.json`

- Korelasi PM2.5 dengan suhu, RH, kecepatan angin per stasiun.
- Korelasi `baseline_pm25` dengan traffic dan jarak jalan (level situs).
- Matriks korelasi antar-polutan nasional.

### 5.8 `lag.json`

Korelasi PM2.5 vs 7 outcome untuk lag 0–7, dua versi: `raw` dan `anomaly`, baik agregat maupun per stasiun.

### 5.9 `dq.json`

```json
{
  "qcTotals": { "VALID": 599185, "SUSPECT": 19741, "...": 0 },
  "perStation": [
    { "station_id": "JMB-02", "valid_pct": 0.5, "missing_hours": 0, "flags": {}, "note": "..." }
  ],
  "completenessMatrix": [
    { "station_id": "MDN-01", "month": "2024-01", "pct": 62.5 }
  ],
  "exclusions": [
    { "station_id": "BJB-01", "from": "2024-09-01", "to": "2025-06-30", "reason": "nilai macet" }
  ]
}
```

### 5.10 `priority_sites.json`

```json
{
  "station_id": "PKN-01",
  "score": 87.4,
  "components": {
    "baseline": 0.62,
    "episode_frequency": 0.78,
    "health_burden": 0.91,
    "data_completeness": 0.95,
    "redundancy": 0.10
  },
  "recommendation": "Pertahankan & tambah monitor sekunder"
}
```

---

## 6. Pipeline ETL

### 6.1 Langkah

1. **Baca** semua CSV dengan `dtype=str` untuk kolom polutan (agar string error tidak langsung gagal).
2. **Normalisasi nama kolom** `_ppm` → `_ug_m3` + simpan `unit_original`.
3. **Konversi unit**:
   - PM × 1000 (mg/m³ → µg/m³)
   - SO₂ × 2620, CO × 1145, O₃ × 1960, NO₂ × 1880
4. **Coerce numeric** dan ganti sentinel (`-999`, `-9999`, `inf`, string) menjadi `NaN`.
5. **Floor timestamp** ke jam; buang duplikat `(station_id, hour)` dengan prioritas `VALID`.
6. **Deteksi stuck**: nilai identik berturut-turut ≥6 jam → `is_stuck`.
7. **Filter QC**: pertahankan `VALID` untuk analisis utama; simpan versi `VALID+SUSPECT` untuk uji sensitivitas.
8. **Resample PLB-01**: 15 menit → jam (mean), lalu jam → hari.
9. **Agregasi harian** dengan syarat ≥18 jam valid.
10. **Join** `sites`, `sensors`, `hospitals`, mapping stasiun–RS, dan `dim_date`.
11. **Hitung metrik**: ISPU, kategori, exceedance, episode, rolling 24 jam, anomali bulanan.
12. **Agregasi turunan**: bulanan, profil jam, wind rose, korelasi, lag, kualitas data.
13. **Tulis output** ke `public/data/` dan jalankan `validate.py`.

### 6.2 Aturan keputusan

| Kasus | Keputusan |
|---|---|
| `JMB-02` | Exclude dari time-series; tampil di halaman kualitas data |
| `BJB-01` periode macet | Exclude dari tren; tetap tampil di peta dengan badge "data bermasalah" |
| `MDN-01` hari tidak lengkap | `pm25 = null` jika <18 jam valid |
| `CALIBRATING`/`MISSING`/`WARMUP`/`MAINTENANCE` | Bukan polusi; tidak dihitung |
| PLB 15 menit | Resample ke jam dulu, agar tidak overweight |
| KTG-01/02 | Tampil terpisah, tetapi agregasi regional pakai rata-rata |

### 6.3 Validasi output (`validate.py`)

- Jumlah baris `daily_air` = 27 × jumlah tanggal unik.
- Tidak ada nilai negatif pada polutan.
- `completeness_pct` antara 0–100.
- Semua `station_id` ada di `stations.geojson`.
- Semua `hospital_id` punya `station_id`.
- Total `VALID` di `dq.json` sama dengan hitungan mentah.
- File JSON valid dan ukuran <5 MB per file.

---

## 7. Rancangan Halaman

### 7.1 Navigasi

Navbar horizontal dengan enam item:

`Ringkasan · Peta & Prioritas · Waktu Rawan · Pendorong · Kesehatan · Kualitas Data`

Di kanan: indikator periode data dan tombol "Metodologi" (membuka panel/drawer).

### 7.2 Halaman 1 — Ringkasan

**Tujuan:** memberi jawaban dalam 30 detik.

- **Hero statement:** "Kabut asap September–Oktober makin parah setiap tahun, dan rumah sakit di wilayah gambut menanggung bebannya."
- **KPI cards** (5):
  - Rata-rata PM2.5 nasional (2024–2026)
  - Jumlah hari episode
  - Stasiun paling kritis
  - Total rawat inap pernapasan
  - Kenaikan kasus Sep–Okt 2024 → 2026
- **Line chart** rata-rata PM2.5 bulanan nasional + garis ambang 55 µg/m³ + shading Sep–Okt.
- **Bar chart** 8 stasiun dengan rata-rata tertinggi.
- **Callout** temuan kunci (maksimal 3 poin).
- **Tautan** ke halaman lain ("Lihat peta prioritas →").

### 7.3 Halaman 2 — Peta & Prioritas

**Tujuan:** menjawab "di mana" dan "mana yang perlu ditambah monitor".

- **MapLibre bubble map**:
  - Warna = kategori ISPU.
  - Ukuran = rata-rata PM2.5 (skala akar).
  - Badge berbeda untuk stasiun bermasalah (BJB, JMB-02).
  - Klik → panel detail: tren mini, nilai terakhir, completeness, RS terkait.
- **Filter**: tahun, musim, region, tipe situs, mode QC.
- **Ranking table** (TanStack): stasiun, rata-rata, maksimum, hari >55, completeness.
- **Panel rekomendasi**: tabel skor prioritas + alasan.
- **Legenda** warna dan ukuran.

### 7.4 Halaman 3 — Waktu Rawan

**Tujuan:** menjawab "kapan".

- **Calendar heatmap** harian (D3): tanggal × stasiun, warna PM2.5.
- **Heatmap jam × hari** (D3): 24 × 7, rata-rata per region terpilih.
- **Multi-line bulanan** per region dengan toggle stasiun.
- **Timeline episode**: penanda hari >75 µg/m³, zoom ke Sep–Okt.
- **Bar weekday vs weekend** (PM2.5 dan kasus).
- **Profil diurnal** per tipe lokasi (4–5 garis).

### 7.5 Halaman 4 — Pendorong Polusi

**Tujuan:** menjawab "mengapa".

- **Matriks korelasi** (D3): polutan × cuaca.
- **Wind rose** (D3 radial): 16 arah × bin kecepatan, filter stasiun.
- **Scatter** `baseline_pm25` vs traffic, dan vs jarak jalan (level situs, 27 titik).
- **Stacked area** komposisi polutan per region.
- **Bar** rata-rata baseline per tipe lokasi.
- **Opsional:** feature importance dari random forest sederhana (dihitung di ETL).

### 7.6 Halaman 5 — Dampak Kesehatan

**Tujuan:** menjawab "seberapa besar dampaknya dan siapa yang rentan".

- **Dual-axis composed chart**: PM2.5 bulanan vs total kasus pernapasan.
- **Lag curve**: korelasi lag 0–7 untuk 4 outcome utama, toggle raw/anomali.
- **Bar** balita vs lansia per region.
- **Scatter kuadran** per stasiun: x = rata-rata PM2.5, y = korelasi kesehatan / beban kasus.
- **Tabel hotspot**: 8 stasiun dengan korelasi tertinggi.
- **Catatan metodologi**: korelasi bukan kausalitas, kontrol musiman.

### 7.7 Halaman 6 — Kualitas Data & Jaringan

**Tujuan:** membangun kepercayaan dan menjawab tujuan 5.

- **Stacked bar** 12 kategori QC.
- **Completeness heatmap** stasiun × bulan.
- **Timeline status sensor**: periode valid, macet, mati.
- **Tabel eksklusi** dengan alasan.
- **Tabel skor prioritas** lokasi baru (bobot transparan).
- **Panel asumsi konversi unit** (sebelum/sesudah).

---

## 8. Komponen Bersama

| Komponen | Fungsi |
|---|---|
| `KpiCard` | Angka besar, label, delta, ikon, tooltip definisi |
| `ChartCard` | Judul, takeaway, slot chart, footer sumber |
| `SectionHeader` | Judul + deskripsi singkat |
| `FilterBar` | Rentang tanggal, region, tipe situs, mode QC |
| `StationSelect` | Searchable dropdown 27 stasiun |
| `CategoryBadge` | Warna & label ISPU |
| `Callout` | Temuan kunci, varian info/warning/critical |
| `EmptyState` | Saat filter tidak menghasilkan data |
| `MethodologyDrawer` | Definisi metrik, unit, ambang, eksklusi |
| `DataTable` | Ranking dengan sorting dan pencarian |

---

## 9. Desain Visual

### 9.1 Arah

**Editorial data journalism**: bersih, tipografi kuat, banyak ruang kosong, warna aksen hanya untuk data.

- Latar: `#FAFAF7` (off-white), kartu `#FFFFFF`, teks `#1A1A1A`, muted `#6B6B6B`.
- Aksen utama: `#0F766E` (teal) untuk garis tren.
- Warna kategori ISPU:
  - Baik: `#22C55E`
  - Sedang: `#EAB308`
  - Tidak Sehat: `#F97316`
  - Sangat Tidak Sehat: `#EF4444`
  - Berbahaya: `#7E22CE`
- Garis ambang: dashed `#9CA3AF`.
- Font: Inter / Geist untuk UI, tabular numbers untuk angka.
- Radius kartu 12 px, shadow sangat halus, border 1 px `#E7E5E4`.

### 9.2 Prinsip chart

- Sumbu Y selalu diberi satuan.
- Legend hanya jika >1 seri.
- Tooltip menampilkan tanggal, nilai, kategori, dan completeness.
- Hindari pie chart; gunakan bar.
- Maksimal 2 garis utama per chart agar terbaca.
- Mobile: chart horizontal scroll atau berubah jadi bar.

### 9.3 Aksesibilitas

- Kontras teks minimal AA.
- Jangan hanya mengandalkan warna: sertakan label/ikon.
- Semua kontrol bisa diakses keyboard.
- `aria-label` pada tombol dan chart.
- Prefers-reduced-motion untuk animasi.

---

## 10. State dan Interaksi

- Filter global disimpan di **URL query** (`?year=2026&region=Kalimantan&qc=strict`) agar bisa dibagikan.
- State lokal untuk pilihan stasiun dan mode tampilan.
- Tidak ada autentikasi.
- Data dimuat sekali per halaman; filter dilakukan di client.
- `daily_air.csv` dan `daily_health.csv` di-cache oleh browser.

---

## 11. Performa

| Masalah | Solusi |
|---|---|
| 667 ribu baris terlalu besar | Hanya kirim agregat harian (±27 ribu baris) |
| Peta berat | Lazy-load MapLibre, hanya 27 titik |
| Re-render chart | `useMemo` pada data terfilter |
| File besar | Kompresi JSON, pisahkan per halaman |
| Mobile | Batasi animasi, turunkan jumlah titik scatter |

Target: **Lighthouse Performance ≥90**, first load <2 MB per halaman.

---

## 12. Tahapan Implementasi

### Fase 0 — Setup (0,5 hari)

- `npx create-next-app@latest dashboard --ts --tailwind --app`
- Konfigurasi path alias, font, metadata.
- Layout dasar + navbar + footer.
- Token desain di `globals.css`.

### Fase 1 — ETL dan validasi (1–1,5 hari)

- Implementasi `scripts/etl.py` lengkap.
- Hasilkan semua file di `public/data/`.
- Jalankan `validate.py`, catat ringkasan kualitas data.
- Review angka kunci terhadap dokumen konteks.

### Fase 2 — Komponen bersama (0,5–1 hari)

- KPI, ChartCard, FilterBar, badge, callout, drawer metodologi.
- Loader data dan tipe TypeScript.
- Utility ISPU dan format angka.

### Fase 3 — Halaman inti (2 hari)

- Halaman 1 Ringkasan.
- Halaman 2 Peta & Prioritas (MapLibre + ranking + skor).

### Fase 4 — Halaman analitis (2 hari)

- Halaman 3 Waktu Rawan.
- Halaman 4 Pendorong.
- Halaman 5 Dampak Kesehatan.

### Fase 5 — Halaman kualitas data (0,5–1 hari)

- Halaman 6.
- Panel asumsi unit dan daftar eksklusi.

### Fase 6 — Poles dan uji (1 hari)

- Copywriting narasi tiap halaman.
- Responsif mobile/tablet.
- Empty state, loading skeleton, error state.
- Uji build, Lighthouse, aksesibilitas.
- README dan dokumentasi menjalankan.

**Total estimasi: 7–8 hari kerja.**

---

## 13. Kriteria Penerimaan

Dashboard dianggap selesai jika:

1. Enam halaman dapat diakses dan tidak ada error build.
2. Semua angka di dashboard dapat ditelusuri ke `daily_air.csv`/`daily_health.csv`.
3. Peta menampilkan 27 stasiun dengan 27 RS terhubung.
4. Stasiun bermasalah (BJB-01, JMB-02) diberi penanda eksplisit.
5. Filter global mengubah minimal tiga visual sekaligus.
6. Halaman kesehatan menampilkan lag 0–7 dan perbandingan balita vs lansia.
7. Halaman kualitas data menampilkan 12 kategori QC dan daftar eksklusi.
8. Tampilan responsif pada lebar 375 px, 768 px, dan 1440 px.
9. Tidak ada teks overflow atau chart terpotong.
10. `npm run build` sukses tanpa error TypeScript.

---

## 14. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Konversi unit `_ppm` salah | Semua analisis BJB/MDN/PSW keliru | Tampilkan sebelum/sesudah, uji terhadap baseline, beri catatan asumsi |
| Korelasi kesehatan menyesatkan | Klaim berlebihan | Tampilkan versi raw dan anomali; jelaskan kausalitas |
| Data macet BJB tidak terdeteksi | Tren palsu | Deteksi stuck otomatis + badge |
| Peta gagal load (basemap) | Halaman 2 kosong | Fallback ke `react-simple-maps` atau SVG Indonesia |
| File data terlalu besar | Load lambat | Agregasi, pisah per halaman, kompresi |
| Waktu habis | Halaman 3–6 belum jadi | Prioritaskan halaman 1, 2, 5; sisanya minimal |

---

## 15. Di Luar Cakupan

- Backend API, autentikasi, database.
- Data populasi dan estimasi keterpaparan kuantitatif (butuh sumber eksternal).
- Model prediksi produksi.
- Data real-time.
- Multi-bahasa (fokus Bahasa Indonesia).

---

## 16. Langkah Berikutnya

1. Setujui rencana ini.
2. Jalankan Fase 0–1: setup proyek dan ETL.
3. Review output ETL bersama angka di `01-KONTEKS-DATA.md`.
4. Lanjut ke halaman 1–2, lalu 3–6.
5. Uji build dan deploy.
