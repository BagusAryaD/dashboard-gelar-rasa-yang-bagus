"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Baby, Heartbeat, Hourglass, UsersThree } from "@phosphor-icons/react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import PageHeader from "@/components/layout/PageHeader";
import Kpi from "@/components/ui/Kpi";
import ChartCard from "@/components/ui/ChartCard";
import Badge from "@/components/ui/Badge";
import Methodology from "@/components/ui/Methodology";
import TrendChart from "@/components/charts/TrendChart";
import { ErrorBlock, LoadingPage } from "@/components/ui/Loading";
import { useJson } from "@/lib/data";
import {
  ISLAND_COLORS,
  categoryFromPm,
  fmtInt,
  fmtNum,
  fmtPct,
  monthShort,
} from "@/lib/metrics";
import type { Lag, Monthly, Station, Summary } from "@/types/data";

function HealthTooltip({ active, payload }: { active?: boolean; payload?: { payload?: Record<string, unknown> }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as
    | { station_id: string; city: string; pm25_mean: number; resp: number; resp_under5: number; resp_over60: number }
    | undefined;
  if (!row) return null;
  return (
    <div className="chart-tip">
      <div className="tip-label">{row.station_id}</div>
      <div className="font-medium text-white">{row.city}</div>
      <div className="mt-1 space-y-0.5 text-[11px] text-white/70">
        <div className="flex justify-between gap-4">
          <span>PM2.5 rata-rata</span>
          <span className="num text-white">{fmtNum(row.pm25_mean, 1)} µg/m³</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Korelasi lag 0</span>
          <span className="num text-white">{fmtNum(row.resp, 2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Balita</span>
          <span className="num text-white">{fmtNum(row.resp_under5, 2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Lansia</span>
          <span className="num text-white">{fmtNum(row.resp_over60, 2)}</span>
        </div>
      </div>
    </div>
  );
}

export default function KesehatanPage() {
  const summary = useJson<Summary>("/data/summary.json");
  const monthly = useJson<Monthly>("/data/monthly.json");
  const lag = useJson<Lag>("/data/lag.json");
  const stations = useJson<Station[]>("/data/stations.json");

  const joined = useMemo(() => {
    if (!monthly.data) return [];
    const health = new Map(monthly.data.health.map((row) => [row.month, row]));
    return monthly.data.national.map((row) => ({
      month: row.month,
      pm25: row.pm25,
      resp: health.get(row.month)?.resp ?? null,
      under5: health.get(row.month)?.resp_under5 ?? null,
      over60: health.get(row.month)?.resp_over60 ?? null,
    }));
  }, [monthly.data]);

  const lagData = useMemo(() => {
    if (!lag.data) return [];
    const rows = Array.from({ length: 8 }, (_, index) => ({ lag: index } as Record<string, number | null>));
    lag.data.aggregate.forEach((row) => {
      if (row.anomaly == null) return;
      rows[row.lag][row.outcome] = row.anomaly;
    });
    return rows;
  }, [lag.data]);

  if (summary.loading || monthly.loading || lag.loading || stations.loading) {
    return <LoadingPage />;
  }
  if (summary.error || monthly.error || lag.error || stations.error || !summary.data || !monthly.data || !lag.data || !stations.data) {
    return <ErrorBlock message={summary.error ?? monthly.error ?? lag.error ?? stations.error ?? "Data tidak tersedia"} />;
  }

  const s = summary.data;
  const stationMap = new Map(stations.data.map((station) => [station.station_id, station]));
  const hotspot = [...lag.data.byStation]
    .filter((row) => stationMap.has(row.station_id) && stationMap.get(row.station_id)?.status !== "excluded")
    .sort((a, b) => (b.resp ?? 0) - (a.resp ?? 0))
    .slice(0, 10)
    .map((row) => {
      const station = stationMap.get(row.station_id);
      return {
        ...row,
        city: station?.city ?? "",
        island: station?.island ?? "",
        pm25_mean: station?.pm25_mean ?? 0,
        episode_days: station?.episode_days ?? 0,
      };
    });

  const scatter = [...lag.data.byStation]
    .filter((row) => stationMap.has(row.station_id) && stationMap.get(row.station_id)?.status !== "excluded")
    .map((row) => {
      const station = stationMap.get(row.station_id);
      return {
        station_id: row.station_id,
        city: station?.city ?? "",
        island: station?.island ?? "",
        pm25_mean: station?.pm25_mean ?? 0,
        episode_days: station?.episode_days ?? 0,
        resp: row.resp ?? 0,
        resp_under5: row.resp_under5 ?? 0,
        resp_over60: row.resp_over60 ?? 0,
      };
    })
    .filter((row) => row.resp !== 0);

  const lag0 = lag.data.aggregate.filter((row) => row.lag === 0);
  const respLag0 = lag0.find((row) => row.outcome === "resp")?.anomaly;
  const under5Share = (s.resp_under5_total / Math.max(1, s.resp_total)) * 100;
  const over60Share = (s.resp_over60_total / Math.max(1, s.resp_total)) * 100;
  const peakMonth = [...monthly.data.health].sort((a, b) => b.resp - a.resp)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Kesehatan respirasi"
        title="Ketika udara memburuk, rumah sakit merasakannya."
        lead="Kunjungan respirasi mengikuti naik turunnya PM2.5. Hubungan paling kuat muncul pada hari yang sama dan hari berikutnya, lalu melemah setelah tiga sampai empat hari."
      >
        <Link
          href="/kualitas-data"
          prefetch={false}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-[9px] border border-[var(--line)] bg-white px-3 text-[11.5px] font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
        >
          Catatan data kesehatan
          <ArrowRight size={13} />
        </Link>
      </PageHeader>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Total kunjungan respirasi"
          value={fmtInt(s.resp_total)}
          unit="kasus"
          note="27 rumah sakit, 2024 sampai 14 Oktober 2026."
          tone="accent"
          icon={<Heartbeat size={15} />}
        />
        <Kpi
          label="Balita"
          value={fmtPct(under5Share, 0)}
          note={`${fmtInt(s.resp_under5_total)} kunjungan berasal dari anak di bawah 5 tahun.`}
          icon={<Baby size={15} />}
        />
        <Kpi
          label="Lansia"
          value={fmtPct(over60Share, 0)}
          note={`${fmtInt(s.resp_over60_total)} kunjungan berasal dari usia di atas 60 tahun.`}
          icon={<UsersThree size={15} />}
        />
        <Kpi
          label="Asosiasi lag 0"
          value={fmtNum(respLag0, 2)}
          note={`Korelasi anomali PM2.5 dan kunjungan pada hari yang sama. Puncak kunjungan: ${peakMonth ? monthShort(peakMonth.month) : "n/a"}.`}
          tone="warn"
          icon={<Hourglass size={15} />}
        />
      </section>

      <ChartCard
        title="PM2.5 dan kunjungan respirasi"
        subtitle="Rata-rata bulanan nasional. Sumbu kanan menunjukkan kunjungan respirasi harian."
        footer="Kedua seri memakai bulan kalender yang sama. Kenaikan bersama pada September-Oktober muncul di ketiga tahun."
      >
        <TrendChart
          data={joined}
          xKey="month"
          height={320}
          unit="µg/m³"
          dualAxis
          rightUnit="kunjungan per hari"
          reference={75}
          referenceLabel="Ambang 75"
          xTickFormatter={monthShort}
          tooltipLabelFormatter={(value) => monthShort(String(value))}
          series={[
            { key: "pm25", label: "PM2.5", color: "#0e5c53", width: 2.2 },
            { key: "resp", label: "Respirasi total", color: "#a86512", yAxisId: "right", width: 1.8 },
          ]}
        />
      </ChartCard>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          title="Jejak lag 0 sampai 7 hari"
          subtitle="Korelasi anomali setelah rata-rata bulanan dikeluarkan. Nilai lebih tinggi berarti hubungan lebih kuat."
          footer="Pola menurun menunjukkan paparan jangka pendek, bukan efek kumulatif berbulan-bulan. Semua nilai adalah asosiasi, bukan sebab-akibat."
        >
          <TrendChart
            data={lagData}
            xKey="lag"
            height={300}
            unit="r"
            yDomain={[-0.2, 0.35]}
            xTickFormatter={(value) => `${value} hr`}
            tooltipLabelFormatter={(value) => `Lag ${value} hari`}
            tooltipValueFormatter={(value) => fmtNum(value, 3)}
            series={[
              { key: "resp", label: "Respirasi total", color: "#0e5c53", width: 2.4 },
              { key: "resp_under5", label: "Balita", color: "#a86512", width: 1.8 },
              { key: "resp_over60", label: "Lansia", color: "#7c5a8f", width: 1.8 },
              { key: "asthma", label: "Asma", color: "#3f7f9e", dashed: true },
              { key: "copd", label: "PPOK", color: "#b93a32", dashed: true },
            ]}
          />
        </ChartCard>

        <ChartCard
          className="xl:col-span-5"
          title="Kelompok rentan"
          subtitle="Kunjungan harian rata-rata bulanan untuk balita dan lansia."
          footer="Kedua kelompok mengikuti pola yang sama dengan total respirasi, dengan amplitudo yang berbeda."
        >
          <TrendChart
            data={joined}
            xKey="month"
            height={300}
            unit="kunjungan"
            xTickFormatter={monthShort}
            tooltipLabelFormatter={(value) => monthShort(String(value))}
            series={[
              { key: "under5", label: "Balita", color: "#a86512", width: 2 },
              { key: "over60", label: "Lansia", color: "#7c5a8f", width: 2 },
            ]}
          />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          title="Stasiun dengan asosiasi kesehatan terkuat"
          subtitle="Sepuluh korelasi lag 0 tertinggi antara anomali PM2.5 dan kunjungan respirasi."
          footer="PKN-01, STG-01, dan PLB-01 menunjukkan asosiasi paling kuat. Ketiganya berada di wilayah dengan episode asap berulang."
        >
          <div className="scroll-x">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--line)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <th className="py-2 pr-3 font-semibold">Stasiun</th>
                  <th className="py-2 pr-3 font-semibold">Kota</th>
                  <th className="py-2 pr-3 text-right font-semibold">PM2.5</th>
                  <th className="py-2 pr-3 text-right font-semibold">r lag 0</th>
                  <th className="py-2 text-right font-semibold">Episode</th>
                </tr>
              </thead>
              <tbody>
                {hotspot.map((row) => (
                  <tr key={row.station_id} className="border-b border-[var(--line)] text-[11.5px] last:border-0">
                    <td className="num py-2 pr-3 font-semibold">{row.station_id}</td>
                    <td className="py-2 pr-3 text-[var(--muted)]">{row.city}</td>
                    <td className="num py-2 pr-3 text-right">{fmtNum(row.pm25_mean, 1)}</td>
                    <td className="num py-2 pr-3 text-right font-medium text-[var(--accent)]">{fmtNum(row.resp, 2)}</td>
                    <td className="num py-2 text-right text-[var(--muted)]">{fmtInt(row.episode_days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-5"
          title="Beban udara dan respons kesehatan"
          subtitle="Setiap titik adalah satu stasiun. Sumbu X rata-rata PM2.5, sumbu Y korelasi lag 0."
          footer="Korelasi tinggi tidak selalu berarti polusi tinggi. Keduanya memberi informasi berbeda untuk perencanaan."
        >
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 12, bottom: 18, left: -2 }}>
              <CartesianGrid stroke="#e7eae3" strokeDasharray="2 4" />
              <XAxis
                type="number"
                dataKey="pm25_mean"
                name="PM2.5"
                tick={{ fontSize: 9.5, fill: "#657069" }}
                tickLine={false}
                axisLine={{ stroke: "#d8ddd5" }}
                label={{ value: "PM2.5 rata-rata (µg/m³)", position: "insideBottom", offset: -10, fontSize: 9.5, fill: "#657069" }}
              />
              <YAxis
                type="number"
                dataKey="resp"
                name="r lag 0"
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickFormatter={(value) => fmtNum(Number(value), 2)}
                tick={{ fontSize: 9.5, fill: "#657069" }}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <ZAxis type="number" dataKey="episode_days" range={[35, 200]} />
              <ReferenceLine x={45} stroke="#c9d0c7" strokeDasharray="3 3" />
              <ReferenceLine y={0.45} stroke="#c9d0c7" strokeDasharray="3 3" />
              <Tooltip content={<HealthTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatter} isAnimationActive={false}>
                {scatter.map((row) => (
                  <Cell
                    key={row.station_id}
                    fill={ISLAND_COLORS[row.island] ?? "#8a938c"}
                    fillOpacity={0.8}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
            Garis putus-putus menandai median kasar PM2.5 dan korelasi. Kuadran kanan atas
            adalah gabungan beban tinggi dan respons kuat.
          </div>
        </ChartCard>
      </section>

      <Methodology title="Cara membaca hubungan kesehatan">
        <p>
          Analisis menggabungkan rata-rata PM2.5 stasiun dengan kunjungan rumah sakit pada
          tanggal yang sama. Untuk mengurangi pengaruh musim, kami menghitung anomali dengan
          mengurangkan rata-rata bulanan masing-masing stasiun.
        </p>
        <p>
          Korelasi dihitung per stasiun, lalu dirata-ratakan. Stasiun dengan kurang dari 200
          hari pasangan data tidak dimasukkan. JMB-02 dikeluarkan sepenuhnya.
        </p>
        <p>
          Kunjungan rumah sakit dipengaruhi banyak faktor: akses layanan, wabah, kebijakan,
          dan perilaku pencarian pengobatan. Angka di halaman ini menunjukkan pola yang
          konsisten, bukan bukti kausal tunggal.
        </p>
      </Methodology>
    </div>
  );
}
