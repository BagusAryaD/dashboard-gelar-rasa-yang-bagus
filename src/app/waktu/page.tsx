"use client";

import { useMemo, useState } from "react";
import { CalendarDots, Clock, Fire, TrendUp } from "@phosphor-icons/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/layout/PageHeader";
import Kpi from "@/components/ui/Kpi";
import ChartCard from "@/components/ui/ChartCard";
import Select from "@/components/ui/Select";
import Methodology from "@/components/ui/Methodology";
import CalendarHeatmap from "@/components/charts/CalendarHeatmap";
import HourDowHeatmap from "@/components/charts/HourDowHeatmap";
import TrendChart from "@/components/charts/TrendChart";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { ErrorBlock, LoadingPage } from "@/components/ui/Loading";
import { useDailyAir, useJson } from "@/lib/data";
import {
  DOW_LABELS,
  HOUR_LABELS,
  ISLAND_COLORS,
  fmtInt,
  fmtNum,
  fmtPct,
  monthShort,
  siteTypeLabel,
  unique,
} from "@/lib/metrics";
import type { Monthly, Station, Temporal } from "@/types/data";

export default function WaktuPage() {
  const air = useDailyAir();
  const stations = useJson<Station[]>("/data/stations.json");
  const temporal = useJson<Temporal>("/data/temporal.json");
  const monthly = useJson<Monthly>("/data/monthly.json");
  const [stationId, setStationId] = useState("KTG-01");
  const [island, setIsland] = useState("Sumatra");

  const active = useMemo(
    () => (stations.data ?? []).filter((station) => station.status !== "excluded"),
    [stations.data],
  );

  const stationData = useMemo(
    () => (air.data ?? []).filter((row) => row.station_id === stationId),
    [air.data, stationId],
  );

  const calendar = useMemo(
    () => stationData.map((row) => ({ date: row.date, value: row.pm25 })),
    [stationData],
  );

  const hourDow = useMemo(() => {
    const rows = temporal.data?.hourDow ?? [];
    if (island !== "Semua") return rows.filter((row) => row.island === island);
    const grouped = new Map<string, { sum: number; n: number }>();
    rows.forEach((row) => {
      if (row.pm25 == null) return;
      const key = `${row.dow}-${row.hour}`;
      const current = grouped.get(key) ?? { sum: 0, n: 0 };
      current.sum += row.pm25;
      current.n += 1;
      grouped.set(key, current);
    });
    return Array.from(grouped.entries()).map(([key, value]) => {
      const [dow, hour] = key.split("-").map(Number);
      return { island, dow, hour, pm25: value.sum / value.n };
    });
  }, [temporal.data, island]);

  const diurnal = useMemo(() => {
    const rows = temporal.data?.diurnalByType ?? [];
    const classify = (type: string) => {
      const key = type.toLowerCase();
      if (key.includes("peat")) return "Gambut";
      if (key.includes("industrial")) return "Industri";
      if (key.includes("traffic") || key.includes("highway")) return "Lalu lintas";
      if (key.includes("coastal") || key.includes("maritime")) return "Pesisir";
      if (key.includes("urban")) return "Latar kota";
      return "Regional";
    };
    const groups = new Map<string, Map<number, { sum: number; n: number }>>();
    rows.forEach((row) => {
      if (row.pm25 == null) return;
      const group = classify(row.site_type);
      if (!groups.has(group)) groups.set(group, new Map());
      const byHour = groups.get(group)!;
      const current = byHour.get(row.hour) ?? { sum: 0, n: 0 };
      current.sum += row.pm25;
      current.n += 1;
      byHour.set(row.hour, current);
    });
    const order = ["Gambut", "Industri", "Lalu lintas", "Pesisir", "Latar kota", "Regional"];
    const data = Array.from({ length: 24 }, (_, hour) => {
      const row: Record<string, number> = { hour };
      order.forEach((group) => {
        const value = groups.get(group)?.get(hour);
        if (value) row[group] = value.sum / value.n;
      });
      return row;
    });
    return { data, types: order.filter((group) => groups.has(group)) };
  }, [temporal.data]);

  const monthlyByIsland = useMemo(() => {
    const rows = monthly.data?.byIsland ?? [];
    const months = unique(rows.map((row) => row.month));
    const map = new Map(months.map((month) => [month, { month } as Record<string, number | string>]));
    rows.forEach((row) => {
      const target = map.get(row.month);
      if (target) target[row.island] = row.pm25;
    });
    return { data: Array.from(map.values()), islands: unique(rows.map((row) => row.island)) };
  }, [monthly.data]);

  const episodeMonthly = useMemo(() => {
    const rows = air.data ?? [];
    const grouped = new Map<string, number>();
    rows.forEach((row) => {
      if (!row.episode) return;
      const month = row.date.slice(0, 7);
      grouped.set(month, (grouped.get(month) ?? 0) + 1);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, episode]) => ({ month, episode }));
  }, [air.data]);

  if (air.loading || stations.loading || temporal.loading || monthly.loading) {
    return <LoadingPage />;
  }
  if (air.error || stations.error || temporal.error || monthly.error || !air.data || !stations.data || !temporal.data || !monthly.data) {
    return <ErrorBlock message={air.error ?? stations.error ?? temporal.error ?? monthly.error ?? "Data tidak tersedia"} />;
  }

  const selected = active.find((station) => station.station_id === stationId) ?? active[0];
  const stationHours = temporal.data.stationHour.filter((row) => row.station_id === selected.station_id);
  const peakHour = [...stationHours].sort((a, b) => b.pm25 - a.pm25)[0];
  const hourDay = temporal.data.stationHourDay.filter((row) => row.station_id === selected.station_id);
  const weekend = hourDay.filter((row) => row.day_type === "libur").reduce((sum, row) => sum + row.pm25, 0) / Math.max(1, hourDay.filter((row) => row.day_type === "libur").length);
  const weekday = hourDay.filter((row) => row.day_type === "kerja").reduce((sum, row) => sum + row.pm25, 0) / Math.max(1, hourDay.filter((row) => row.day_type === "kerja").length);
  const diff = weekend - weekday;

  const totalEpisodes = episodeMonthly.reduce((sum, row) => sum + row.episode, 0);
  const hazeEpisodes = episodeMonthly
    .filter((row) => ["-09", "-10", "-11"].some((part) => row.month.endsWith(part)))
    .reduce((sum, row) => sum + row.episode, 0);

  let streak = 0;
  let longest = 0;
  stationData.forEach((row) => {
    if (row.pm25 != null && row.pm25 > 75) {
      streak += 1;
      longest = Math.max(longest, streak);
    } else {
      streak = 0;
    }
  });

  const nationalPeak = [...monthly.data.national].sort((a, b) => b.pm25 - a.pm25)[0];

  const typeColors = ["#0e5c53", "#a86512", "#3f7f9e", "#7c5a8f", "#5c7a3c", "#b93a32"];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Pola waktu"
        title="Asap punya jam, hari, dan musim."
        lead="Konsentrasi PM2.5 tidak tersebar rata sepanjang tahun. Ia memuncak pada musim kemarau, bergerak mengikuti jam aktivitas, dan berbeda antara hari kerja dan akhir pekan."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label={`Jam terburuk ${selected.station_id}`}
          value={peakHour ? `${String(peakHour.hour).padStart(2, "0")}:00` : "n/a"}
          note={`Rata-rata ${fmtNum(peakHour?.pm25, 1)} µg/m³ pada jam tersebut.`}
          tone="accent"
          icon={<Clock size={15} />}
        />
        <Kpi
          label="Selisih akhir pekan"
          value={`${diff >= 0 ? "+" : ""}${fmtNum(diff, 1)}`}
          unit="µg/m³"
          note="Rata-rata akhir pekan dibanding hari kerja di stasiun terpilih."
          icon={<TrendUp size={15} />}
        />
        <Kpi
          label="Episode di musim asap"
          value={fmtPct((hazeEpisodes / Math.max(1, totalEpisodes)) * 100, 0)}
          note={`${fmtInt(hazeEpisodes)} dari ${fmtInt(totalEpisodes)} hari-stasiun di atas 75 µg/m³.`}
          tone="warn"
          icon={<Fire size={15} />}
        />
        <Kpi
          label="Rentetan episode terpanjang"
          value={fmtInt(longest)}
          unit="hari"
          note={`Berurutan di ${selected.station_id}. Rata-rata nasional memuncak pada ${nationalPeak ? monthShort(nationalPeak.month) : "n/a"}.`}
          tone="warn"
          icon={<CalendarDots size={15} />}
        />
      </section>

      <ChartCard
        title="Kalender panas PM2.5"
        subtitle="Setiap kotak adalah satu hari. Warna mengikuti kategori ISPU berbasis PM2.5."
        action={
          <Select label="Stasiun" value={stationId} onChange={(event) => setStationId(event.target.value)}>
            {active.map((station) => (
              <option key={station.station_id} value={station.station_id}>
                {station.station_id} / {station.city}
              </option>
            ))}
          </Select>
        }
        footer="Hari tanpa data ditampilkan kosong. Kotak yang sangat gelap menunjukkan nilai ekstrem, bukan interpolasi."
      >
        <CalendarHeatmap data={calendar} />
      </ChartCard>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-6"
          title="Jam dan hari"
          subtitle="Rata-rata PM2.5 menurut jam dan hari dalam sepekan."
          action={
            <Select label="Wilayah" value={island} onChange={(event) => setIsland(event.target.value)}>
              <option value="Semua">Semua pulau</option>
              {unique(temporal.data.hourDow.map((row) => row.island)).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          }
          footer="Warna lebih gelap berarti konsentrasi lebih tinggi. Arahkan kursor ke kotak untuk melihat nilai."
        >
          <HourDowHeatmap data={hourDow} />
          <div className="mt-3 rounded-[8px] bg-[var(--panel-soft)] px-3 py-2 text-[11px] leading-5 text-[var(--muted)]">
            Konsentrasi memuncak pada pagi hari sekitar pukul 05.00 sampai 08.00, lalu
            menurun pada siang sampai sore. Pola ini muncul di semua hari, dengan akhir pekan
            sedikit lebih rendah.
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-6"
          title="Siklus harian menurut kelompok lokasi"
          subtitle="Rata-rata jam-jaman pada seluruh periode, digabung menjadi enam kelompok karakter lokasi."
          footer="Lokasi lalu lintas dan industri biasanya memuncak pada jam sibuk pagi dan sore. Lokasi gambut dapat bertahan tinggi sepanjang hari."
        >
          <TrendChart
            data={diurnal.data}
            xKey="hour"
            height={310}
            unit="µg/m³"
            xTickFormatter={(value) => `${String(value).padStart(2, "0")}:00`}
            tooltipLabelFormatter={(value) => `Pukul ${String(value).padStart(2, "0")}:00`}
            series={diurnal.types.map((type, index) => ({
              key: type,
              label: siteTypeLabel(type),
              color: typeColors[index % typeColors.length],
              width: 1.8,
            }))}
          />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-8"
          title="Musim asap menurut pulau"
          subtitle="Rata-rata PM2.5 bulanan. Perhatikan lonjakan September dan Oktober."
          footer="Pulau dengan data lebih sedikit dapat terlihat lebih ekstrem. Jumlah stasiun per pulau tidak sama."
        >
          <TrendChart
            data={monthlyByIsland.data}
            xKey="month"
            height={300}
            reference={75}
            referenceLabel="Ambang 75"
            xTickFormatter={monthShort}
            tooltipLabelFormatter={(value) => monthShort(String(value))}
            series={monthlyByIsland.islands.map((name) => ({
              key: name,
              label: name,
              color: ISLAND_COLORS[name] ?? "#8a938c",
              width: name === "Sumatra" || name === "Kalimantan" ? 2.3 : 1.6,
            }))}
          />
        </ChartCard>

        <ChartCard
          className="xl:col-span-4"
          title="Episode per bulan"
          subtitle="Jumlah hari-stasiun dengan PM2.5 di atas 75 µg/m³."
          footer="September dan Oktober konsisten menjadi bulan dengan episode terbanyak."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={episodeMonthly} margin={{ top: 6, right: 4, bottom: 20, left: -20 }}>
              <CartesianGrid stroke="#e7eae3" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 8.5, fill: "#657069" }}
                tickLine={false}
                axisLine={{ stroke: "#d8ddd5" }}
                tickFormatter={(value) => {
                  const month = String(value);
                  return month.endsWith("-01") || month.endsWith("-07") ? monthShort(month) : "";
                }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 9, fill: "#657069" }} tickLine={false} axisLine={false} width={38} />
              <Tooltip
                content={<ChartTooltip unit="hari-stasiun" labelFormatter={(value) => monthShort(String(value))} />}
                cursor={{ fill: "#f3f5f1" }}
              />
              <Bar dataKey="episode" name="Hari episode" fill="#c65d19" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <Methodology title="Cara membaca pola waktu">
        <p>
          Profil jam-jaman memakai data stasiun yang lolos QC setelah nilai sensor macet
          dikeluarkan. Pola hari kerja dan akhir pekan dihitung dari rata-rata jam yang sama
          agar tidak tercampur perbedaan jumlah observasi.
        </p>
        <p>
          Kalender panas menampilkan nilai harian apa adanya. Hari dengan kurang dari 6 jam
          valid dibiarkan kosong dan tidak diisi dengan interpolasi.
        </p>
        <p>
          Musim asap didefinisikan sebagai September sampai November, mengikuti pola historis
          kebakaran lahan gambut di Sumatra dan Kalimantan.
        </p>
      </Methodology>
    </div>
  );
}
