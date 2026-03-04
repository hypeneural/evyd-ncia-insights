import { useState, useEffect, useCallback, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Search, Copy, ArrowLeft, ShieldCheck, XCircle, CheckCircle2,
    Loader2, ClipboardList, Sparkles, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ── API ──
const API_BASE = "https://adm.evydencia.com.br/api/blacklist.php";

interface BlacklistEntry {
    id: number;
    name: string;
    whatsapp: string;
    has_closed_order: boolean;
    observation: string;
}

/** Retorna os últimos 8 dígitos do número */
function last8(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return digits.slice(-8);
}

function normalizeWhatsapp(raw: string): string {
    return raw.replace(/\D/g, "");
}

interface RemovedNumber {
    original: string;
    normalized: string;
    reason: "blacklist" | "duplicate";
    blacklistName?: string;
}

export default function BlacklistVerify() {
    const navigate = useNavigate();
    const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
    const [loadingBL, setLoadingBL] = useState(true);
    const [inputText, setInputText] = useState("");
    const [hasVerified, setHasVerified] = useState(false);

    // ── Load blacklist on mount ──
    const loadBlacklist = useCallback(async () => {
        setLoadingBL(true);
        try {
            const res = await fetch(`${API_BASE}?fetch=all`, {
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (json.success) setBlacklist(json.data);
        } catch {
            toast.error("Erro ao carregar blacklist");
        } finally {
            setLoadingBL(false);
        }
    }, []);

    useEffect(() => { loadBlacklist(); }, [loadBlacklist]);

    // ── Build blacklist lookup (last 8 digits → entry) ──
    const blacklistMap = useMemo(() => {
        const map = new Map<string, BlacklistEntry>();
        for (const entry of blacklist) {
            map.set(last8(entry.whatsapp), entry);
        }
        return map;
    }, [blacklist]);

    // ── Verification logic ──
    const { validNumbers, removedNumbers } = useMemo(() => {
        if (!hasVerified || !inputText.trim()) {
            return { validNumbers: [] as string[], removedNumbers: [] as RemovedNumber[] };
        }

        const lines = inputText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

        const valid: string[] = [];
        const removed: RemovedNumber[] = [];
        const seenLast8 = new Set<string>();

        for (const line of lines) {
            const normalized = normalizeWhatsapp(line);
            if (!normalized || normalized.length < 8) continue;

            const tail = last8(normalized);

            // Check duplicate (by last 8 digits)
            if (seenLast8.has(tail)) {
                removed.push({
                    original: normalized,
                    normalized,
                    reason: "duplicate",
                });
                continue;
            }

            // Check blacklist (by last 8 digits)
            const blEntry = blacklistMap.get(tail);
            if (blEntry) {
                removed.push({
                    original: normalized,
                    normalized,
                    reason: "blacklist",
                    blacklistName: blEntry.name || undefined,
                });
                seenLast8.add(tail);
                continue;
            }

            seenLast8.add(tail);
            valid.push(normalized);
        }

        return { validNumbers: valid, removedNumbers: removed };
    }, [inputText, blacklistMap, hasVerified]);

    const handleVerify = () => {
        if (!inputText.trim()) {
            toast.error("Cole pelo menos um número para verificar");
            return;
        }
        setHasVerified(true);
    };

    const handleClear = () => {
        setInputText("");
        setHasVerified(false);
    };

    const handleCopyValid = () => {
        if (validNumbers.length === 0) {
            toast.error("Nenhum número válido para copiar");
            return;
        }
        navigator.clipboard.writeText(validNumbers.join("\n"));
        toast.success(`${validNumbers.length} número(s) copiado(s)!`);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => navigate("/blacklist")}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold">
                            Verificação em Massa
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Verifique múltiplos números contra a blacklist
                        </p>
                    </div>
                    {loadingBL && (
                        <Badge variant="outline" className="ml-auto gap-1.5 text-xs">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Carregando blacklist...
                        </Badge>
                    )}
                    {!loadingBL && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                            {blacklist.length} na blacklist
                        </Badge>
                    )}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Input */}
                    <Card>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-primary" />
                                <h3 className="font-semibold">Números para Verificar</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Cole os números (um por linha)
                            </p>
                            <Textarea
                                placeholder={"48996425287\n47996181544\n47991704645\n..."}
                                value={inputText}
                                onChange={(e) => {
                                    setInputText(e.target.value);
                                    if (hasVerified) setHasVerified(false);
                                }}
                                rows={12}
                                className="font-mono text-sm resize-y"
                            />
                            <p className="text-xs text-muted-foreground">
                                Cole números com ou sem formatação. Um número por linha.
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 gap-1.5"
                                    onClick={handleVerify}
                                    disabled={loadingBL || !inputText.trim()}
                                >
                                    <Search className="h-4 w-4" />
                                    Verificar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleClear}
                                    disabled={!inputText && !hasVerified}
                                >
                                    Limpar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Results */}
                    <Card>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    <h3 className="font-semibold">Resultados</h3>
                                </div>
                                {hasVerified && (
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="bg-green-500/15 text-green-700 border-green-500/30 text-xs">
                                            {validNumbers.length} válidos
                                        </Badge>
                                        <Badge variant="secondary" className="bg-red-500/15 text-red-700 border-red-500/30 text-xs">
                                            {removedNumbers.length} removidos
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {!hasVerified ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
                                    <p className="text-sm">Cole os números e clique em Verificar</p>
                                </div>
                            ) : (
                                <>
                                    {/* Removed numbers */}
                                    {removedNumbers.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted-foreground">
                                                Números Removidos ({removedNumbers.length})
                                            </p>
                                            <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                                                {removedNumbers.map((r, i) => (
                                                    <div
                                                        key={`${r.normalized}-${i}`}
                                                        className="flex items-center justify-between text-sm px-2 py-1.5 rounded-md bg-red-500/5 border border-red-500/10"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                                            <span className="font-mono truncate">
                                                                {r.normalized}
                                                            </span>
                                                            {r.blacklistName && (
                                                                <span className="text-xs text-muted-foreground truncate">
                                                                    ({r.blacklistName})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] shrink-0 ml-2 ${r.reason === "blacklist"
                                                                    ? "bg-red-500/10 text-red-700 border-red-500/20"
                                                                    : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                                                }`}
                                                        >
                                                            {r.reason === "blacklist" ? "Blacklist" : "Duplicado na entrada"}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Valid numbers */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground">
                                            Números Válidos ({validNumbers.length})
                                        </p>
                                        <Textarea
                                            readOnly
                                            value={validNumbers.join("\n")}
                                            rows={Math.min(10, Math.max(4, validNumbers.length))}
                                            className="font-mono text-sm resize-y"
                                            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Dê duplo-clique para selecionar todos
                                        </p>
                                    </div>

                                    <Button
                                        className="w-full gap-1.5"
                                        onClick={handleCopyValid}
                                        disabled={validNumbers.length === 0}
                                    >
                                        <Copy className="h-4 w-4" />
                                        Copiar Números Válidos
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* How it works */}
                <Card>
                    <CardContent className="p-5">
                        <h3 className="font-semibold mb-4">Como Funciona</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <ClipboardList className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">1. Cole os Números</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Cole uma lista de números, um por linha. Pode incluir formatação.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">2. Verificação Automática</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Remove duplicados e números já na blacklist automaticamente.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <ListChecks className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">3. Copie os Válidos</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Copie apenas os números que podem receber propostas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
