import { Customer, Order, PackageName, PaymentMethod } from "./types";

/* ---------- seeded PRNG ---------- */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rand = seededRandom(42);

/* ---------- customers ---------- */
const FN = [
  "Ana","Beatriz","Camila","Daniela","Eduarda","Fernanda","Gabriela","Helena",
  "Isabela","Juliana","Karen","Larissa","Mariana","Natália","Olívia","Patrícia",
  "Rafaela","Sabrina","Tatiana","Valéria","Adriana","Bruna","Carolina","Débora",
  "Eliane","Fabiana","Giovana","Heloísa","Ingrid","Jéssica","Karina","Letícia",
  "Michele","Nathalia","Priscila","Renata","Simone","Talita","Vivian","Aline",
  "Bianca","Cristina","Diana","Elisa","Flávia","Giulia","Lorena","Monique",
  "Paula","Raquel","Sandra","Thaís","Vanessa","Yasmin","Amanda","Cíntia",
  "Denise","Érica","Gisele","Joana","Lívia","Marta","Nina","Rosana",
  "Solange","Tereza","Vera","Andréa","Clara","Estela","Graziela","Ivone",
  "Luana","Márcia","Norma","Paloma","Regina","Sueli","Tamires","Vitória",
];
const LN = [
  "Silva","Santos","Oliveira","Souza","Lima","Pereira","Costa","Rodrigues",
  "Almeida","Nascimento","Araújo","Melo","Barbosa","Ribeiro","Carvalho",
  "Gomes","Martins","Rocha","Dias","Ferreira",
];

export const customers: Customer[] = FN.map((first, i) => ({
  id: `c${i + 1}`,
  name: `${first} ${LN[i % LN.length]}`,
  whatsapp: `(21) 9${String(8000 + i).padStart(4, "0")}-${String(1000 + i * 7).slice(-4)}`,
  email: i % 3 === 0 ? `${first.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}${i}@email.com` : undefined,
  tags: i % 10 === 0 ? ["VIP"] : i % 7 === 0 ? ["voltou_2025"] : [],
}));

/* ---------- prices per year ---------- */
const PRICES: Record<number, Record<PackageName, { entry: number; total: number }>> = {
  2024: {
    "Mamãe Coruja": { entry: 75, total: 150 },
    "Super Mãe": { entry: 120, total: 350 },
    "A melhor mãe do mundo": { entry: 180, total: 700 },
  },
  2025: {
    "Mamãe Coruja": { entry: 90, total: 180 },
    "Super Mãe": { entry: 130, total: 400 },
    "A melhor mãe do mundo": { entry: 200, total: 750 },
  },
  2026: {
    "Mamãe Coruja": { entry: 98, total: 196 },
    "Super Mãe": { entry: 120, total: 450 },
    "A melhor mãe do mundo": { entry: 180, total: 885 },
  },
};

/* ---------- aggregate specs ---------- */
type Spec = [number, PackageName, number, number]; // year, pkg, month(1-based), count
const SPECS: Spec[] = [
  // 2024
  [2024, "Mamãe Coruja", 3, 15],
  [2024, "Mamãe Coruja", 4, 35],
  [2024, "Mamãe Coruja", 5, 9],
  [2024, "Super Mãe", 3, 14],
  [2024, "Super Mãe", 4, 41],
  [2024, "Super Mãe", 5, 4],
  [2024, "Super Mãe", 6, 1],
  // 2025
  [2025, "A melhor mãe do mundo", 2, 1],
  [2025, "A melhor mãe do mundo", 4, 1],
  [2025, "A melhor mãe do mundo", 5, 1],
  [2025, "Mamãe Coruja", 2, 8],
  [2025, "Mamãe Coruja", 3, 11],
  [2025, "Mamãe Coruja", 4, 23],
  [2025, "Mamãe Coruja", 5, 17],
  [2025, "Super Mãe", 2, 4],
  [2025, "Super Mãe", 3, 11],
  [2025, "Super Mãe", 4, 12],
  [2025, "Super Mãe", 5, 4],
  // 2026 (partial – up to Feb 23)
  [2026, "Mamãe Coruja", 2, 7],
  [2026, "Super Mãe", 2, 5],
  [2026, "A melhor mãe do mundo", 2, 3],
];

const PAY: PaymentMethod[] = ["pix", "cartao", "dinheiro", "transferencia"];

function generateOrders(): Order[] {
  const orders: Order[] = [];
  let oid = 1;
  const yearCustIdx: Record<number, number> = { 2024: 0, 2025: 10, 2026: 30 };

  for (const [year, pkg, month, count] of SPECS) {
    const maxDay = year === 2026 ? 23 : new Date(year, month, 0).getDate();
    const prices = PRICES[year][pkg];

    for (let i = 0; i < count; i++) {
      const day = Math.max(1, Math.min(maxDay, Math.floor((i / count) * maxDay) + 1));
      const ci = yearCustIdx[year] % customers.length;
      yearCustIdx[year]++;
      const customer = customers[ci];

      const createdAt = new Date(year, month - 1, day, 8 + Math.floor(rand() * 12), Math.floor(rand() * 60));
      const hasSession = rand() < 0.6;
      const sessionAt = hasSession
        ? new Date(createdAt.getTime() + (7 + Math.floor(rand() * 23)) * 86_400_000)
        : undefined;

      const status: Order["status"] = sessionAt
        ? rand() < 0.5 ? "fotografou" : "pos-venda"
        : rand() < 0.5 ? "reservou" : "agendou";

      orders.push({
        id: `o${oid++}`,
        year,
        customerId: customer.id,
        createdAt: createdAt.toISOString(),
        sessionAt: sessionAt?.toISOString(),
        packageName: pkg,
        entryAmount: prices.entry,
        totalAmount: prices.total,
        entryPaymentMethod: PAY[Math.floor(rand() * PAY.length)],
        status,
      });
    }
  }
  return orders;
}

export const orders = generateOrders();
