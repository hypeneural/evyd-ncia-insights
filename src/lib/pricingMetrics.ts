import { PackageYearData, ExtraPhotoYearData } from "../mocks/pricing";

export type ComputedPackageYear = PackageYearData & {
    saldo: number;
    calculatedTotal: number;
    needsAdjustmentBadge: boolean;
    deltaTotalRs: number | null; // null for first year
    deltaTotalPct: number | null;
    deltaEntryRs: number | null;
    deltaEntryPct: number | null;
};

export type ComputedExtraPhotoYear = ExtraPhotoYearData & {
    deltaUnitRs: number | null;
    deltaUnitPct: number | null;
};

export function computeYearlyDeltas(series: PackageYearData[]): ComputedPackageYear[] {
    // Sort series by year ascending just to be safe
    const sorted = [...series].sort((a, b) => a.year - b.year);

    return sorted.map((current, index) => {
        const previous = index > 0 ? sorted[index - 1] : null;

        const saldo = current.total - current.entry;
        const installmentsTotal = current.installmentsCount * current.installmentValue;
        const calculatedTotal = current.entry + installmentsTotal;
        const needsAdjustmentBadge = calculatedTotal !== current.total;

        let deltaTotalRs: number | null = null;
        let deltaTotalPct: number | null = null;
        let deltaEntryRs: number | null = null;
        let deltaEntryPct: number | null = null;

        if (previous) {
            deltaTotalRs = current.total - previous.total;
            deltaTotalPct = previous.total > 0 ? (deltaTotalRs / previous.total) * 100 : 0;

            deltaEntryRs = current.entry - previous.entry;
            deltaEntryPct = previous.entry > 0 ? (deltaEntryRs / previous.entry) * 100 : 0;
        }

        return {
            ...current,
            saldo,
            calculatedTotal,
            needsAdjustmentBadge,
            deltaTotalRs,
            deltaTotalPct,
            deltaEntryRs,
            deltaEntryPct,
        };
    });
}

export function computeExtraPhotoDeltas(series: ExtraPhotoYearData[]): ComputedExtraPhotoYear[] {
    const sorted = [...series].sort((a, b) => a.year - b.year);
    return sorted.map((current, index) => {
        const previous = index > 0 ? sorted[index - 1] : null;

        let deltaUnitRs: number | null = null;
        let deltaUnitPct: number | null = null;

        if (previous) {
            deltaUnitRs = current.unitPrice - previous.unitPrice;
            deltaUnitPct = previous.unitPrice > 0 ? (deltaUnitRs / previous.unitPrice) * 100 : 0;
        }

        return {
            ...current,
            deltaUnitRs,
            deltaUnitPct,
        };
    });
}

export function computeCAGR(startValue: number, endValue: number, years: number): number {
    if (years <= 0 || startValue <= 0) return 0;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

export function formatBRL(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

export function formatPct(value: number | null): string {
    if (value === null) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

// Aligns multiple series (packages + extra photo) to ensure they share the same x-axis layout if missing years
export function buildAlignedYears<T extends { year: number }>(...seriesArray: T[][]): number[] {
    const years = new Set<number>();
    seriesArray.forEach(series => series.forEach(item => years.add(item.year)));
    return Array.from(years).sort((a, b) => a - b);
}
