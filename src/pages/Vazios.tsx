import { useMemo, useState } from "react";
import { Search, FileText, Package, Clock, CheckCircle2, Truck, LogOut, BarChart3 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useDataset } from "@/lib/store";

export default function VaziosPage() {
  const ds = useDataset();
  const [q, setQ] = useState("");

  const total = ds.vaziosLocados.length;
  const emPatio = ds.vaziosLocados.filter((v) => !v.statusPatio || /patio|pátio|fabrica/i.test(v.statusPatio)).length;
  const dePara = ds.vaziosLocados.filter((v) => /realizado/i.test(v.statusUso || "")).length;
  const fabrica = ds.vaziosLocados.filter((v) => /fabrica/i.test(v.statusPatio || "")).length;
  const saida = ds.vaziosLocados.filter((v) => /devolv|saida|saída/i.test(v.statusPatio || "")).length;

  const rows = useMemo(
    () =>
      ds.vaziosLocados
        .filter((v) => (q ? v.conteiner.toLowerCase().includes(q.toLowerCase()) : true))
        .slice(0, 300),
    [ds.vaziosLocados, q],
  );

  return (
    <AppShell>
      <PageHeader
        title="Vazios Locados em Pátio"
        subtitle="Gerenciamento de containers vazios"
        actions={
          <button className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-3 py-1.5 bg-card hover:bg-accent">
            <FileText className="h-4 w-4" /> PDF
          </button>
        }
      />

      <div className="px-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Locados" value={total} icon={Package} />
        <StatCard label="Vazio Locados em Pátio TLOG" value={emPatio} tone="success" active icon={Clock} />
        <StatCard label="Dê para Realizado" value={dePara} icon={CheckCircle2} />
        <StatCard label="Enviado Fábrica" value={fabrica} icon={Truck} />
        <StatCard label="Saída / Devolvido" value={saida} icon={LogOut} />
      </div>

      <div className="px-6 mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar container..."
            className="w-full bg-card border border-border rounded-md pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="px-6 mt-4 pb-8">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Listagem Analítica
            </div>
            <div className="text-xs text-muted-foreground">{rows.length} registros</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">IDENTIFICAÇÃO</th>
                  <th className="px-4 py-3 text-left font-medium">TIPO</th>
                  <th className="px-4 py-3 text-left font-medium">ARMADOR</th>
                  <th className="px-4 py-3 text-left font-medium">CHEGADA</th>
                  <th className="px-4 py-3 text-left font-medium">RETORNO</th>
                  <th className="px-4 py-3 text-left font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhum container vazio. Importe um arquivo Excel.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={`${r.conteiner}-${i}`} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{r.conteiner}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.tipo || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.armador || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.dataEntrada ? new Date(r.dataEntrada).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.dataRetorno ? new Date(r.dataRetorno).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge tone="info">{r.statusUso || "DÊ PARA REALIZADO"}</StatusBadge>
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
