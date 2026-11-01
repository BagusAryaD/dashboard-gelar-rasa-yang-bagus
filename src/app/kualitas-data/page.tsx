"use client";

import { useMemo } from "react";
import { Database, Gauge, ShieldWarning, Wrench } from "@phosphor-icons/react";
import PageHeader from "@/components/layout/PageHeader";
import Kpi from "@/components/ui/Kpi";
import ChartCard from "@/components/ui/ChartCard";
import Badge from "@/components/ui/Badge";
import Methodology from "@/components/ui/Methodology";
import { ErrorBlock, LoadingPage } from "@/components/ui/Loading";
import { useJson } from "@/lib/data";
import { fmtInt, fmtNum, fmtPct, monthShort } from "@/lib/metrics";
import type { DQ, Priority, Station } from "@/types/data";

const QC_COLORS: Record<string, string> = {
  VALID: "#0e5c53",
  SUSPECT: "#c39311",
  MISSING: "#b8c0b7",
  CALIBRATING: "#3f7f9e",
  WARMUP: "#86a9b8",
  MAINTENANCE: "#7c5a8f",
  PARSER_FAIL: "#c65d19",
  FATAL_ERR: "#b93a32",
  GARBAGE: "#8a6b52",
  COMM_LOST: "#8a938c",
  CORRUPT: "#a86512",
  SENSOR_DEAD: "#5b5f58",
};

function pctColor(pct: number | null) {
  if (pct == null) return "#eef1ec";
  if (pct < 25) return "#b93a32";
  if (pct < 50) return "#d4774f";
  if (pct < 70) return "#dfaa55";
  if (pct < 85) return "#b9cb83";
  if (pct < 95) return "#82bb92";
  return "#4f9d76";
}

function CompletenessHeatmap({
  rows,
  stations,
  months,
}: {
  rows: DQ["completeness"];
  stations: Station[];
  months: string[];
}) {
  const map = new Map(rows.map((row) => [`${row.station_id}-${row.month}`, row.pct]));
  const cellW = 23;
  const cellH = 18;
  const left = 72;
  const top = 24;
  const W = left + months.length * cellW + 2;
  const H = top + stations.length * cellH + 2;

  return (
    <div className="scroll-x">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto min-w-[820px]"
        role="img"
        aria-label="Matriks kelengkapan data per stasiun dan bulan"
      >
        {months.map((month, index) =>
          index % 3 === 0 ? (
            <text
              key={month}
              x={left + index * cellW + 2}
              y={12}
              fontSize={8}
              fill="#657069"
            >
              {monthShort(month)}
            </text>
          ) : null,
        )}
        {stations.map((station, rowIndex) => (
          <g key={station.station_id}>
            <text
              x={2}
              y={top + rowIndex * cellH + 12}
              fontSize={8.5}
              fill="#4d5851"
              className="num"
            >
              {station.station_id}
            </text>
            {months.map((month, colIndex) => {
              const pct = map.get(`${station.station_id}-${month}`) ?? null;
              return (
                <rect
                  key={month}
                  x={left + colIndex * cellW + 1}
                  y={top + rowIndex * cellH + 1}
                  width={cellW - 2}
                  height={cellH - 2}
                  rx={1.5}
                  fill={pctColor(pct)}
                  opacity={pct == null ? 0.6 : 0.92}
                >
                  <title>{`${station.station_id} ${monthShort(month)}: ${pct == null ? "tidak ada data" : fmtPct(pct, 0)}`}</title>
                </rect>
              );
            })}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--muted)]">
        <span>Kelengkapan</span>
        {[10, 40, 65, 80, 92, 99].map((value) => (
          <span key={value} className="flex items-center gap-1">
            <span className="h-2.5 w-3 rounded-[1px]" style={{ backgroundColor: pctColor(value) }} />
            <span className="num">{value}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function KualitasDataPage() {
  const dq = useJson<DQ>("/data/dq.json");
  const stations = useJson<Station[]>("/data/stations.json");
  const priority = useJson<Priority[]>("/data/priority.json");

  const qc = useMemo(() => {
    if (!dq.data) return [];
    const total = Object.values(dq.data.qcTotals).reduce((sum, value) => sum + value, 0);
    return Object.entries(dq.data.qcTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([flag, count]) => ({
        flag,
        count,
        pct: (count / Math.max(1, total)) * 100,
        color: QC_COLORS[flag] ?? "#8a938c",
      }));
  }, [dq.data]);

  if (dq.loading || stations.loading || priority.loading) {
    return <LoadingPage />;
  }
  if (dq.error || stations.error || priority.error || !dq.data || !stations.data || !priority.data) {
    return <ErrorBlock message={dq.error ?? stations.error ?? priority.error ?? "Data tidak tersedia"} />;
  }

  const months = Array.from(new Set(dq.data.completeness.map((row) => row.month))).sort();
  const stationList = stations.data;
  const stationRows = [...dq.data.station].sort((a, b) => a.completeness - b.completeness);
  const stuck = dq.data.station.reduce((sum, row) => sum + row.stuck_hours, 0);
  const validPct = (dq.data.validRows / Math.max(1, dq.data.rows)) * 100;
  const worst = stationRows[0];
  const topPriority = [...priority.data].sort((a, b) => b.score - a.score).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Kualitas data"
        title="Kesimpulan hanya sekuat data di belakangnya."
        lead="Sebagian besar jam pengamatan valid, tetapi ada lubang yang tidak boleh diabaikan: satu sensor macet berbulan-bulan, satu stasiun nyaris mati, dan beberapa stasiun kehilangan sebagian besar hari."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Baris pengamatan"
          value={fmtInt(dq.data.rows)}
          unit="baris"
          note="27 berkas AQMS, resolusi jam-an dan 15 menit."
          tone="accent"
          icon={<Database size={15} />}
        />
        <Kpi
          label="Baris berstatus VALID"
          value={fmtPct(validPct, 1)}
          note={`${fmtInt(dq.data.validRows)} baris lolos QC utama.`}
          icon={<Gauge size={15} />}
        />
        <Kpi
          label="Jam sensor macet"
          value={fmtInt(stuck)}
          unit="jam"
          note="Nilai PM2.5 identik 6 jam berturut-turut atau lebih."
          tone="warn"
          icon={<Wrench size={15} />}
        />
        <Kpi
          label="Stasiun paling rapuh"
          value={worst?.station_id ?? "n/a"}
          note={`${worst ? fmtPct(worst.completeness, 0) : "n/a"} kelengkapan rata-rata. ${worst?.stuck_hours ? `${fmtInt(worst.stuck_hours)} jam macet.` : "Terbanyak kehilangan data."}`}
          tone="warn"
          icon={<ShieldWarning size={15} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          title="Komposisi status QC"
          subtitle="Proporsi seluruh baris menurut flag kontrol kualitas."
          footer="Hanya VALID yang dipakai pada analisis utama. SUSPECT disimpan sebagai pembanding dan tidak dipakai untuk kesimpulan."
        >
          <div className="flex h-6 w-full overflow-hidden rounded-[5px]">
            {qc.map((item) => (
              <div
                key={item.flag}
                style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                title={`${item.flag}: ${fmtInt(item.count)} baris`}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {qc.map((item) => (
              <div key={item.flag} className="flex items-center gap-2 text-[11px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 flex-1 truncate text-[var(--muted)]">{item.flag}</span>
                <span className="num text-[var(--ink-soft)]">{fmtPct(item.pct, 1)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[8px] bg-[var(--panel-soft)] px-3 py-2 text-[11px] leading-5 text-[var(--muted)]">
            <strong className="text-[var(--ink-soft)]">SUSPECT 19.741 baris</strong> dan flag
            teknis lain tetap disimpan. Pembersihan dilakukan di lapisan ETL, bukan dengan
            menghapus file mentah.
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-5"
          title="Eksklusi dan pengecualian"
          subtitle="Bagian data yang dikeluarkan dari analisis utama."
          footer="BJB-01 tetap dipakai setelah jam macet dibuang, tetapi tidak masuk analisis lag kesehatan. JMB-02 dikeluarkan sepenuhnya."
        >
          <div className="space-y-2">
            {dq.data.exclusions.map((row, index) => (
              <div key={index} className="rounded-[9px] border border-[var(--line)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="num text-[12px] font-semibold">{row.station_id}</span>
                  <Badge tone="danger">Dikeluarkan</Badge>
                </div>
                <div className="num mt-1 text-[10.5px] text-[var(--muted)]">
                  {row.from} sampai {row.to}
                </div>
                <div className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{row.reason}</div>
              </div>
            ))}
            <div className="rounded-[9px] border border-[var(--line)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold">PLB-01</span>
                <Badge tone="warn">Resolusi berubah</Badge>
              </div>
              <div className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
                Pada September-Oktober, data dikirim setiap 15 menit. ETL meresampe ke rata-rata
                jam-an sebelum agregasi harian.
              </div>
            </div>
          </div>
        </ChartCard>
      </section>

      <ChartCard
        title="Matriks kelengkapan stasiun"
        subtitle="Persentase jam valid terhadap jam yang diharapkan, per bulan."
        footer="Sel kosong berarti tidak ada data. Merah menandakan kelengkapan di bawah 25 persen."
      >
        <CompletenessHeatmap rows={dq.data.completeness} stations={stations.data} months={months} />
      </ChartCard>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-5"
          title="Konversi satuan"
          subtitle="Tiga berkas memakai ppm dan harus dikonversi sebelum digabung."
          footer="Faktor konversi mengikuti massa molar pada kondisi standar. Tanpa konversi, ketiga stasiun akan tampak bersih secara palsu."
        >
          <div className="scroll-x">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--line)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  <th className="py-2 pr-3 font-semibold">Parameter</th>
                  <th className="py-2 pr-3 font-semibold">Asal</th>
                  <th className="py-2 text-right font-semibold">Faktor</th>
                </tr>
              </thead>
              <tbody>
                {dq.data.conversions.map((row) => (
                  <tr key={row.parameter} className="border-b border-[var(--line)] text-[11.5px] last:border-0">
                    <td className="py-2 pr-3 font-medium">{row.parameter}</td>
                    <td className="num py-2 pr-3 text-[var(--muted)]">{row.from}</td>
                    <td className="num py-2 text-right font-medium text-[var(--accent)]">{row.factor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
            Berlaku untuk BJB-01, MDN-01, dan PSW-01. Satuan akhir: µg/m³ untuk semua parameter.
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-7"
          title="Rekomendasi jaringan pemantauan"
          subtitle="Skor prioritas tinggi berarti perbaikan di stasiun tersebut memberi manfaat terbesar."
          footer="Skor menggabungkan beban polusi, frekuensi episode, tekanan kesehatan, kelengkapan data, dan redundansi."
        >
          <div className="space-y-3">
            {topPriority.map((row, index) => (
              <div key={row.station_id} className="flex items-start gap-3">
                <span className="num mt-0.5 w-4 text-[10px] text-[var(--muted)]">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[11.5px] font-medium">
                      {row.station_id} <span className="font-normal text-[var(--muted)]">{row.name}</span>
                    </div>
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
                    <span className="text-[10px] text-[var(--muted)]">{row.recommendation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <ChartCard
        title="Status per stasiun"
        subtitle="Diurutkan dari kelengkapan terendah. Valid mengikuti flag QC, kelengkapan mengikuti jam valid harian."
        footer="JMB-02 punya 122 jam valid tetapi tersebar tidak merata, sehingga tidak layak untuk analisis deret waktu."
      >
        <div className="scroll-x">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                <th className="py-2 pr-3 font-semibold">Stasiun</th>
                <th className="py-2 pr-3 font-semibold">Kota</th>
                <th className="py-2 pr-3 text-right font-semibold">Baris</th>
                <th className="py-2 pr-3 text-right font-semibold">Valid</th>
                <th className="py-2 pr-3 text-right font-semibold">Macet</th>
                <th className="py-2 pr-3 text-right font-semibold">Kelengkapan</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {stationRows.map((row) => {
                const station = stationList.find((item) => item.station_id === row.station_id);
                return (
                  <tr key={row.station_id} className="border-b border-[var(--line)] text-[11.5px] last:border-0">
                    <td className="num py-1.5 pr-3 font-semibold">{row.station_id}</td>
                    <td className="py-1.5 pr-3 text-[var(--muted)]">{station?.city}</td>
                    <td className="num py-1.5 pr-3 text-right text-[var(--muted)]">{fmtInt(row.rows)}</td>
                    <td className="num py-1.5 pr-3 text-right">{fmtPct(row.valid_pct, 1)}</td>
                    <td className="num py-1.5 pr-3 text-right text-[var(--muted)]">{fmtInt(row.stuck_hours)}</td>
                    <td className="num py-1.5 pr-3 text-right">{fmtPct(row.completeness, 0)}</td>
                    <td className="py-1.5">
                      {station?.status === "excluded" ? (
                        <Badge tone="danger">Dikeluarkan</Badge>
                      ) : station?.status === "flagged" ? (
                        <Badge tone="warn">Perlu perhatian</Badge>
                      ) : (
                        <Badge tone="accent">Baik</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <Methodology title="Aturan pembersihan yang dipakai">
        <p>
          Satu hari masuk analisis jika punya minimal 6 jam valid untuk PM2.5. Nilai PM2.5
          yang identik selama 6 jam berturut-turut dianggap sensor macet dan dikeluarkan dari
          rata-rata harian. Untuk PLB-01, data 15 menit dirata-ratakan ke jam sebelum agregasi.
        </p>
        <p>
          Hanya baris dengan flag VALID yang dipakai untuk analisis utama. Flag SUSPECT
          dipertahankan di file mentah dan tidak dipakai untuk kesimpulan akhir.
        </p>
        <p>
          File dataset asli tidak diubah. Semua pembersihan terjadi di skrip ETL dan hasilnya
          disimpan sebagai file turunan di folder <code className="num">public/data</code>.
        </p>
      </Methodology>
    </div>
  );
}
