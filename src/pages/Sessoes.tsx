import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { orders, customers } from "@/mocks/data";
import { TODAY } from "@/mocks/types";
import { formatBRL } from "@/lib/analytics";
import { PackageBadge } from "@/components/PackageBadge";
import { YearBadge } from "@/components/YearBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, Camera } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

export default function Sessoes() {
  const [filterYear, setFilterYear] = useState("2026");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    let list = orders.filter((o) => o.year === Number(filterYear));
    if (filterStatus === "sem_sessao") list = list.filter((o) => !o.sessionAt);
    else if (filterStatus === "com_sessao") list = list.filter((o) => !!o.sessionAt);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filterYear, filterStatus]);

  const withSession = filtered.filter((o) => o.sessionAt).length;
  const withoutSession = filtered.filter((o) => !o.sessionAt).length;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Sessões</h1>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Total pedidos</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Com sessão</p>
              <p className="text-2xl font-bold text-pkg-coruja">{withSession}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Sem sessão</p>
              <p className="text-2xl font-bold text-destructive">{withoutSession}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Taxa agend.</p>
              <p className="text-2xl font-bold">
                {filtered.length ? Math.round((withSession / filtered.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="com_sessao">Com sessão</SelectItem>
              <SelectItem value="sem_sessao">Sem sessão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pacote</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Sessão</TableHead>
                    <TableHead>Lead time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 30).map((o) => {
                    const customer = customers.find((c) => c.id === o.customerId);
                    const lt = o.sessionAt
                      ? differenceInDays(parseISO(o.sessionAt), parseISO(o.createdAt))
                      : null;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="text-sm font-medium">{customer?.name || "—"}</TableCell>
                        <TableCell><PackageBadge name={o.packageName} /></TableCell>
                        <TableCell className="text-sm">{format(parseISO(o.createdAt), "dd/MM/yy")}</TableCell>
                        <TableCell className="text-sm">
                          {o.sessionAt ? format(parseISO(o.sessionAt), "dd/MM/yy") : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {lt !== null ? `${lt}d` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">{o.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Marcar como fotografado">
                              <Camera className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Registrar sessão">
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
