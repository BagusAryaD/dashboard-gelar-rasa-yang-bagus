import type { ReactNode } from "react";
import clsx from "clsx";

export default function Kpi({
  label,
  value,
  unit,
  note,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  tone?: "default" | "accent" | "warn";
  icon?: ReactNode;
}) {
  return (
    <div className="card flex min-h-[132px] flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10.5px] font-semibold uppercase leading-4 tracking-[0.11em] text-[var(--muted)]">
          {label}
        </div>
        {icon ? (
          <span
            className={clsx(
              "grid h-7 w-7 place-items-center rounded-[8px]",
              tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
              tone === "warn" && "bg-[var(--amber-soft)] text-[var(--amber)]",
              tone === "default" && "bg-[var(--panel-soft)] text-[var(--muted)]",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-1.5">
          <span
            className={clsx(
              "num text-[30px] font-medium leading-none tracking-[-0.04em] md:text-[34px]",
              tone === "warn" ? "text-[var(--amber)]" : "text-[var(--ink)]",
            )}
          >
            {value}
          </span>
          {unit ? (
            <span className="text-[12px] font-medium text-[var(--muted)]">{unit}</span>
          ) : null}
        </div>
        {note ? (
          <div className="mt-2 text-[11.5px] leading-[1.45] text-[var(--muted)]">{note}</div>
        ) : null}
      </div>
    </div>
  );
}
