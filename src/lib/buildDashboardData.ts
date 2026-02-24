import { format, differenceInDays, addDays, parseISO } from "date-fns";
import type { Order } from "@/mocks/types";
import { TODAY, PACKAGES_2026 } from "@/mocks/types";
import {
    filterByYear, filterByDateRange, equivalentRange,
    packageDistribution, leadTimeStats, todayRuler,
    sumRevenue, avgTicket, paymentDistribution,
} from "@/lib/analytics";
import type { DashboardData } from "@/types/dashboardTypes";

// ── Constants ──
const CAMPAIGN_START_MONTH = 1; // February (0-indexed)
const CAMPAIGN_START_DAY = 1;
const META_TARGET_MONTH = 4; // May (0-indexed)
const META_TARGET_DAY = 8;

const PKG_ICON_MAP: Record<string, "bird" | "crown" | "heart"> = {
    "Mamãe Coruja": "bird",
    "Super Mãe": "crown",
    "A melhor mãe do mundo": "heart",
};

const PKG_COLOR_MAP: Record<string, string> = {
    "pkg-coruja": "hsl(160,45%,42%)",
    "pkg-super": "hsl(36,70%,48%)",
    "pkg-melhor": "hsl(340,55%,55%)",
};

const PKG_GOAL_MAP: Record<string, { target: number; color: string }> = {
    "Super Mãe": { target: 35, color: "hsl(36,70%,48%)" },
    "Mamãe Coruja": { target: 60, color: "hsl(160,45%,42%)" },
    "A melhor mãe do mundo": { target: 5, color: "hsl(340,55%,55%)" },
};

// ── Builder ──
export function buildDashboardData(
    orders: Order[],
    today: Date = TODAY,
): DashboardData {
    const currentYear = today.getFullYear();
    const campaignStart = new Date(currentYear, CAMPAIGN_START_MONTH, CAMPAIGN_START_DAY);
    const targetDate = new Date(currentYear, META_TARGET_MONTH, META_TARGET_DAY);
    const daysLeft = Math.max(0, differenceInDays(targetDate, today));

    // ── Campaign orders per year ──
    const campOrders2026 = filterByDateRange(filterByYear(orders, currentYear), campaignStart, today);
    const eq2025 = equivalentRange(today, today, currentYear - 1);
    const campOrders2025 = filterByDateRange(
        filterByYear(orders, currentYear - 1),
        new Date(currentYear - 1, CAMPAIGN_START_MONTH, CAMPAIGN_START_DAY),
        eq2025.from,
    );
    const eq2024 = equivalentRange(today, today, currentYear - 2);
    const campOrders2024 = filterByDateRange(
        filterByYear(orders, currentYear - 2),
        new Date(currentYear - 2, CAMPAIGN_START_MONTH, CAMPAIGN_START_DAY),
        eq2024.from,
    );

    // ── KPIs ──
    const rev2026 = sumRevenue(campOrders2026);
    const lt2026 = leadTimeStats(campOrders2026);

    const kpis: DashboardData["kpis"] = {
        pedidos: {
            y2026: campOrders2026.length,
            y2025: campOrders2025.length,
            y2024: campOrders2024.length,
        },
        receita2026: rev2026,
        ticketMedio: avgTicket(campOrders2026),
        leadTimeMediana: lt2026.median,
    };

    // ── Packages ──
    const packages: DashboardData["packages"] = PACKAGES_2026.map(pkg => {
        const color = PKG_COLOR_MAP[pkg.color] || "hsl(36,75%,50%)";
        const icon = PKG_ICON_MAP[pkg.name] || "heart";
        const s26 = campOrders2026.filter(o => o.packageName === pkg.name);
        const s25 = campOrders2025.filter(o => o.packageName === pkg.name);
        const s24 = campOrders2024.filter(o => o.packageName === pkg.name);
        return {
            name: pkg.name,
            price: pkg.total,
            entry: pkg.entry,
            installments: pkg.installments,
            color,
            icon,
            sold: { y2026: s26.length, y2025: s25.length, y2024: s24.length },
            revenue2026: s26.reduce((s, o) => s + o.totalAmount, 0),
        };
    });

    // ── Goals ──
    const META_PEDIDOS = 120;
    const META_FOTOS_EXTRAS = 200;
    const META_FATURAMENTO = 35935;
    const META_ENSAIOS = 100;

    const goals: DashboardData["goals"] = {
        pedidos: { target: META_PEDIDOS, current: campOrders2026.length },
        byPackage: Object.entries(PKG_GOAL_MAP).map(([name, { target, color }]) => ({
            name,
            target,
            current: campOrders2026.filter(o => o.packageName === name).length,
            color,
        })),
        fotosExtras: {
            target: META_FOTOS_EXTRAS,
            current: Math.round(campOrders2026.length * 1.7), // simulated
        },
        faturamento: { target: META_FATURAMENTO, current: rev2026 },
        ensaios: {
            target: META_ENSAIOS,
            current: campOrders2026.filter(o => !!o.sessionAt).length,
        },
        campaignComparison: {
            y2025: campOrders2025.length,
            y2024: campOrders2024.length,
        },
    };

    // ── Insights ──
    const computePeaks = (year: number) => {
        const yOrders = filterByYear(orders, year);
        const dayMap = new Map<string, number>();
        yOrders.forEach(o => {
            const key = format(new Date(o.createdAt), "dd/MM");
            dayMap.set(key, (dayMap.get(key) || 0) + 1);
        });
        return Array.from(dayMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([date, count]) => ({ date, count }));
    };

    const computeForecast = (year: number) => {
        const from = new Date(year, today.getMonth(), today.getDate());
        const to = addDays(from, 6);
        return filterByDateRange(filterByYear(orders, year), from, to).length;
    };

    const insights: DashboardData["insights"] = {
        peakDays2025: computePeaks(currentYear - 1),
        peakDays2024: computePeaks(currentYear - 2),
        next7Days: {
            y2025: computeForecast(currentYear - 1),
            y2024: computeForecast(currentYear - 2),
        },
    };

    // ── Charts: Day Series ──
    const seriesFrom = new Date(currentYear, CAMPAIGN_START_MONTH, CAMPAIGN_START_DAY);
    const seriesTo = today;
    const dayBuckets: Record<string, Record<string, number>> = {};
    [currentYear - 2, currentYear - 1, currentYear].forEach(y => {
        const yFrom = new Date(y, seriesFrom.getMonth(), seriesFrom.getDate());
        const yTo = new Date(y, seriesTo.getMonth(), seriesTo.getDate());
        const yOrders = filterByDateRange(filterByYear(orders, y), yFrom, yTo);
        yOrders.forEach(o => {
            const md = format(new Date(o.createdAt), "dd/MM");
            if (!dayBuckets[md]) dayBuckets[md] = {};
            dayBuckets[md][String(y)] = (dayBuckets[md][String(y)] || 0) + 1;
        });
    });
    const daySeries = Object.entries(dayBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vals]) => ({ date, ...vals }));

    // ── Charts: Package Comparison ──
    const pkgDist2025 = packageDistribution(filterByYear(orders, currentYear - 1));
    const pkgDist2026 = packageDistribution(filterByYear(orders, currentYear));
    const allPkgNames = new Set([...pkgDist2025.map(p => p.name), ...pkgDist2026.map(p => p.name)]);
    const packageComparison = Array.from(allPkgNames).map(name => ({
        name: name.length > 14 ? name.slice(0, 14) + "…" : name,
        fullName: name,
        "2025": pkgDist2025.find(p => p.name === name)?.count || 0,
        "2026": pkgDist2026.find(p => p.name === name)?.count || 0,
    }));

    // ── Charts: Lead Time ──
    const lt2025 = leadTimeStats(filterByYear(orders, currentYear - 1));
    const ranges = ["0–3", "4–7", "8–14", "15–30", "31+"];
    const ltBuckets = ranges.map(r => ({
        range: r,
        "2025": lt2025.buckets.find(b => b.range === r)?.count || 0,
        "2026": lt2026.buckets.find(b => b.range === r)?.count || 0,
    }));

    // ── Charts: Payment Distribution ──
    const pd2025 = paymentDistribution(filterByYear(orders, currentYear - 1));
    const pd2026 = paymentDistribution(filterByYear(orders, currentYear));
    const allMethods = new Set([...pd2025.map(d => d.method), ...pd2026.map(d => d.method)]);
    const payDist = Array.from(allMethods).map(m => ({
        method: m,
        "2025": pd2025.find(d => d.method === m)?.count || 0,
        "2026": pd2026.find(d => d.method === m)?.count || 0,
    }));

    // ── Ruler ──
    const ruler = todayRuler(orders);

    return {
        today: format(today, "yyyy-MM-dd"),
        campaign: {
            name: `Dia das Mães ${currentYear}`,
            startDate: format(campaignStart, "yyyy-MM-dd"),
            targetDate: format(targetDate, "yyyy-MM-dd"),
            daysLeft,
        },
        kpis,
        packages,
        goals,
        insights,
        charts: {
            daySeries,
            packageComparison,
            leadTime: {
                stats: {
                    y2025: { avg: lt2025.avg, median: lt2025.median },
                    y2026: { avg: lt2026.avg, median: lt2026.median },
                },
                buckets: ltBuckets,
            },
            paymentDistribution: payDist,
        },
        ruler,
    };
}
