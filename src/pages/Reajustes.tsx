import React, { useState, useMemo } from "react";
import {
    Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, ComposedChart
} from "recharts";
import { Download, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Layout } from "@/components/Layout";

import { MOCK_PRICING_DATA } from "../mocks/pricing";
import {
    computeYearlyDeltas,
    computeExtraPhotoDeltas,
    computeCAGR,
    formatBRL,
    formatPct,
    buildAlignedYears,
    ComputedPackageYear,
    ComputedExtraPhotoYear
} from "../lib/pricingMetrics";

const PACKAGE_COLORS: Record<string, string> = {
    "Mamãe Coruja": "#3b82f6", // blue-500
    "Super Mãe": "#8b5cf6",    // violet-500
    "A melhor mãe do mundo": "#ec4899", // pink-500
};
const PHOTO_COLOR = "#f59e0b"; // amber-500

export default function Reajustes() {
    const [intervalOption, setIntervalOption] = useState<string>("all");
    const [displayMode, setDisplayMode] = useState<"pct" | "brl">("pct");
    const [alignYears, setAlignYears] = useState(false);
    const [barChartMode, setBarChartMode] = useState<"total" | "entry">("total");

    // --- Data Preparation ---
    const packagesNames = Object.keys(MOCK_PRICING_DATA.packages);

    // Compute deltas for all series
    const computedPackages = useMemo(() => {
        const result: Record<string, ComputedPackageYear[]> = {};
        for (const pkg of packagesNames) {
            result[pkg] = computeYearlyDeltas(MOCK_PRICING_DATA.packages[pkg]);
        }
        return result;
    }, [packagesNames]);

    const computedExtraPhoto = useMemo(() => {
        return computeExtraPhotoDeltas(MOCK_PRICING_DATA.extraPhoto);
    }, []);

    // Filter by interval
    const { filteredPackages, filteredExtraPhoto } = useMemo(() => {
        const allYears = Array.from(new Set([
            ...Object.values(MOCK_PRICING_DATA.packages).flat().map(p => p.year),
            ...MOCK_PRICING_DATA.extraPhoto.map(p => p.year)
        ])).sort((a, b) => a - b);

        if (allYears.length === 0) return { filteredPackages: computedPackages, filteredExtraPhoto: computedExtraPhoto };

        const maxYear = allYears[allYears.length - 1];
        let minYear = allYears[0];

        if (intervalOption === "last2") minYear = maxYear - 1;
        if (intervalOption === "last3") minYear = maxYear - 2;

        const fp: Record<string, ComputedPackageYear[]> = {};
        for (const pkg of packagesNames) {
            fp[pkg] = computedPackages[pkg].filter(d => d.year >= minYear && d.year <= maxYear);
        }
        const fep = computedExtraPhoto.filter(d => d.year >= minYear && d.year <= maxYear);

        return { filteredPackages: fp, filteredExtraPhoto: fep };
    }, [computedPackages, computedExtraPhoto, intervalOption, packagesNames]);

    // Aligned years for charts if requested
    const allFilteredYears = useMemo(() => {
        const seriesList: { year: number }[][] = [
            ...Object.values(filteredPackages),
            filteredExtraPhoto
        ];
        return buildAlignedYears(...seriesList);
    }, [filteredPackages, filteredExtraPhoto]);

    // Chart Data compilation
    const chartData = useMemo(() => {
        const dataByYear: Record<number, any> = {};
        allFilteredYears.forEach(y => {
            dataByYear[y] = { name: y.toString() };
        });

        for (const pkg of packagesNames) {
            filteredPackages[pkg].forEach(d => {
                if (!dataByYear[d.year]) dataByYear[d.year] = { name: d.year.toString() };
                dataByYear[d.year][`${pkg}_total`] = d.total;
                dataByYear[d.year][`${pkg}_entry`] = d.entry;
                dataByYear[d.year][`${pkg}_deltaTotalPct`] = d.deltaTotalPct;
                dataByYear[d.year][`${pkg}_deltaEntryPct`] = d.deltaEntryPct;
            });
        }

        filteredExtraPhoto.forEach(d => {
            if (!dataByYear[d.year]) dataByYear[d.year] = { name: d.year.toString() };
            dataByYear[d.year]["foto_unit"] = d.unitPrice;
        });

        return Object.values(dataByYear).sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name));
    }, [allFilteredYears, filteredPackages, filteredExtraPhoto, packagesNames]);

    // Insights / Summaries
    const summaries = useMemo(() => {
        let maxPctPkg = { pkg: "-", year: 0, val: 0 };
        let maxRsPkg = { pkg: "-", year: 0, val: 0 };
        let cagrData: Record<string, number> = {};
        const noAdjustmentYears: { pkg: string, year: number }[] = [];

        for (const pkg of packagesNames) {
            const data = filteredPackages[pkg];
            if (data.length === 0) continue;

            // CAGR
            if (data.length >= 3) {
                cagrData[pkg] = computeCAGR(data[0].total, data[data.length - 1].total, data.length - 1);
            }

            data.forEach(d => {
                if (d.deltaTotalPct !== null && d.deltaTotalPct > maxPctPkg.val) {
                    maxPctPkg = { pkg, year: d.year, val: d.deltaTotalPct };
                }
                if (d.deltaTotalRs !== null && d.deltaTotalRs > maxRsPkg.val) {
                    maxRsPkg = { pkg, year: d.year, val: d.deltaTotalRs };
                }
                if (d.deltaTotalRs === 0) {
                    noAdjustmentYears.push({ pkg, year: d.year });
                }
            });
        }

        let fotoVarInfo = { rs: 0, pct: 0, hasData: false };
        if (filteredExtraPhoto.length >= 2) {
            const last = filteredExtraPhoto[filteredExtraPhoto.length - 1];
            if (last.deltaUnitRs !== null && last.deltaUnitPct !== null) {
                fotoVarInfo = { rs: last.deltaUnitRs, pct: last.deltaUnitPct, hasData: true };
            }
        }

        return { maxPctPkg, maxRsPkg, noAdjustmentYears, cagrData, fotoVarInfo };
    }, [filteredPackages, filteredExtraPhoto, packagesNames]);

    // --- Handlers ---
    const exportCSV = () => {
        // A simple CSV export of the detailed active data
        let csvContent = "data:text/csv;charset=utf-8,Pacote,Ano,Total,Entrada,Parcelas,Saldo,Delta Total R$,Delta Total %,Delta Entrada R$,Delta Entrada %\n";

        for (const pkg of packagesNames) {
            filteredPackages[pkg].forEach(d => {
                csvContent += `"${pkg}",${d.year},${d.total},${d.entry},"${d.installmentsCount}x ${d.installmentValue}",${d.saldo},${d.deltaTotalRs || ''},${d.deltaTotalPct || ''},${d.deltaEntryRs || ''},${d.deltaEntryPct || ''}\n`;
            });
        }
        filteredExtraPhoto.forEach(d => {
            csvContent += `"Foto Extra",${d.year},${d.unitPrice},-,,,${d.deltaUnitRs || ''},${d.deltaUnitPct || ''},,\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "reajustes_precificacao.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    // --- Render Helpers ---
    const renderDeltaBadge = (rs: number | null, pct: number | null) => {
        if (rs === null || pct === null) return <Badge variant="secondary" className="text-gray-500">—</Badge>;
        if (rs === 0) return <Badge variant="outline" className="text-gray-500">0,0%</Badge>;

        const isPositive = rs > 0;
        const colorClass = isPositive ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-red-100 text-red-800 hover:bg-red-200";
        const icon = isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />;

        const displayValue = displayMode === "pct" ? formatPct(pct) : formatBRL(rs);

        return (
            <Badge className={`font-semibold ${colorClass}`}>
                {icon} {displayValue}
            </Badge>
        );
    };

    return (
        <Layout>
            <TooltipProvider>
                <div className="flex-1 space-y-6 p-8 pt-6 max-w-[1600px] mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Reajuste de Pacotes — Dia das Mães</h2>
                            <p className="text-muted-foreground mt-1">Evolução anual de total, entrada e foto extra com variação em R$ e %.</p>
                        </div>
                        <div className="flex items-center space-x-4 flex-wrap gap-y-2">
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="alignYears" className="text-sm font-medium">Alinhar Anos</Label>
                                <Switch id="alignYears" checked={alignYears} onCheckedChange={setAlignYears} />
                            </div>

                            <ToggleGroup type="single" value={displayMode} onValueChange={(v) => v && setDisplayMode(v as any)}>
                                <ToggleGroupItem value="pct">Exibir %</ToggleGroupItem>
                                <ToggleGroupItem value="brl">Exibir R$</ToggleGroupItem>
                            </ToggleGroup>

                            <Select value={intervalOption} onValueChange={setIntervalOption}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Intervalo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="last2">Últimos 2 anos</SelectItem>
                                    <SelectItem value="last3">Últimos 3 anos</SelectItem>
                                    <SelectItem value="all">Tudo (2022-2026)</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="outline" size="sm" onClick={exportCSV}>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar
                            </Button>
                        </div>
                    </div>

                    {/* Summaries */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Maior Reajuste % (Total)</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">{formatPct(summaries.maxPctPkg.val)}</div>
                                <p className="text-xs text-muted-foreground">{summaries.maxPctPkg.pkg} ({summaries.maxPctPkg.year})</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Maior Reajuste R$ (Total)</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">{formatBRL(summaries.maxRsPkg.val)}</div>
                                <p className="text-xs text-muted-foreground">{summaries.maxRsPkg.pkg} ({summaries.maxRsPkg.year})</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ano sem Reajuste</CardTitle>
                                <Minus className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {summaries.noAdjustmentYears.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                        {summaries.noAdjustmentYears.map((i, idx) => (
                                            <div key={idx} className="text-sm font-medium text-gray-700">{i.pkg} <span className="text-xs text-gray-400">({i.year})</span></div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">Todos tiveram reajuste</div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Foto Extra (Última ref.)</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {summaries.fotoVarInfo.hasData ? (
                                    <>
                                        <div className="text-2xl font-bold">{formatBRL(summaries.fotoVarInfo.rs)}</div>
                                        <p className="text-xs text-muted-foreground">{formatPct(summaries.fotoVarInfo.pct)} vs ano anterior</p>
                                    </>
                                ) : (
                                    <div className="text-sm text-muted-foreground">Sem dados para variação</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Charts Section */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle>Totais por Ano</CardTitle>
                                    <CardDescription>Evolução dos pacotes (esq.) e Foto Extra (dir.)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                                <YAxis yAxisId="left" tickFormatter={(val) => `R$${val}`} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                                <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `R$${val}`} axisLine={false} tickLine={false} tick={{ fill: '#F59E0B' }} />
                                                <RechartsTooltip
                                                    formatter={(value: number, name: string) => [formatBRL(value), name.split('_')[0]]}
                                                    labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                                />
                                                <Legend iconType="circle" />
                                                {packagesNames.map(pkg => (
                                                    <Line key={pkg} yAxisId="left" type="monotone" dataKey={`${pkg}_total`} name={pkg} stroke={PACKAGE_COLORS[pkg]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={alignYears} />
                                                ))}
                                                <Line yAxisId="right" type="monotone" dataKey="foto_unit" name="Foto Extra" stroke={PHOTO_COLOR} strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={alignYears} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Reajuste % Ano a Ano</CardTitle>
                                        <CardDescription>Comparativo percentual de variação</CardDescription>
                                    </div>
                                    <ToggleGroup type="single" value={barChartMode} onValueChange={(v) => v && setBarChartMode(v as any)} size="sm">
                                        <ToggleGroupItem value="total">Total</ToggleGroupItem>
                                        <ToggleGroupItem value="entry">Entrada</ToggleGroupItem>
                                    </ToggleGroup>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                                <YAxis tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                                <RechartsTooltip
                                                    formatter={(value: number, name: string) => [`${value?.toFixed(1)}%`, name.split('_')[0]]}
                                                    cursor={{ fill: '#F3F4F6' }}
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                                />
                                                <Legend iconType="circle" />
                                                {packagesNames.map(pkg => (
                                                    <Bar key={pkg} dataKey={`${pkg}_delta${barChartMode === 'total' ? 'Total' : 'Entry'}Pct`} name={pkg} fill={PACKAGE_COLORS[pkg]} radius={[4, 4, 0, 0]} />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Side Info / Timeline */}
                        <div className="space-y-6">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle>Histórico Consolidado</CardTitle>
                                    <CardDescription>Linha do tempo de alterações</CardDescription>
                                </CardHeader>
                                <CardContent className="px-6 pb-6">
                                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                        {[...allFilteredYears].reverse().map(year => {
                                            const yearData = chartData.find(d => parseInt(d.name) === year);
                                            if (!yearData) return null;
                                            return (
                                                <div key={year} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                                    </div>
                                                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border border-slate-200 bg-white shadow-sm">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-slate-900">{year}</span>
                                                        </div>
                                                        <div className="text-sm text-slate-600 space-y-1">
                                                            {packagesNames.map(pkg => {
                                                                const v = yearData[`${pkg}_total`];
                                                                if (v == null) return null;
                                                                return <div key={pkg} className="flex justify-between"><span>{pkg}:</span> <span className="font-medium text-slate-900">{formatBRL(v)}</span></div>
                                                            })}
                                                            {yearData.foto_unit && (
                                                                <div className="flex justify-between text-amber-600"><span>Foto Extra:</span> <span className="font-medium">{formatBRL(yearData.foto_unit)}</span></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Comparison Section */}
                    <Card className="shadow-sm mt-8">
                        <CardHeader>
                            <CardTitle>Comparativo Direto (Últimos 2 Anos)</CardTitle>
                            <CardDescription>Variação lado a lado dos totais e entradas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="w-[200px] font-bold text-slate-900">Produto</TableHead>
                                            <TableHead className="text-right">Anterior</TableHead>
                                            <TableHead className="text-right">Atual</TableHead>
                                            <TableHead className="text-right">ΔR$ Total</TableHead>
                                            <TableHead className="text-right">Δ% Total</TableHead>
                                            <TableHead className="text-right">ΔR$ Entrada</TableHead>
                                            <TableHead className="text-right">Δ% Entrada</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {packagesNames.map(pkg => {
                                            const data = filteredPackages[pkg];
                                            if (data.length < 2) return null;
                                            const last = data[data.length - 1];
                                            const prev = data[data.length - 2];
                                            return (
                                                <TableRow key={pkg}>
                                                    <TableCell className="font-medium"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PACKAGE_COLORS[pkg] }}></div>{pkg}</div></TableCell>
                                                    <TableCell className="text-right text-muted-foreground">{formatBRL(prev.total)}</TableCell>
                                                    <TableCell className="text-right font-semibold">{formatBRL(last.total)}</TableCell>
                                                    <TableCell className="text-right">{renderDeltaBadge(last.deltaTotalRs, last.deltaTotalPct)}</TableCell>
                                                    <TableCell className="text-right">{formatPct(last.deltaTotalPct)}</TableCell>
                                                    <TableCell className="text-right">{last.deltaEntryRs !== null ? renderDeltaBadge(last.deltaEntryRs, last.deltaEntryPct) : "—"}</TableCell>
                                                    <TableCell className="text-right">{formatPct(last.deltaEntryPct)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {filteredExtraPhoto.length >= 2 && (
                                            <TableRow className="bg-amber-50/30">
                                                <TableCell className="font-medium"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: PHOTO_COLOR }}></div>Foto Extra (Unit.)</div></TableCell>
                                                <TableCell className="text-right text-muted-foreground">{formatBRL(filteredExtraPhoto[filteredExtraPhoto.length - 2].unitPrice)}</TableCell>
                                                <TableCell className="text-right font-semibold text-amber-700">{formatBRL(filteredExtraPhoto[filteredExtraPhoto.length - 1].unitPrice)}</TableCell>
                                                <TableCell className="text-right">{renderDeltaBadge(filteredExtraPhoto[filteredExtraPhoto.length - 1].deltaUnitRs, filteredExtraPhoto[filteredExtraPhoto.length - 1].deltaUnitPct)}</TableCell>
                                                <TableCell className="text-right text-amber-700">{formatPct(filteredExtraPhoto[filteredExtraPhoto.length - 1].deltaUnitPct)}</TableCell>
                                                <TableCell className="text-right">—</TableCell>
                                                <TableCell className="text-right">—</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Package Tabs */}
                    <div className="mt-8">
                        <Tabs defaultValue={packagesNames[0]}>
                            <TabsList className="mb-4">
                                {packagesNames.map(pkg => (
                                    <TabsTrigger key={pkg} value={pkg}>{pkg}</TabsTrigger>
                                ))}
                                <TabsTrigger value="foto_extra">Foto Extra</TabsTrigger>
                            </TabsList>

                            {packagesNames.map(pkg => (
                                <TabsContent key={pkg} value={pkg}>
                                    <Card className="shadow-sm border-t-4" style={{ borderTopColor: PACKAGE_COLORS[pkg] }}>
                                        <CardHeader>
                                            <CardTitle>Detalhamento: {pkg}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                <div className="p-4 bg-slate-50 rounded-lg border">
                                                    <div className="text-sm text-slate-500 mb-1">CAGR ({filteredPackages[pkg].length - 1} anos)</div>
                                                    <div className="text-xl font-bold">{summaries.cagrData[pkg] !== undefined ? `${summaries.cagrData[pkg].toFixed(1)}%` : '—'}</div>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-lg border">
                                                    <div className="text-sm text-slate-500 mb-1">Entrada Atual</div>
                                                    <div className="text-xl font-bold">{filteredPackages[pkg].length > 0 ? formatBRL(filteredPackages[pkg][filteredPackages[pkg].length - 1].entry) : '—'}</div>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                                                            <TableHead>Ano</TableHead>
                                                            <TableHead className="text-right font-semibold">Total (R$)</TableHead>
                                                            <TableHead className="text-right">Entrada</TableHead>
                                                            <TableHead className="text-right">Parcelas (Qtd x R$)</TableHead>
                                                            <TableHead className="text-right">Saldo (Total-Entrada)</TableHead>
                                                            <TableHead className="text-center" colSpan={2}>Variação Total (vs ano ant.)</TableHead>
                                                            <TableHead className="text-center" colSpan={2}>Variação Entrada (vs ano ant.)</TableHead>
                                                        </TableRow>
                                                        <TableRow className="bg-slate-50 border-t-0 hover:bg-slate-50">
                                                            <TableHead></TableHead>
                                                            <TableHead></TableHead>
                                                            <TableHead></TableHead>
                                                            <TableHead></TableHead>
                                                            <TableHead></TableHead>
                                                            <TableHead className="text-right text-xs">ΔR$</TableHead>
                                                            <TableHead className="text-right text-xs">Δ%</TableHead>
                                                            <TableHead className="text-right text-xs">ΔR$</TableHead>
                                                            <TableHead className="text-right text-xs">Δ%</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {allFilteredYears.map(year => {
                                                            const d = filteredPackages[pkg].find(x => x.year === year);
                                                            if (!d && !alignYears) return null;
                                                            if (!d && alignYears) {
                                                                return (
                                                                    <TableRow key={year} className="text-slate-400">
                                                                        <TableCell>{year}</TableCell>
                                                                        <TableCell className="text-right">—</TableCell>
                                                                        <TableCell className="text-right">—</TableCell>
                                                                        <TableCell className="text-right">—</TableCell>
                                                                        <TableCell className="text-right">—</TableCell>
                                                                        <TableCell className="text-right">—</TableCell>
                                                                        <TableCell className="text-right">—</TableCell>
                                                                        <TableCell className="text-right">—</TableCell>
                                                                        <TableCell className="text-right">—</TableCell>
                                                                    </TableRow>
                                                                );
                                                            }
                                                            // TypeScript constraint
                                                            if (!d) return null;

                                                            return (
                                                                <TableRow key={d.year}>
                                                                    <TableCell className="font-medium text-slate-900">{d.year}</TableCell>
                                                                    <TableCell className="text-right font-bold text-slate-900 text-base">
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            {d.needsAdjustmentBadge && (
                                                                                <Tooltip>
                                                                                    <TooltipTrigger>
                                                                                        <Info className="h-4 w-4 text-amber-500" />
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>
                                                                                        <p className="max-w-xs">Valor do pacote ({formatBRL(d.total)}) difere da soma Entrada + Parcelas ({formatBRL(d.calculatedTotal)}). O Total é usado como referência.</p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            )}
                                                                            {formatBRL(d.total)}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">{formatBRL(d.entry)}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        {d.installmentsCount > 0 ? `${d.installmentsCount}x ${formatBRL(d.installmentValue)}` : "—"}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono text-slate-600">{formatBRL(d.saldo)}</TableCell>
                                                                    <TableCell className="text-right">{renderDeltaBadge(d.deltaTotalRs, d.deltaTotalPct)}</TableCell>
                                                                    <TableCell className="text-right text-slate-500 text-sm font-medium">{formatPct(d.deltaTotalPct)}</TableCell>
                                                                    <TableCell className="text-right">{renderDeltaBadge(d.deltaEntryRs, d.deltaEntryPct)}</TableCell>
                                                                    <TableCell className="text-right text-slate-500 text-sm font-medium">{formatPct(d.deltaEntryPct)}</TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                        {filteredPackages[pkg].length === 0 && (
                                                            <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Nenhum dado no período.</TableCell></TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            ))}

                            <TabsContent value="foto_extra">
                                <Card className="shadow-sm border-t-4" style={{ borderTopColor: PHOTO_COLOR }}>
                                    <CardHeader>
                                        <CardTitle>Detalhamento: Foto Extra</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto max-w-3xl">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-50">
                                                        <TableHead>Ano</TableHead>
                                                        <TableHead className="text-right">Preço Unitário (R$)</TableHead>
                                                        <TableHead className="text-right">Variação R$</TableHead>
                                                        <TableHead className="text-right">Variação %</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredExtraPhoto.map(d => (
                                                        <TableRow key={d.year}>
                                                            <TableCell className="font-medium">{d.year}</TableCell>
                                                            <TableCell className="text-right font-bold text-amber-700">{formatBRL(d.unitPrice)}</TableCell>
                                                            <TableCell className="text-right">{renderDeltaBadge(d.deltaUnitRs, d.deltaUnitPct)}</TableCell>
                                                            <TableCell className="text-right font-medium text-slate-600">{formatPct(d.deltaUnitPct)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                        </Tabs>
                    </div>

                </div>
            </TooltipProvider>
        </Layout>
    );
}
