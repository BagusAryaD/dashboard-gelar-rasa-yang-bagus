"use client";

import { fmtNum } from "@/lib/metrics";

function color(value: number | null) {
  if (value == null || Number.isNaN(value)) return "#eef1ec";
  const t = Math.max(-1, Math.min(1, value));
  if (t >= 0) {
    const a = Math.round(255 - t * 165);
    return `rgb(${a},${Math.round(236 - t * 140)},${Math.round(226 - t * 120)})`;
  }
  const a = Math.abs(t);
  return `rgb(${Math.round(220 - a * 140)},${Math.round(235 - a * 95)},${Math.round(245 - a * 40)})`;
}

export default function CorrelationMatrix({
  labels,
  matrix,
  rowLabels,
  size = "md",
}: {
  labels: string[];
  matrix: (number | null)[][];
  rowLabels?: string[];
  size?: "sm" | "md";
}) {
  const cell = size === "sm" ? "h-8 w-8 text-[9px]" : "h-10 w-10 text-[10px]";
  return (
    <div className="scroll-x">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="w-16" />
            {labels.map((label) => (
              <th
                key={label}
                className="num px-1 pb-1 text-center text-[9.5px] font-medium text-[var(--muted)]"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th className="num pr-2 text-right text-[9.5px] font-medium text-[var(--muted)]">
                {(rowLabels ?? labels)[rowIndex]}
              </th>
              {row.map((value, colIndex) => (
                <td key={colIndex} className="p-0.5">
                  <div
                    className={`${cell} grid place-items-center rounded-[3px] font-medium text-[#24302a]`}
                    style={{ backgroundColor: color(value) }}
                    title={`${(rowLabels ?? labels)[rowIndex]} vs ${labels[colIndex]}: ${value == null ? "n/a" : fmtNum(value, 2)}`}
                  >
                    {value == null ? "" : fmtNum(value, 2)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
