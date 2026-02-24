import { useMemo } from "react";
import { Layout } from "@/components/Layout";
import { orders, customers } from "@/mocks/data";
import { TODAY } from "@/mocks/types";
import { filterByYear, customersNotIn2026, customerLastOrder, formatBRL, customerTotalSpent } from "@/lib/analytics";
import { PackageBadge } from "@/components/PackageBadge";
import { YearBadge } from "@/components/YearBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { format, parseISO, differenceInDays, subDays } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function Insights() {
  // Leads: bought in 2024/2025 but not 2026
  const leads = useMemo(() => customersNotIn2026(orders, customers), []);

  // Peak days: days in 2025 with 3+ orders
  const peakDays = useMemo(() => {
    const o2025 = filterByYear(orders, 2025);
    const dayMap = new Map<string, number>();
    o2025.forEach((o) => {
      const k = format(parseISO(o.createdAt), "dd/MM");
      dayMap.set(k, (dayMap.get(k) || 0) + 1);
    });
    return Array.from(dayMap)
      .filter(([, v]) => v >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([date, count]) => ({ date, count }));
  }, []);

  // Simple projection
  const projection = useMemo(() => {
    const o2026 = filterByYear(orders, 2026);
    const o2025 = filterByYear(orders, 2025);
    const daysIn2026 = differenceInDays(TODAY, new Date(2026, 1, 1)) + 1;
    const avgDaily2026 = o2026.length / Math.max(daysIn2026, 1);
    const campaignDays = 120; // Feb–May ≈ 120 days
    const projected2026 = Math.round(avgDaily2026 * campaignDays);
    return { avgDaily2026: avgDaily2026.toFixed(1), projected2026, total2025: o2025.length };
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Insights</h1>

        {/* Projection */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">📊 Projeção Simples (linear)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Baseada na média diária de 2026 até agora: <strong>{projection.avgDaily2026} pedidos/dia</strong>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Projeção 2026 (Fev–Mai)</p>
                <p className="text-2xl font-bold">{projection.projected2026}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total real 2025</p>
                <p className="text-2xl font-bold">{projection.total2025}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Diferença projetada</p>
                <p className="text-2xl font-bold">
                  {projection.projected2026 > projection.total2025 ? "+" : ""}
                  {Math.round(((projection.projected2026 - projection.total2025) / projection.total2025) * 100)}%
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              ⚠️ Estimativa simplificada. Resultados reais podem variar com sazonalidade.
            </p>
          </CardContent>
        </Card>

        {/* Peak days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">📅 Dias com Pico Histórico (2025)</CardTitle>
            <p className="text-xs text-muted-foreground">Dias com mais pedidos em 2025 — oportunidade de concentrar ações</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {peakDays.map((d) => (
                <Badge key={d.date} variant="secondary" className="text-sm px-3 py-1">
                  {d.date} <span className="ml-1 font-bold">({d.count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">🎯 Oportunidades de Remarketing</CardTitle>
            <p className="text-xs text-muted-foreground">
              Clientes que compraram em 2024/2025 e ainda não compraram em 2026 ({leads.length} leads)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Último ano</TableHead>
                    <TableHead>Último pacote</TableHead>
                    <TableHead>Último pedido</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.slice(0, 20).map((c) => {
                    const last = customerLastOrder(c.id, orders);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.whatsapp}</TableCell>
                        <TableCell>{last ? <YearBadge year={last.year} /> : "—"}</TableCell>
                        <TableCell>{last ? <PackageBadge name={last.packageName} /> : "—"}</TableCell>
                        <TableCell className="text-sm">
                          {last ? format(parseISO(last.createdAt), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Copiar WhatsApp"
                            onClick={() => {
                              navigator.clipboard.writeText(c.whatsapp);
                              toast({ title: "WhatsApp copiado!" });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
