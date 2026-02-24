import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Phone, Search, UserCheck, TrendingUp, TrendingDown, Calendar, CreditCard, Camera, ShoppingBag, Star, Gift, Info, Heart, CalendarOff, UserX, Users, ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { ClientData } from "@/types/clientTypes";
import clientsRaw from "@/mocks/clients.json";

const clients: ClientData[] = clientsRaw as ClientData[];

// ── Formatting ──
function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const s = d.slice(0, 10);
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
}

// ── Filter definitions ──
type FilterId = "todos" | "dia-das-maes" | "sem-2026" | "ativo-2026" | "sem-sessao" | "inativo" | "upgrade" | "downgrade";
type DmSub = "all" | "recorrente" | "novo";

interface FilterDef {
  id: FilterId;
  label: string;
  description: string;
  icon: React.ReactNode;
  hasSubFilters?: boolean;
}

const FILTERS: FilterDef[] = [
  { id: "todos", label: "Todos", icon: <Users className="w-3.5 h-3.5" />, description: "Exibe todos os clientes cadastrados, sem nenhum filtro aplicado." },
  { id: "dia-das-maes", label: "Dia das Mães", icon: <Heart className="w-3.5 h-3.5" />, description: "Clientes do Dia das Mães. Use os sub-filtros para refinar por ano, recorrência ou novos.", hasSubFilters: true },
  { id: "sem-2026", label: "Sem 2026", icon: <CalendarOff className="w-3.5 h-3.5" />, description: "Clientes que compraram antes mas NÃO têm pedido em 2026. Oportunidade de reativação." },
  { id: "ativo-2026", label: "Ativo 2026", icon: <Calendar className="w-3.5 h-3.5" />, description: "Clientes que já possuem pelo menos 1 pedido em 2026." },
  { id: "sem-sessao", label: "Sem sessão", icon: <Camera className="w-3.5 h-3.5" />, description: "Têm pedido em 2026 mas sem sessão fotográfica agendada." },
  { id: "inativo", label: "Cliente Inativo", icon: <Clock className="w-3.5 h-3.5" />, description: "Clientes sem sessão recente. Selecione o período de inatividade.", hasSubFilters: true },
  { id: "upgrade", label: "Upgrade", icon: <ArrowUpCircle className="w-3.5 h-3.5" />, description: "Último pacote comprado foi MAIS CARO que o anterior." },
  { id: "downgrade", label: "Downgrade", icon: <ArrowDownCircle className="w-3.5 h-3.5" />, description: "Último pacote comprado foi MAIS BARATO que o anterior." },
];

// DM available years (detected from data)
const DM_YEARS = [2025, 2024, 2023, 2022];

// Inativo period presets
const INATIVO_PRESETS = [
  { label: "6 meses", days: 180 },
  { label: "1 ano", days: 365 },
  { label: "2 anos", days: 730 },
  { label: "3 anos", days: 1095 },
];

// ── Recorrente streak logic ──
function dmConsecutiveStreak(years: number[]): number {
  if (years.length < 2) return 0;
  const sorted = [...years].sort((a, b) => b - a); // desc
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] - 1) streak++;
    else break;
  }
  return streak;
}

function isRecorrente(years: number[]): boolean {
  // Must have at least 2024+2025 consecutive
  return years.includes(2025) && years.includes(2024);
}

// ── Tag colors ──
function tagColor(tag: string): string {
  if (tag === "vip") return "bg-yellow-500/20 text-yellow-700 border-yellow-500/40";
  if (tag === "premium") return "bg-purple-500/20 text-purple-700 border-purple-500/40";
  if (tag === "recorrente") return "bg-green-500/20 text-green-700 border-green-500/40";
  if (tag === "novo") return "bg-blue-500/20 text-blue-700 border-blue-500/40";
  if (tag === "upgrade") return "bg-emerald-500/20 text-emerald-700 border-emerald-500/40";
  if (tag === "downgrade") return "bg-red-500/20 text-red-700 border-red-500/40";
  if (tag === "inativo") return "bg-gray-500/20 text-gray-600 border-gray-500/40";
  if (tag === "sem-2026") return "bg-orange-500/20 text-orange-700 border-orange-500/40";
  if (tag === "ativo-2026") return "bg-teal-500/20 text-teal-700 border-teal-500/40";
  if (tag.startsWith("dia-das-maes")) return "bg-pink-500/15 text-pink-700 border-pink-500/30";
  return "bg-muted text-muted-foreground border-border";
}

// ── Tag descriptions (shown on hover) ──
const TAG_DESCRIPTIONS: Record<string, string> = {
  "vip": "Gasto total ≥ R$ 2.000 (todas as campanhas)",
  "premium": "Gasto total entre R$ 1.000 e R$ 1.999",
  "recorrente": "Fez DM em pelo menos 2024+2025 consecutivos",
  "novo": "Participou de apenas 1 Dia das Mães",
  "upgrade": "Último pacote mais caro que o anterior",
  "downgrade": "Último pacote mais barato que o anterior",
  "inativo": "Sem sessão recente",
  "sem-2026": "Comprou antes mas não tem pedido em 2026",
  "ativo-2026": "Já tem pedido em 2026",
  "sem-sessao": "Tem pedido 2026 mas sem sessão agendada",
};

function tagDescription(tag: string): string | null {
  if (TAG_DESCRIPTIONS[tag]) return TAG_DESCRIPTIONS[tag];
  if (tag.startsWith("dia-das-maes-")) return `Participou do Dia das Mães ${tag.split("-").pop()}`;
  const match = tag.match(/^(.+)-(\d{4})$/);
  if (match) return `Participou de ${match[1]} em ${match[2]}`;
  return null;
}

// ── Prioritize visible tags ──
const PRIORITY_TAGS = ["vip", "premium", "recorrente", "novo", "upgrade", "downgrade", "inativo", "sem-2026", "ativo-2026", "sem-sessao"];
function sortedTags(tags: string[]): string[] {
  const priority = tags.filter(t => PRIORITY_TAGS.includes(t));
  const campaigns = tags.filter(t => !PRIORITY_TAGS.includes(t));
  return [...priority, ...campaigns];
}

// ── Pagination ──
const PAGE_SIZE = 50;

// ── Sort Options ──
type SortKey = "orders" | "spent" | "name" | "last_session";
const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Mais pedidos", value: "orders" },
  { label: "Maior gasto", value: "spent" },
  { label: "Nome A-Z", value: "name" },
  { label: "Última sessão", value: "last_session" },
];

function sortClients(list: ClientData[], key: SortKey): ClientData[] {
  const sorted = [...list];
  switch (key) {
    case "orders":
      return sorted.sort((a, b) => b.kpis.total_orders - a.kpis.total_orders || b.kpis.total_spent - a.kpis.total_spent);
    case "spent":
      return sorted.sort((a, b) => b.kpis.total_spent - a.kpis.total_spent);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "last_session":
      return sorted.sort((a, b) => {
        const da = a.kpis.last_session_date || "0000";
        const db = b.kpis.last_session_date || "0000";
        return db.localeCompare(da);
      });
    default:
      return sorted;
  }
}

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("todos");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("orders");
  const [page, setPage] = useState(0);

  // DM sub-filters
  const [dmYears, setDmYears] = useState<Set<number>>(new Set());
  const [dmSub, setDmSub] = useState<DmSub>("all");

  // Inativo period
  const [inativoDays, setInativoDays] = useState(365);

  const toggleDmYear = (year: number) => {
    setDmYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
    setDmSub("all");
    setPage(0);
  };

  const handleFilterChange = (id: FilterId) => {
    setActiveFilter(id);
    setPage(0);
    if (id !== "dia-das-maes") { setDmYears(new Set()); setDmSub("all"); }
    if (id !== "inativo") setInativoDays(365);
  };

  const currentFilterDef = FILTERS.find(f => f.id === activeFilter)!;

  const filtered = useMemo(() => {
    let result = clients.filter((c) => {
      // Main filter
      switch (activeFilter) {
        case "todos": break;
        case "vip": if (!c.tags.includes("vip")) return false; break;
        case "premium": if (!c.tags.includes("premium")) return false; break;
        case "sem-2026": if (!c.tags.includes("sem-2026")) return false; break;
        case "ativo-2026": if (!c.tags.includes("ativo-2026")) return false; break;
        case "sem-sessao": if (!c.tags.includes("sem-sessao")) return false; break;
        case "upgrade": if (!c.tags.includes("upgrade")) return false; break;
        case "downgrade": if (!c.tags.includes("downgrade")) return false; break;
        case "inativo":
          if (!c.kpis.days_since_last_session || c.kpis.days_since_last_session < inativoDays) return false;
          break;
        case "dia-das-maes":
          if (c.kpis.mothers_day_count === 0) return false;
          // DM sub-filters
          if (dmSub === "recorrente" && !isRecorrente(c.kpis.mothers_day_years)) return false;
          if (dmSub === "novo" && c.kpis.mothers_day_count !== 1) return false;
          // Year filters (must have ALL selected years)
          if (dmYears.size > 0) {
            for (const y of dmYears) {
              if (!c.kpis.mothers_day_years.includes(y)) return false;
            }
          }
          break;
      }
      // Search
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.whatsapp && c.whatsapp.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
        );
      }
      return true;
    });

    // Special sorting for Recorrente: by streak length DESC, then total DM count DESC
    if (activeFilter === "dia-das-maes" && dmSub === "recorrente") {
      result.sort((a, b) => {
        const sa = dmConsecutiveStreak(a.kpis.mothers_day_years);
        const sb = dmConsecutiveStreak(b.kpis.mothers_day_years);
        if (sb !== sa) return sb - sa;
        return b.kpis.mothers_day_count - a.kpis.mothers_day_count;
      });
      return result;
    }

    return sortClients(result, sortKey);
  }, [search, activeFilter, sortKey, dmYears, dmSub, inativoDays]);

  // Reset page when filters change
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, totalPages - 1);
  const pageClients = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleCopyWhatsApp = (whatsapp: string) => {
    navigator.clipboard.writeText(whatsapp);
    toast({ title: "WhatsApp copiado!", description: whatsapp });
  };

  const handleContact = (uuid: string) => {
    setContacted((prev) => new Set(prev).add(uuid));
    toast({ title: "Marcado como contatado" });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-display font-bold">Clientes (CRM)</h1>
          <span className="text-sm text-muted-foreground">{clients.length} clientes no total</span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Clientes</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Dia das Mães</p>
              <p className="text-2xl font-bold">{clients.filter(c => c.kpis.mothers_day_count > 0).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sem 2026</p>
              <p className="text-2xl font-bold">{clients.filter(c => c.tags.includes("sem-2026")).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Recorrentes (2+ DM consecutivos)</p>
              <p className="text-2xl font-bold">{clients.filter(c => isRecorrente(c.kpis.mothers_day_years)).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <UITooltip key={f.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeFilter === f.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange(f.id)}
                    className="text-xs gap-1.5"
                  >
                    {f.icon}
                    {f.label}
                    {f.hasSubFilters && <span className="ml-0.5 opacity-60">▾</span>}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs p-3">
                  <div className="space-y-1">
                    <p className="font-semibold">{f.label}</p>
                    <p className="text-muted-foreground">{f.description}</p>
                  </div>
                </TooltipContent>
              </UITooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* DM Sub-Filters */}
        {activeFilter === "dia-das-maes" && (
          <div className="space-y-3">
            {/* DM Sub-type */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
              {(["all", "recorrente", "novo"] as DmSub[]).map((sub) => {
                const labels: Record<DmSub, string> = { all: "Todos DM", recorrente: "Recorrente", novo: "Novo (1 DM)" };
                const descs: Record<DmSub, string> = {
                  all: "Todos os clientes que fizeram Dia das Mães",
                  recorrente: "Fez em 2024+2025 consecutivos. Prioriza quem tem mais anos seguidos (4y > 3y > 2y)",
                  novo: "Participou de apenas 1 Dia das Mães. Primeira experiência.",
                };
                return (
                  <UITooltip key={sub}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={dmSub === sub ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setDmSub(sub); setPage(0); }}
                        className="text-xs h-7"
                      >
                        {labels[sub]}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs p-2">
                      {descs[sub]}
                    </TooltipContent>
                  </UITooltip>
                );
              })}
            </div>

            {/* Year chips */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Anos:</span>
              {DM_YEARS.map((year) => {
                const isSelected = dmYears.has(year);
                const count = clients.filter(c => c.kpis.mothers_day_years.includes(year)).length;
                return (
                  <Button
                    key={year}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDmYear(year)}
                    className={`text-xs h-7 ${isSelected ? "bg-pink-600 hover:bg-pink-700" : ""}`}
                  >
                    {year} <span className="ml-1 opacity-60">({count})</span>
                  </Button>
                );
              })}
              {dmYears.size > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { setDmYears(new Set()); setPage(0); }} className="text-xs h-7 text-muted-foreground">
                  Limpar
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Inativo Sub-Filters */}
        {activeFilter === "inativo" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Sem sessão há mais de:</span>
            {INATIVO_PRESETS.map((preset) => (
              <Button
                key={preset.days}
                variant={inativoDays === preset.days ? "default" : "outline"}
                size="sm"
                onClick={() => { setInativoDays(preset.days); setPage(0); }}
                className="text-xs h-7"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        {/* Active filter info */}
        {activeFilter !== "todos" && (
          <div className="flex items-start gap-2 text-xs p-3 rounded-lg border bg-muted/30">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">{currentFilterDef.label}:</span>{" "}
              <span className="text-muted-foreground">
                {currentFilterDef.description}
                {activeFilter === "dia-das-maes" && dmYears.size > 0 && (
                  <> · Filtrando por: <strong>{[...dmYears].sort().join(", ")}</strong></>
                )}
                {activeFilter === "dia-das-maes" && dmSub === "recorrente" && (
                  <> · Ordenado por streak consecutiva (4y → 3y → 2y)</>
                )}
                {activeFilter === "inativo" && (
                  <> · Último ensaio há mais de <strong>{INATIVO_PRESETS.find(p => p.days === inativoDays)?.label}</strong></>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead>Total Gasto</TableHead>
                    <TableHead>Cliente Desde</TableHead>
                    <TableHead>Última Sessão</TableHead>
                    <TableHead>DM</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageClients.map((c) => {
                    const visibleTags = sortedTags(c.tags).slice(0, 4);
                    const extraTagCount = c.tags.length - visibleTags.length;
                    return (
                      <TableRow
                        key={c.uuid}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedClient(c)}
                      >
                        <TableCell className="font-medium text-sm max-w-[180px] truncate">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.whatsapp || "—"}</TableCell>
                        <TableCell className="text-center text-sm font-semibold">{c.kpis.total_orders}</TableCell>
                        <TableCell className="text-sm font-medium">{formatBRL(c.kpis.total_spent)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(c.kpis.first_order_date)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(c.kpis.last_session_date)}</TableCell>
                        <TableCell className="text-center">
                          {c.kpis.mothers_day_count > 0 ? (
                            <Badge variant="outline" className="bg-pink-500/15 text-pink-700 border-pink-500/30 text-xs">
                              {c.kpis.mothers_day_count}x
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider delayDuration={150}>
                            <div className="flex gap-1 flex-wrap">
                              {visibleTags.map((t) => {
                                const desc = tagDescription(t);
                                return desc ? (
                                  <UITooltip key={t}>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className={`text-[10px] cursor-help ${tagColor(t)}`}>{t}</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs max-w-[200px] p-2">
                                      {desc}
                                    </TooltipContent>
                                  </UITooltip>
                                ) : (
                                  <Badge key={t} variant="outline" className={`text-[10px] ${tagColor(t)}`}>{t}</Badge>
                                );
                              })}
                              {extraTagCount > 0 && (
                                <Badge variant="outline" className="text-[10px]">+{extraTagCount}</Badge>
                              )}
                              {contacted.has(c.uuid) && (
                                <Badge variant="secondary" className="text-[10px]">contatado</Badge>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {c.whatsapp && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar WhatsApp" onClick={() => handleCopyWhatsApp(c.whatsapp)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Marcar contatado" onClick={() => handleContact(c.uuid)}>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage + 1} de {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </div>

      {/* ── Client Detail Drawer ── */}
      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selectedClient && <ClientDetail client={selectedClient} onCopyWhatsApp={handleCopyWhatsApp} onContact={handleContact} contacted={contacted} />}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}


// ── Client Detail Component ──
function ClientDetail({
  client: c,
  onCopyWhatsApp,
  onContact,
  contacted,
}: {
  client: ClientData;
  onCopyWhatsApp: (w: string) => void;
  onContact: (uuid: string) => void;
  contacted: Set<string>;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-lg">{c.name}</SheetTitle>
        <SheetDescription className="space-y-1">
          {c.whatsapp && <span className="block">{c.whatsapp}</span>}
          {c.email && <span className="block text-xs">{c.email}</span>}
          {c.document && <span className="block text-xs">CPF: {c.document}</span>}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 space-y-5">
        {/* Tags */}
        <TooltipProvider delayDuration={150}>
          <div className="flex gap-1.5 flex-wrap">
            {sortedTags(c.tags).map((t) => {
              const desc = tagDescription(t);
              return desc ? (
                <UITooltip key={t}>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={`text-xs cursor-help ${tagColor(t)}`}>{t}</Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[220px] p-2">
                    {desc}
                  </TooltipContent>
                </UITooltip>
              ) : (
                <Badge key={t} variant="outline" className={`text-xs ${tagColor(t)}`}>{t}</Badge>
              );
            })}
            {contacted.has(c.uuid) && <Badge variant="secondary" className="text-xs">contatado</Badge>}
          </div>
        </TooltipProvider>

        {/* Actions */}
        <div className="flex gap-2">
          {c.whatsapp && (
            <Button size="sm" variant="outline" onClick={() => onCopyWhatsApp(c.whatsapp)}>
              <Phone className="h-3.5 w-3.5 mr-1" /> Copiar WhatsApp
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onContact(c.uuid)}>
            <UserCheck className="h-3.5 w-3.5 mr-1" /> Contatado
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <KpiMini icon={<ShoppingBag className="h-3.5 w-3.5" />} label="Total Pedidos" value={String(c.kpis.total_orders)} />
          <KpiMini icon={<CreditCard className="h-3.5 w-3.5" />} label="Total Gasto" value={formatBRL(c.kpis.total_spent)} />
          <KpiMini icon={<Star className="h-3.5 w-3.5" />} label="Ticket Médio" value={formatBRL(c.kpis.avg_ticket)} />
          <KpiMini icon={<Camera className="h-3.5 w-3.5" />} label="Fotos Extras" value={`${c.kpis.total_extra_photos} fotos`} />
          <KpiMini icon={<Calendar className="h-3.5 w-3.5" />} label="Cliente desde" value={formatDate(c.kpis.first_order_date)} />
          <KpiMini icon={<Calendar className="h-3.5 w-3.5" />} label="Última Sessão" value={formatDate(c.kpis.last_session_date)} />
          <KpiMini icon={<Gift className="h-3.5 w-3.5" />} label="Dia das Mães" value={c.kpis.mothers_day_count > 0 ? `${c.kpis.mothers_day_count}x (${c.kpis.mothers_day_years.join(", ")})` : "Nenhuma"} />
          <KpiMini icon={<CreditCard className="h-3.5 w-3.5" />} label="Pagamento Preferido" value={c.kpis.preferred_payment || "—"} />
        </div>

        {c.kpis.days_since_last_session !== null && (
          <p className="text-xs text-muted-foreground">
            {c.kpis.days_since_last_session} dias desde a última sessão
          </p>
        )}

        {/* Tabs: Histórico / Pedidos */}
        <Tabs defaultValue="historico" className="mt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="historico">Histórico Pacotes</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos ({c.orders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="mt-3 space-y-2">
            {c.packages_history.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pacote encontrado.</p>}
            {c.packages_history
              .slice()
              .sort((a, b) => b.year - a.year || a.campaign.localeCompare(b.campaign))
              .map((ph, i) => (
                <Card key={i}>
                  <CardContent className="p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{ph.year}</Badge>
                        <Badge variant="outline" className={`text-xs ${ph.campaign.includes("mae") ? "bg-pink-500/15 text-pink-700 border-pink-500/30" : ph.campaign.includes("natal") ? "bg-red-500/15 text-red-700 border-red-500/30" : ""}`}>
                          {ph.campaign}
                        </Badge>
                      </div>
                      <span className="font-semibold">{formatBRL(ph.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{ph.package}</p>
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>Sessão: {formatDate(ph.session_date)}</span>
                      {ph.extra_photos > 0 && (
                        <span className="flex items-center gap-1">
                          <Camera className="h-3 w-3" /> {ph.extra_photos} extras
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="pedidos" className="mt-3 space-y-2">
            {c.orders
              .slice()
              .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
              .map((o) => (
                <Card key={o.order_id}>
                  <CardContent className="p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{o.year}</Badge>
                        {o.campaign && <Badge variant="outline" className="text-xs">{o.campaign}</Badge>}
                        <Badge
                          variant="outline"
                          className={`text-xs ${o.status?.id === 12 ? "bg-green-500/15 text-green-700 border-green-500/30" :
                            o.status?.id === 6 ? "bg-blue-500/15 text-blue-700 border-blue-500/30" :
                              o.status?.id === 10 ? "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" :
                                ""
                            }`}
                        >
                          {o.status?.name || "—"}
                        </Badge>
                      </div>
                      <span className="font-semibold">{formatBRL(o.financials.total)}</span>
                    </div>

                    {o.package && <p className="text-xs font-medium">{o.package.name}</p>}

                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>Pedido: {formatDate(o.created_at)}</span>
                      <span>Sessão: {formatDate(o.session_date)}</span>
                    </div>

                    {/* Financials row */}
                    <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>Recebido: {formatBRL(o.financials.received)}</span>
                      {o.financials.remaining > 0 && (
                        <span className="text-orange-600 font-medium">Pendente: {formatBRL(o.financials.remaining)}</span>
                      )}
                    </div>

                    {/* Extras */}
                    {o.extras && o.extras.length > 0 && (
                      <div className="mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium">Extras: </span>
                        {o.extras.map((e, i) => (
                          <span key={i}>
                            {e.quantity}x {e.name}
                            {i < o.extras.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Payment methods */}
                    {o.payment_methods.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {o.payment_methods.map((m) => (
                          <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>

        {/* Summary footer */}
        <div className="pt-3 border-t space-y-1">
          <p className="text-sm text-muted-foreground">
            Total gasto: <strong className="text-foreground">{formatBRL(c.kpis.total_spent)}</strong>
          </p>
          {c.kpis.preferred_package && (
            <p className="text-sm text-muted-foreground">
              Pacote preferido: <strong className="text-foreground">{c.kpis.preferred_package}</strong>
            </p>
          )}
          {c.kpis.extra_photos_spent > 0 && (
            <p className="text-sm text-muted-foreground">
              Gasto em extras: <strong className="text-foreground">{formatBRL(c.kpis.extra_photos_spent)}</strong>
            </p>
          )}
        </div>
      </div>
    </>
  );
}


// ── Mini KPI Card ──
function KpiMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/30">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}
