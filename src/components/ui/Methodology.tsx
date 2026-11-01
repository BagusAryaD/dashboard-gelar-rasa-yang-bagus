import type { ReactNode } from "react";
import { Info } from "@phosphor-icons/react/dist/ssr";

export default function Methodology({
  title = "Cara membaca angka ini",
  children,
  defaultOpen = false,
}: {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-[12px] border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[12px] font-semibold text-[var(--ink-soft)]">
        <Info size={15} className="text-[var(--accent)]" />
        {title}
        <span className="ml-auto text-[11px] font-normal text-[var(--muted)] group-open:hidden">
          Buka
        </span>
        <span className="ml-auto hidden text-[11px] font-normal text-[var(--muted)] group-open:inline">
          Tutup
        </span>
      </summary>
      <div className="mt-3 space-y-2 text-[12px] leading-5 text-[var(--muted)]">{children}</div>
    </details>
  );
}
