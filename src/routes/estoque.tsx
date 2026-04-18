import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, FileText, Settings, CheckCircle2, Clock, ArrowDownToLine } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useDataset } from "@/lib/store";
import { summary } from "@/lib/analytics";

export const Route = createFileRoute("/estoque")({
  component: EstoquePage,
});

function statusTone(s: string): "success" | "info" | "warning" | "default" | "primary" {
  if (s.includes("FINALIZ") || s.includes("DEVOLV")) return "success";
  if (s.includes("HORSE") || s.includes("FABRICA")) return "info";
  if (s.includes("DEPARA") || s.includes("DÊ PARA")) return "warning";
  if (s.includes("EM PATIO")) return "primary";
  return "default";
}

function EstoquePage() {
  const ds = useDataset();
  const s = summary(ds.cheios, ds.vaziosLocados);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    return ds.cheios
      .filter((c) => (filter === "all" ? true : c.status === filter))
      .filter((c) => (q ? c.conteiner.toLowerCase().includes(q.toLowerCase()) : true))
      .slice(0, 200);
  }, [ds.cheios, q, filter]);

  const statuses = useMemo(() => Array.from(new Set(ds.cheios.map((c) => c.status))), [ds.cheios]);

  return (
    <AppShell>
      <PageHeader
        title="Estoque Pátio"
        subtitle="Monitoramento e gestão"
        actions={
          <>
            <button className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-3 py-1.5 bg-card hover:bg-accent">
              <FileText className="h-4 w-4" /> PDF
            </button>
            <button className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-3 py-1.5 bg-card hover:bg-accent">
              <Settings className="h-4 w-4" /> Configurações
            </button>
          </>
        }
      />

      <div className="px-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="Em Pátio" value={s.emPatio} hint="No pátio TLOG-SJP" icon={CheckCircle2} tone="success" />
        <StatCard label="Enviado p/ Fábrica" value={s.enviadoFabrica} hint="Saídas registradas" icon={Clock} tone="warning" />
        <StatCard label="Finalizados" value={s.finalizados} hint="Concluídos" icon={ArrowDownToLine} tone="default" active />
      </div>

      <div className="px-6 mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por ID ou detalhes..."
            className="w-full bg-card border border-border rounded-md pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded border border-border bg-card text-muted-foreground">⏷ Status:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos os Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-6 mt-4 pb-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Identificação</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Posição</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhum container. Importe um arquivo Excel em <strong>Importar Dados</strong>.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.conteiner + i} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.conteiner}</div>
                    <div className="text-[11px] text-muted-foreground">#{5158 + i}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.dataChegada ? new Date(r.dataChegada).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
