export type PackageYearData = {
    year: number;
    total: number;
    entry: number;
    installmentsCount: number;
    installmentValue: number;
};

export type ExtraPhotoYearData = {
    year: number;
    unitPrice: number;
};

export type PricingData = {
    packages: Record<string, PackageYearData[]>;
    extraPhoto: ExtraPhotoYearData[];
};

export const MOCK_PRICING_DATA: PricingData = {
    packages: {
        "Mamãe Coruja": [
            { year: 2023, total: 116, entry: 58, installmentsCount: 1, installmentValue: 58 },
            { year: 2024, total: 136, entry: 68, installmentsCount: 1, installmentValue: 68 },
            { year: 2025, total: 178, entry: 89, installmentsCount: 1, installmentValue: 89 },
            { year: 2026, total: 196, entry: 98, installmentsCount: 1, installmentValue: 98 },
        ],
        "Super Mãe": [
            { year: 2022, total: 288, entry: 48, installmentsCount: 5, installmentValue: 48 },
            { year: 2023, total: 348, entry: 58, installmentsCount: 5, installmentValue: 58 },
            { year: 2024, total: 348, entry: 58, installmentsCount: 5, installmentValue: 58 },
            { year: 2025, total: 419, entry: 89, installmentsCount: 3, installmentValue: 110 },
            { year: 2026, total: 450, entry: 120, installmentsCount: 3, installmentValue: 110 },
        ],
        "A melhor mãe do mundo": [
            { year: 2025, total: 819, entry: 159, installmentsCount: 3, installmentValue: 220 },
            { year: 2026, total: 885, entry: 180, installmentsCount: 3, installmentValue: 235 },
        ],
    },
    extraPhoto: [
        { year: 2022, unitPrice: 15 },
        { year: 2023, unitPrice: 16 },
        { year: 2024, unitPrice: 18 },
        { year: 2025, unitPrice: 19 },
        { year: 2026, unitPrice: 20 },
    ],
};
