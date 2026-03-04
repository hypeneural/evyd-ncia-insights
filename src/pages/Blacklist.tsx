import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    ShieldBan, Search, Plus, Pencil, Trash2, RefreshCw, Phone, Users,
    ShoppingBag, UserX, Loader2, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import clientsRaw from "@/mocks/clients.json";

// ── API ──
const API_BASE = "https://adm.evydencia.com.br/api/blacklist.php";

interface BlacklistEntry {
    id: number;
    name: string;
    whatsapp: string;
    has_closed_order: boolean;
    observation: string;
    created_at: string;
    updated_at: string;
}

interface Stats {
    total: number;
    with_order: number;
    without_order: number;
}

async function apiFetch(
    endpoint: string,
    options: RequestInit = {},
): Promise<any> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    return res.json();
}

// ── Helpers ──
function formatDateBR(d: string | null | undefined): string {
    if (!d) return "—";
    const s = d.slice(0, 10);
    const [y, m, day] = s.split("-");
    return `${day}/${m}/${y}`;
}

function formatWhatsApp(raw: string): string {
    const d = raw.replace(/\D/g, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return raw;
}

function normalizeWhatsapp(raw: string): string {
    return raw.replace(/\D/g, "");
}

/** Retorna os últimos 8 dígitos do número (referência universal para comparação) */
function last8(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return digits.slice(-8);
}

// ── Page ──
export default function Blacklist() {
    const navigate = useNavigate();
    const [entries, setEntries] = useState<BlacklistEntry[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, with_order: 0, without_order: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Create form
    const [formWhatsapp, setFormWhatsapp] = useState("");
    const [formName, setFormName] = useState("");
    const [formStatus, setFormStatus] = useState<string>("false");
    const [formObs, setFormObs] = useState("");
    const [creating, setCreating] = useState(false);

    // Edit dialog
    const [editEntry, setEditEntry] = useState<BlacklistEntry | null>(null);
    const [editName, setEditName] = useState("");
    const [editStatus, setEditStatus] = useState<string>("false");
    const [editObs, setEditObs] = useState("");
    const [saving, setSaving] = useState(false);

    // Delete dialog
    const [deleteEntry, setDeleteEntry] = useState<BlacklistEntry | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Sync
    const [syncing, setSyncing] = useState(false);
    const [autoSyncDone, setAutoSyncDone] = useState(false);

    // ── Data loading ──
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [listRes, statsRes] = await Promise.all([
                apiFetch("?fetch=all"),
                apiFetch("?fetch=stats"),
            ]);
            if (listRes.success) setEntries(listRes.data);
            if (statsRes.success) setStats(statsRes.data);
            return listRes.success ? listRes.data as BlacklistEntry[] : [];
        } catch {
            toast.error("Erro ao carregar blacklist");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Auto-sync DM 2026 on page load (async, silent) ──
    useEffect(() => {
        loadData().then((currentEntries) => {
            if (autoSyncDone || !currentEntries.length && entries.length === 0) {
                // Still run auto-sync even with empty blacklist
            }
            if (!autoSyncDone) {
                setAutoSyncDone(true);
                autoSyncDM2026(currentEntries.length > 0 ? currentEntries : entries);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Filtered list ──
    const filtered = useMemo(() => {
        if (!search) return entries;
        const q = search.toLowerCase();
        return entries.filter(
            (e) =>
                (e.name && e.name.toLowerCase().includes(q)) ||
                e.whatsapp.includes(q),
        );
    }, [entries, search]);

    // ── Create ──
    const handleCreate = async () => {
        const whatsapp = normalizeWhatsapp(formWhatsapp);
        if (whatsapp.length < 10) {
            toast.error("WhatsApp inválido (mínimo 10 dígitos)");
            return;
        }
        setCreating(true);
        try {
            const res = await apiFetch("", {
                method: "POST",
                body: JSON.stringify({
                    whatsapp,
                    name: formName,
                    has_closed_order: formStatus === "true",
                    observation: formObs,
                }),
            });
            if (res.success) {
                toast.success("Número adicionado à blacklist");
                setFormWhatsapp("");
                setFormName("");
                setFormStatus("false");
                setFormObs("");
                loadData();
            } else {
                toast.error(res.error || "Erro ao cadastrar");
            }
        } catch {
            toast.error("Erro de conexão");
        } finally {
            setCreating(false);
        }
    };

    // ── Edit ──
    const openEdit = (entry: BlacklistEntry) => {
        setEditEntry(entry);
        setEditName(entry.name || "");
        setEditStatus(entry.has_closed_order ? "true" : "false");
        setEditObs(entry.observation || "");
    };

    const handleUpdate = async () => {
        if (!editEntry) return;
        setSaving(true);
        try {
            const res = await apiFetch(`?id=${editEntry.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    name: editName,
                    has_closed_order: editStatus === "true",
                    observation: editObs,
                }),
            });
            if (res.success) {
                toast.success("Registro atualizado");
                setEditEntry(null);
                loadData();
            } else {
                toast.error(res.error || "Erro ao atualizar");
            }
        } catch {
            toast.error("Erro de conexão");
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──
    const handleDelete = async () => {
        if (!deleteEntry) return;
        setDeleting(true);
        try {
            const res = await apiFetch(`?id=${deleteEntry.id}`, { method: "DELETE" });
            if (res.success) {
                toast.success("Registro removido");
                setDeleteEntry(null);
                loadData();
            } else {
                toast.error(res.error || "Erro ao remover");
            }
        } catch {
            toast.error("Erro de conexão");
        } finally {
            setDeleting(false);
        }
    };

    // ── Core sync logic (used by both auto-sync and manual button) ──
    const syncDM2026 = async (currentEntries: BlacklistEntry[], silent = false) => {
        // Get clients with DM 2026 tag and whatsapp
        const dm2026Clients = (clientsRaw as any[]).filter(
            (c) => c.tags?.includes("dia-das-maes-2026") && c.whatsapp,
        );

        // Compare using last 8 digits of phone number
        const existingLast8 = new Set(currentEntries.map((e) => last8(e.whatsapp)));
        const newClients = dm2026Clients.filter(
            (c) => !existingLast8.has(last8(c.whatsapp)),
        );

        if (newClients.length === 0) {
            if (!silent) toast.info("Nenhum novo cliente DM 2026 para inserir");
            return 0;
        }

        let inserted = 0;
        let errors = 0;

        for (const client of newClients) {
            try {
                const res = await apiFetch("", {
                    method: "POST",
                    body: JSON.stringify({
                        whatsapp: normalizeWhatsapp(client.whatsapp),
                        name: client.name || "",
                        has_closed_order: true,
                        observation: `Sincronizado automaticamente — DM 2026`,
                    }),
                });
                if (res.success) inserted++;
                else errors++;
            } catch {
                errors++;
            }
        }

        if (inserted > 0) {
            toast.success(
                `Sincronização: ${inserted} novo(s) cliente(s) DM 2026 inserido(s)${errors > 0 ? `, ${errors} erro(s)` : ""}`,
            );
            loadData();
        } else if (!silent && errors > 0) {
            toast.error(`${errors} erro(s) durante sincronização`);
        }

        return inserted;
    };

    // Auto-sync on load (silent — no toast if nothing new)
    const autoSyncDM2026 = async (currentEntries: BlacklistEntry[]) => {
        await syncDM2026(currentEntries, true);
    };

    // Manual sync button
    const handleSync = async () => {
        setSyncing(true);
        try {
            await syncDM2026(entries, false);
        } catch {
            toast.error("Erro durante sincronização");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
                            <ShieldBan className="h-7 w-7 text-primary" />
                            Blacklist
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Gerencie números bloqueados para envio de propostas — Dia das Mães 2026
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/blacklist/verificar")}
                            className="gap-1.5"
                        >
                            <ListChecks className="h-3.5 w-3.5" />
                            Verificação em Massa
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadData}
                            disabled={loading}
                            className="gap-1.5"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                            Atualizar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSync}
                            disabled={syncing || loading}
                            className="gap-1.5 bg-pink-600 hover:bg-pink-700 text-white"
                        >
                            {syncing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <ShoppingBag className="h-3.5 w-3.5" />
                            )}
                            Sincronizar DM 2026
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-primary">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Total na Blacklist</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <ShoppingBag className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Com Pedido DM 2026</p>
                                <p className="text-2xl font-bold text-green-600">{stats.with_order}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <UserX className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Sem Pedido</p>
                                <p className="text-2xl font-bold text-amber-600">{stats.without_order}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Add Form */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Plus className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">Adicionar à Blacklist</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                            <div>
                                <Label className="text-xs">WhatsApp *</Label>
                                <Input
                                    placeholder="48999999999"
                                    value={formWhatsapp}
                                    onChange={(e) => setFormWhatsapp(normalizeWhatsapp(e.target.value))}
                                    onPaste={(e) => {
                                        e.preventDefault();
                                        const pasted = e.clipboardData.getData("text");
                                        setFormWhatsapp(normalizeWhatsapp(pasted));
                                    }}
                                    className="mt-1 font-mono"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Nome</Label>
                                <Input
                                    placeholder="Nome do contato"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Status</Label>
                                <Select value={formStatus} onValueChange={setFormStatus}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="false">Cliente não fechou pedido</SelectItem>
                                        <SelectItem value="true">Cliente já fechou pedido</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Observação</Label>
                                <Input
                                    placeholder="Opcional..."
                                    value={formObs}
                                    onChange={(e) => setFormObs(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={creating || !formWhatsapp.trim()}
                                className="gap-1.5"
                            >
                                {creating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                Adicionar
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Search */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou WhatsApp..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {filtered.length} registro(s)
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>WhatsApp</TableHead>
                                            <TableHead className="text-center">Pedido DM 2026</TableHead>
                                            <TableHead>Observação</TableHead>
                                            <TableHead>Data Inclusão</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                    <ShieldBan className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                    {search
                                                        ? "Nenhum resultado encontrado"
                                                        : "Nenhum número na blacklist"}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filtered.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell className="font-medium text-sm">
                                                        {entry.name || <span className="text-muted-foreground italic">Sem nome</span>}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-mono">
                                                        <div className="flex items-center gap-1.5">
                                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                                            {formatWhatsApp(entry.whatsapp)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {entry.has_closed_order ? (
                                                            <Badge className="bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/20">
                                                                Com pedido
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                                                                Sem pedido
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                                        {entry.observation || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                        {formatDateBR(entry.created_at)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                title="Editar"
                                                                onClick={() => openEdit(entry)}
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                                title="Excluir"
                                                                onClick={() => setDeleteEntry(entry)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ── Edit Dialog ── */}
            <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Editar Registro
                        </DialogTitle>
                        <DialogDescription>
                            WhatsApp: {editEntry ? formatWhatsApp(editEntry.whatsapp) : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Nome</Label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Nome do contato"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="false">Cliente não fechou pedido</SelectItem>
                                    <SelectItem value="true">Cliente já fechou pedido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Observação</Label>
                            <Textarea
                                value={editObs}
                                onChange={(e) => setEditObs(e.target.value)}
                                placeholder="Observação opcional..."
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditEntry(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdate} disabled={saving} className="gap-1.5">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ── */}
            <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover da Blacklist?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover{" "}
                            <strong>{deleteEntry?.name || formatWhatsApp(deleteEntry?.whatsapp || "")}</strong>{" "}
                            da blacklist? Essa pessoa voltará a receber propostas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
