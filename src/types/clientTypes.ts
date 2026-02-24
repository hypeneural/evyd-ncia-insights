// ── Types for the unified Clients JSON ──

export interface ClientExtra {
    name: string;
    quantity: number;
    unit_price: number;
}

export interface ClientOrder {
    order_id: number;
    order_uuid: string;
    created_at: string;
    session_date: string | null;
    year: number;
    campaign: string;
    status: { id: number; name: string };
    financials: {
        discounts: number;
        total: number;
        received: number;
        remaining: number;
    };
    package: { name: string; slug: string };
    extras: ClientExtra[];
    payment_methods: string[];
}

export interface PackageHistory {
    year: number;
    campaign: string;
    package: string;
    total: number;
    session_date: string | null;
    extra_photos: number;
}

export interface ClientKpis {
    total_orders: number;
    total_spent: number;
    avg_ticket: number;
    first_order_date: string;
    last_order_date: string;
    last_session_date: string | null;
    days_since_last_session: number | null;
    mothers_day_count: number;
    mothers_day_years: number[];
    other_campaigns: string[];
    other_campaigns_years: Array<{ campaign: string; year: number }>;
    has_order_2026: boolean;
    order_count_2026: number;
    spent_2026: number;
    preferred_payment: string;
    preferred_package: string;
    total_extra_photos: number;
    extra_photos_spent: number;
}

export interface ClientData {
    id: number;
    uuid: string;
    name: string;
    document: string;
    email: string;
    whatsapp: string;
    tags: string[];
    kpis: ClientKpis;
    packages_history: PackageHistory[];
    orders: ClientOrder[];
}
