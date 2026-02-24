import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { KPICard } from "@/components/KPICard";
import { orders } from "@/mocks/data";
import { TODAY } from "@/mocks/types";
import {
  filterByYear, filterByDateRange, equivalentRange,
  packageDistribution, leadTimeStats, todayRuler,
  sumRevenue, avgTicket, formatBRL, buildDaySeries,
} from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { format, subDays, startOfMonth } from "date-fns";

const PRESETS = [
  { label: "Hoje", from: TODAY, to: TODAY },
  { label: "Últimos 7 dias", from: subDays(TODAY, 6), to: TODAY },
  { label: "Últimos 30 dias", from: subDays(TODAY, 29), to: TODAY },
  { label: "Fev 2026", from: startOfMonth(TODAY), to: TODAY },
  { label: "Campanha (Fev–Mai)", from: new Date(2026, 1, 1), to: new Date(2026, 4, 31) },
];

const YEAR_COLORS: Record<number, string> = {
  2024: "hsl(210,55%,58%)",
  2025: "hsl(350,50%,65%)",
  2026: "hsl(36,75%,50%)",
};

const PKG_COLORS: Record<string, string> = {
  "Mamãe Coruja": "hsl(160,45%,42%)",
  "Super Mãe": "hsl(36,70%,48%)",
  "A melhor mãe do mundo": "hsl(340,55%,55%)",
};

export default function Dashboard() {
  const [presetIdx, setPresetIdx] = useState(3); // Fev 2026
  const preset = PRESETS[presetIdx];
  const { from, to } = preset;

  const o2026 = useMemo(() => filterByDateRange(filterByYear(orders, 2026), from, to), [from, to]);
  const range2025 = useMemo(() => equivalentRange(from, to, 2025), [from, to]);
  const o2025 = useMemo(() => filterByDateRange(filterByYear(orders, 2025), range2025.from, range2025.to), [range2025]);

  const rev2026 = sumRevenue(o2026);
  const diff = o2025.length ? Math.round(((o2026.length - o2025.length) / o2025.length) * 100) : 0;
  const lt2026 = leadTimeStats(o2026);

  // Day series for line chart (use full Feb range for better visualization)
  const seriesFrom = new Date(2026, 1, 1);
  const seriesTo = TODAY;
  const daySeries = useMemo(() => {
    const days: Record<string, Record<string, number>> = {};
    [2024, 2025, 2026].forEach((y) => {
      const yFrom = new Date(y, seriesFrom.getMonth(), seriesFrom.getDate());
      const yTo = new Date(y, seriesTo.getMonth(), seriesTo.getDate());
      const yOrders = filterByDateRange(filterByYear(orders, y), yFrom, yTo);
      yOrders.forEach((o) => {
        const md = format(new Date(o.createdAt), "dd/MM");
        if (!days[md]) days[md] = {};
        days[md][String(y)] = (days[md][String(y)] || 0) + 1;
      });
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }, []);

  // Package distribution comparison
  const pkgDist2025 = useMemo(() => packageDistribution(filterByYear(orders, 2025)), []);
  const pkgDist2026 = useMemo(() => packageDistribution(filterByYear(orders, 2026)), []);
  const pkgComparison = useMemo(() => {
    const allPkgs = new Set([...pkgDist2025.map(p => p.name), ...pkgDist2026.map(p => p.name)]);
    return Array.from(allPkgs).map(name => ({
      name: name.length > 14 ? name.slice(0, 14) + "…" : name,
      fullName: name,
      "2025": pkgDist2025.find(p => p.name === name)?.count || 0,
      "2026": pkgDist2026.find(p => p.name === name)?.count || 0,
    }));
  }, [pkgDist2025, pkgDist2026]);

  // Lead time buckets
  const lt2025 = leadTimeStats(filterByYear(orders, 2025));
  const ltData = useMemo(() => {
    const ranges = ["0–3", "4–7", "8–14", "15–30", "31+"];
    return ranges.map(r => ({
      range: r,
      "2025": lt2025.buckets.find(b => b.range === r)?.count || 0,
      "2026": lt2026.buckets.find(b => b.range === r)?.count || 0,
    }));
  }, [lt2025, lt2026]);

  // Today ruler
  const ruler = useMemo(() => todayRuler(orders), []);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Visão Geral
            </h1>
            <p className="text-sm text-muted-foreground">
              Campanha Dia das Mães · {format(TODAY, "dd/MM/yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(presetIdx)} onValueChange={(v) => setPresetIdx(Number(v))}>
              <SelectTrigger className="w-[180px]" aria-label="Período">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden md:flex gap-1">
              {[2024, 2025, 2026].map((y) => (
                <Badge key={y} variant="outline" className="text-xs" style={{ borderColor: YEAR_COLORS[y], color: YEAR_COLORS[y] }}>
                  {y}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <KPICard
            label="Pedidos 2026"
            value={o2026.length}
            tooltip="Total de pedidos no período selecionado em 2026"
          />
          <KPICard
            label="Pedidos 2025"
            value={o2025.length}
            tooltip="Mesmo período no ano anterior (baseline)"
          />
          <KPICard
            label="Diferença"
            value={`${diff > 0 ? "+" : ""}${diff}%`}
            comparison={diff}
            tooltip="Variação percentual: (2026 − 2025) / 2025"
          />
          <KPICard
            label="Receita est. 2026"
            value={formatBRL(rev2026)}
            tooltip="Soma do valor total de todos os pedidos 2026 no período"
          />
          <KPICard
            label="Ticket Médio"
            value={formatBRL(avgTicket(o2026))}
            tooltip="Receita total ÷ número de pedidos"
          />
          <KPICard
            label="Lead Time (md)"
            value={`${lt2026.median}d`}
            tooltip="Mediana de dias entre pedido e sessão fotográfica"
          />
        </div>

        {/* Orders by Day */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Pedidos por dia (dia a dia)</CardTitle>
            <p className="text-xs text-muted-foreground">Comparando mesmo período em 2024, 2025 e 2026</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={daySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="2024" stroke={YEAR_COLORS[2024]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="2025" stroke={YEAR_COLORS[2025]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="2026" stroke={YEAR_COLORS[2026]} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Package Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Distribuição de Pacotes</CardTitle>
              <p className="text-xs text-muted-foreground">2025 vs 2026 (total)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pkgComparison} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="2025" fill={YEAR_COLORS[2025]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="2026" fill={YEAR_COLORS[2026]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Lead Time Pedido → Sessão</CardTitle>
              <p className="text-xs text-muted-foreground">Distribuição por faixa de dias</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-3 text-sm">
                <span className="text-muted-foreground">2025: <strong className="text-foreground">{lt2025.avg}d (avg) / {lt2025.median}d (med)</strong></span>
                <span className="text-muted-foreground">2026: <strong className="text-foreground">{lt2026.avg}d (avg) / {lt2026.median}d (med)</strong></span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ltData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="2025" fill={YEAR_COLORS[2025]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="2026" fill={YEAR_COLORS[2026]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Today Ruler */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Régua do Dia — Hoje & Proximidades</CardTitle>
            <p className="text-xs text-muted-foreground">Pedidos no mesmo dia/mês em cada ano (−3 a +3 dias)</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {ruler.map((r) => (
                <div
                  key={r.offset}
                  className={`rounded-lg p-3 text-center ${r.offset === 0 ? "bg-primary/10 ring-2 ring-primary" : "bg-muted/50"}`}
                >
                  <p className="text-xs font-semibold text-muted-foreground">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground">{r.date}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: YEAR_COLORS[2024] }} />
                      <span>{r.y2024}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: YEAR_COLORS[2025] }} />
                      <span>{r.y2025}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: YEAR_COLORS[2026] }} />
                      <span>{r.y2026 !== null ? r.y2026 : <em className="text-muted-foreground">prev.</em>}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
