import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "NAPAS | Kualitas Udara dan Kesehatan Indonesia",
  description:
    "Dashboard interaktif kualitas udara dan kesehatan respirasi dari 27 kota di Indonesia, 2024 sampai 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Sidebar />
        <main className="min-h-[100dvh] md:pl-[236px]">
          <div className="mx-auto max-w-[1480px] px-4 pb-14 pt-5 md:px-8 md:pb-16 md:pt-8">
            {children}
            <footer className="mt-12 border-t border-[var(--line)] pt-4 text-[10.5px] leading-5 text-[var(--muted)]">
              Sumber: dataset Gelar Rasa 2026, 27 stasiun AQMS dan 27 rumah sakit.
              Halaman ini memakai agregat harian yang sudah melewati kontrol kualitas.
            </footer>
          </div>
        </main>
      </body>
    </html>
  );
}
