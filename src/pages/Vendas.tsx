import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { orders } from "@/mocks/data";
import { PackageName, TODAY } from "@/mocks/types";
import { filterByYear, filterByDateRange, formatBRL, paymentDistribution } from "@/lib/analytics";
import { PackageBadge } from "@/components/PackageBadge";
import { YearBadge } from "@/components/YearBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";

const YEAR_COLORS: Record<number, string> = {
  2024: "hsl(210,55%,58%)", 2025: "hsl(350,50%,65%)", 2026: "hsl(36,75%,50%)",
};

export default function Vendas() {
  const [metric, setMetric] = useState<"pedidos" | "receita">("pedidos");
  const [view, setView] = useState<"dia" | "acumulado">("dia");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterPkg, setFilterPkg] = useState<string>("all");

  // Build chart data
  const chartData = useMemo(() => {
    const from = new Date(2026, 1, 1);
    const to = TODAY;
    const days = eachDayOfInterval({ start: from, end: to });

    return days.map((d) => {
      const md = format(d, "dd/MM");
      const entry: Record<string, string | number> = { date: md };
      [2024, 2025, 2026].forEach((y) => {
        const target = new Date(y, d.getMonth(), d.getDate());
        const dayOrders = orders.filter(
          (o) => o.year === y && format(parseISO(o.createdAt), "yyyy-MM-dd") === format(target, "yyyy-MM-dd"),
        );
        entry[String(y)] = metric === "pedidos" ? dayOrders.length : dayOrders.reduce((s, o) => s + o.totalAmount, 0);
      });
      return entry;
    });
  }, [metric]);

  const displayData = useMemo(() => {
    if (view === "dia") return chartData;
    // accumulated
    const acc = { "2024": 0, "2025": 0, "2026": 0 };
    return chartData.map((d) => {
      (["2024", "2025", "2026"] as const).forEach((y) => {
        acc[y] += (d[y] as number) || 0;
      });
      return { date: d.date, "2024": acc["2024"], "2025": acc["2025"], "2026": acc["2026"] };
    });
  }, [chartData, view]);

  // Table data
  const tableOrders = useMemo(() => {
    let filtered = [...orders];
    if (filterYear !== "all") filtered = filtered.filter((o) => o.year === Number(filterYear));
    if (filterPkg !== "all") filtered = filtered.filter((o) => o.packageName === filterPkg);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);
  }, [filterYear, filterPkg]);

  // Payment distribution
  const payDist = useMemo(() => {
    const d2025 = paymentDistribution(filterByYear(orders, 2025));
    const d2026 = paymentDistribution(filterByYear(orders, 2026));
    const methods = new Set([...d2025.map((d) => d.method), ...d2026.map((d) => d.method)]);
    return Array.from(methods).map((m) => ({
      method: m,
      "2025": d2025.find((d) => d.method === m)?.count || 0,
      "2026": d2026.find((d) => d.method === m)?.count || 0,
    }));
  }, []);

  const ChartComponent = view === "acumulado" ? LineChart : BarChart;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Vendas & Comparativos</h1>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pedidos">Pedidos</SelectItem>
              <SelectItem value="receita">Receita (R$)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={view} onValueChange={(v) => setView(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Dia a dia</SelectItem>
              <SelectItem value="acumulado">Acumulado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Chart */}
        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={320}>
              {view === "acumulado" ? (
                <LineChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="2024" stroke={YEAR_COLORS[2024]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="2025" stroke={YEAR_COLORS[2025]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="2026" stroke={YEAR_COLORS[2026]} strokeWidth={2.5} dot={false} />
                </LineChart>
              ) : (
                <BarChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="2024" fill={YEAR_COLORS[2024]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="2025" fill={YEAR_COLORS[2025]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="2026" fill={YEAR_COLORS[2026]} radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Meio de Pagamento da Entrada</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={payDist} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                <XAxis dataKey="method" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="2025" fill={YEAR_COLORS[2025]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="2026" fill={YEAR_COLORS[2026]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg font-display">Pedidos</CardTitle>
              <div className="flex gap-2">
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[100px]"><SelectValue placeholder="Ano" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPkg} onValueChange={setFilterPkg}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Pacote" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Mamãe Coruja">Mamãe Coruja</SelectItem>
                    <SelectItem value="Super Mãe">Super Mãe</SelectItem>
                    <SelectItem value="A melhor mãe do mundo">A melhor mãe…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Pacote</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-sm">{format(parseISO(o.createdAt), "dd/MM/yy")}</TableCell>
                      <TableCell><YearBadge year={o.year} /></TableCell>
                      <TableCell><PackageBadge name={o.packageName} /></TableCell>
                      <TableCell className="text-sm">{formatBRL(o.entryAmount)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatBRL(o.totalAmount)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{o.entryPaymentMethod}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{o.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
