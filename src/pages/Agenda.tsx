import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    CalendarDays, Package, Clock, Settings2, Plus, Pencil, Trash2, Save,
    CheckCircle2, AlertCircle, Eye, X, Info, PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ---------- API CONFIG ----------
const API_BASE = "https://horarios.evydencia.com.br/api/admin.php";

/** Formats YYYY-MM-DD to DD/MM/YYYY */
function formatDateBR(dateStr: string): string {
    if (!dateStr) return "—";
    try {
        return format(parseISO(dateStr), "dd/MM/yyyy");
    } catch {
        return dateStr;
    }
}

async function apiFetch(action: string, options: RequestInit = {}): Promise<any> {
    const sep = action.includes("?") ? "&" : "?";
    const url = `${API_BASE}?action=${action}`;
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    return res.json();
}

// ---------- TYPES ----------
interface PackageItem {
    id: number;
    code: string;
    name: string;
    duration_minutes: number;
    buffer_minutes: number;
    block_window_minutes: number;
    touch_conflict_start: boolean;
    touch_conflict_end: boolean;
    blocked_on_holidays: boolean;
    blocked_on_sundays: boolean;
    url: string | null;
}

interface CalendarRule {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    min_advance_hours: number;
    slot_step_minutes: number;
    week_times: Record<string, string[]>;
    week_times_packages: Record<string, Record<string, string[]>>;
    overrides: Record<string, any>;
    blocked_packages: Record<string, string[]>;
    caps: Record<string, string>;
    holidays: Record<string, { name: string; times: string[] }>;
    sunday_open_from: string | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LABELS: Record<string, string> = {
    Monday: "Seg", Tuesday: "Ter", Wednesday: "Qua",
    Thursday: "Qui", Friday: "Sex", Saturday: "Sáb", Sunday: "Dom",
};

// ============ MAIN PAGE ============
export default function Agenda() {
    const [packages, setPackages] = useState<PackageItem[]>([]);
    const [rules, setRules] = useState<CalendarRule[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [pkgRes, ruleRes] = await Promise.all([
                apiFetch("packages"),
                apiFetch("rules"),
            ]);
            if (pkgRes.success) setPackages(pkgRes.data);
            if (ruleRes.success) setRules(ruleRes.data);
        } catch (e) {
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const activeRule = rules.find((r) => {
        const today = new Date().toISOString().slice(0, 10);
        return r.start_date <= today && r.end_date >= today;
    }) || rules[0];

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Agenda</h1>
                    <p className="text-muted-foreground">Gerencie pacotes, regras e horários de agendamento</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <Tabs defaultValue="campaign" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="campaign" className="gap-2">
                                <CalendarDays className="w-4 h-4" /> Campanha
                            </TabsTrigger>
                            <TabsTrigger value="packages" className="gap-2">
                                <Package className="w-4 h-4" /> Pacotes
                            </TabsTrigger>
                            <TabsTrigger value="schedule" className="gap-2">
                                <Clock className="w-4 h-4" /> Grade Horária
                            </TabsTrigger>
                        </TabsList>

                        {/* ========== TAB 1: CAMPAIGN ========== */}
                        <TabsContent value="campaign">
                            <CampaignTab rule={activeRule} onSave={loadData} packages={packages} />
                        </TabsContent>

                        {/* ========== TAB 2: PACKAGES ========== */}
                        <TabsContent value="packages">
                            <PackagesTab packages={packages} onRefresh={loadData} />
                        </TabsContent>

                        {/* ========== TAB 3: SCHEDULE ========== */}
                        <TabsContent value="schedule">
                            <ScheduleTab rule={activeRule} packages={packages} onSave={loadData} />
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </Layout>
    );
}

// ============ TAB 1: CAMPAIGN ============
function CampaignTab({ rule, onSave, packages }: { rule?: CalendarRule; onSave: () => void; packages: PackageItem[] }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: "", start_date: "", end_date: "",
        min_advance_hours: 12, slot_step_minutes: 60,
        sunday_open_from: "",
    });

    useEffect(() => {
        if (rule) {
            setForm({
                name: rule.name,
                start_date: rule.start_date,
                end_date: rule.end_date,
                min_advance_hours: rule.min_advance_hours,
                slot_step_minutes: rule.slot_step_minutes,
                sunday_open_from: rule.sunday_open_from || "",
            });
        }
    }, [rule]);

    const handleSave = async () => {
        if (!rule) return;
        const res = await apiFetch(`rules&id=${rule.id}`, {
            method: "PUT",
            body: JSON.stringify(form),
        });
        if (res.success) {
            toast.success("Campanha atualizada");
            setEditing(false);
            onSave();
        } else {
            toast.error(res.error || "Erro ao salvar");
        }
    };

    if (!rule) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3" />
                    Nenhuma regra de calendário encontrada.
                </CardContent>
            </Card>
        );
    }

    const today = new Date().toISOString().slice(0, 10);
    const isActive = rule.start_date <= today && rule.end_date >= today;
    const isFuture = rule.start_date > today;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-primary" />
                                {rule.name}
                            </CardTitle>
                            <CardDescription>Configuração central da campanha · ID #{rule.id}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={isActive ? "default" : isFuture ? "secondary" : "outline"}>
                                {isActive ? "Ativa" : isFuture ? "Futura" : "Encerrada"}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
                                {editing ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
                                {editing ? "Cancelar" : "Editar"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {editing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FieldLabel tip="Nome exibido internamente para identificar esta campanha">Nome da Campanha</FieldLabel>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <FieldLabel tip="Primeiro dia em que os horários estarão disponíveis para agendamento">Data Início</FieldLabel>
                                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                            </div>
                            <div>
                                <FieldLabel tip="Último dia em que os horários estarão disponíveis. Após essa data, nenhum slot será exibido">Data Fim</FieldLabel>
                                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                            </div>
                            <div>
                                <FieldLabel tip="Quantas horas antes do horário o cliente precisa agendar. Ex: 4h = não pode agendar um slot que começa em menos de 4 horas">Antecedência Mínima (horas)</FieldLabel>
                                <Input type="number" value={form.min_advance_hours} onChange={(e) => setForm({ ...form, min_advance_hours: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <FieldLabel tip="Intervalo entre cada horário da grade. Ex: 60 = horários de hora em hora (08h, 09h, 10h...)">Intervalo de Slots (minutos)</FieldLabel>
                                <Input type="number" value={form.slot_step_minutes} onChange={(e) => setForm({ ...form, slot_step_minutes: parseInt(e.target.value) || 60 })} />
                            </div>
                            <div>
                                <FieldLabel tip="Data a partir da qual domingos passam a ter horários. Antes dessa data, domingos ficam bloqueados">Domingos abertos a partir de</FieldLabel>
                                <Input type="date" value={form.sunday_open_from} onChange={(e) => setForm({ ...form, sunday_open_from: e.target.value })} />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <Button onClick={handleSave}>
                                    <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <InfoItem label="Período" value={`${formatDateBR(rule.start_date)} → ${formatDateBR(rule.end_date)}`} tip="Datas de início e fim da campanha" />
                            <InfoItem label="Antecedência" value={`${rule.min_advance_hours}h`} tip="Horas mínimas antes do horário para agendar" />
                            <InfoItem label="Intervalo" value={`${rule.slot_step_minutes} min`} tip="Espaço entre cada horário na grade" />
                            <InfoItem label="Domingos desde" value={formatDateBR(rule.sunday_open_from || "")} tip="Domingos liberados a partir desta data" />
                            <InfoItem label="Feriados" value={`${Object.keys(rule.holidays).length} cadastrados`} tip="Dias com horários especiais" />
                            <InfoItem label="Pacotes" value={`${packages.length} ativos`} tip="Total de pacotes de ensaio disponíveis" />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Caps Card — Editable */}
            <CapsEditor rule={rule} onSave={onSave} />

            {/* Holidays CRUD */}
            <HolidaysEditor rule={rule} onSave={onSave} />
        </div>
    );
}

function InfoItem({ label, value, tip }: { label: string; value: string; tip?: string }) {
    return (
        <div>
            <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                {tip && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-xs">
                            {tip}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
        </div>
    );
}

/** Label with info tooltip */
function FieldLabel({ children, tip }: { children: React.ReactNode; tip: string }) {
    return (
        <Label className="flex items-center gap-1.5">
            {children}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] text-xs">
                    {tip}
                </TooltipContent>
            </Tooltip>
        </Label>
    );
}

// ============ TAB 2: PACKAGES ============
function PackagesTab({ packages, onRefresh }: { packages: PackageItem[]; onRefresh: () => void }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editPkg, setEditPkg] = useState<PackageItem | null>(null);
    const [form, setForm] = useState({ code: "", name: "", duration_minutes: 30, buffer_minutes: 15, block_window_minutes: 60, touch_conflict_start: false, touch_conflict_end: false, blocked_on_holidays: false, blocked_on_sundays: false, url: "" });

    const openCreate = () => {
        setEditPkg(null);
        setForm({ code: "", name: "", duration_minutes: 30, buffer_minutes: 15, block_window_minutes: 60, touch_conflict_start: false, touch_conflict_end: false, blocked_on_holidays: false, blocked_on_sundays: false, url: "" });
        setDialogOpen(true);
    };

    const openEdit = (pkg: PackageItem) => {
        setEditPkg(pkg);
        setForm({
            code: pkg.code,
            name: pkg.name,
            duration_minutes: pkg.duration_minutes,
            buffer_minutes: pkg.buffer_minutes,
            block_window_minutes: pkg.block_window_minutes,
            touch_conflict_start: pkg.touch_conflict_start,
            touch_conflict_end: pkg.touch_conflict_end,
            blocked_on_holidays: pkg.blocked_on_holidays,
            blocked_on_sundays: pkg.blocked_on_sundays,
            url: pkg.url || "",
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (editPkg) {
            const res = await apiFetch(`packages&id=${editPkg.id}`, {
                method: "PUT",
                body: JSON.stringify(form),
            });
            if (res.success) { toast.success("Pacote atualizado"); setDialogOpen(false); onRefresh(); }
            else toast.error(res.error);
        } else {
            const res = await apiFetch("packages", {
                method: "POST",
                body: JSON.stringify(form),
            });
            if (res.success) { toast.success("Pacote criado"); setDialogOpen(false); onRefresh(); }
            else toast.error(res.error);
        }
    };

    const handleDelete = async (pkg: PackageItem) => {
        if (!confirm(`Deletar pacote "${pkg.name}"?`)) return;
        const res = await apiFetch(`packages&id=${pkg.id}`, { method: "DELETE" });
        if (res.success) { toast.success("Pacote deletado"); onRefresh(); }
        else toast.error(res.error);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pacotes de Ensaio</h3>
                <Button onClick={openCreate} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Novo Pacote
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead className="text-center">Duração</TableHead>
                                <TableHead className="text-center">Buffer</TableHead>
                                <TableHead className="text-center">Bloqueio</TableHead>
                                <TableHead className="text-center">Restrições</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {packages.map((pkg) => (
                                <TableRow key={pkg.id}>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono">{pkg.code}</Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{pkg.name}</TableCell>
                                    <TableCell className="text-center">{pkg.duration_minutes} min</TableCell>
                                    <TableCell className="text-center">{pkg.buffer_minutes} min</TableCell>
                                    <TableCell className="text-center">{pkg.block_window_minutes} min</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center gap-1 flex-wrap">
                                            {pkg.blocked_on_sundays && <Badge variant="destructive" className="text-xs">Dom</Badge>}
                                            {pkg.blocked_on_holidays && <Badge variant="destructive" className="text-xs">Feriados</Badge>}
                                            {!pkg.blocked_on_sundays && !pkg.blocked_on_holidays && <span className="text-muted-foreground text-xs">—</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => openEdit(pkg)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(pkg)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Package Form Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editPkg ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
                        <DialogDescription>
                            {editPkg ? `Editando ${editPkg.name}` : "Preencha os dados do novo pacote"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel tip="Identificador único do pacote. Usado na URL e na API (ex: ?pack=CORUJA)">Código</FieldLabel>
                                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    placeholder="Ex: CORUJA" className="uppercase" disabled={!!editPkg} />
                            </div>
                            <div>
                                <FieldLabel tip="Nome visível para o cliente na página de agendamento">Nome</FieldLabel>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Ex: Mamãe Coruja" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <FieldLabel tip="Tempo real da sessão de fotos em minutos">Duração (min)</FieldLabel>
                                <Input type="number" value={form.duration_minutes}
                                    onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <FieldLabel tip="Tempo extra após a sessão para preparação do próximo cliente (limpeza, troca de cenário, etc.)">Buffer (min)</FieldLabel>
                                <Input type="number" value={form.buffer_minutes}
                                    onChange={(e) => setForm({ ...form, buffer_minutes: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <FieldLabel tip="Janela total que este pacote bloqueia no Google Calendar. Se definido, substitui duração+buffer na verificação de conflito">Janela Bloqueio (min)</FieldLabel>
                                <Input type="number" value={form.block_window_minutes}
                                    onChange={(e) => setForm({ ...form, block_window_minutes: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.touch_conflict_start}
                                    onChange={(e) => setForm({ ...form, touch_conflict_start: e.target.checked })}
                                    className="rounded" />
                                <span className="text-sm flex items-center gap-1">
                                    Bloquear toque no início
                                    <Tooltip><TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" /></TooltipTrigger>
                                        <TooltipContent className="max-w-[250px] text-xs">Se ativado, impede agendar um slot que começa exatamente quando outro termina (sem intervalo)</TooltipContent></Tooltip>
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.touch_conflict_end}
                                    onChange={(e) => setForm({ ...form, touch_conflict_end: e.target.checked })}
                                    className="rounded" />
                                <span className="text-sm flex items-center gap-1">
                                    Bloquear toque no fim
                                    <Tooltip><TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" /></TooltipTrigger>
                                        <TooltipContent className="max-w-[250px] text-xs">Se ativado, impede agendar um slot que termina exatamente quando outro começa (sem intervalo)</TooltipContent></Tooltip>
                                </span>
                            </label>
                        </div>
                        <div className="border rounded-lg p-3 bg-muted/10">
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" /> Bloqueios por tipo de dia
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.blocked_on_holidays}
                                        onChange={(e) => setForm({ ...form, blocked_on_holidays: e.target.checked })}
                                        className="rounded" />
                                    <span className="text-sm flex items-center gap-1">
                                        Bloquear em feriados
                                        <Tooltip><TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" /></TooltipTrigger>
                                            <TooltipContent className="max-w-[250px] text-xs">Impede agendamento deste pacote em todos os feriados cadastrados na campanha</TooltipContent></Tooltip>
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.blocked_on_sundays}
                                        onChange={(e) => setForm({ ...form, blocked_on_sundays: e.target.checked })}
                                        className="rounded" />
                                    <span className="text-sm flex items-center gap-1">
                                        Bloquear aos domingos
                                        <Tooltip><TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" /></TooltipTrigger>
                                            <TooltipContent className="max-w-[250px] text-xs">Impede agendamento deste pacote em todos os domingos, independente da grade semanal</TooltipContent></Tooltip>
                                    </span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <FieldLabel tip="Link de pagamento que o cliente recebe após confirmar o horário">URL de Pagamento</FieldLabel>
                            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                                placeholder="https://..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" /> {editPkg ? "Salvar" : "Criar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ============ CAPS EDITOR ============
function CapsEditor({ rule, onSave }: { rule: CalendarRule; onSave: () => void }) {
    const [editing, setEditing] = useState(false);
    const [caps, setCaps] = useState({
        saturday_max: rule.caps?.saturday_max || "",
        sunday_max: rule.caps?.sunday_max || "",
        holiday_max: rule.caps?.holiday_max || "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setCaps({
            saturday_max: rule.caps?.saturday_max || "",
            sunday_max: rule.caps?.sunday_max || "",
            holiday_max: rule.caps?.holiday_max || "",
        });
    }, [rule]);

    const handleSave = async () => {
        setSaving(true);
        const cleanCaps: Record<string, string> = {};
        if (caps.saturday_max) cleanCaps.saturday_max = caps.saturday_max;
        if (caps.sunday_max) cleanCaps.sunday_max = caps.sunday_max;
        if (caps.holiday_max) cleanCaps.holiday_max = caps.holiday_max;
        const res = await apiFetch(`rules&id=${rule.id}`, {
            method: "PUT",
            body: JSON.stringify({ caps: cleanCaps }),
        });
        setSaving(false);
        if (res.success) {
            toast.success("Limites atualizados");
            setEditing(false);
            onSave();
        } else {
            toast.error(res.error || "Erro ao salvar");
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" /> Limites de Horário (Caps)
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
                        {editing ? <X className="w-4 h-4 mr-1" /> : <Pencil className="w-4 h-4 mr-1" />}
                        {editing ? "Cancelar" : "Editar"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {editing ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <FieldLabel tip="Horário máximo permitido aos sábados. Slots após esse horário não serão exibidos">Sábado até</FieldLabel>
                                <Input type="time" value={caps.saturday_max}
                                    onChange={(e) => setCaps({ ...caps, saturday_max: e.target.value })} />
                            </div>
                            <div>
                                <FieldLabel tip="Horário máximo permitido aos domingos. Slots após esse horário não serão exibidos">Domingo até</FieldLabel>
                                <Input type="time" value={caps.sunday_max}
                                    onChange={(e) => setCaps({ ...caps, sunday_max: e.target.value })} />
                            </div>
                            <div>
                                <FieldLabel tip="Horário máximo em feriados cadastrados. Depois desse horário, não há agendamento">Feriado até</FieldLabel>
                                <Input type="time" value={caps.holiday_max}
                                    onChange={(e) => setCaps({ ...caps, holiday_max: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={saving} size="sm">
                                <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar Limites"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        <InfoItem label="Sábado até" value={rule.caps?.saturday_max || "—"} tip="Horário limite aos sábados" />
                        <InfoItem label="Domingo até" value={rule.caps?.sunday_max || "—"} tip="Horário limite aos domingos" />
                        <InfoItem label="Feriado até" value={rule.caps?.holiday_max || "—"} tip="Horário limite em feriados" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ============ HOLIDAYS EDITOR (CRUD) ============
function HolidaysEditor({ rule, onSave }: { rule: CalendarRule; onSave: () => void }) {
    const [holidays, setHolidays] = useState<Record<string, { name: string; times: string[] }>>({});
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newDate, setNewDate] = useState("");
    const [newName, setNewName] = useState("");
    const [newTimes, setNewTimes] = useState("");

    useEffect(() => {
        setHolidays(JSON.parse(JSON.stringify(rule.holidays || {})));
    }, [rule]);

    const addHoliday = () => {
        if (!newDate || !newName) { toast.error("Preencha data e nome"); return; }
        if (holidays[newDate]) { toast.error("Já existe feriado nesta data"); return; }
        const times = newTimes.split(",").map(t => t.trim()).filter(Boolean);
        setHolidays(prev => ({ ...prev, [newDate]: { name: newName, times } }));
        setNewDate(""); setNewName(""); setNewTimes("");
    };

    const removeHoliday = (date: string) => {
        setHolidays(prev => {
            const next = { ...prev };
            delete next[date];
            return next;
        });
    };

    const updateHolidayTimes = (date: string, timesStr: string) => {
        const times = timesStr.split(",").map(t => t.trim()).filter(Boolean);
        setHolidays(prev => ({ ...prev, [date]: { ...prev[date], times } }));
    };

    const updateHolidayName = (date: string, name: string) => {
        setHolidays(prev => ({ ...prev, [date]: { ...prev[date], name } }));
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await apiFetch(`rules&id=${rule.id}`, {
            method: "PUT",
            body: JSON.stringify({ holidays }),
        });
        setSaving(false);
        if (res.success) {
            toast.success("Feriados salvos");
            setEditing(false);
            onSave();
        } else {
            toast.error(res.error || "Erro ao salvar");
        }
    };

    const handleCancel = () => {
        setHolidays(JSON.parse(JSON.stringify(rule.holidays || {})));
        setEditing(false);
    };

    const sortedDates = Object.keys(holidays).sort();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <PartyPopper className="w-4 h-4 text-primary" /> Feriados
                        </CardTitle>
                        <CardDescription>
                            {editing ? "Adicione, edite ou remova feriados com horários especiais" : `${sortedDates.length} feriado(s) cadastrado(s)`}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {editing && (
                            <>
                                <Button size="sm" variant="outline" onClick={handleCancel}>
                                    <X className="w-4 h-4 mr-1" /> Cancelar
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={saving}>
                                    <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
                                </Button>
                            </>
                        )}
                        {!editing && (
                            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                                <Pencil className="w-4 h-4 mr-1" /> Editar
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Add new holiday */}
                {editing && (
                    <div className="border rounded-lg p-3 mb-4 bg-muted/20">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Adicionar feriado</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                            <div>
                                <FieldLabel tip="Data do feriado no formato YYYY-MM-DD">Data</FieldLabel>
                                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                                    min={rule.start_date} max={rule.end_date} />
                            </div>
                            <div>
                                <FieldLabel tip="Nome do feriado para identificação">Nome</FieldLabel>
                                <Input value={newName} onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Ex: Sexta-feira Santa" />
                            </div>
                            <div>
                                <FieldLabel tip="Horários disponíveis nesse dia, separados por vírgula. Se vazio, usa a grade padrão">Horários</FieldLabel>
                                <Input value={newTimes} onChange={(e) => setNewTimes(e.target.value)}
                                    placeholder="08:00, 09:00, 10:00" />
                            </div>
                            <Button size="sm" onClick={addHoliday} className="h-9">
                                <Plus className="w-4 h-4 mr-1" /> Adicionar
                            </Button>
                        </div>
                    </div>
                )}

                {sortedDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        Nenhum feriado cadastrado.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Horários</TableHead>
                                {editing && <TableHead className="text-right w-16">Ações</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedDates.map((date) => {
                                const hol = holidays[date];
                                return (
                                    <TableRow key={date}>
                                        <TableCell className="font-mono text-sm">{formatDateBR(date)}</TableCell>
                                        <TableCell>
                                            {editing ? (
                                                <Input value={hol.name} onChange={(e) => updateHolidayName(date, e.target.value)}
                                                    className="h-8 text-sm" />
                                            ) : hol.name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {editing ? (
                                                <Input value={hol.times?.join(", ") || ""}
                                                    onChange={(e) => updateHolidayTimes(date, e.target.value)}
                                                    placeholder="08:00, 09:00, 10:00"
                                                    className="h-8 text-sm" />
                                            ) : (hol.times?.join(", ") || "—")}
                                        </TableCell>
                                        {editing && (
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => removeHoliday(date)}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

function ScheduleTab({ rule, packages, onSave }: { rule?: CalendarRule; packages: PackageItem[]; onSave: () => void }) {
    const [previewPack, setPreviewPack] = useState("");
    const [previewDate, setPreviewDate] = useState("");
    const [previewSlots, setPreviewSlots] = useState<string[] | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    if (!rule) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    Nenhuma regra de calendário encontrada.
                </CardContent>
            </Card>
        );
    }

    const handlePreview = async () => {
        if (!previewPack || !previewDate) return;
        setPreviewLoading(true);
        try {
            const res = await apiFetch(`preview&rule=${rule.id}&pack=${previewPack}&date=${previewDate}`);
            if (res.success) {
                setPreviewSlots(res.times);
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error("Erro ao carregar preview");
        } finally {
            setPreviewLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Editable Week Grid */}
            <WeekGridEditor rule={rule} onSave={onSave} />

            {/* Package Restrictions */}
            <PackageRestrictionsEditor rule={rule} packages={packages} onSave={onSave} />

            {/* Preview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" /> Preview de Slots
                    </CardTitle>
                    <CardDescription>Visualize os horários gerados para uma data e pacote</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-3 mb-4">
                        <div>
                            <Label className="text-xs">Pacote</Label>
                            <select value={previewPack} onChange={(e) => setPreviewPack(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                                <option value="">Selecione...</option>
                                {packages.map((p) => (
                                    <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs">Data</Label>
                            <Input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)}
                                min={rule.start_date} max={rule.end_date} className="w-44" />
                        </div>
                        <Button size="sm" onClick={handlePreview} disabled={!previewPack || !previewDate || previewLoading}>
                            <Eye className="w-4 h-4 mr-1" /> {previewLoading ? "Carregando..." : "Visualizar"}
                        </Button>
                    </div>
                    {previewSlots !== null && (
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <div className="text-sm font-medium mb-2">
                                {previewSlots.length} horários disponíveis para <Badge variant="outline" className="font-mono">{previewPack}</Badge> em {formatDateBR(previewDate)}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {previewSlots.map((t) => (
                                    <Badge key={t} variant="secondary" className="font-mono">{t}</Badge>
                                ))}
                                {previewSlots.length === 0 && (
                                    <p className="text-sm text-muted-foreground">Nenhum horário nesta data para este pacote.</p>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ============ WEEK GRID EDITOR ============
const ALL_POSSIBLE_TIMES = [
    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

function WeekGridEditor({ rule, onSave }: { rule: CalendarRule; onSave: () => void }) {
    const [editing, setEditing] = useState(false);
    const [grid, setGrid] = useState<Record<string, string[]>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setGrid(JSON.parse(JSON.stringify(rule.week_times || {})));
    }, [rule]);

    const toggleCell = (day: string, time: string) => {
        if (!editing) return;
        setGrid((prev) => {
            const dayTimes = [...(prev[day] || [])];
            const idx = dayTimes.indexOf(time);
            if (idx >= 0) dayTimes.splice(idx, 1);
            else dayTimes.push(time);
            dayTimes.sort();
            return { ...prev, [day]: dayTimes };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await apiFetch(`rules&id=${rule.id}`, {
            method: "PUT",
            body: JSON.stringify({ week_times: grid }),
        });
        setSaving(false);
        if (res.success) {
            toast.success("Grade semanal salva");
            setEditing(false);
            onSave();
        } else {
            toast.error(res.error || "Erro ao salvar");
        }
    };

    const handleCancel = () => {
        setGrid(JSON.parse(JSON.stringify(rule.week_times || {})));
        setEditing(false);
    };

    // Gather all times used in current grid + all possible
    const usedTimes = new Set<string>();
    DAYS.forEach((d) => (grid[d] || []).forEach((t) => usedTimes.add(t)));
    const displayTimes = editing
        ? ALL_POSSIBLE_TIMES
        : Array.from(usedTimes).sort();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Grade Semanal Base</CardTitle>
                        <CardDescription>
                            {editing ? "Clique nas células para ativar/desativar horários" : "Horários configurados para todos os pacotes"}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {editing && (
                            <>
                                <Button size="sm" variant="outline" onClick={handleCancel}>
                                    <X className="w-4 h-4 mr-1" /> Cancelar
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={saving}>
                                    <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
                                </Button>
                            </>
                        )}
                        {!editing && (
                            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                                <Pencil className="w-4 h-4 mr-1" /> Editar
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="text-left py-2 px-2 text-xs text-muted-foreground">Horário</th>
                            {DAYS.map((d) => (
                                <th key={d} className="text-center py-2 px-1 text-xs font-semibold">{DAY_LABELS[d]}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayTimes.map((time) => (
                            <tr key={time} className="border-t border-border/50">
                                <td className="py-1.5 px-2 font-mono text-xs font-bold">{time}</td>
                                {DAYS.map((day) => {
                                    const has = (grid[day] || []).includes(time);
                                    return (
                                        <td key={day} className="text-center py-1.5 px-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleCell(day, time)}
                                                disabled={!editing}
                                                className={`inline-block w-7 h-7 rounded transition-colors ${has
                                                    ? "bg-primary/20 text-primary font-bold hover:bg-primary/30"
                                                    : editing
                                                        ? "bg-muted/30 text-muted-foreground/40 hover:bg-muted/60 cursor-pointer"
                                                        : "bg-muted/30 text-muted-foreground/30"
                                                    } ${editing ? "cursor-pointer" : "cursor-default"}`}
                                            >
                                                {has ? "✓" : "—"}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}

// ============ PACKAGE RESTRICTIONS EDITOR ============
function PackageRestrictionsEditor({ rule, packages, onSave }: { rule: CalendarRule; packages: PackageItem[]; onSave: () => void }) {
    const [editing, setEditing] = useState(false);
    const [overrides, setOverrides] = useState<Record<string, Record<string, string[]>>>({});
    const [saving, setSaving] = useState(false);
    const [selectedPkg, setSelectedPkg] = useState("");

    useEffect(() => {
        setOverrides(JSON.parse(JSON.stringify(rule.week_times_packages || {})));
    }, [rule]);

    const toggleDayForPkg = (pkgCode: string, day: string) => {
        if (!editing) return;
        setOverrides((prev) => {
            const pkgOverrides = { ...(prev[pkgCode] || {}) };
            if (day in pkgOverrides) {
                // Remove the day override (allow all times)
                delete pkgOverrides[day];
            } else {
                // Block this day (empty array = blocked)
                pkgOverrides[day] = [];
            }
            if (Object.keys(pkgOverrides).length === 0) {
                const newOverrides = { ...prev };
                delete newOverrides[pkgCode];
                return newOverrides;
            }
            return { ...prev, [pkgCode]: pkgOverrides };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await apiFetch(`rules&id=${rule.id}`, {
            method: "PUT",
            body: JSON.stringify({ week_times_packages: overrides }),
        });
        setSaving(false);
        if (res.success) {
            toast.success("Restrições salvas");
            setEditing(false);
            onSave();
        } else {
            toast.error(res.error || "Erro ao salvar");
        }
    };

    const handleCancel = () => {
        setOverrides(JSON.parse(JSON.stringify(rule.week_times_packages || {})));
        setEditing(false);
    };

    const addPkgOverride = () => {
        if (!selectedPkg || overrides[selectedPkg]) return;
        setOverrides((prev) => ({ ...prev, [selectedPkg]: {} }));
        setSelectedPkg("");
    };

    const removePkgOverride = (code: string) => {
        setOverrides((prev) => {
            const next = { ...prev };
            delete next[code];
            return next;
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Restrições por Pacote</CardTitle>
                        <CardDescription>
                            {editing ? "Clique nos dias para bloquear/desbloquear" : "Dias bloqueados por pacote"}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {editing && (
                            <>
                                <Button size="sm" variant="outline" onClick={handleCancel}>
                                    <X className="w-4 h-4 mr-1" /> Cancelar
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={saving}>
                                    <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
                                </Button>
                            </>
                        )}
                        {!editing && (
                            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                                <Pencil className="w-4 h-4 mr-1" /> Editar
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Add package override */}
                {editing && (
                    <div className="flex items-end gap-2 mb-4">
                        <div className="flex-1">
                            <Label className="text-xs">Adicionar restrição para pacote</Label>
                            <select value={selectedPkg} onChange={(e) => setSelectedPkg(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                                <option value="">Selecione...</option>
                                {packages.filter((p) => !overrides[p.code]).map((p) => (
                                    <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                                ))}
                            </select>
                        </div>
                        <Button size="sm" onClick={addPkgOverride} disabled={!selectedPkg}>
                            <Plus className="w-4 h-4 mr-1" /> Adicionar
                        </Button>
                    </div>
                )}

                {Object.keys(overrides).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        Nenhuma restrição por pacote configurada. Todos os pacotes seguem a grade base.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(overrides).map(([code, days]) => (
                            <div key={code} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="font-mono">{code}</Badge>
                                    {editing && (
                                        <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => removePkgOverride(code)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS.map((day) => {
                                        const isBlocked = day in (days || {});
                                        const arr = (days as Record<string, string[]>)[day];
                                        const isBlockedEmpty = isBlocked && (!arr || arr.length === 0);
                                        return (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => toggleDayForPkg(code, day)}
                                                disabled={!editing}
                                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${isBlockedEmpty
                                                    ? "bg-destructive/10 text-destructive border border-destructive/30"
                                                    : "bg-muted/30 text-foreground border border-border"
                                                    } ${editing ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                                            >
                                                {DAY_LABELS[day]}
                                                {isBlockedEmpty && " ✕"}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
