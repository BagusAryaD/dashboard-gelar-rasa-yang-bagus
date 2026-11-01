"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, ShieldWarning } from "@phosphor-icons/react";
import PageHeader from "@/components/layout/PageHeader";
import ChartCard from "@/components/ui/ChartCard";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Methodology from "@/components/ui/Methodology";
import IndonesiaMap from "@/components/charts/IndonesiaMap";
import TrendChart from "@/components/charts/TrendChart";
import { ErrorBlock, LoadingPage } from "@/components/ui/Loading";
import { useJson } from "@/lib/data";
import {
  categoryFromPm,
  fmtInt,
  fmtNum,
  fmtPct,
  monthShort,
  siteTypeLabel,
  unique,
} from "@/lib/metrics";
import type { Monthly, Priority, Station } from "@/types/data";

const RECOMMENDATION_TONE: Record<string, "warn" | "danger" | "accent" | "neutral"> = {
  "Prioritas tinggi": "danger",
  "Pantau & perkuat": "warn",
  "Cukup memadai": "accent",
};

export default function PetaPage() {
  const stations = useJson<Station[]>("/data/stations.json");
  const monthly = useJson<Monthly>("/data/monthly.json");
  const priority = useJson<Priority[]>("/data/priority.json");
  const [selected, setSelected] = useState<string>("SM2-01");
  const [island, setIsland] = useState("Semua");
  const [sort, setSort] = useState<"mean" | "episode" | "completeness">("mean");

  const active = useMemo(
    () => (stations.data ?? []).filter((station) => station.status !== "excluded"),
    [stations.data],
  );

  const rows = useMemo(() => {
    const filtered = active.filter((station) => island === "Semua" || station.island === island);
    return [...filtered].sort((a, b) => {
      if (sort === "episode") return b.episode_days - a.episode_days;
      if (sort === "completeness") return (b.completeness ?? 0) - (a.completeness ?? 0);
      return (b.pm25_mean ?? 0) - (a.pm25_mean ?? 0);
    });
  }, [active, island, sort]);

  if (stations.loading || monthly.loading || priority.loading) {
    return <LoadingPage />;
  }
  if (stations.error || monthly.error || priority.error || !stations.data || !monthly.data || !priority.data) {
    return <ErrorBlock message={stations.error ?? monthly.error ?? priority.error ?? "Data tidak tersedia"} />;
  }

  const current = active.find((station) => station.station_id === selected) ?? active[0];
  const trend = monthly.data.byStation
    .filter((row) => row.station_id === current.station_id && row.pm25 != null)
    .map((row) => ({ month: row.month, pm25: row.pm25 }));
  const currentPriority = priority.data.find((row) => row.station_id === current.station_id);
  const topPriority = [...priority.data].sort((a, b) => b.score - a.score).slice(0, 6);
  const islands = ["Semua", ...unique(stations.data.map((station) => station.island))];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Sebaran ruang"
        title="Tidak semua kota bernapas dengan beban yang sama."
        lead="Peta ini membandingkan rata-rata PM2.5 antar stasiun. Warna menunjukkan kategori, ukuran lingkaran menunjukkan besarnya beban. Pilih stasiun untuk melihat rekam jejak dan prioritas pemantauannya."
      >
        <div className="flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-white px-3 py-2 text-[11px] text-[var(--muted)]">
          <MapPin size={14} className="text-[var(--accent)]" />
          {fmtInt(active.length)} stasiun aktif
        </div>
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-8"
          title="Peta stasiun dan rata-rata PM2.5"
          subtitle="Klik atau tekan Enter pada lingkaran untuk memilih stasiun. Garis provinsi dipakai sebagai orientasi, bukan batas analisis."
          bodyClassName="p-2 md:p-3"
        >
          <IndonesiaMap stations={active} selected={current.station_id} onSelect={setSelected} />
        </ChartCard>

        <div className="card flex flex-col xl:col-span-4">
          <div className="border-b border-[var(--line)] px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="kicker">Stasiun terpilih</div>
                <div className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">
                  {current.station_id}
                </div>
                <div className="text-[11.5px] text-[var(--muted)]">{current.name}</div>
              </div>
              <Badge category={categoryFromPm(current.pm25_mean)} />
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <div className="kicker">Rata-rata</div>
                <div className="num mt-1 text-[24px] font-medium leading-none">
                  {fmtNum(current.pm25_mean, 1)}
                </div>
                <div className="text-[10px] text-[var(--muted)]">µg/m³</div>
              </div>
              <div>
                <div className="kicker">Puncak harian</div>
                <div className="num mt-1 text-[24px] font-medium leading-none">
                  {fmtNum(current.pm25_max, 1)}
                </div>
                <div className="text-[10px] text-[var(--muted)]">µg/m³</div>
              </div>
              <div>
                <div className="kicker">Hari episode</div>
                <div className="num mt-1 text-[15px] font-medium">{fmtInt(current.episode_days)}</div>
                <div className="text-[10px] text-[var(--muted)]">dari {fmtInt(current.valid_days)} hari valid</div>
              </div>
              <div>
                <div className="kicker">Kelengkapan</div>
                <div className="num mt-1 text-[15px] font-medium">{fmtPct(current.completeness, 0)}</div>
                <div className="text-[10px] text-[var(--muted)]">jam valid rata-rata</div>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--line)] pt-3 text-[11.5px] leading-5 text-[var(--muted)]">
              <div className="flex justify-between gap-3 py-0.5">
                <span>Pulau</span>
                <span className="font-medium text-[var(--ink-soft)]">{current.island}</span>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <span>Tipe lokasi</span>
                <span className="font-medium text-[var(--ink-soft)]">{siteTypeLabel(current.site_type)}</span>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <span>Rumah sakit</span>
                <span className="num font-medium text-[var(--ink-soft)]">{current.hospital_id}</span>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <span>Status data</span>
                <span className="max-w-[58%] text-right font-medium text-[var(--ink-soft)]">
                  {current.status === "ok" ? "Baik" : current.status_reason}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-[9px] bg-[var(--panel-soft)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  Skor prioritas
                </span>
                <span className="num text-[15px] font-medium">
                  {currentPriority ? fmtNum(currentPriority.score, 0) : "n/a"}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#e4e9e1]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.min(100, currentPriority?.score ?? 0)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[10.5px] text-[var(--muted)]">
                {currentPriority?.recommendation ?? ""}
              </div>
            </div>

            <Link href="/waktu" prefetch={false} className="mt-3 inline-flex min-h-9 items-center gap-1 text-[11.5px] font-semibold text-[var(--accent)] hover:underline">
              Buka pola waktu
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          title={`Rekam jejak ${current.station_id}`}
          subtitle="Rata-rata PM2.5 bulanan. Garis putus-putus adalah ambang 75 µg/m³."
          footer="Bulan tanpa cukup data valid tidak digambar. Klik stasiun lain pada peta untuk mengganti."
        >
          <TrendChart
            data={trend}
            xKey="month"
            height={320}
            reference={75}
            referenceLabel="Ambang 75"
            xTickFormatter={monthShort}
            tooltipLabelFormatter={(value) => monthShort(String(value))}
            series={[{ key: "pm25", label: "PM2.5 bulanan", color: "#0e5c53", width: 2 }]}
          />
        </ChartCard>

        <ChartCard
          className="xl:col-span-5"
          title="Prioritas pemantauan"
          subtitle="Skor gabungan: beban PM2.5 teramati, frekuensi episode, tekanan kesehatan, kelengkapan, dan redundansi."
          footer="Skor tinggi berarti stasiun perlu perhatian lebih, bukan bahwa kualitas udaranya pasti terburuk."
        >
          <div className="space-y-2.5">
            {topPriority.map((row, index) => (
              <div key={row.station_id} className="flex items-center gap-2.5">
                <span className="num w-4 text-[10px] text-[var(--muted)]">{index + 1}</span>
                <button
                  type="button"
                  onClick={() => setSelected(row.station_id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[11.5px] font-medium text-[var(--ink)]">
                      {row.station_id} <span className="font-normal text-[var(--muted)]">{row.name}</span>
                    </span>
                    <span className="num text-[11.5px] font-medium">{fmtNum(row.score, 0)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e4e9e1]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, row.score)}%`,
                          backgroundColor:
                            row.recommendation === "Prioritas tinggi"
                              ? "#b93a32"
                              : row.recommendation === "Pantau & perkuat"
                                ? "#a86512"
                                : "#2d9358",
                        }}
                      />
                    </div>
                    <Badge tone={RECOMMENDATION_TONE[row.recommendation] ?? "neutral"}>
                      {row.recommendation}
                    </Badge>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <ChartCard
        title="Tabel stasiun"
        subtitle="Urutkan dan filter untuk melihat pola regional. Klik nama stasiun untuk menampilkannya di peta."
        action={
          <div className="flex flex-wrap items-end gap-2">
            <Select label="Pulau" value={island} onChange={(event) => setIsland(event.target.value)}>
              {islands.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select label="Urutkan" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="mean">Rata-rata PM2.5</option>
              <option value="episode">Hari episode</option>
              <option value="completeness">Kelengkapan</option>
            </Select>
          </div>
        }
      >
        <div className="scroll-x">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                <th className="py-2 pr-3 font-semibold">Stasiun</th>
                <th className="py-2 pr-3 font-semibold">Kota</th>
                <th className="py-2 pr-3 font-semibold">Pulau</th>
                <th className="py-2 pr-3 text-right font-semibold">Rata-rata</th>
                <th className="py-2 pr-3 text-right font-semibold">Episode</th>
                <th className="py-2 pr-3 text-right font-semibold">Valid</th>
                <th className="py-2 text-right font-semibold">Kelengkapan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((station) => (
                <tr
                  key={station.station_id}
                  className={`border-b border-[var(--line)] text-[11.5px] transition-colors last:border-0 hover:bg-[var(--panel-soft)] ${
                    current.station_id === station.station_id ? "bg-[var(--accent-soft)]/40" : ""
                  }`}
                >
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="num font-semibold text-[var(--accent)] hover:underline"
                      onClick={() => setSelected(station.station_id)}
                    >
                      {station.station_id}
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{station.city}</td>
                  <td className="py-2 pr-3 text-[var(--muted)]">{station.island}</td>
                  <td className="num py-2 pr-3 text-right font-medium">{fmtNum(station.pm25_mean, 1)}</td>
                  <td className="num py-2 pr-3 text-right">{fmtInt(station.episode_days)}</td>
                  <td className="num py-2 pr-3 text-right text-[var(--muted)]">{fmtInt(station.valid_days)}</td>
                  <td className="num py-2 text-right text-[var(--muted)]">{fmtPct(station.completeness, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <Methodology title="Bagaimana skor prioritas dihitung">
        <p>
          Skor 0 sampai 100 menggabungkan lima komponen: rata-rata PM2.5 teramati (30%),
          frekuensi hari episode (25%), tekanan kunjungan respirasi di rumah sakit pasangan (25%),
          kekurangan kelengkapan data (10%), dan penalti redundansi untuk pasangan KTG-01/KTG-02 (10%).
        </p>
        <p>
          Setiap komponen dinormalisasi 0 sampai 1 sebelum digabung. Tujuannya transparan:
          menunjukkan di mana perbaikan jaringan pemantauan akan memberi manfaat terbesar.
        </p>
        <p>
          <ShieldWarning size={13} className="inline text-[var(--amber)]" /> Stasiun dengan data
          tidak lengkap tidak otomatis dianggap bersih. Nilai kosong tetap kosong, bukan nol.
        </p>
      </Methodology>
    </div>
  );
}
