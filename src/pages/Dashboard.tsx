import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { RefreshCw, Car, Repeat, MapPin, ClipboardList, Boxes, Package } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useDataset } from "@/lib/store";
import { dailyMovement, statusDistribution, summary } from "@/lib/analytics";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = ["#16a34a", "#94a3b8", "#64748b", "#a855f7", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const ds = useDataset();
  const s = summary(ds.cheios, ds.vaziosLocados, ds.settings.capacidadePatio, ds.vazioIngesys);
  const dist = statusDistribution(ds.cheios);
  const movement = dailyMovement(ds.cheios);
  
  // Lógica de Agrupamento e Contagem da Coluna D (Filtrando vazios/N/A)
  const groupedRenault = useMemo(() => {
    const map = new Map<string, number>();
    const valid = ds.vaziosLocadosRenault.filter(v => v.colunaD && v.colunaD !== "N/A" && v.colunaD !== "-");
    valid.forEach(v => map.set(v.colunaD, (map.get(v.colunaD) || 0) + 1));
    return Array.from(map.entries());
  }, [ds.vaziosLocadosRenault]);

  const groupedTlog = useMemo(() => {
    const map = new Map<string, number>();
    const valid = ds.vaziosLocadosTlog.filter(v => v.colunaD && v.colunaD !== "N/A" && v.colunaD !== "-");
    valid.forEach(v => map.set(v.colunaD, (map.get(v.colunaD) || 0) + 1));
    return Array.from(map.entries());
  }, [ds.vaziosLocadosTlog]);

  const groupedArmadores = useMemo(() => {
    const map = new Map<string, number>();
    const valid = ds.vaziosArmadores.filter(v => v.colunaD && v.colunaD !== "N/A" && v.colunaD !== "-");
    valid.forEach(v => map.set(v.colunaD, (map.get(v.colunaD) || 0) + 1));
    return Array.from(map.entries());
  }, [ds.vaziosArmadores]);

  // Totais baseados na presença de valor na Coluna D
  const totalRenaultD = groupedRenault.reduce((acc, curr) => acc + curr[1], 0);
  const totalTlogD = groupedTlog.reduce((acc, curr) => acc + curr[1], 0);
  const totalArmadoresD = groupedArmadores.reduce((acc, curr) => acc + curr[1], 0);

  // SOMA TOTAL: Ocupação Real (Cheios) + Vazios (Renault + Tlog + Armadores)
  const ocupacaoTotalReal = s.ocupacao + totalRenaultD + totalTlogD + totalArmadoresD;
  
  const ocupacaoPct = Math.round((ocupacaoTotalReal / s.capacidadeTotal) * 1000) / 10;
  const livres = s.capacidadeTotal - ocupacaoTotalReal;
  const isCritical = ocupacaoPct >= 90;

  return (
    <AppShell>
      <PageHeader
        title="Operação Spot Renault-Terminal Tlog"
        subtitle="Visão geral em tempo real"
        actions={
          <>
            <SettingsDialog />
            <button 
              className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-2.5 py-1.5 bg-card hover:bg-accent"
              onClick={() => typeof window !== 'undefined' && window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </>
        }
      />
      
      <div className="px-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          label="Ocupação Total (Pátio)" 
          value={ocupacaoTotalReal} 
          hint={`Cheios (${s.ocupacao}) + Vazios (${totalRenaultD + totalTlogD + totalArmadoresD})`} 
          icon={Car} 
          tone="success" 
          active
        />
        <StatCard label="Programada Entrada" value={s.programadas} hint="Aguardando chegada" icon={ClipboardList} tone="warning" />
        <StatCard label="Depara em pátio" value={s.dePara} hint="Dê-para realizados" icon={Repeat} tone="info" />
        <StatCard label="Em Pátio TLOG" value={s.emPatio} hint="No pátio TLOG-SJP" icon={MapPin} tone="primary" />
      </div>

      {/* Seção: Gestão de Vazios */}
      <section className="px-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Boxes className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Gestão de Vazios</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Vazios Renault" value={totalRenaultD} hint={`${ds.vaziosLocadosRenault.length} total registros`} icon={Package} tone="info" />
          <StatCard label="Total Vazios Tlog" value={totalTlogD} hint={`${ds.vaziosLocadosTlog.length} total registros`} icon={Package} tone="warning" />
          <StatCard label="Total Vazios Armadores" value={totalArmadoresD} hint={`${ds.vaziosArmadores.length} total registros`} icon={Package} tone="primary" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detalhes Renault */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase text-muted-foreground px-1">Status Vazios Renault</div>
            <div className="grid grid-cols-1 gap-2">
              {groupedRenault.length === 0 && <div className="text-xs italic text-muted-foreground p-4 border border-dashed rounded-lg">Nenhum dado disponível</div>}
              {groupedRenault.map(([label, count]) => (
                <StatCard key={label} label={label} value={count} tone="info" />
              ))}
            </div>
          </div>

          {/* Detalhes Tlog */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase text-muted-foreground px-1">Status Vazios Tlog</div>
            <div className="grid grid-cols-1 gap-2">
              {groupedTlog.length === 0 && <div className="text-xs italic text-muted-foreground p-4 border border-dashed rounded-lg">Nenhum dado disponível</div>}
              {groupedTlog.map(([label, count]) => (
                <StatCard key={label} label={label} value={count} tone="warning" />
              ))}
            </div>
          </div>

          {/* Detalhes Armadores */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase text-muted-foreground px-1">Status Vazios Armadores</div>
            <div className="grid grid-cols-1 gap-2">
              {groupedArmadores.length === 0 && <div className="text-xs italic text-muted-foreground p-4 border border-dashed rounded-lg">Nenhum dado disponível</div>}
              {groupedArmadores.map(([label, count]) => (
                <StatCard key={label} label={label} value={count} tone="primary" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 mt-6">
        <div className={cn(
          "rounded-xl border p-5 transition-colors",
          isCritical ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className={cn("font-semibold", isCritical ? "text-destructive" : "text-primary")}>Capacidade Operacional Total</div>
              <div className="text-xs text-muted-foreground">Soma de Cheios (AA) + Vazios (Renault, Tlog, Armadores)</div>
            </div>
            <span className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold",
              isCritical ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-success text-success-foreground"
            )}>
              {isCritical ? "CRÍTICO" : "NORMAL"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex flex-col items-center justify-center">
              <CapacityRing pct={ocupacaoPct} isCritical={isCritical} />
            </div>
            <div>
              <div className="text-[11px] uppercase text-muted-foreground">Total Ocupado</div>
              <div className={cn("text-3xl font-bold", isCritical ? "text-destructive" : "text-warning-foreground")}>{ocupacaoTotalReal}</div>
              <div className="text-xs text-muted-foreground">de {s.capacidadeTotal}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-muted-foreground">Livres</div>
              <div className={cn("text-3xl font-bold", isCritical ? "text-destructive" : "text-success")}>{livres}</div>
              <div className="text-xs text-muted-foreground">agora</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-muted-foreground">Taxa</div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div className={cn("h-full transition-all duration-500", isCritical ? "bg-destructive" : "bg-success")} style={{ width: `${Math.min(ocupacaoPct, 100)}%` }} />
              </div>
              <div className={cn("text-xs mt-1 font-bold", isCritical ? "text-destructive" : "text-muted-foreground")}>{ocupacaoPct}%</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-info font-semibold flex items-center gap-2">
            <span>📈</span> Movimentações do Pátio
          </div>
          <p className="text-xs text-muted-foreground mb-3">Análise detalhada de entradas e saídas diárias</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movement}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={11} angle={-30} textAnchor="end" height={50} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" fill="#0ea5e9" name="Entradas (G)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="devolucoes" fill="#16a34a" name="Devoluções" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="devolucoes" position="top" fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-primary font-semibold flex items-center gap-2">
            <span>📊</span> Status do Estoque
          </div>
          <p className="text-xs text-muted-foreground mb-3">Distribuição detalhada do inventário por status</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={2}>
                  {dist.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function CapacityRing({ pct, isCritical }: { pct: number; isCritical: boolean }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(pct, 100) / 100) * c;
  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle 
          cx="50" 
          cy="50" 
          r={r} 
          fill="none" 
          stroke={isCritical ? "var(--destructive)" : "var(--info)"} 
          strokeWidth="10" 
          strokeDasharray={c} 
          strokeDashoffset={off} 
          strokeLinecap="round" 
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn("text-xl font-bold", isCritical ? "text-destructive" : "text-info")}>{pct}%</div>
        <div className="text-[10px] text-muted-foreground">Ocupado</div>
      </div>
    </div>
  );
}