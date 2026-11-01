"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

export type TrendSeries = {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  width?: number;
  yAxisId?: "left" | "right";
};

export default function TrendChart({
  data,
  xKey,
  series,
  height = 300,
  unit = "µg/m³",
  yDomain,
  reference,
  referenceLabel,
  areas,
  xTickFormatter,
  tooltipLabelFormatter,
  tooltipValueFormatter,
  dualAxis = false,
  rightUnit,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: TrendSeries[];
  height?: number;
  unit?: string;
  yDomain?: [number, number];
  reference?: number;
  referenceLabel?: string;
  areas?: { from: string; to: string; label?: string }[];
  xTickFormatter?: (value: string) => string;
  tooltipLabelFormatter?: (value: unknown) => string;
  tooltipValueFormatter?: (value: number) => string;
  dualAxis?: boolean;
  rightUnit?: string;
}) {
  const hasRight = dualAxis && series.some((item) => item.yAxisId === "right");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((item) => (
          <span
            key={item.key}
            className="flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--muted)]"
          >
            <span
              className="h-[2px] w-4 rounded-full"
              style={{
                backgroundColor: item.color,
                opacity: item.dashed ? 0.65 : 1,
              }}
            />
            {item.label}
          </span>
        ))}
        {reference ? (
          <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--muted)]">
            <span className="h-px w-4 border-t border-dashed border-[#8e3a33]" />
            {referenceLabel ?? `Ambang ${reference}`}
          </span>
        ) : null}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: hasRight ? 12 : 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#e7eae3" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: "#657069" }}
            tickLine={false}
            axisLine={{ stroke: "#d8ddd5" }}
            minTickGap={28}
            tickFormatter={xTickFormatter}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#657069" }}
            tickLine={false}
            axisLine={false}
            domain={yDomain ?? ["auto", "auto"]}
            width={44}
          />
          {hasRight ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#657069" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
          ) : null}
          {areas?.map((area) => (
            <ReferenceArea
              key={`${area.from}-${area.to}`}
              x1={area.from}
              x2={area.to}
              fill="#b8860b"
              fillOpacity={0.08}
              stroke="none"
            />
          ))}
          {reference ? (
            <ReferenceLine
              y={reference}
              yAxisId="left"
              stroke="#8e3a33"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
            />
          ) : null}
          <Tooltip
            content={
              <ChartTooltip
                unit={unit}
                labelFormatter={tooltipLabelFormatter}
                valueFormatter={tooltipValueFormatter}
              />
            }
            cursor={{ stroke: "#9aa69e", strokeDasharray: "3 3" }}
          />
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              yAxisId={item.yAxisId ?? "left"}
              stroke={item.color}
              strokeWidth={item.width ?? 2}
              strokeDasharray={item.dashed ? "4 4" : undefined}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 2, stroke: "#ffffff" }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {hasRight && rightUnit ? (
        <div className="mt-1 text-right text-[10px] text-[var(--muted)]">
          Garis kanan: {rightUnit}
        </div>
      ) : null}
    </div>
  );
}
