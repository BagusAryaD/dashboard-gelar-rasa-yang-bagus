"use client";

import { useMemo } from "react";
import { DOW_LABELS, fmtNum } from "@/lib/metrics";

function color(value: number | null, min: number, max: number) {
  if (value == null || Number.isNaN(value)) return "#eef1ec";
  const t = Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));
  const from = [233, 241, 236];
  const to = [14, 92, 83];
  const rgb = from.map((channel, index) => Math.round(channel + (to[index] - channel) * t));
  return `rgb(${rgb.join(",")})`;
}

export default function HourDowHeatmap({
  data,
}: {
  data: { hour: number; dow: number; pm25: number }[];
}) {
  const matrix = useMemo(() => {
    const values = new Map(data.map((row) => [`${row.dow}-${row.hour}`, row.pm25]));
    return Array.from({ length: 7 }, (_, dow) =>
      Array.from({ length: 24 }, (_, hour) => values.get(`${dow}-${hour}`) ?? null),
    );
  }, [data]);

  const flat = data.map((row) => row.pm25).filter((value) => Number.isFinite(value));
  const min = Math.min(...flat);
  const max = Math.max(...flat);

  const cellW = 30;
  const cellH = 26;
  const left = 34;
  const top = 22;
  const W = left + 24 * cellW;
  const H = top + 7 * cellH + 2;

  return (
    <div>
      <div className="scroll-x">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto min-w-[640px]"
          role="img"
          aria-label="Peta panas konsentrasi PM2.5 menurut jam dan hari"
        >
          {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hour) => (
            <text
              key={hour}
              x={left + hour * cellW + cellW / 2}
              y={12}
              textAnchor="middle"
              fontSize={8.5}
              fill="#657069"
              className="num"
            >
              {String(hour).padStart(2, "0")}
            </text>
          ))}
          {DOW_LABELS.map((day, dow) => (
            <g key={day}>
              <text x={0} y={top + dow * cellH + cellH / 2 + 3} fontSize={8.5} fill="#657069">
                {day}
              </text>
              {matrix[dow].map((value, hour) => (
                <rect
                  key={`${dow}-${hour}`}
                  x={left + hour * cellW + 1}
                  y={top + dow * cellH + 1}
                  width={cellW - 2}
                  height={cellH - 2}
                  rx={2}
                  fill={color(value, min, max)}
                >
                  <title>{`${day} ${String(hour).padStart(2, "0")}:00, ${value == null ? "tidak ada data" : `${fmtNum(value, 1)} µg/m³`}`}</title>
                </rect>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-[var(--muted)]">
        <span>{fmtNum(min, 0)}</span>
        <span
          className="h-2.5 w-24 rounded-full"
          style={{ background: `linear-gradient(90deg, rgb(233,241,236), rgb(14,92,83))` }}
        />
        <span>{fmtNum(max, 0)} µg/m³</span>
      </div>
    </div>
  );
}
