import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { format, addDays } from "date-fns";
import { Target, Lightbulb, Bird, Crown, Heart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { DashboardData, RulerYearData } from "@/types/dashboardTypes";
import dashboardRaw from "@/mocks/dashboard.json";


const YEAR_COLORS: Record<number, string> = {
  2024: "hsl(210,55%,58%)",
  2025: "hsl(350,50%,65%)",
  2026: "hsl(36,75%,50%)",
};

const ICON_MAP: Record<string, React.ReactNode> = {
  bird: <Bird className="w-8 h-8" />,
  crown: <Crown className="w-8 h-8" />,
  heart: <Heart className="w-8 h-8" />,
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(current: number, target: number) {
  return Math.min(100, Math.round((current / target) * 100));
}

function remaining(current: number, target: number) {
  return Math.max(0, target - current);
}

export default function Dashboard() {
  const [chartView, setChartView] = useState<"dia" | "acumulado">("dia");

  // ── Single data source (real data from JSON) ──
  const data: DashboardData = dashboardRaw as unknown as DashboardData;

  // ── Derived client-side: accumulated chart series ──
  const accumSeries = useMemo(() => {
    const acc: Record<string, number> = { "2024": 0, "2025": 0, "2026": 0 };
    return data.charts.daySeries.map(d => {
      ["2024", "2025", "2026"].forEach(y => {
        acc[y] += (d[y] as number) || 0;
      });
      return { date: d.date, "2024": acc["2024"], "2025": acc["2025"], "2026": acc["2026"] };
    });
  }, [data.charts.daySeries]);

  const chartDisplayData = chartView === "acumulado" ? accumSeries : data.charts.daySeries;

  // ── Convenience aliases ──
  const { kpis, packages, goals, insights, charts, ruler, campaign } = data;
  const today = new Date(data.today);
  const targetDate = new Date(campaign.targetDate);

  // KPI diffs
  const diff2025 = kpis.pedidos.y2025 ? Math.round(((kpis.pedidos.y2026 - kpis.pedidos.y2025) / kpis.pedidos.y2025) * 100) : 0;
  const diff2024 = kpis.pedidos.y2024 ? Math.round(((kpis.pedidos.y2026 - kpis.pedidos.y2024) / kpis.pedidos.y2024) * 100) : 0;
  const diffAbs2025 = kpis.pedidos.y2026 - kpis.pedidos.y2025;
  const diffAbs2024 = kpis.pedidos.y2026 - kpis.pedidos.y2024;

  // Goals derived
  const metaPedidosPct = pct(goals.pedidos.current, goals.pedidos.target);
  const metaPedidosRemaining = remaining(goals.pedidos.current, goals.pedidos.target);
  const metaPedidosPace = campaign.daysLeft > 0 ? Math.ceil(metaPedidosRemaining / campaign.daysLeft) : 0;

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
              {campaign.name} · {format(today, "dd/MM/yyyy")}
            </p>
          </div>
          <div className="hidden md:flex gap-1">
            {[2024, 2025, 2026].map(y => (
              <Badge key={y} variant="outline" className="text-xs" style={{ borderColor: YEAR_COLORS[y], color: YEAR_COLORS[y] }}>
                {y}
              </Badge>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Card Unificado de Pedidos */}
          <Card className="flex flex-col border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <CardContent className="p-4 md:p-5 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Pedidos 2026 (Período)
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-primary leading-tight">{kpis.pedidos.y2026}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t pt-3 border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">vs 2025 <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground/70">{kpis.pedidos.y2025}</Badge></span>
                  <div className={`flex items-center gap-1 font-medium ${diff2025 > 0 ? "text-pkg-coruja" : diff2025 < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {diff2025 > 0 ? <ArrowUp className="w-3 h-3" /> : diff2025 < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    <span>{diff2025 > 0 ? "+" : ""}{diff2025}% <span className="text-xs opacity-70 font-normal">({diffAbs2025 > 0 ? "+" : ""}{diffAbs2025})</span></span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">vs 2024 <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground/70">{kpis.pedidos.y2024}</Badge></span>
                  <div className={`flex items-center gap-1 font-medium ${diff2024 > 0 ? "text-pkg-coruja" : diff2024 < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {diff2024 > 0 ? <ArrowUp className="w-3 h-3" /> : diff2024 < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    <span>{diff2024 > 0 ? "+" : ""}{diff2024}% <span className="text-xs opacity-70 font-normal">({diffAbs2024 > 0 ? "+" : ""}{diffAbs2024})</span></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <KPICard
            label="Receita est. 2026"
            value={formatBRL(kpis.receita2026)}
            tooltip="Soma do valor total de todos os pedidos 2026 no período"
          />
          <KPICard
            label="Ticket Médio"
            value={formatBRL(kpis.ticketMedio)}
            tooltip="Receita total ÷ número de pedidos"
          />
          <KPICard
            label="Lead Time (md)"
            value={`${kpis.leadTimeMediana}d`}
            tooltip="Mediana de dias entre pedido e sessão fotográfica"
          />
        </div>

        {/* ═══ PACKAGE CARDS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map(pkg => {
            const icon = ICON_MAP[pkg.icon];
            return (
              <Card key={pkg.name} className="relative overflow-hidden border-t-4 hover:shadow-md transition-shadow" style={{ borderTopColor: pkg.color }}>
                <div className="absolute top-3 right-3 opacity-10" style={{ color: pkg.color }}>
                  {icon}
                </div>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: pkg.color }} />
                    <span className="text-sm font-bold">{pkg.name}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: pkg.color }}>{formatBRL(pkg.price)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Entrada {formatBRL(pkg.entry)} + {pkg.installments}
                  </p>

                  <div className="mt-4 pt-3 border-t space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Vendidos 2026</span>
                      <span className="font-bold text-lg">{pkg.sold.y2026}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: YEAR_COLORS[2025] }} />
                        2025
                      </span>
                      <span>{pkg.sold.y2025} vendidos</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: YEAR_COLORS[2024] }} />
                        2024
                      </span>
                      <span>{pkg.sold.y2024} vendidos</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-1 border-t border-dashed">
                      <span className="text-muted-foreground">Receita 2026</span>
                      <span className="font-semibold">{formatBRL(pkg.revenue2026)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ═══ METAS DA CAMPANHA ═══ */}
        <Card className="border-primary/20 overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/8 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Metas da Campanha — {campaign.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Até {format(targetDate, "dd/MM/yyyy")} · Faltam <strong className="text-foreground">{campaign.daysLeft} dias</strong></p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs" style={{ borderColor: YEAR_COLORS[2025], color: YEAR_COLORS[2025] }}>2025: {goals.campaignComparison.y2025} ped.</Badge>
                <Badge variant="outline" className="text-xs" style={{ borderColor: YEAR_COLORS[2024], color: YEAR_COLORS[2024] }}>2024: {goals.campaignComparison.y2024} ped.</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">

            {/* Meta Global de Pedidos */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold">🎯 Meta Global de Pedidos</span>
                <span className="text-xs text-muted-foreground">Ritmo: <strong className="text-foreground">{metaPedidosPace}/dia</strong></span>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-2xl font-bold">{goals.pedidos.current} <span className="text-sm text-muted-foreground font-normal">/ {goals.pedidos.target}</span></span>
                    <span className="text-sm font-bold text-primary">{metaPedidosPct}%</span>
                  </div>
                  <Progress value={metaPedidosPct} className="h-2.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">Faltam {metaPedidosRemaining} pedidos</p>
                </div>
              </div>
            </div>

            {/* Metas por Pacote */}
            <div>
              <p className="text-sm font-semibold mb-3">📦 Meta por Pacote</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {goals.byPackage.map(pg => {
                  const p = pct(pg.current, pg.target);
                  return (
                    <div key={pg.name} className="rounded-lg border p-3 bg-card hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: pg.color }} />
                          <span className="text-xs font-semibold truncate">{pg.name}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: pg.color }}>{p}%</span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-1.5">
                        <span className="text-xl font-bold">{pg.current}</span>
                        <span className="text-xs text-muted-foreground">/ {pg.target}</span>
                      </div>
                      <Progress value={p} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground mt-1">Faltam {remaining(pg.current, pg.target)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid de Metas Secundárias */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Fotos Extras */}
              <div className="rounded-lg border p-3 bg-card">
                <p className="text-xs font-semibold mb-2">📸 Fotos Extras</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold">{goals.fotosExtras.current}</span>
                  <span className="text-xs text-muted-foreground">/ {goals.fotosExtras.target}</span>
                  <span className="ml-auto text-xs font-bold text-primary">{pct(goals.fotosExtras.current, goals.fotosExtras.target)}%</span>
                </div>
                <Progress value={pct(goals.fotosExtras.current, goals.fotosExtras.target)} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Faltam {remaining(goals.fotosExtras.current, goals.fotosExtras.target)}</p>
              </div>

              {/* Faturamento */}
              <div className="rounded-lg border p-3 bg-card">
                <p className="text-xs font-semibold mb-2">💰 Meta de Faturamento</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold">{formatBRL(goals.faturamento.current)}</span>
                  <span className="ml-auto text-xs font-bold text-primary">{pct(goals.faturamento.current, goals.faturamento.target)}%</span>
                </div>
                <Progress value={pct(goals.faturamento.current, goals.faturamento.target)} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Meta: {formatBRL(goals.faturamento.target)} · Faltam {formatBRL(remaining(goals.faturamento.current, goals.faturamento.target))}</p>
              </div>

              {/* Ensaios */}
              <div className="rounded-lg border p-3 bg-card">
                <p className="text-xs font-semibold mb-2">🎬 Meta de Ensaios</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold">{goals.ensaios.current}</span>
                  <span className="text-xs text-muted-foreground">/ {goals.ensaios.target}</span>
                  <span className="ml-auto text-xs font-bold text-primary">{pct(goals.ensaios.current, goals.ensaios.target)}%</span>
                </div>
                <Progress value={pct(goals.ensaios.current, goals.ensaios.target)} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Faltam {remaining(goals.ensaios.current, goals.ensaios.target)} ensaios</p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ═══ INSIGHTS HISTÓRICOS ═══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Insights Históricos
            </CardTitle>
            <p className="text-xs text-muted-foreground">Dias de pico e previsão baseados em campanhas anteriores</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 2025 peaks */}
              <div className="rounded-lg border p-4 bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: YEAR_COLORS[2025] }} />
                  <span className="text-sm font-semibold">Dias com Pico Histórico (2025)</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Dias com mais pedidos em 2025 — oportunidade de concentrar ações</p>
                <div className="flex flex-wrap gap-2">
                  {insights.peakDays2025.map(d => (
                    <Badge key={d.date} variant="secondary" className="text-xs px-2 py-1 font-mono">
                      {d.date} <span className="ml-1 font-bold">({d.count})</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 2024 peaks */}
              <div className="rounded-lg border p-4 bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: YEAR_COLORS[2024] }} />
                  <span className="text-sm font-semibold">Dias com Pico Histórico (2024)</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Dias com mais pedidos em 2024 — oportunidade de concentrar ações</p>
                <div className="flex flex-wrap gap-2">
                  {insights.peakDays2024.map(d => (
                    <Badge key={d.date} variant="secondary" className="text-xs px-2 py-1 font-mono">
                      {d.date} <span className="ml-1 font-bold">({d.count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Next 7 days forecast */}
            <div className="rounded-lg border p-4 bg-gradient-to-r from-blue-500/5 to-transparent">
              <p className="text-sm font-semibold mb-1">📅 Próximos 7 dias ({format(today, "dd/MM")} – {format(addDays(today, 6), "dd/MM")})</p>
              <p className="text-[10px] text-muted-foreground mb-3">Quantos pedidos foram feitos neste mesmo período em anos anteriores</p>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: YEAR_COLORS[2025] }} />
                  <span className="text-sm"><strong className="text-lg">{insights.next7Days.y2025}</strong> <span className="text-muted-foreground">pedidos em 2025</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: YEAR_COLORS[2024] }} />
                  <span className="text-sm"><strong className="text-lg">{insights.next7Days.y2024}</strong> <span className="text-muted-foreground">pedidos em 2024</span></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders by Day */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-display">
                  {chartView === "dia" ? "Pedidos por dia (dia a dia)" : "Pedidos Acumulados (campanha)"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Comparando mesmo período em 2024, 2025 e 2026</p>
              </div>
              <Select value={chartView} onValueChange={(v) => setChartView(v as "dia" | "acumulado")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia a dia</SelectItem>
                  <SelectItem value="acumulado">Acumulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {chartView === "acumulado" ? (
                <LineChart data={chartDisplayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="2024" stroke={YEAR_COLORS[2024]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="2025" stroke={YEAR_COLORS[2025]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="2026" stroke={YEAR_COLORS[2026]} strokeWidth={2.5} dot={false} />
                </LineChart>
              ) : (
                <LineChart data={chartDisplayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="2024" stroke={YEAR_COLORS[2024]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="2025" stroke={YEAR_COLORS[2025]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="2026" stroke={YEAR_COLORS[2026]} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              )}
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
                <BarChart data={charts.packageComparison} barGap={4}>
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
                <span className="text-muted-foreground">2025: <strong className="text-foreground">{charts.leadTime.stats.y2025.avg}d (avg) / {charts.leadTime.stats.y2025.median}d (med)</strong></span>
                <span className="text-muted-foreground">2026: <strong className="text-foreground">{charts.leadTime.stats.y2026.avg}d (avg) / {charts.leadTime.stats.y2026.median}d (med)</strong></span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.leadTime.buckets} barGap={2}>
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

          {/* Meio de Pagamento da Entrada */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Meio de Pagamento da Entrada</CardTitle>
              <p className="text-xs text-muted-foreground">2025 vs 2026 (total)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.paymentDistribution} barGap={4}>
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
        </div>

        {/* Today Ruler */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Régua do Dia — Hoje & Proximidades</CardTitle>
            <p className="text-xs text-muted-foreground">Comparativo de pedidos diários e acumulados da campanha (YTD)</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              <TooltipProvider delayDuration={100}>
                {ruler.map((r) => (
                  <div
                    key={r.offset}
                    className={`rounded-lg p-2 text-center border ${r.offset === 0 ? "bg-primary/10 border-primary" : "bg-card border-border/50"}`}
                  >
                    <p className="text-xs font-bold text-foreground">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground mb-3">{r.date}</p>
                    <div className="space-y-2">
                      {([
                        { year: 2024, data: r.y2024 as RulerYearData | null },
                        { year: 2025, data: r.y2025 as RulerYearData | null },
                        { year: 2026, data: r.y2026 as RulerYearData | null },
                      ]).map(({ year, data }) => (
                        <UITooltip key={year}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between gap-1 text-xs cursor-help rounded px-1 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-1.5 opacity-80">
                                <span className="w-2 h-2 rounded-full" style={{ background: YEAR_COLORS[year as keyof typeof YEAR_COLORS] }} />
                                <span className="text-[10px] font-medium">{year}</span>
                              </div>
                              <span className="font-bold text-foreground">
                                {data === null ? <em className="text-muted-foreground font-normal opacity-50 text-[10px]">prev</em> : data.daily}
                              </span>
                            </div>
                          </TooltipTrigger>
                          {data !== null && (
                            <TooltipContent className="p-3 w-56 text-xs" side="bottom">
                              <div className="space-y-2">
                                <p className="font-bold border-b pb-1 mb-2">{format(addDays(today, r.offset), "dd/MM")} de {year}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                                  <span className="text-muted-foreground">Pedidos do dia:</span>
                                  <span className="font-medium text-right">{data.daily}</span>
                                  <span className="text-muted-foreground">Acumulado (YTD):</span>
                                  <span className="font-medium text-right">{data.accumTotal}</span>
                                  <span className="text-muted-foreground">Receita YTD:</span>
                                  <span className="font-medium text-right text-pkg-coruja">{formatBRL(data.accumRevenue)}</span>
                                </div>
                                {Object.keys(data.packages).length > 0 && (
                                  <>
                                    <p className="font-semibold text-muted-foreground pt-1 border-t mt-2">Pacotes vendidos hoje:</p>
                                    <ul className="space-y-1 mt-1">
                                      {Object.entries(data.packages).map(([pkg, count]) => (
                                        <li key={pkg} className="flex justify-between">
                                          <span className="truncate pr-2">- {pkg}</span>
                                          <span className="font-medium font-mono">{String(count)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                )}
                              </div>
                            </TooltipContent>
                          )}
                        </UITooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
