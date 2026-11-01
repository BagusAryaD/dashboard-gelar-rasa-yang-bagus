import type { ReactNode } from "react";
import clsx from "clsx";

export default function ChartCard({
  title,
  subtitle,
  action,
  children,
  footer,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("card overflow-hidden", className)}>
      <div className="flex flex-col gap-2 border-b border-[var(--line)] px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={clsx("px-4 py-4", bodyClassName)}>{children}</div>
      {footer ? (
        <div className="border-t border-[var(--line)] bg-[var(--panel-soft)] px-4 py-2.5 text-[11px] leading-[1.5] text-[var(--muted)]">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
