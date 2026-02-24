export type PackageName = "Mamãe Coruja" | "Super Mãe" | "A melhor mãe do mundo";
export type PaymentMethod = "pix" | "cartao" | "dinheiro" | "transferencia";
export type OrderStatus = "reservou" | "agendou" | "fotografou" | "pos-venda";

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  tags: string[];
}

export interface Order {
  id: string;
  year: number;
  customerId: string;
  createdAt: string;
  sessionAt?: string;
  packageName: PackageName;
  entryAmount: number;
  totalAmount: number;
  entryPaymentMethod: PaymentMethod;
  status: OrderStatus;
}

export const PACKAGES_2026 = [
  {
    name: "Mamãe Coruja" as PackageName,
    entry: 98,
    installments: "1x R$ 98,00",
    total: 196,
    color: "pkg-coruja",
  },
  {
    name: "Super Mãe" as PackageName,
    entry: 120,
    installments: "até 3x R$ 110,00",
    total: 450,
    color: "pkg-super",
  },
  {
    name: "A melhor mãe do mundo" as PackageName,
    entry: 180,
    installments: "até 3x R$ 235,00",
    total: 885,
    color: "pkg-melhor",
  },
] as const;

export const TODAY = new Date(2026, 1, 23); // Feb 23, 2026
