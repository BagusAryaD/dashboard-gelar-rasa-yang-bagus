"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { fmtNum } from "@/lib/metrics";

export type RankItem = {
  name: string;
  value: number;
  color?: string;
  meta?: string;
};

export default function RankingBars({
  data,
  height,
  unit = "µg/m³",
  maxItems = 12,
  labelWidth = 126,
}: {
  data: RankItem[];
  height?: number;
  unit?: string;
  maxItems?: number;
  labelWidth?: number;
}) {
  const rows = data.slice(0, maxItems);
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(220, rows.length * 30 + 20)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 52, bottom: 4, left: 4 }}
        barCategoryGap={5}
      >
        <XAxis type="number" hide domain={[0, "dataMax + 20"]} />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth}
          tick={{ fontSize: 10.5, fill: "#4d5851" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ChartTooltip unit={unit} />}
          cursor={{ fill: "#f3f5f1" }}
        />
        <Bar dataKey="value" name="Rata-rata" radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {rows.map((item, index) => (
            <Cell key={index} fill={item.color ?? "#0e5c53"} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(value: unknown) => fmtNum(Number(value), 1)}
            style={{ fontSize: 10, fill: "#4d5851", fontFamily: "var(--font-geist-mono)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
