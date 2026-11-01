import clsx from "clsx";
import type { SelectHTMLAttributes } from "react";

export default function Select({
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={clsx("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </span>
      <select
        {...props}
        className="min-h-9 rounded-[8px] border border-[var(--line-strong)] bg-white px-2.5 text-[12px] font-medium text-[var(--ink)] shadow-none outline-none transition-colors hover:border-[#aeb8ac] focus:border-[var(--accent)]"
      >
        {children}
      </select>
    </label>
  );
}
