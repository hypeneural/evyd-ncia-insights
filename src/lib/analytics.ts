import { Order, Customer, PackageName, TODAY } from "@/mocks/types";
import {
  parseISO,
  isWithinInterval,
  differenceInDays,
  format,
  eachDayOfInterval,
  subDays,
  addDays,
  startOfDay,
} from "date-fns";

/* ---- filters ---- */
export function filterByYear(orders: Order[], year: number) {
  return orders.filter((o) => o.year === year);
}

export function filterByDateRange(orders: Order[], from: Date, to: Date) {
  return orders.filter((o) => {
    const d = parseISO(o.createdAt);
    return isWithinInterval(d, { start: startOfDay(from), end: addDays(startOfDay(to), 1) });
  });
}

export function equivalentRange(from: Date, to: Date, targetYear: number) {
  const newFrom = new Date(targetYear, from.getMonth(), from.getDate());
  const newTo = new Date(targetYear, to.getMonth(), to.getDate());
  return { from: newFrom, to: newTo };
}

/* ---- aggregations ---- */
export function countByDay(orders: Order[]) {
  const map = new Map<string, number>();
  for (const o of orders) {
    const key = format(parseISO(o.createdAt), "yyyy-MM-dd");
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

export function buildDaySeries(
  orders: Order[],
  from: Date,
  to: Date,
  years: number[],
) {
  const days = eachDayOfInterval({ start: from, end: to });
  const maps = years.map((y) => countByDay(filterByYear(orders, y)));

  return days.map((d) => {
    const dayKey = format(d, "MM-dd");
    const entry: Record<string, string | number> = { date: format(d, "dd/MM") };
    years.forEach((y, i) => {
      const fullKey = `${y}-${dayKey}`;
      entry[String(y)] = maps[i].get(fullKey) || 0;
    });
    return entry;
  });
}

export function packageDistribution(orders: Order[]) {
  const map = new Map<PackageName, { count: number; revenue: number }>();
  for (const o of orders) {
    const prev = map.get(o.packageName) || { count: 0, revenue: 0 };
    map.set(o.packageName, { count: prev.count + 1, revenue: prev.revenue + o.totalAmount });
  }
  return Array.from(map, ([name, v]) => ({ name, ...v }));
}

export function leadTimeStats(orders: Order[]) {
  const diffs = orders
    .filter((o) => o.sessionAt)
    .map((o) => differenceInDays(parseISO(o.sessionAt!), parseISO(o.createdAt)));

  if (diffs.length === 0) return { avg: 0, median: 0, buckets: [] };

  diffs.sort((a, b) => a - b);
  const avg = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  const median = diffs[Math.floor(diffs.length / 2)];

  const ranges = ["0–3", "4–7", "8–14", "15–30", "31+"] as const;
  const limits = [3, 7, 14, 30, Infinity];
  const buckets = ranges.map((range, i) => ({
    range,
    count: diffs.filter(
      (d) => d >= (i === 0 ? 0 : limits[i - 1] + 1) && d <= limits[i],
    ).length,
  }));

  return { avg, median, buckets };
}

export function paymentDistribution(orders: Order[]) {
  const map = new Map<string, number>();
  for (const o of orders) {
    map.set(o.entryPaymentMethod, (map.get(o.entryPaymentMethod) || 0) + 1);
  }
  return Array.from(map, ([method, count]) => ({ method, count }));
}

export function customersNotIn2026(orders: Order[], customers: Customer[]) {
  const ids2026 = new Set(filterByYear(orders, 2026).map((o) => o.customerId));
  const idsPrev = new Set(
    orders.filter((o) => o.year === 2024 || o.year === 2025).map((o) => o.customerId),
  );
  return customers.filter((c) => idsPrev.has(c.id) && !ids2026.has(c.id));
}

export function todayRuler(orders: Order[], dayOffset: number[] = [-3, -2, -1, 0, 1, 2, 3]) {
  return dayOffset.map((offset) => {
    const d = addDays(TODAY, offset);
    const getCount = (year: number) => {
      const target = new Date(year, d.getMonth(), d.getDate());
      const key = format(target, "yyyy-MM-dd");
      return countByDay(filterByYear(orders, year)).get(key) || 0;
    };
    return {
      offset,
      label: offset === 0 ? "Hoje" : (offset > 0 ? `+${offset}` : String(offset)),
      date: format(d, "dd/MM"),
      y2024: getCount(2024),
      y2025: getCount(2025),
      y2026: offset > 0 ? null : getCount(2026), // future = null
    };
  });
}

export function sumRevenue(orders: Order[]) {
  return orders.reduce((s, o) => s + o.totalAmount, 0);
}

export function avgTicket(orders: Order[]) {
  return orders.length ? Math.round(sumRevenue(orders) / orders.length) : 0;
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* customer last order info */
export function customerLastOrder(customerId: string, orders: Order[]) {
  const custOrders = orders.filter((o) => o.customerId === customerId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return custOrders[0] || null;
}

export function customerTotalSpent(customerId: string, orders: Order[]) {
  return orders.filter((o) => o.customerId === customerId).reduce((s, o) => s + o.totalAmount, 0);
}
