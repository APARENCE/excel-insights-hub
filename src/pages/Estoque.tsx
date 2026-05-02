"use client";

import { useMemo, useState } from "react";
import { Search, CheckCircle2, Clock, ArrowDownToLine, Ship, FileSpreadsheet, Filter } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useDataset } from "@/lib/store";
import { summary } from "@/lib/analytics";
import { exportToExcel } from "@/lib/excel-parser";

function statusTone(s: string): "success" | "info" | "warning" | "default" | "primary" {
  if (s.includes("FINALIZ") || s.includes("DEVOLV")) return "success";
  if (s.includes("HORSE") || s.includes("FABRICA")) return "info";
  if (s.includes("DEPARA") || s.includes("DÊ PARA")) return "warning";
  if (s.includes("EM PATIO")) return "primary";
  return "default";
}

export default function EstoquePage() {
  const ds = useDataset();
  const s = summary(ds.cheios, ds.vaziosLocados, ds.settings.capacidadePatio);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    return ds.cheios
      .filter((c) => (filter === "all" ? true : c.status === filter))
      .filter((c) => (q ? c.conteiner.toLowerCase().includes(q.toLowerCase()) : true));
  }, [ds.cheios, q, filter]);

  const statuses = useMemo(() => Array.from(new Set(ds.cheios.map((c) => c.status))), [ds.cheios]);

  const handleExport = () => {
    const exportData = rows.map(r => ({
      Container: r.conteiner,
      Lacre: r.lacre || "",
      Tipo: r.tipo || "",
      Armador: r.armador || "",
      Navio: r.navio || "",
      "Data Chegada": r.dataChegada ? new Date(r.dataChegada).toLocaleDateString("pt-BR") : "",
      Status: r.status,
      "Dê-Para": r.conteinerDePara || "",
      "Data Envio Fábrica": r.dataEnvioFabrica ? new Date(r.dataEnvioFabrica).toLocaleDateString("pt-BR") : "",
      "Info AS": r.colunaAS || ""
    }));
    exportToExcel(exportData, `Estoque_TLOG_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Estoque Pátio"
        subtitle="Monitoramento e gestão"
        actions={
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button 
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 text-xs font-bold border border-border rounded-xl px-4 py-2.5 bg-card hover:bg-accent cursor-pointer flex-1 sm:flex-none transition-all"
            >
              <FileSpreadsheet className="h-4 w-4 text-success" /> Exportar
            </button>
            <SettingsDialog />
          </div>
        }
      />

      <div className="px-4 md:px-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Em Pátio" value={s.emPatio} hint="No pátio TLOG-SJP" icon={CheckCircle2} tone="success" />
        <StatCard label="Enviado p/ Fábrica" value={s.enviadoFabrica} hint="Saídas registradas" icon={Clock} tone="warning" />
        <StatCard label="Finalizados" value={s.finalizados} hint="Concluídos" icon={ArrowDownToLine} tone="default" active />
      </div>

      <div className="px-4 md:px-8 mt-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar container..."
            className="w-full bg-card border border-border rounded-xl pl-10 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 md:w-64">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-transparent text-sm outline-none font-medium cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 md:px-8 mt-4 pb-12">
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/50 border-b border-border">
                <tr className="text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  <th className="px-6 py-4">Identificação</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Armador</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 hidden md:table-cell">Dê-Para</th>
                  <th className="px-6 py-4">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-40">
                      Nenhum container encontrado
                    </td>
                  </tr>
                )}
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={r.conteiner + i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-foreground">{r.conteiner}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">{r.tipo || "—"}</div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <Ship className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-bold text-xs">{r.armador || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-muted-foreground font-black text-xs">
                      {r.conteinerDePara || "—"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-bold text-xs">
                      {r.dataChegada ? new Date(r.dataChegada).toLocaleDateString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
            <div className="px-6 py-3 bg-muted/20 border-t border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
              Mostrando {Math.min(rows.length, 200)} de {rows.length} registros
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}