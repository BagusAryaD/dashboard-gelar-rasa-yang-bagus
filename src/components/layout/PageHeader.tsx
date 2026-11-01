import type { ReactNode } from "react";

export default function PageHeader({
  kicker,
  title,
  lead,
  children,
}: {
  kicker?: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-[var(--line)] pb-6 md:pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[760px]">
          {kicker ? <div className="kicker mb-2">{kicker}</div> : null}
          <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)] md:text-[42px]">
            {title}
          </h1>
          <p className="mt-3 max-w-[68ch] text-[14px] leading-6 text-[var(--muted)] md:text-[15px]">
            {lead}
          </p>
        </div>
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </header>
  );
}
