export const AQI = {
  good: { label: "Baik", color: "#2d9358", soft: "#e4f3e9" },
  moderate: { label: "Sedang", color: "#b8860b", soft: "#f8efd5" },
  unhealthy: { label: "Tidak Sehat", color: "#c65d19", soft: "#fbe8dd" },
  very: { label: "Sangat Tidak Sehat", color: "#b93a32", soft: "#f8e2df" },
  hazard: { label: "Berbahaya", color: "#753b8c", soft: "#f0e6f4" },
  none: { label: "Tidak ada data", color: "#9aa39c", soft: "#eef0ec" },
} as const;

export type AqiKey = keyof typeof AQI;

export const ISLAND_COLORS: Record<string, string> = {
  Sumatra: "#0e5c53",
  Jawa: "#3f7f9e",
  Kalimantan: "#a86512",
  Sulawesi: "#7c5a8f",
  Papua: "#5c7a3c",
  Lainnya: "#8a938c",
};

export const SITE_TYPE_LABELS: Record<string, string> = {
  urban_traffic: "Lalu lintas kota",
  urban_background: "Latar kota",
  suburban: "Pinggiran kota",
  industrial: "Industri",
  peatland: "Lahan gambut",
  port: "Pelabuhan",
  rural: "Pedesaan",
  residential: "Permukiman",
  background: "Latar belakang",
};

export function siteTypeLabel(value: string) {
  return SITE_TYPE_LABELS[value] ?? value.replaceAll("_", " ");
}

export function categoryFromPm(pm: number | null | undefined): AqiKey {
  if (pm == null || Number.isNaN(pm)) return "none";
  if (pm <= 35) return "good";
  if (pm <= 75) return "moderate";
  if (pm <= 115) return "unhealthy";
  if (pm <= 150) return "very";
  return "hazard";
}

export function aqiForCategory(category: string | null | undefined): AqiKey {
  if (!category) return "none";
  const map: Record<string, AqiKey> = {
    Baik: "good",
    Sedang: "moderate",
    "Tidak Sehat": "unhealthy",
    "Sangat Tidak Sehat": "very",
    Berbahaya: "hazard",
  };
  return map[category] ?? "none";
}

export function fmtNum(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function fmtInt(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

export function fmtPct(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${fmtNum(value, digits)}%`;
}

export function fmtCompact(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function monthShort(value: string) {
  const [year, month] = value.split("-");
  return `${MONTHS_SHORT[Number(month) - 1]} ${year.slice(2)}`;
}

export function monthLong(value: string) {
  const [year, month] = value.split("-");
  return `${MONTHS_LONG[Number(month) - 1]} ${year}`;
}

export function dateShort(value: string) {
  const [year, month, day] = value.split("-");
  return `${Number(day)} ${MONTHS_SHORT[Number(month) - 1]} ${year}`;
}

export function pctChange(from: number, to: number) {
  if (!from) return null;
  return ((to - from) / from) * 100;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export const DOW_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}`);
