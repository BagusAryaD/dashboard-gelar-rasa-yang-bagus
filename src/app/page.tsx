"use client";

import Link from "next/link";
import {
  ArrowRight,
  Heartbeat,
  MapPin,
  TrendUp,
  Warning,
  Wind,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "@/components/layout/PageHeader";
import Kpi from "@/components/ui/Kpi";
import ChartCard from "@/components/ui/ChartCard";
import Badge from "@/components/ui/Badge";
import Methodology from "@/components/ui/Methodology";
import TrendChart from "@/components/charts/TrendChart";
import RankingBars from "@/components/charts/RankingBars";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { ErrorBlock, LoadingPage } from "@/components/ui/Loading";
import { useJson } from "@/lib/data";
import {
  categoryFromPm,
  dateShort,
  fmtInt,
  fmtNum,
  monthShort,
  pctChange,
} from "@/lib/metrics";
import type { Monthly, Station, Summary } from "@/types/data";

export default function HomePage() {
  const summary = useJson<Summary>("/data/summary.json");
  const monthly = useJson<Monthly>("/data/monthly.json");
  const stations = useJson<Station[]>("/data/stations.json");

  if (summary.loading || monthly.loading || stations.loading) {
    return <LoadingPage />;
  }
  if (summary.error || monthly.error || stations.error || !summary.data || !monthly.data || !stations.data) {
    return <ErrorBlock message={summary.error ?? monthly.error ?? stations.error ?? "Data tidak tersedia"} />;
  }

  const s = summary.data;
  const m = monthly.data;
  const list = stations.data;
  const active = list.filter((station) => station.status !== "excluded");
  const top = [...active].sort((a, b) => (b.pm25_mean ?? 0) - (a.pm25_mean ?? 0));
  const healthByMonth = new Map(m.health.map((row) => [row.month, row]));
  const dual = m.national.map((row) => ({
    month: row.month,
    pm25: row.pm25,
    resp: healthByMonth.get(row.month)?.resp ?? null,
  }));

  const sepOct = [2024, 2025, 2026].map((year) => ({
    year: String(year),
    resp: Math.round(s.sep_oct_resp[String(year)] ?? 0),
  }));
  const growth = pctChange(sepOct[0].resp, sepOct[2].resp);

  const ktg = m.byStation.filter((row) => row.station_id === "KTG-01");
  const ktgYears = [2024, 2025, 2026].map((year) => {
    const rows = ktg.filter((row) => row.month.startsWith(String(year)) && ["-09", "-10"].some((part) => row.month.endsWith(part)));
    return {
      year,
      value: rows.reduce((sum, row) => sum + row.pm25, 0) / Math.max(1, rows.length),
    };
  });

  const peak = s.peak_day;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Ringkasan nasional / 2024-2026"
        title="Udara yang kita hirup, dalam angka."
        lead="Tiga tahun data dari 27 kota menunjukkan pola yang konsisten: beban PM2.5 tinggi, episode asap berulang setiap musim kemarau, dan tekanan yang sama pada layanan respirasi rumah sakit."
      >
        <div className="flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-white px-3 py-2 text-[11px] text-[var(--muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-2)]" />
          {fmtInt(active.length)} stasiun dianalisis
        </div>
      </PageHeader>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="Rata-rata PM2.5 nasional"
          value={fmtNum(s.pm25_mean, 1)}
          unit="µg/m³"
          note="Sekitar 8 kali pedoman tahunan WHO (5 µg/m³)."
          tone="accent"
          icon={<Wind size={15} />}
        />
        <Kpi
          label="Hari stasiun di atas 75"
          value={fmtInt(s.episode_days)}
          unit="hari"
          note="Hari-stasiun dengan PM2.5 masuk kategori tidak sehat."
          tone="warn"
          icon={<Warning size={15} />}
        />
        <Kpi
          label="Stasiun terberat"
          value={top[0]?.station_id ?? "n/a"}
          note={`${fmtNum(top[0]?.pm25_mean, 1)} µg/m³, rata-rata 2024-2026.`}
          tone="warn"
          icon={<MapPin size={15} />}
        />
        <Kpi
          label="Kunjungan respirasi"
          value={fmtInt(s.resp_total)}
          unit="kasus"
          note="Total 27 rumah sakit rujukan pada periode yang sama."
          icon={<Heartbeat size={15} />}
        />
        <Kpi
          label="Kenaikan Sep-Okt"
          value={growth == null ? "n/a" : `+${fmtNum(growth, 0)}%`}
          note={`Dari ${fmtInt(sepOct[0].resp)} menjadi ${fmtInt(sepOct[2].resp)} kunjungan per hari.`}
          tone="warn"
          icon={<TrendUp size={15} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-8"
          title="Gelombang PM2.5 nasional"
          subtitle="Rata-rata bulanan seluruh stasiun yang lolos kontrol kualitas. Area jingga menandai September-Oktober."
          footer="Ambang 75 µg/m³ dipakai sebagai penanda episode tidak sehat. Nilai bulanan adalah rata-rata stasiun, bukan rata-rata paparan penduduk."
        >
          <TrendChart
            data={m.national}
            xKey="month"
            height={310}
            reference={75}
            referenceLabel="Ambang 75 µg/m³"
            areas={[
              { from: "2024-09", to: "2024-10" },
              { from: "2025-09", to: "2025-10" },
              { from: "2026-09", to: "2026-10" },
            ]}
            xTickFormatter={monthShort}
            tooltipLabelFormatter={(value) => monthShort(String(value))}
            series={[
              { key: "pm25", label: "Rata-rata PM2.5", color: "#0e5c53", width: 2.2 },
              { key: "pm25_median", label: "Median stasiun", color: "#8aa39a", dashed: true },
            ]}
          />
        </ChartCard>

        <div className="card flex flex-col xl:col-span-4">
          <div className="border-b border-[var(--line)] px-4 py-3.5">
            <div className="kicker">Puncak episode</div>
            <div className="mt-1 text-[13.5px] font-semibold">Oktober 2026, Kalimantan Tengah</div>
          </div>
          <div className="flex flex-1 flex-col px-4 py-4">
            <div className="flex items-baseline gap-2">
              <span className="num text-[44px] font-medium leading-none tracking-[-0.05em] text-[var(--ink)]">
                {fmtNum(peak?.pm25, 1)}
              </span>
              <span className="text-[11px] text-[var(--muted)]">µg/m³</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
              <span className="num font-medium text-[var(--ink-soft)]">{peak?.station_id}</span>
              <span>{peak ? dateShort(peak.date) : ""}</span>
              <Badge category={categoryFromPm(peak?.pm25)} />
            </div>
            <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
              Nilai harian tertinggi sepanjang periode. Stasiun KTG-01 dan KTG-02 berada
              di lokasi yang berdekatan sehingga keduanya menangkap puncak yang sama.
            </p>

            <div className="mt-4 border-t border-[var(--line)] pt-3">
              <div className="kicker mb-2">Tiga nilai harian tertinggi</div>
              <div className="divide-y divide-[var(--line)]">
                {s.top_episodes.slice(0, 3).map((episode) => (
                  <div key={`${episode.date}-${episode.station_id}`} className="flex items-center gap-2 py-2">
                    <span className="num w-14 text-[10.5px] text-[var(--muted)]">{episode.station_id}</span>
                    <span className="text-[11px] text-[var(--muted)]">{dateShort(episode.date)}</span>
                    <span className="num ml-auto text-[12px] font-medium text-[var(--ink)]">
                      {fmtNum(episode.pm25, 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/peta"
              prefetch={false}
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-[12px] font-semibold text-[var(--accent)] hover:underline"
            >
              Lihat sebaran dan prioritas
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          title="PM2.5 dan kunjungan respirasi"
          subtitle="Rata-rata harian per bulan pada skala nasional. Keduanya bergerak searah pada musim asap."
          footer="Sumbu kanan menunjukkan rata-rata kunjungan respirasi harian dari 27 rumah sakit. Hubungan ini asosiatif, bukan bukti sebab-akibat."
        >
          <TrendChart
            data={dual}
            xKey="month"
            height={290}
            unit="µg/m³"
            dualAxis
            rightUnit="kunjungan per hari"
            xTickFormatter={monthShort}
            tooltipLabelFormatter={(value) => monthShort(String(value))}
            series={[
              { key: "pm25", label: "PM2.5", color: "#0e5c53", width: 2.2 },
              { key: "resp", label: "Kunjungan respirasi", color: "#a86512", yAxisId: "right", width: 1.8 },
            ]}
          />
        </ChartCard>

        <ChartCard
          className="xl:col-span-5"
          title="Beban September-Oktober"
          subtitle="Rata-rata kunjungan respirasi harian pada puncak musim asap."
          footer="Angka 2026 mencakup 1 sampai 14 Oktober, periode dengan episode terberat."
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sepOct} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e7eae3" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#657069" }} tickLine={false} axisLine={{ stroke: "#d8ddd5" }} />
              <YAxis tick={{ fontSize: 10, fill: "#657069" }} tickLine={false} axisLine={false} width={44} domain={[0, 1400]} ticks={[0, 350, 700, 1050, 1400]} />
              <Tooltip content={<ChartTooltip unit="kunjungan" />} cursor={{ fill: "#f3f5f1" }} />
              <Bar dataKey="resp" name="Kunjungan per hari" fill="#a86512" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="resp" position="top" style={{ fontSize: 10.5, fill: "#4d5851", fontFamily: "var(--font-geist-mono)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1 rounded-[8px] bg-[var(--panel-soft)] px-3 py-2 text-[11px] leading-5 text-[var(--muted)]">
            Kenaikan {growth == null ? "" : `${fmtNum(growth, 0)}%`} dalam dua tahun. Pola yang sama
            terlihat pada kelompok usia di bawah 5 tahun dan di atas 60 tahun.
          </div>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-6"
          title="Sepuluh stasiun dengan rata-rata tertinggi"
          subtitle="Rata-rata PM2.5 harian 2024 sampai 2026. JMB-02 dikeluarkan karena telemetri rusak."
          footer="Warna mengikuti kategori rata-rata: hijau baik, kuning sedang, jingga tidak sehat."
        >
          <RankingBars
            data={top.slice(0, 10).map((station) => ({
              name: station.station_id,
              value: station.pm25_mean ?? 0,
              color: ["#2d9358", "#b8860b", "#c65d19", "#b93a32", "#753b8c"][
                ["good", "moderate", "unhealthy", "very", "hazard"].indexOf(categoryFromPm(station.pm25_mean))
              ],
            }))}
            labelWidth={86}
            height={300}
          />
        </ChartCard>

        <div className="card xl:col-span-6">
          <div className="border-b border-[var(--line)] px-4 py-3.5">
            <h2 className="text-[13.5px] font-semibold">Tiga temuan yang perlu dibawa pulang</h2>
            <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
              Ringkasan untuk pembaca yang baru melihat data ini.
            </p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            <div className="grid grid-cols-[44px_1fr] gap-3 px-4 py-4">
              <span className="num text-[22px] font-medium leading-none text-[var(--accent)]">01</span>
              <div>
                <div className="text-[12.5px] font-semibold">Asap musiman makin tinggi</div>
                <p className="mt-1 text-[11.5px] leading-5 text-[var(--muted)]">
                  Rata-rata Sep-Okt di KTG-01 naik dari{" "}
                  <span className="num text-[var(--ink-soft)]">{fmtNum(ktgYears[0].value, 0)}</span> menjadi{" "}
                  <span className="num text-[var(--ink-soft)]">{fmtNum(ktgYears[2].value, 0)} µg/m³</span>.
                  Tahun 2026 mencatat puncak harian 1.128 µg/m³.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[44px_1fr] gap-3 px-4 py-4">
              <span className="num text-[22px] font-medium leading-none text-[var(--accent)]">02</span>
              <div>
                <div className="text-[12.5px] font-semibold">Rumah sakit ikut menanggung</div>
                <p className="mt-1 text-[11.5px] leading-5 text-[var(--muted)]">
                  Kunjungan respirasi harian naik dari {fmtInt(sepOct[0].resp)} pada Sep-Okt 2024
                  menjadi {fmtInt(sepOct[2].resp)} pada Sep-Okt 2026. Kelompok rentan menanggung
                  bagian terbesar.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[44px_1fr] gap-3 px-4 py-4">
              <span className="num text-[22px] font-medium leading-none text-[var(--accent)]">03</span>
              <div>
                <div className="text-[12.5px] font-semibold">Kualitas data menentukan kesimpulan</div>
                <p className="mt-1 text-[11.5px] leading-5 text-[var(--muted)]">
                  Satu sensor macet selama 7.329 jam dan satu stasiun nyaris tidak mengirim data.
                  Tanpa pembersihan, rata-rata nasional bisa menyesatkan.
                </p>
                <Link href="/kualitas-data" prefetch={false} className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--accent)] hover:underline">
                  Periksa catatan kualitas data
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Jelajahi
            </span>
            {[
              ["/peta", "Peta prioritas"],
              ["/waktu", "Pola waktu"],
              ["/kesehatan", "Kesehatan"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
              >
                {label}
                <ArrowRight size={12} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Methodology>
        <p>
          Analisis memakai rata-rata harian stasiun dengan minimal 6 jam valid. Nilai PM2.5
          yang identik selama 6 jam berturut-turut dianggap sensor macet dan dikeluarkan dari
          rata-rata. Hanya baris berstatus <strong>VALID</strong> yang dipakai untuk analisis utama.
        </p>
        <p>
          Data kesehatan berasal dari 27 rumah sakit rujukan. Hubungan PM2.5 dan kunjungan
          dihitung pada tingkat stasiun, lalu dirata-ratakan. Angka ini tidak boleh dibaca
          sebagai jumlah kasus yang murni disebabkan polusi udara.
        </p>
      </Methodology>
    </div>
  );
}
