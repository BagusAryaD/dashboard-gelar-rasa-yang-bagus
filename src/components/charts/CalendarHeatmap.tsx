"use client";

import { useMemo, useState } from "react";
import { AQI, categoryFromPm, dateShort, fmtNum } from "@/lib/metrics";

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function CalendarHeatmap({
  data,
  start = "2024-01-01",
  end = "2026-10-14",
  label = "PM2.5 harian",
}: {
  data: { date: string; value: number | null }[];
  start?: string;
  end?: string;
  label?: string;
}) {
  const [hover, setHover] = useState<{ date: string; value: number | null; x: number; y: number } | null>(null);
  const byDate = useMemo(() => new Map(data.map((row) => [row.date, row.value])), [data]);

  const layout = useMemo(() => {
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    const offset = (startDate.getUTCDay() + 6) % 7;
    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / DAY) + 1;
    const weeks = Math.ceil((offset + totalDays) / 7);
    const cells = [];
    for (let week = 0; week < weeks; week += 1) {
      for (let dow = 0; dow < 7; dow += 1) {
        const index = week * 7 + dow - offset;
        if (index < 0 || index >= totalDays) continue;
        const date = new Date(startDate.getTime() + index * DAY);
        cells.push({
          date: date.toISOString().slice(0, 10),
          week,
          dow,
        });
      }
    }
    const monthLabels: { label: string; x: number }[] = [];
    const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    while (cursor <= endDate) {
      const first = new Date(Math.max(cursor.getTime(), startDate.getTime()));
      const week = Math.floor(((first.getTime() - startDate.getTime()) / DAY + offset) / 7);
      if (cursor.getUTCMonth() % 3 === 0) {
        monthLabels.push({
          label: `${MONTHS[cursor.getUTCMonth()]} ${String(cursor.getUTCFullYear()).slice(2)}`,
          x: week * 11,
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return { cells, weeks, monthLabels };
  }, [start, end]);

  const W = layout.weeks * 11 + 36;
  const H = 7 * 15 + 22;

  return (
    <div className="relative">
      <div className="scroll-x">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto min-w-[720px]"
          role="img"
          aria-label={`Kalender panas ${label}, 2024 sampai 2026`}
        >
          {layout.monthLabels.map((month) => (
            <text
              key={`${month.label}-${month.x}`}
              x={month.x + 34}
              y={9}
              fontSize={8.5}
              fill="#657069"
              fontWeight={600}
            >
              {month.label}
            </text>
          ))}
          {["Sen", "Rab", "Jum", "Min"].map((day, index) => (
            <text
              key={day}
              x={0}
              y={19 + (index * 2) * 15 + 9}
              fontSize={8}
              fill="#88928a"
            >
              {day}
            </text>
          ))}
          {layout.cells.map((cell) => {
            const value = byDate.get(cell.date) ?? null;
            const key = categoryFromPm(value);
            const x = cell.week * 11 + 34;
            const y = cell.dow * 15 + 15;
            return (
              <rect
                key={cell.date}
                x={x}
                y={y}
                width={9}
                height={12}
                rx={1.5}
                fill={value == null ? "#edf0ea" : AQI[key].color}
                stroke={value == null ? "none" : "#ffffff"}
                strokeWidth={0.4}
                opacity={value == null ? 0.8 : 0.9}
                onMouseEnter={() => setHover({ date: cell.date, value, x, y })}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${dateShort(cell.date)}: ${value == null ? "tidak ada data" : `${fmtNum(value, 1)} µg/m³`}`}</title>
              </rect>
            );
          })}
          {hover ? (
            <g
              transform={`translate(${Math.min(hover.x + 12, W - 136)}, ${Math.max(hover.y - 36, 6)})`}
              pointerEvents="none"
            >
              <rect width="126" height="32" rx="6" fill="#101512" />
              <text x="7" y="13" fontSize="8.5" fill="#9fae9f">
                {dateShort(hover.date)}
              </text>
              <text x="7" y="25" fontSize="9.5" fill="#ffffff" fontWeight={600}>
                {hover.value == null ? "Tidak ada data" : `${fmtNum(hover.value, 1)} µg/m³`}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
        </span>
        {(
          [
            ["good", "Baik"],
            ["moderate", "Sedang"],
            ["unhealthy", "Tidak sehat"],
            ["very", "Sangat tidak sehat"],
            ["hazard", "Berbahaya"],
            ["none", "Kosong"],
          ] as const
        ).map(([key, text]) => (
          <span key={key} className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: AQI[key].color }} />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
