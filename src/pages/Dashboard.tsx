"use client";

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
import { RefreshCw, Car, Repeat, MapPin, CalendarClock, LogOut, ClipboardList, Boxes } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useDataset } from "@/lib/store";
import { dailyMovement, statusDistribution, summary } from "@/lib/analytics";

const STATUS_COLORS = ["#16a34a", "#94a3b8", "#64748b", "#a855f7", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const ds = useDataset();
  const s = summary(ds.cheios, ds.vaziosLocados, ds.settings.capacidadePatio);
  const dist = statusDistribution(ds.cheios);
  const movement = dailyMovement(ds.cheios);
  const ocupacaoPct = Math.round((s.ocupacao / s.capacidadeTotal) * 1000) / 10;
  const livres = s.capacidadeTotal - s.ocupacao;

  return (
    <AppShell>
      <PageHeader
        title="Operação Spot Renault"
        subtitle="Terminal Tlog — Visão Geral"
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SettingsDialog />
            <button 
              className="inline-flex items-center justify-center gap-2 text-sm border border-border rounded-xl px-4 py-2 bg-card hover:bg-accent transition-all duration-200 flex-1 sm:flex-none"
              onClick={() => typeof window !== 'undefined' && window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sm:hidden">Atualizar</span>
            </button>
          </div>
        }
      />
      
      <div className="px-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Ocupação Atual" value={s.ocupacao} hint={`de ${s.capacidadeTotal} vagas`} icon={Car} tone="success" />
        <StatCard label="Programada Entrada" value={s.programadas} hint="Aguardando chegada" icon={ClipboardList} tone="warning" />
        <StatCard label="Depara em pátio" value={s.dePara} hint="Dê-para realizados" icon={Repeat} tone="info" />
        <StatCard label="Em Pátio TLOG" value={s.emPatio} hint="No pátio TLOG-SJP" icon={MapPin} tone="primary" />
        <StatCard label="Enviado Fábrica" value={s.enviadoFabrica} hint="Em trânsito p/ fábrica" icon={CalendarClock} />
        <StatCard label="Finalizados" value={s.finalizados} hint="Concluídos" icon={LogOut} />
      </div>

      <section className="px-4 md:px-8 mt-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <div className="text-lg font-bold text-foreground">Capacidade Operacional</div>
              <div className="text-sm text-muted-foreground">Ocupação real do pátio em tempo real</div>
            </div>
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-success/10 text-success text-[10px] font-bold tracking-widest border border-success/20">STATUS: NORMAL</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center">
            <div className="flex flex-col items-center justify-center">
              <CapacityRing pct={ocupacaoPct} />
            </div>
            <div className="text-center md:text-left">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest mb-1">Vagas Ocupadas</div>
              <div className="text-4xl font-bold text-warning-foreground tracking-tight">{s.ocupacao}</div>
              <div className="text-xs text-muted-foreground font-medium">Limite: {s.capacidadeTotal}</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest mb-1">Vagas Livres</div>
              <div className="text-4xl font-bold text-success tracking-tight">{livres}</div>
              <div className="text-xs text-muted-foreground font-medium">Disponíveis agora</div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-widest">Taxa de Utilização</div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success transition-all duration-1000 ease-out" style={{ width: `${Math.min(ocupacaoPct, 100)}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">{ocupacaoPct}%</span>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Eficiência</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-info/10 p-2 rounded-lg">
              <Repeat className="h-5 w-5 text-info" />
            </div>
            <div className="text-lg font-bold">Movimentações do Pátio</div>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Análise detalhada de entradas e saídas diárias</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movement} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" fontSize={10} fontWeight="600" axisLine={false} tickLine={false} />
                <YAxis fontSize={10} fontWeight="600" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: '600' }} />
                <Bar dataKey="entradas" fill="#0ea5e9" name="Entradas" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="devolucoes" fill="#16a34a" name="Devoluções" radius={[4, 4, 0, 0]} barSize={20}>
                  <LabelList dataKey="devolucoes" position="top" fontSize={10} fontWeight="600" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Boxes className="h-5 w-5 text-primary" />
            </div>
            <div className="text-lg font-bold">Status do Estoque</div>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Distribuição detalhada do inventário por status</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={dist} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  innerRadius={65} 
                  paddingAngle={4}
                  stroke="none"
                >
                  {dist.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px', fontWeight: '600', paddingLeft: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function CapacityRing({ pct }: { pct: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(pct, 100) / 100) * c;
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 drop-shadow-sm">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
        <circle 
          cx="50" cy="50" r={r} fill="none" 
          stroke="var(--info)" strokeWidth="10" 
          strokeDasharray={c} strokeDashoffset={off} 
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-info tracking-tight">{pct}%</div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Ocupado</div>
      </div>
    </div>
  );
}