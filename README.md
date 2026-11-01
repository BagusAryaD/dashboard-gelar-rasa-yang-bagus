# NAPAS — Dashboard Gelar Rasa 2026

Dashboard interaktif kualitas udara dan kesehatan respirasi dari 27 kota di Indonesia. Dibangun untuk menjawab enam objektif studi kasus Gelar Rasa 2026 dengan bahasa yang bisa dibaca oleh juri umum.

## Halaman

| Rute | Isi |
| --- | --- |
| `/` | Ringkasan nasional, temuan utama, dan puncak episode |
| `/peta` | Peta sebaran PM2.5, profil stasiun, skor prioritas pemantauan |
| `/waktu` | Kalender panas, pola jam dan hari, musim asap, episode bulanan |
| `/pendorong` | Scatter lokasi, wind rose, matriks korelasi polutan, korelasi meteorologi |
| `/kesehatan` | Tren kunjungan respirasi, analisis lag, kelompok rentan, hotspot |
| `/kualitas-data` | Komposisi QC, kelengkapan per stasiun, eksklusi, konversi satuan |

## Menjalankan

```powershell
cd dashboard
npm install
python scripts/etl.py
npm run dev
```

Buka `http://localhost:3000`.

Build statis:

```powershell
npm run build
python -m http.server 4173 --directory out
```

Hasil build ada di `out/`. Aplikasi memakai `output: "export"` sehingga tidak memerlukan server Node saat disajikan.

## Deploy ke Vercel

Folder `dashboard/` adalah root repository dan sudah dilengkapi `vercel.json` untuk static export:

```json
{
  "framework": null,
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "out"
}
```

Langkah deploy:

1. Import repository ke Vercel. Tidak perlu mengatur Root Directory karena `package.json` berada di root repo.
2. Biarkan pengaturan dari `vercel.json`; Vercel akan menjalankan `npm run build` dan menyajikan folder `out/`.
3. Deploy.

Vercel **tidak menjalankan ETL Python**. Karena itu, `public/data/` wajib ikut di-commit. Jika dataset mentah berubah, jalankan `python scripts/etl.py` secara lokal, lalu commit ulang hasilnya sebelum push.

## Sumber data

Dataset mentah berada di direktori induk (`../`) dan **tidak diubah** oleh dashboard. Semua pembersihan dilakukan di `scripts/etl.py`, lalu hasil turunannya ditulis ke `public/data/`.

Berkas utama:

- `daily_air.csv` — 27.486 baris harian stasiun, 11 kolom
- `daily_health.csv` — 27.491 baris harian rumah sakit, 10 kolom
- `summary.json`, `monthly.json`, `stations.json`
- `temporal.json`, `correlations.json`, `windrose.json`
- `lag.json`, `priority.json`, `dq.json`
- `indonesia.geojson` — batas provinsi untuk peta

### Aturan pembersihan

- Hanya baris dengan flag `VALID` yang dipakai untuk analisis utama. `SUSPECT` disimpan sebagai pembanding.
- Rata-rata harian membutuhkan minimal **6 jam valid** PM2.5.
- Nilai PM2.5 yang identik selama **6 jam berturut-turut** dianggap sensor macet dan dikeluarkan.
- BJB-01 memiliki 7.329 jam macet (2024-09-07 sampai 2025-07-09).
- JMB-02 dikeluarkan dari analisis deret waktu karena hanya memiliki 122 jam valid.
- Data PLB-01 yang beresolusi 15 menit pada September-Oktober dirata-ratakan ke jam sebelum agregasi harian.

### Konversi satuan

Tiga berkas (`BJB-01`, `MDN-01`, `PSW-01`) memakai satuan ppm untuk gas dan mg/m³ untuk partikel:

| Parameter | Faktor |
| --- | --- |
| PM2.5, PM10 | × 1000 |
| SO₂ | × 2620 |
| CO | × 1145 |
| O₃ | × 1960 |
| NO₂ | × 1880 |

## Catatan GeoJSON

`public/data/indonesia.geojson` berasal dari batas provinsi Indonesia. Geometri Papua dan Papua Barat pada sumber awal memiliki winding order yang membuat `d3-geo` membaca polygon sebagai komplemen bola, sehingga peta membesar menutupi seluruh area. Semua ring sudah di-rewind: ring luar searah jarum jam dan lubang berlawanan arah jarum jam.

Jika mengganti berkas GeoJSON, periksa kembali bahwa `path.bounds` hasil proyeksi tidak mencakup hampir seluruh bola. Kesalahan winding biasanya membuat satu provinsi menggambar kotak besar yang menutupi peta.

## Skor prioritas

Skor 0 sampai 100 menggabungkan:

- 30% rata-rata PM2.5 teramati
- 25% frekuensi hari episode (PM2.5 > 75 µg/m³)
- 25% tekanan kunjungan respirasi rumah sakit pasangan
- 10% kekurangan kelengkapan data
- 10% penalti redundansi untuk pasangan KTG-01/KTG-02

Ambang rekomendasi: skor ≥ 55 masuk prioritas tinggi, skor ≥ 40 perlu dipantau dan diperkuat, sisanya cukup memadai. Skor adalah alat bantu prioritas jaringan pemantauan, bukan vonis kualitas udara suatu kota.

## Teknologi

Next.js 16 (App Router, static export), React 19, TypeScript, Tailwind CSS 4, Recharts, D3 Geo, PapaParse, Phosphor Icons, Geist.

## Dokumen perencanaan

- `01-KONTEKS-DATA.md` — temuan awal dan konteks dataset
- `02-RENCANA-IMPLEMENTASI.md` — rencana teknis dan keputusan desain
