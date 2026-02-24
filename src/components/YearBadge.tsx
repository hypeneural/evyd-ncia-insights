import { cn } from "@/lib/utils";

const yearColors: Record<number, string> = {
  2024: "bg-year-2024",
  2025: "bg-year-2025",
  2026: "bg-year-2026",
};

export function YearBadge({ year }: { year: number }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-primary-foreground", yearColors[year] || "bg-muted")}>
      {year}
    </span>
  );
}
