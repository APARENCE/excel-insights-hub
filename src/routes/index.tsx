import { createFileRoute } from "@tanstack/react-router";
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
import { RefreshCw, Settings, Car, Repeat, MapPin, CalendarClock, LogOut } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { useDataset } from "@/lib/store";
import { dailyMovement, statusDistribution, summary } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const STATUS_COLORS = ["#16a34a", "#94a3b8", "#64748b", "#a855f7", "#0ea5e9", "#f59e0b", "#ef4444"];

function Dashboard() {
  const ds = useDataset();
  const s = summary(ds.cheios, ds.vaziosLocados);
  const dist = statusDistribution(ds.cheios);
  const movement = dailyMovement(ds.cheios);
  const ocupacaoPct = Math.round((s.ocupacao / s.capacidadeTotal) * 1000) / 10;
  const livres = s.capacidadeTotal - s.ocupacao;

  return (
    <AppShell>
      <PageHeader
        title="Operação Spot Renault-Terminal Tlog"
        subtitle="Visão geral em tempo real"
        actions={
          <>
            <button className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-3 py-1.5 bg-card hover:bg-accent">
              <Settings className="h-4 w-4" /> Configurações
            </button>
            <button className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-2.5 py-1.5 bg-card hover:bg-accent">
              <RefreshCw className="h-4 w-4" />
            </button>
          </>
        }
      />
      <div className="px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Ocupação Atual" value={s.ocupacao} hint={`de ${s.capacidadeTotal} vagas`} icon={Car} tone="success" />
        <StatCard label="Depara em pátio TLOG-SJP" value={s.dePara} hint="Dê-para realizados" icon={Repeat} tone="warning" />
        <StatCard label="Em Pátio TLOG-SJP" value={s.emPatio} hint="No pátio TLOG-SJP" icon={MapPin} tone="info" />
        <StatCard label="Enviado para Fábrica" value={s.enviadoFabrica} hint="Em trânsito p/ fábrica" icon={CalendarClock} tone="primary" />
        <StatCard label="Finalizados" value={s.finalizados} hint="Concluídos" icon={LogOut} />
      </div>

      <section className="px-6 mt-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-primary font-semibold">Capacidade</div>
              <div className="text-xs text-muted-foreground">Métricas</div>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-success text-success-foreground text-xs font-bold">NORMAL</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex flex-col items-center justify-center">
              <CapacityRing pct={ocupacaoPct} />
            </div>
            <div>
              <div className="text-[11px] uppercase text-muted-foreground">Ocupadas</div>
              <div className="text-3xl font-bold text-warning-foreground">{s.ocupacao}</div>
              <div className="text-xs text-muted-foreground">de {s.capacidadeTotal}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-muted-foreground">Livres</div>
              <div className="text-3xl font-bold text-success">{livres}</div>
              <div className="text-xs text-muted-foreground">agora</div>
            </div>
            <div>
              <div className="text-[11px] uppercase text-muted-foreground">Taxa</div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div className="h-full bg-success" style={{ width: `${Math.min(ocupacaoPct, 100)}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{ocupacaoPct}%</div>
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
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="rounded-md bg-info/5 border border-info/20 p-2 text-center">
              <div className="text-[10px] uppercase text-muted-foreground">Ocupação Atual</div>
              <div className="text-xl font-bold text-info">{s.emPatio}</div>
            </div>
            <div className="rounded-md bg-success/5 border border-success/20 p-2 text-center">
              <div className="text-[10px] uppercase text-muted-foreground">Devoluções</div>
              <div className="text-xl font-bold text-success">{s.finalizados}</div>
            </div>
          </div>
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
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Em Pátio TLOG-SJP</div>
              <div className="text-xl font-bold text-primary">{s.emPatio}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Maior</div>
              <div className="text-sm font-bold">FINALIZADO {s.finalizados}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Menor</div>
              <div className="text-sm font-bold">EM PROCESSO</div>
            </div>
          </div>
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

function CapacityRing({ pct }: { pct: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(pct, 100) / 100) * c;
  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--info)" strokeWidth="10" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-bold text-info">{pct}%</div>
        <div className="text-[10px] text-muted-foreground">Ocupado</div>
      </div>
    </div>
  );
}
