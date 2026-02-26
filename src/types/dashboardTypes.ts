// ── Types for the unified Dashboard JSON ──

export interface RulerYearData {
    daily: number;
    accumTotal: number;
    accumRevenue: number;
    packages: Record<string, number>;
}

export interface DashboardData {
    today: string; // "2026-02-23"

    campaign: {
        name: string;        // "Dia das Mães 2026"
        startDate: string;   // "2026-02-01"
        targetDate: string;  // "2026-05-08"
        daysLeft: number;
        activeDays?: number;
    };

    kpis: {
        pedidos: { y2026: number; y2025: number; y2024: number };
        receita2026: number;
        ticketMedio: number;
        leadTimeMediana: number;
    };

    packages: Array<{
        name: string;
        price: number;
        entry: number;
        installments: string;
        color: string;
        icon: "bird" | "crown" | "heart";
        sold: { y2026: number; y2025: number; y2024: number };
        revenue2026: number;
    }>;

    goals: {
        pedidos: { target: number; current: number };
        byPackage: Array<{
            name: string;
            target: number;
            current: number;
            color: string;
        }>;
        fotosExtras: { target: number; current: number };
        faturamento: { target: number; current: number };
        ensaios: { target: number; current: number };
        campaignComparison: { y2025: number; y2024: number };
    };

    insights: {
        peakDays2025: Array<{ date: string; fullDate?: string; count: number }>;
        peakDays2024: Array<{ date: string; fullDate?: string; count: number }>;
        next7Days: { y2025: number; y2024: number };
    };

    charts: {
        daySeries: Array<Record<string, string | number>>;
        packageComparison: Array<Record<string, string | number>>;
        leadTime: {
            stats: {
                y2025: { avg: number; median: number };
                y2026: { avg: number; median: number };
            };
            buckets: Array<Record<string, string | number>>;
        };
        paymentDistribution: Array<Record<string, string | number>>;
    };

    ruler: Array<{
        offset: number;
        label: string;
        date: string;
        y2024: RulerYearData;
        y2025: RulerYearData;
        y2026: RulerYearData | null;
    }>;

    recentBuyers: Array<{
        name: string;
        package: string;
        clientSince: string | null;
        dmCount: number;
        orderUuid: string;
        total: number;
        createdAt: string | null;
    }>;

    recurrentMissing: Array<{
        name: string;
        dmYears: number[];
        dmCount: number;
        clientSince: string | null;
        lastPackage: string | null;
    }>;
}
