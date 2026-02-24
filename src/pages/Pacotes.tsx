import { useMemo } from "react";
import { Layout } from "@/components/Layout";
import { orders } from "@/mocks/data";
import { PACKAGES_2026 } from "@/mocks/types";
import { filterByYear, packageDistribution, formatBRL } from "@/lib/analytics";
import { PackageBadge } from "@/components/PackageBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const YEAR_COLORS: Record<number, string> = {
  2024: "hsl(210,55%,58%)", 2025: "hsl(350,50%,65%)", 2026: "hsl(36,75%,50%)",
};

export default function Pacotes() {
  const dist = useMemo(() => {
    const d24 = packageDistribution(filterByYear(orders, 2024));
    const d25 = packageDistribution(filterByYear(orders, 2025));
    const d26 = packageDistribution(filterByYear(orders, 2026));
    const pkgs = new Set([...d24.map(p => p.name), ...d25.map(p => p.name), ...d26.map(p => p.name)]);
    return Array.from(pkgs).map(name => ({
      name: name.length > 16 ? name.slice(0, 16) + "…" : name,
      fullName: name,
      "2024": d24.find(p => p.name === name)?.count || 0,
      "2025": d25.find(p => p.name === name)?.count || 0,
      "2026": d26.find(p => p.name === name)?.count || 0,
    }));
  }, []);

  const revDist = useMemo(() => {
    const d24 = packageDistribution(filterByYear(orders, 2024));
    const d25 = packageDistribution(filterByYear(orders, 2025));
    const d26 = packageDistribution(filterByYear(orders, 2026));
    const pkgs = new Set([...d24.map(p => p.name), ...d25.map(p => p.name), ...d26.map(p => p.name)]);
    return Array.from(pkgs).map(name => ({
      name: name.length > 16 ? name.slice(0, 16) + "…" : name,
      "2024": d24.find(p => p.name === name)?.revenue || 0,
      "2025": d25.find(p => p.name === name)?.revenue || 0,
      "2026": d26.find(p => p.name === name)?.revenue || 0,
    }));
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Pacotes</h1>

        {/* Package Cards 2026 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PACKAGES_2026.map((pkg) => {
            const total26 = filterByYear(orders, 2026).filter(o => o.packageName === pkg.name).length;
            const rev26 = filterByYear(orders, 2026).filter(o => o.packageName === pkg.name).reduce((s, o) => s + o.totalAmount, 0);
            return (
              <Card key={pkg.name} className="animate-fade-in">
                <CardContent className="p-5">
                  <PackageBadge name={pkg.name} className="mb-3" />
                  <p className="text-2xl font-bold mt-2">{formatBRL(pkg.total)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrada {formatBRL(pkg.entry)} + {pkg.installments}
                  </p>
                  <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                    <span className="text-muted-foreground">Vendidos 2026</span>
                    <span className="font-semibold">{total26}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Receita 2026</span>
                    <span className="font-semibold">{formatBRL(rev26)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Volume Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Volume por Pacote (2024 / 2025 / 2026)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dist} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="2024" fill={YEAR_COLORS[2024]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="2025" fill={YEAR_COLORS[2025]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="2026" fill={YEAR_COLORS[2026]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Receita por Pacote</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revDist} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,89%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend />
                <Bar dataKey="2024" fill={YEAR_COLORS[2024]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="2025" fill={YEAR_COLORS[2025]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="2026" fill={YEAR_COLORS[2026]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
