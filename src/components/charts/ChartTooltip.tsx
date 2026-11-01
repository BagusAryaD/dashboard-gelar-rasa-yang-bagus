"use client";

import { fmtNum } from "@/lib/metrics";

type TipPayload = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
};

export function ChartTooltip({
  active,
  payload,
  label,
  unit = "µg/m³",
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TipPayload[];
  label?: string | number;
  unit?: string;
  labelFormatter?: (label: unknown) => string;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div className="tip-label">
        {labelFormatter ? labelFormatter(label) : String(label ?? "")}
      </div>
      <div className="space-y-0.5">
        {payload.map((item, index) => {
          const value =
            typeof item.value === "number"
              ? valueFormatter
                ? valueFormatter(item.value)
                : `${fmtNum(item.value, 1)} ${unit}`
              : String(item.value ?? "");
          return (
            <div key={`${item.name}-${index}`} className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: item.color ?? "#8fd8c7" }}
              />
              <span className="text-white/60">{item.name}</span>
              <span className="num ml-auto pl-3 font-medium text-white">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
