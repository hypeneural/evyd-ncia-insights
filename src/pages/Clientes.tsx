import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { orders, customers } from "@/mocks/data";
import { formatBRL, customerLastOrder, customerTotalSpent, customersNotIn2026 } from "@/lib/analytics";
import { PackageBadge } from "@/components/PackageBadge";
import { YearBadge } from "@/components/YearBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Copy, Phone, Tag, Search, UserCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Customer } from "@/mocks/types";
import { toast } from "@/hooks/use-toast";

const SEGMENTS = [
  { label: "Todos", filter: () => true },
  { label: "Comprou 2025, não 2026", filter: (c: Customer) => {
    const years = new Set(orders.filter(o => o.customerId === c.id).map(o => o.year));
    return years.has(2025) && !years.has(2026);
  }},
  { label: "Comprou 2024/25, não 2026", filter: (c: Customer) => {
    const years = new Set(orders.filter(o => o.customerId === c.id).map(o => o.year));
    return (years.has(2024) || years.has(2025)) && !years.has(2026);
  }},
  { label: "Top ticket", filter: (c: Customer) => customerTotalSpent(c.id, orders) >= 700 },
  { label: "Sem sessão marcada", filter: (c: Customer) => {
    return orders.some(o => o.customerId === c.id && o.year === 2026 && !o.sessionAt);
  }},
];

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [segmentIdx, setSegmentIdx] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [contacted, setContacted] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const segment = SEGMENTS[segmentIdx];
    return customers.filter((c) => {
      // must have at least one order
      if (!orders.some((o) => o.customerId === c.id)) return false;
      if (!segment.filter(c)) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.whatsapp.includes(q);
      }
      return true;
    });
  }, [search, segmentIdx]);

  const handleCopyWhatsApp = (whatsapp: string) => {
    navigator.clipboard.writeText(whatsapp);
    toast({ title: "WhatsApp copiado!", description: whatsapp });
  };

  const handleContact = (id: string) => {
    setContacted((prev) => new Set(prev).add(id));
    toast({ title: "Marcado como contatado" });
  };

  // Customer detail
  const custOrders = selectedCustomer
    ? orders.filter((o) => o.customerId === selectedCustomer.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Clientes (CRM)</h1>

        {/* Segments */}
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s, i) => (
            <Button
              key={i}
              variant={segmentIdx === i ? "default" : "outline"}
              size="sm"
              onClick={() => setSegmentIdx(i)}
              className="text-xs"
            >
              {s.label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} clientes encontrados</p>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Último ano</TableHead>
                    <TableHead>Último pacote</TableHead>
                    <TableHead>Total gasto</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 40).map((c) => {
                    const last = customerLastOrder(c.id, orders);
                    const total = customerTotalSpent(c.id, orders);
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.whatsapp}</TableCell>
                        <TableCell>{last ? <YearBadge year={last.year} /> : "—"}</TableCell>
                        <TableCell>{last ? <PackageBadge name={last.packageName} /> : "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{formatBRL(total)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {c.tags.map((t) => (
                              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                            {contacted.has(c.id) && (
                              <Badge variant="secondary" className="text-xs">contatado</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar WhatsApp" onClick={() => handleCopyWhatsApp(c.whatsapp)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Marcar contatado" onClick={() => handleContact(c.id)}>
                              <UserCheck className="h-3.5 w-3.5" />
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

      {/* Customer Drawer */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display">{selectedCustomer.name}</SheetTitle>
                <SheetDescription>{selectedCustomer.whatsapp}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {selectedCustomer.email && (
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                )}
                <div className="flex gap-1 flex-wrap">
                  {selectedCustomer.tags.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCopyWhatsApp(selectedCustomer.whatsapp)}>
                    <Phone className="h-3.5 w-3.5 mr-1" /> Copiar WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleContact(selectedCustomer.id)}>
                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Contatado
                  </Button>
                </div>

                <h3 className="font-semibold text-sm mt-4">Histórico de Pedidos</h3>
                <div className="space-y-2">
                  {custOrders.map((o) => (
                    <Card key={o.id}>
                      <CardContent className="p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <YearBadge year={o.year} />
                          <span className="text-muted-foreground">{format(parseISO(o.createdAt), "dd/MM/yyyy")}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <PackageBadge name={o.packageName} />
                          <span className="font-semibold">{formatBRL(o.totalAmount)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">Status: {o.status}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Total gasto: <strong className="text-foreground">{formatBRL(customerTotalSpent(selectedCustomer.id, orders))}</strong>
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
