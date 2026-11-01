import clsx from "clsx";
import { AQI, type AqiKey } from "@/lib/metrics";

export default function Badge({
  category,
  children,
  tone,
  className,
}: {
  category?: AqiKey;
  children?: React.ReactNode;
  tone?: "neutral" | "accent" | "warn" | "danger";
  className?: string;
}) {
  const style = category
    ? { backgroundColor: AQI[category].soft, color: AQI[category].color }
    : undefined;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-4",
        !category && tone === "neutral" && "bg-[#eef1ec] text-[#5f6962]",
        !category && tone === "accent" && "bg-[var(--accent-soft)] text-[var(--accent)]",
        !category && tone === "warn" && "bg-[var(--amber-soft)] text-[var(--amber)]",
        !category && tone === "danger" && "bg-[#f8e2df] text-[#a52f28]",
        className,
      )}
      style={style}
    >
      {children ?? (category ? AQI[category].label : null)}
    </span>
  );
}
