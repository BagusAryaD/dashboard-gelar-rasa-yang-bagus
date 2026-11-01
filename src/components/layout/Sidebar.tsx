"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDots,
  Heartbeat,
  MapTrifold,
  ShieldCheck,
  SquaresFour,
  WaveSine,
  Wind,
} from "@phosphor-icons/react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Ringkasan", icon: SquaresFour },
  { href: "/peta", label: "Peta & prioritas", icon: MapTrifold },
  { href: "/waktu", label: "Pola waktu", icon: CalendarDots },
  { href: "/pendorong", label: "Pendorong", icon: WaveSine },
  { href: "/kesehatan", label: "Kesehatan", icon: Heartbeat },
  { href: "/kualitas-data", label: "Kualitas data", icon: ShieldCheck },
];

function Brand() {
  return (
    <Link href="/" prefetch={false} className="flex items-center gap-2.5" aria-label="Napas, halaman ringkasan">
      <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#d9f0e8] text-[#0e5c53]">
        <Wind size={19} weight="bold" />
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-[0.02em] text-white">NAPAS</span>
        <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-white/45">
          Gelar Rasa 2026
        </span>
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const clean = (pathname ?? "/").replace(/\/$/, "") || "/";

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col bg-[#101512] px-4 py-5 md:flex">
        <Brand />

        <div className="mt-8 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Navigasi
        </div>
        <nav className="mt-2 flex flex-col gap-0.5" aria-label="Navigasi utama">
          {NAV.map((item) => {
            const active = clean === item.href.replace(/\/$/, "");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "group flex min-h-11 items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] transition-colors",
                  active
                    ? "bg-white/[0.09] font-semibold text-white"
                    : "text-white/60 hover:bg-white/[0.05] hover:text-white/90",
                )}
              >
                <Icon
                  size={17}
                  weight={active ? "fill" : "regular"}
                  className={active ? "text-[#8fd8c7]" : "text-white/45 group-hover:text-white/70"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
            Cakupan data
          </div>
          <div className="mt-2 text-[12px] leading-5 text-white/70">
            27 stasiun udara
            <br />
            27 rumah sakit
            <br />
            2024 sampai 2026
          </div>
          <div className="mt-3 border-t border-white/10 pt-2 text-[10.5px] leading-4 text-white/35">
            Kualitas udara dan kesehatan respirasi di 27 kota Indonesia.
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-40 bg-[#101512] px-4 pb-3 pt-3 md:hidden">
        <div className="flex items-center justify-between">
          <Brand />
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
            2024-2026
          </span>
        </div>
        <nav
          className="mt-3 grid grid-cols-3 gap-1"
          aria-label="Navigasi utama"
        >
          {NAV.map((item) => {
            const active = clean === item.href.replace(/\/$/, "");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] px-1.5 text-[11px] transition-colors",
                  active
                    ? "bg-white/[0.12] font-semibold text-white"
                    : "text-white/55 hover:text-white",
                )}
              >
                <Icon size={14} weight={active ? "fill" : "regular"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
