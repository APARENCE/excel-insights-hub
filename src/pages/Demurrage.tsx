"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";
import { Search, FileText, FileSpreadsheet, AlertTriangle, Clock, Table2, MapPin } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useDataset } from "@/lib/store";
import { buildDemurrageBuckets, buildDemurrageRows } from "@/lib/analytics";

const sevColor = {
  vencido: "#ef4444",
  urgente: "#f97316",
  alerta: "#eab308",
  regular: "#16a34a",
} as const;

export default function DemurragePage() {
  const ds = useDataset();
  
  const filteredCheios = useMemo(() => 
    ds.cheios.filter(c => c.status === "EM PATIO TLOG-SJP"), 
    [ds.cheios]
  );

  const buckets = useMemo(() => buildDemurrageBuckets(filteredCheios), [filteredCheios]);
  const rows = useMemo(() => buildDemurrageRows(filteredCheios), [filteredCheios]);
  
  const [q, setQ] = useState("");
  const filteredRows = rows.filter((r) => (q ? r.conteiner.toLowerCase().includes(q.toLowerCase()) : true));

  const totalNoPatio = filteredCheios.length;
  const vencidos = rows.filter((r) => (r.diasRestantes ?? 0) < 0).length;
  const alerta = rows.filter((r) => (r.diasRestantes ?? 99) >= 0 && (r.diasRestantes ?? 99) <= 3).length;
  const regular = rows.filter((r) => (r.diasRestantes ?? 0) > 7).length;
  const alertaMedio = rows.filter((r) => (r.diasRestantes ?? 99) > 3 && (r.diasRestantes ?? 99) <= 7).length;

  const resumo = [
    { label: "Vencido", count: vencidos, color: "bg-destructive" },
    { label: "Urgente (0-3d)", count: alerta, color: "bg-orange-500" },
    { label: "Alerta (4-7d)", count: alertaMedio, color: "bg-warning" },
    { label: "Regular (>7d)", count: regular, color: "bg-success" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Demurrage"
        subtitle="Gestão de prazos (Apenas containers em pátio)"
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="inline-flex items-center justify-center gap-2 text-xs font-bold border border-border rounded-xl px-4 py-2.5 bg-card hover:bg-accent flex-1 sm:flex-none transition-all">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button className="inline-flex items-center justify-center gap-2 text-xs font-bold border border-border rounded-xl px-4 py-2.5 bg-card hover:bg-accent flex-1 sm:flex-none transition-all">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </div>
        }
      />

      <div className="px-4 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total em Pátio" value={totalNoPatio} icon={MapPin} tone="primary" />
        <StatCard label="Em Atraso" value={vencidos} tone="destructive" icon={AlertTriangle} />
        <StatCard label="Urgente" value={alerta} tone="warning" icon={Clock} />
        <StatCard label="Regular" value={regular} tone="success" icon={Table2} />
      </div>

      <div className="px-4 md:px-8 mt-6">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
          Distribuição de Vencimento:
        </div>
        <div className="flex flex-wrap gap-2">
          {buckets.map((b) => (
            <span
              key={b.daysRemaining}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-tight"
              style={{
                background: `color-mix(in oklch, ${sevColor[b.severity]} 10%, transparent)`,
                borderColor: `color-mix(in oklch, ${sevColor[b.severity]} 30%, transparent)`,
                color: sevColor[b.severity],
              }}
            >
              <span className="opacity-60">{b.count} ×</span> {b.label}
            </span>
          ))}
        </div>
      </div>

      <section className="px-4 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="font-black text-sm uppercase tracking-widest flex items-center gap-2 mb-6">
            📊 Análise de Vencimento
          </div>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" fontSize={9} fontWeight="bold" angle={-35} textAnchor="end" height={50} />
                <YAxis fontSize={10} fontWeight="bold" allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={30}>
                  <LabelList dataKey="count" position="top" fontSize={10} fontWeight="bold" />
                  {buckets.map((b, i) => (
                    <Cell key={i} fill={sevColor[b.severity]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="font-black text-sm uppercase tracking-widest flex items-center gap-2 mb-6">⏱ Resumo</div>
          <ul className="space-y-4">
            {resumo.map((r) => (
              <li key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${r.color} shadow-sm`} />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{r.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black">{r.count}</span>
                  <span className="text-[9px] font-black text-muted-foreground uppercase">un</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed tracking-widest">
              * Prazos calculados apenas para containers com status "EM PATIO TLOG-SJP"
            </p>
          </div>
        </div>
      </section>

      <div className="px-4 md:px-8 mt-6 pb-16">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar container no pátio..."
            className="w-full bg-card border border-border rounded-xl pl-10 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  <th className="px-6 py-4">Container</th>
                  <th className="px-6 py-4">Navio / Armador</th>
                  <th className="px-6 py-4">Chegada</th>
                  <th className="px-6 py-4">Free Time</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4 text-right">Dias</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-40">
                      Nenhum container em pátio disponível
                    </td>
                  </tr>
                )}
                {filteredRows.slice(0, 200).map((r, i) => (
                  <tr key={`${r.conteiner}-${i}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-black text-foreground">{r.conteiner}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold">{r.navio || "—"}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">{r.armador || "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-bold text-xs">
                      {r.chegada ? new Date(r.chegada).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-bold text-xs">{r.freeTime ? `${r.freeTime} d` : "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground font-bold text-xs">
                      {r.vencimento ? new Date(r.vencimento).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-sm">{r.diasRestantes ?? "—"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        tone={
                          r.statusLabel === "PRAZO VENCIDO"
                            ? "destructive"
                            : r.statusLabel === "URGENTE"
                              ? "warning"
                              : r.statusLabel === "ALERTA"
                                ? "warning"
                                : "success"
                        }
                      >
                        {r.statusLabel}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}