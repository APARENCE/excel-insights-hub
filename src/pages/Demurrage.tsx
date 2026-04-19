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
import { Search, FileText, FileSpreadsheet, AlertTriangle, Clock, CheckCircle2, Table2 } from "lucide-react";
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
  const buckets = useMemo(() => buildDemurrageBuckets(ds.cheios), [ds.cheios]);
  const rows = useMemo(() => buildDemurrageRows(ds.cheios), [ds.cheios]);
  const [q, setQ] = useState("");
  const filteredRows = rows.filter((r) => (q ? r.conteiner.toLowerCase().includes(q.toLowerCase()) : true));

  const total = ds.cheios.length;
  const noPatio = rows.length;
  const vencidos = rows.filter((r) => (r.diasRestantes ?? 0) < 0).length;
  const alerta = rows.filter((r) => (r.diasRestantes ?? 99) >= 0 && (r.diasRestantes ?? 99) <= 3).length;
  const devolvidos = ds.cheios.filter((c) => c.status === "FINALIZADO").length;

  const resumo = [
    { label: "Vencido", count: vencidos, color: "bg-destructive" },
    { label: "Urgente (0-3d)", count: alerta, color: "bg-orange-500" },
    {
      label: "Alerta (4-7d)",
      count: rows.filter((r) => (r.diasRestantes ?? 99) > 3 && (r.diasRestantes ?? 99) <= 7).length,
      color: "bg-warning",
    },
    {
      label: "Regular (>7d)",
      count: rows.filter((r) => (r.diasRestantes ?? 0) > 7).length,
      color: "bg-success",
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Demurrage"
        subtitle="Gestão de prazos"
        actions={
          <>
            <button className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-3 py-1.5 bg-card hover:bg-accent">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-3 py-1.5 bg-card hover:bg-accent">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
          </>
        }
      />

      <div className="px-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Containers" value={total} icon={Table2} />
        <StatCard label="No Pátio TLOG" value={noPatio} icon={Table2} />
        <StatCard label="Em Atraso" value={vencidos} tone="destructive" icon={AlertTriangle} />
        <StatCard label="Alerta (Free Time)" value={alerta} tone="warning" icon={Clock} />
        <StatCard label="Devolvidos" value={devolvidos} tone="success" icon={CheckCircle2} />
      </div>

      <div className="px-6 mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Containers por Dias Restantes:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {buckets.map((b) => (
            <span
              key={b.daysRemaining}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border"
              style={{
                background: `color-mix(in oklch, ${sevColor[b.severity]} 12%, transparent)`,
                borderColor: `color-mix(in oklch, ${sevColor[b.severity]} 40%, transparent)`,
                color: sevColor[b.severity],
              }}
            >
              <span className="font-bold">{b.count} ×</span> {b.label}
            </span>
          ))}
        </div>
      </div>

      <section className="px-6 mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="font-semibold flex items-center gap-2">
            📊 Análise de Vencimento — <span className="text-muted-foreground font-normal">Containers por Dias Restantes</span>
          </div>
          <div className="h-72 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" fontSize={10} angle={-35} textAnchor="end" height={60} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" fontSize={11} />
                  {buckets.map((b, i) => (
                    <Cell key={i} fill={sevColor[b.severity]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="font-semibold flex items-center gap-2 mb-3">⏱ Resumo de Prazos</div>
          <ul className="space-y-3 text-sm">
            {resumo.map((r) => (
              <li key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${r.color}`} />
                  {r.label}
                </div>
                <div>
                  <span className="font-bold">{r.count}</span>{" "}
                  <span className="text-xs text-muted-foreground">un</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-4">* Prazos calculados por data de chegada</p>
        </div>
      </section>

      <div className="px-6 mt-4 pb-8">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar container..."
            className="w-full bg-card border border-border rounded-md pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">CONTAINER</th>
                <th className="px-4 py-3 text-left font-medium">NAVIO</th>
                <th className="px-4 py-3 text-left font-medium">ARMADOR</th>
                <th className="px-4 py-3 text-left font-medium">CHEGADA (G)</th>
                <th className="px-4 py-3 text-left font-medium">FREE TIME (M)</th>
                <th className="px-4 py-3 text-left font-medium">VENCIMENTO (N)</th>
                <th className="px-4 py-3 text-left font-medium">DEVOLUÇÃO</th>
                <th className="px-4 py-3 text-right font-medium">DIAS (O)</th>
                <th className="px-4 py-3 text-left font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum dado disponível.
                  </td>
                </tr>
              )}
              {filteredRows.slice(0, 200).map((r, i) => (
                <tr key={`${r.conteiner}-${i}`} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{r.conteiner}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.navio || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.armador || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.chegada ? new Date(r.chegada).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.freeTime ? `${r.freeTime} d` : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.vencimento ? new Date(r.vencimento).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.devolucao ? new Date(r.devolucao).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{r.diasRestantes ?? "—"}</td>
                  <td className="px-4 py-2.5">
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
    </AppShell>
  );
}
