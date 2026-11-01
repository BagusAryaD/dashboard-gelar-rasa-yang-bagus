"use client";

import { useMemo } from "react";
import type { Windrose } from "@/types/data";
import { fmtInt } from "@/lib/metrics";

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const COLORS = ["#d8eee6", "#9bd3c0", "#57aa96", "#247a6b", "#0a4d45"];

function polar(radius: number, angle: number) {
  return {
    x: Math.sin(angle) * radius,
    y: -Math.cos(angle) * radius,
  };
}

function wedgePath(r0: number, r1: number, a0: number, a1: number) {
  const p0 = polar(r1, a0);
  const p1 = polar(r1, a1);
  const p2 = polar(r0, a1);
  const p3 = polar(r0, a0);
  return [
    `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
    `A ${r1.toFixed(2)} ${r1.toFixed(2)} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `A ${r0.toFixed(2)} ${r0.toFixed(2)} 0 0 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export default function WindRose({ data }: { data: Windrose[string] | undefined }) {
  const size = 320;
  const center = size / 2;
  const maxR = 118;

  const shape = useMemo(() => {
    if (!data) return null;
    const totals = data.counts.map((row) => row.reduce((sum, value) => sum + value, 0));
    const maxTotal = Math.max(...totals, 1);
    const wedges: { d: string; fill: string; dir: string; bin: string }[] = [];
    data.counts.forEach((row, dirIndex) => {
      let inner = 0;
      row.forEach((count, binIndex) => {
        if (!count) return;
        const outer = inner + (count / maxTotal) * maxR;
        const start = dirIndex * (Math.PI / 8) - Math.PI / 16 + 0.012;
        const end = dirIndex * (Math.PI / 8) + Math.PI / 16 - 0.012;
        wedges.push({
          d: wedgePath(inner, Math.max(outer, inner + 0.6), start, end),
          fill: COLORS[binIndex] ?? COLORS[COLORS.length - 1],
          dir: DIRS[dirIndex],
          bin: data.speed_bins[binIndex] ?? "",
        });
        inner = outer;
      });
    });
    return { wedges, maxTotal, total: data.total };
  }, [data]);

  if (!data || !shape) {
    return <div className="skeleton h-[280px] w-full" />;
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-[280px] w-[280px]" role="img" aria-label="Wind rose arah dan kecepatan angin">
        <g transform={`translate(${center},${center})`}>
          {[0.25, 0.5, 0.75, 1].map((ring) => (
            <circle
              key={ring}
              r={maxR * ring}
              fill="none"
              stroke="#e2e7df"
              strokeWidth={0.8}
            />
          ))}
          {shape.wedges.map((wedge, index) => (
            <path key={index} d={wedge.d} fill={wedge.fill} opacity={0.92}>
              <title>{`${wedge.dir} / ${wedge.bin} m/s`}</title>
            </path>
          ))}
          <circle r={2.5} fill="#4d5851" />
          {DIRS.filter((_, index) => index % 2 === 0).map((dir, index) => {
            const angle = index * (Math.PI / 4) - Math.PI / 2;
            const r = maxR + 13;
            return (
              <text
                key={dir}
                x={Math.cos(angle) * r}
                y={Math.sin(angle) * r + 3}
                textAnchor="middle"
                fontSize={9}
                fill="#657069"
                fontWeight={dir === "N" || dir === "E" || dir === "S" || dir === "W" ? 700 : 400}
              >
                {dir}
              </text>
            );
          })}
        </g>
      </svg>
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          Kecepatan angin
        </div>
        <div className="space-y-1">
          {data.speed_bins.map((bin, index) => (
            <div key={bin} className="flex items-center gap-1.5 text-[10.5px] text-[var(--muted)]">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: COLORS[index] }} />
              <span className="num">{bin} m/s</span>
            </div>
          ))}
        </div>
        <div className="pt-1 text-[10.5px] leading-4 text-[var(--muted)]">
          {fmtInt(shape.total)} observasi
          <br />
          jam dengan data angin
        </div>
      </div>
    </div>
  );
}
