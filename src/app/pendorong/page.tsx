"use client";

import { useMemo, useState } from "react";
import { ArrowsOutSimple, RoadHorizon, Wind } from "@phosphor-icons/react";
import {
  CartesianGrid,
  Cell,
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
import Select from "@/components/ui/Select";
import Methodology from "@/components/ui/Methodology";
import WindRose from "@/components/charts/WindRose";
import CorrelationMatrix from "@/components/charts/CorrelationMatrix";
import { ErrorBlock, LoadingPage } from "@/components/ui/Loading";
import { useJson } from "@/lib/data";
import { ISLAND_COLORS, fmtNum } from "@/lib/metrics";
import type { Correlations, Station, Windrose } from "@/types/data";

function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return num / Math.sqrt(dx * dy);
}

function SiteTooltip({ active, payload }: { active?: boolean; payload?: { payload?: Station }[] }) {
  if (!active || !payload?.length) return null;
  const station = payload[0].payload;
  if (!station) return null;
  return (
    <div className="chart-tip">
      <div className="tip-label">{station.station_id}</div>
      <div className="font-medium text-white">{station.name}</div>
      <div className="mt-1 space-y-0.5 text-[11px] text-white/70">
        <div className="flex justify-between gap-4">
          <span>PM2.5 rata-rata</span>
          <span className="num text-white">{fmtNum(station.pm25_mean, 1)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Lalu lintas</span>
          <span className="num text-white">{fmtNum(station.traffic, 0)}/jam</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Jarak ke jalan</span>
          <span className="num text-white">{fmtNum(station.distance_road, 0)} m</span>
        </div>
      </div>
    </div>
  );
}

const POLLUTANT_LABELS: Record<string, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  so2: "SO2",
  co: "CO",
  o3: "O3",
  no2: "NO2",
};

export default function PendorongPage() {
  const stations = useJson<Station[]>("/data/stations.json");
  const correlations = useJson<Correlations>("/data/correlations.json");
  const windrose = useJson<Windrose>("/data/windrose.json");
  const [windStation, setWindStation] = useState("PLB-01");

  const active = useMemo(
    () => (stations.data ?? []).filter((station) => station.status !== "excluded" && station.pm25_mean != null),
    [stations.data],
  );

  if (stations.loading || correlations.loading || windrose.loading) {
    return <LoadingPage />;
  }
  if (stations.error || correlations.error || windrose.error || !stations.data || !correlations.data || !windrose.data) {
    return <ErrorBlock message={stations.error ?? correlations.error ?? windrose.error ?? "Data tidak tersedia"} />;
  }

  const trafficR = pearson(active.map((s) => s.traffic), active.map((s) => s.pm25_mean ?? 0));
  const distanceR = pearson(active.map((s) => s.distance_road), active.map((s) => s.pm25_mean ?? 0));
  const windNegative = correlations.data.station.filter(
    (row) => row.wind != null && row.wind < 0 && row.station_id !== "JMB-02",
  ).length;
  const stationLabels = active.map((station) => station.station_id);
  const corrRows = correlations.data.station.filter((row) => stationLabels.includes(row.station_id));

  const p = correlations.data.pollutants;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Pendorong konsentrasi"
        title="Asap tidak hanya soal knalpot."
        lead="Kedekatan ke jalan dan volume lalu lintas membantu menjelaskan sebagian variasi antar kota. Namun lonjakan terbesar tetap datang dari pembakaran lahan gambut yang dipicu cuaca kering."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Korelasi jarak ke jalan"
          value={fmtNum(distanceR, 2)}
          note="Makin dekat stasiun ke jalan, makin tinggi rata-rata PM2.5."
          tone="accent"
          icon={<RoadHorizon size={15} />}
        />
        <Kpi
          label="Korelasi volume lalu lintas"
          value={fmtNum(trafficR, 2)}
          note="Hubungan positif sedang. Lalu lintas bukan satu-satunya penentu."
          icon={<ArrowsOutSimple size={15} />}
        />
        <Kpi
          label="PM2.5 terhadap PM10"
          value={fmtNum(p.matrix[0]?.[1] ?? null, 2)}
          note="Partikel halus mendominasi massa partikel pada banyak hari."
          icon={<Wind size={15} />}
        />
        <Kpi
          label="Angin menurunkan PM2.5"
          value={`${windNegative}/26`}
          note="Hanya sebagian stasiun menunjukkan korelasi negatif yang jelas."
          tone="warn"
          icon={<Wind size={15} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-6"
          title="Lalu lintas dan rata-rata PM2.5"
          subtitle="Setiap titik adalah satu stasiun. Ukuran titik mengikuti jumlah hari episode."
          footer={`Korelasi Pearson r = ${fmtNum(trafficR, 2)}. Kota dengan lalu lintas tinggi belum tentu paling tercemar.`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 14, bottom: 22, left: 0 }}>
              <CartesianGrid stroke="#e7eae3" strokeDasharray="2 4" />
              <XAxis
                type="number"
                dataKey="traffic"
                name="Lalu lintas"
                tick={{ fontSize: 9.5, fill: "#657069" }}
                tickLine={false}
                axisLine={{ stroke: "#d8ddd5" }}
                label={{ value: "kendaraan per jam", position: "insideBottom", offset: -10, fontSize: 9.5, fill: "#657069" }}
              />
              <YAxis
                type="number"
                dataKey="pm25_mean"
                name="PM2.5"
                domain={[0, 100]}
                tick={{ fontSize: 9.5, fill: "#657069" }}
                tickLine={false}
                axisLine={false}
                width={34}
                label={{ value: "µg/m³", angle: -90, position: "insideLeft", fontSize: 9.5, fill: "#657069" }}
              />
              <ZAxis type="number" dataKey="episode_days" range={[35, 220]} />
              <Tooltip content={<SiteTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={active} isAnimationActive={false}>
                {active.map((station) => (
                  <Cell
                    key={station.station_id}
                    fill={ISLAND_COLORS[station.island] ?? "#8a938c"}
                    fillOpacity={0.78}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(ISLAND_COLORS)
              .filter(([name]) => name !== "Lainnya")
              .map(([name, color]) => (
                <span key={name} className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {name}
                </span>
              ))}
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-6"
          title="Jarak ke jalan dan rata-rata PM2.5"
          subtitle="Semakin jauh stasiun dari jalan, konsentrasi cenderung menurun."
          footer={`Korelasi Pearson r = ${fmtNum(distanceR, 2)}. Pola ini lebih konsisten daripada volume lalu lintas.`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 14, bottom: 22, left: 0 }}>
              <CartesianGrid stroke="#e7eae3" strokeDasharray="2 4" />
              <XAxis
                type="number"
                dataKey="distance_road"
                name="Jarak jalan"
                tick={{ fontSize: 9.5, fill: "#657069" }}
                tickLine={false}
                axisLine={{ stroke: "#d8ddd5" }}
                label={{ value: "meter dari jalan", position: "insideBottom", offset: -10, fontSize: 9.5, fill: "#657069" }}
              />
              <YAxis
                type="number"
                dataKey="pm25_mean"
                name="PM2.5"
                domain={[0, 100]}
                tick={{ fontSize: 9.5, fill: "#657069" }}
                tickLine={false}
                axisLine={false}
                width={34}
                label={{ value: "µg/m³", angle: -90, position: "insideLeft", fontSize: 9.5, fill: "#657069" }}
              />
              <ZAxis type="number" dataKey="episode_days" range={[35, 220]} />
              <Tooltip content={<SiteTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={active} isAnimationActive={false}>
                {active.map((station) => (
                  <Cell
                    key={station.station_id}
                    fill={ISLAND_COLORS[station.island] ?? "#8a938c"}
                    fillOpacity={0.78}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
            Ukuran titik mengikuti jumlah hari episode. Nilai ekstrem SM2-01 dan PLB-01
            berasal dari episode gambut, bukan hanya lalu lintas jalan.
          </div>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-5"
          title="Arah angin"
          subtitle="Wind rose 16 arah dengan lima kelas kecepatan."
          action={
            <Select label="Stasiun" value={windStation} onChange={(event) => setWindStation(event.target.value)}>
              {active.map((station) => (
                <option key={station.station_id} value={station.station_id}>
                  {station.station_id}
                </option>
              ))}
            </Select>
          }
          footer="Panjang sektor menunjukkan frekuensi relatif. Warna menunjukkan kelas kecepatan angin."
        >
          <WindRose data={windrose.data[windStation]} />
        </ChartCard>

        <ChartCard
          className="xl:col-span-7"
          title="Matriks korelasi polutan"
          subtitle="Korelasi antar rata-rata harian seluruh stasiun."
          footer="PM2.5 dan PM10 bergerak hampir identik. SO2, NO2, dan CO membentuk kelompok pembakaran yang berbeda."
        >
          <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:justify-around">
            <CorrelationMatrix
              labels={p.labels.map((label) => POLLUTANT_LABELS[label] ?? label)}
              rowLabels={p.labels.map((label) => POLLUTANT_LABELS[label] ?? label)}
              matrix={p.matrix}
            />
            <div className="max-w-[250px] space-y-2 text-[11.5px] leading-5 text-[var(--muted)]">
              <p>
                <strong className="text-[var(--ink-soft)]">PM2.5 dan PM10</strong> memiliki
                korelasi {fmtNum(p.matrix[0]?.[1] ?? null, 2)}. Keduanya sering berasal dari
                sumber yang sama.
              </p>
              <p>
                <strong className="text-[var(--ink-soft)]">SO2 dan NO2</strong> mencapai{" "}
                {fmtNum(p.matrix[2]?.[5] ?? null, 2)}, konsisten dengan pembakaran bahan bakar
                dan industri.
              </p>
              <p>
                Ozon punya pola sendiri karena terbentuk lewat reaksi fotokimia pada siang hari.
              </p>
            </div>
          </div>
        </ChartCard>
      </section>

      <ChartCard
        title="Korelasi meteorologi per stasiun"
        subtitle="Korelasi jam-jaman PM2.5 dengan suhu, kelembapan, dan kecepatan angin."
        footer="Nilai positif berarti polutan naik bersama variabel tersebut. Korelasi jam-jaman dipengaruhi siklus harian sehingga tidak identik dengan hubungan sebab-akibat."
      >
        <div className="scroll-x max-h-[390px] overflow-y-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[var(--line)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                <th className="py-2 pr-3 font-semibold">Stasiun</th>
                <th className="py-2 pr-3 font-semibold">Kota</th>
                <th className="py-2 pr-3 text-right font-semibold">Suhu</th>
                <th className="py-2 pr-3 text-right font-semibold">Kelembapan</th>
                <th className="py-2 pr-3 text-right font-semibold">Angin</th>
                <th className="py-2 text-right font-semibold">Observasi</th>
              </tr>
            </thead>
            <tbody>
              {corrRows.map((row) => {
                const station = active.find((item) => item.station_id === row.station_id);
                const tone = (value: number | null) =>
                  value == null
                    ? "text-[var(--muted)]"
                    : value > 0.2
                      ? "text-[#a86512]"
                      : value < -0.2
                        ? "text-[#3f7f9e]"
                        : "text-[var(--muted)]";
                return (
                  <tr key={row.station_id} className="border-b border-[var(--line)] text-[11.5px] last:border-0">
                    <td className="num py-1.5 pr-3 font-semibold text-[var(--ink)]">{row.station_id}</td>
                    <td className="py-1.5 pr-3 text-[var(--muted)]">{station?.city}</td>
                    <td className={`num py-1.5 pr-3 text-right ${tone(row.temp)}`}>{fmtNum(row.temp, 2)}</td>
                    <td className={`num py-1.5 pr-3 text-right ${tone(row.rh)}`}>{fmtNum(row.rh, 2)}</td>
                    <td className={`num py-1.5 pr-3 text-right ${tone(row.wind)}`}>{fmtNum(row.wind, 2)}</td>
                    <td className="num py-1.5 text-right text-[var(--muted)]">{fmtNum(row.n, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <Methodology title="Batasan analisis pendorong">
        <p>
          Korelasi situs dihitung dari 26 stasiun yang punya rata-rata PM2.5. JMB-02 tidak
          dimasukkan karena telemetri hampir tidak pernah mengirim data valid.
        </p>
        <p>
          Korelasi jam-jaman dipengaruhi siklus harian suhu dan aktivitas. Nilai mendekati nol
          tidak berarti meteorologi tidak penting, hanya bahwa hubungan linier sederhana tidak
          menangkapnya dengan baik.
        </p>
        <p>
          Untuk episode asap, pembakaran lahan gambut dan angin regional bekerja pada skala
          yang lebih besar daripada variabel lokal di sekitar stasiun.
        </p>
      </Methodology>
    </div>
  );
}
