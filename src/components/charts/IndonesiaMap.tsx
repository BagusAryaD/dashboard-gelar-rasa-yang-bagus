"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { useJson } from "@/lib/data";
import { AQI, categoryFromPm, fmtNum } from "@/lib/metrics";
import type { Station } from "@/types/data";

type Hover = { station: Station; x: number; y: number };

const W = 1000;
const H = 440;

const ISLANDS = [
  { name: "SUMATRA", lon: 101.6, lat: -1.2 },
  { name: "JAWA", lon: 110.2, lat: -7.65 },
  { name: "KALIMANTAN", lon: 113.6, lat: 0.2 },
  { name: "SULAWESI", lon: 121.2, lat: -2.3 },
  { name: "MALUKU", lon: 128.2, lat: -3.1 },
  { name: "PAPUA", lon: 138.2, lat: -4.8 },
];

export default function IndonesiaMap({
  stations,
  selected,
  onSelect,
}: {
  stations: Station[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const geo = useJson<Record<string, unknown>>("/data/indonesia.geojson");
  const [hover, setHover] = useState<Hover | null>(null);

  const shapes = useMemo<{
    provinces: { id: string; d: string }[];
    points: { station: Station; x: number; y: number }[];
    labels: { name: string; x: number; y: number }[];
  }>(() => {
    if (!geo.data) return { provinces: [], points: [], labels: [] };
    const projection = geoMercator().fitExtent(
      [
        [18, 18],
        [W - 18, H - 18],
      ],
      geo.data as never,
    );
    const path = geoPath(projection);
    const features = (geo.data as { features?: { properties?: { state?: string }; geometry?: unknown }[] })
      .features;
    const provinces =
      features?.map((feature) => ({
        id: feature.properties?.state ?? "",
        d: path(feature as never) ?? "",
      })) ?? [];
    const points = stations
      .filter((station) => station.status !== "excluded")
      .map((station) => {
        const p = projection([station.lon, station.lat]);
        return { station, x: p?.[0] ?? 0, y: p?.[1] ?? 0 };
      });
    const labels = ISLANDS.map((island) => {
      const p = projection([island.lon, island.lat]);
      return { name: island.name, x: p?.[0] ?? 0, y: p?.[1] ?? 0 };
    });
    return { provinces, points, labels };
  }, [geo.data, stations]);

  if (geo.loading) {
    return <div className="skeleton h-[300px] w-full md:h-[420px]" />;
  }
  if (geo.error) {
    return (
      <div className="grid h-[300px] place-items-center rounded-[10px] bg-[var(--panel-soft)] text-[12px] text-[var(--muted)]">
        Peta tidak dapat dimuat.
      </div>
    );
  }

  const maxMean = Math.max(...stations.map((station) => station.pm25_mean ?? 0), 100);
  const radius = (value: number | null) => {
    const v = Math.max(0, value ?? 0);
    return 4 + 14 * Math.sqrt(Math.min(v, maxMean) / maxMean);
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Peta sebaran rata-rata PM2.5 pada 26 stasiun yang dianalisis"
      >
        <rect width={W} height={H} fill="#f3f6f2" rx="10" />
        {shapes.provinces?.map((province, index) => (
          <path
            key={`${province.id}-${index}`}
            d={province.d}
            fill="#dfe6dc"
            stroke="#f7f9f5"
            strokeWidth={0.8}
          />
        ))}
        {shapes.labels?.map((label) => (
          <text
            key={label.name}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight={600}
            letterSpacing={1.4}
            fill="#7e8a80"
            opacity={0.75}
            pointerEvents="none"
          >
            {label.name}
          </text>
        ))}
        {shapes.points?.map(({ station, x, y }) => {
          const key = categoryFromPm(station.pm25_mean);
          const active = selected === station.station_id;
          const r = radius(station.pm25_mean);
          return (
            <g key={station.station_id}>
              {active ? (
                <circle
                  cx={x}
                  cy={y}
                  r={r + 5}
                  fill="none"
                  stroke={AQI[key].color}
                  strokeWidth={1.5}
                  opacity={0.55}
                />
              ) : null}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={AQI[key].color}
                fillOpacity={0.82}
                stroke={active ? "#101512" : "#ffffff"}
                strokeWidth={active ? 2 : 1}
                tabIndex={0}
                role="button"
                aria-label={`${station.name}, rata-rata PM2.5 ${fmtNum(station.pm25_mean, 1)} mikrogram per meter kubik`}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setHover({ station, x, y })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ station, x, y })}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(station.station_id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(station.station_id);
                  }
                }}
              >
                <title>{`${station.station_id} ${station.name}: ${fmtNum(station.pm25_mean, 1)} µg/m³`}</title>
              </circle>
              {active ? (
                <text
                  x={x + r + 4}
                  y={y - 3}
                  fontSize={10}
                  fontWeight={600}
                  fill="#101512"
                  style={{ paintOrder: "stroke", stroke: "#f3f6f2", strokeWidth: 3 }}
                >
                  {station.station_id}
                </text>
              ) : null}
            </g>
          );
        })}
        {hover ? (
          <g
            transform={`translate(${Math.min(hover.x + 12, W - 170)}, ${Math.max(hover.y - 54, 8)})`}
            pointerEvents="none"
          >
            <rect width="158" height="50" rx="7" fill="#101512" opacity="0.96" />
            <text x="9" y="16" fontSize="9" fill="#9fae9f" letterSpacing="0.06em">
              {hover.station.station_id} / {hover.station.island}
            </text>
            <text x="9" y="30" fontSize="10.5" fill="#f2f4f0" fontWeight="600">
              {hover.station.city}
            </text>
            <text x="9" y="43" fontSize="9.5" fill="#c9d4c8">
              PM2.5 {fmtNum(hover.station.pm25_mean, 1)} µg/m³
            </text>
          </g>
        ) : null}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          Rata-rata PM2.5
        </span>
        {(
          [
            ["good", "≤ 35"],
            ["moderate", "36-75"],
            ["unhealthy", "76-115"],
            ["very", "116-150"],
            ["hazard", "> 150"],
          ] as const
        ).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1 text-[10.5px] text-[var(--muted)]">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: AQI[key].color }}
            />
            <span className="num">{label}</span>
          </span>
        ))}
        <span className="text-[10px] text-[var(--muted)]">Ukuran lingkaran mengikuti kadar PM2.5.</span>
      </div>
    </div>
  );
}
