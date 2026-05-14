"use client";

import { 
  Car, 
  ClipboardList, 
  Repeat, 
  MapPin, 
  Key, 
  Truck, 
  PackageCheck, 
  RefreshCw,
  Package
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useDataset } from "@/lib/store";
import { summary } from "@/lib/analytics";

export default function Dashboard() {
  const ds = useDataset();
  const s = summary(
    ds.cheios,
    ds.vaziosLocadosTlog,
    ds.vaziosLocadosRenault,
    ds.vaziosArmadores,
    ds.settings.capacidadePatio
  );

  const ocupacaoPct = Math.round((s.ocupacaoSaturacao / s.capacidadeTotal) * 100);

  return (
    <AppShell>
      <PageHeader
        title="Operação Spot Renault — Terminal Tlog"
        subtitle="Visão geral em tempo real"
        actions={
          <>
            <SettingsDialog />
            <button
              className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-2.5 py-1.5 bg-card hover:bg-accent"
              onClick={() => typeof window !== "undefined" && window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard 
          label="Ocupação Atual" 
          value={`${ocupacaoPct}%`} 
          hint={`${s.ocupacaoSaturacao} de ${s.capacidadeTotal} vagas`} 
          icon={Car} 
          tone="success" 
          active 
        />
        <StatCard 
          label="Programada Entrada" 
          value={s.programadas} 
          hint="Aguardando chegada" 
          icon={ClipboardList} 
          tone="warning" 
        />
        <StatCard 
          label="Depara em pátio" 
          value={s.dePara} 
          hint="Dê-para realizados" 
          icon={Repeat} 
          tone="info" 
        />
        <StatCard 
          label="Em Pátio TLOG" 
          value={s.emPatio} 
          hint="No pátio TLOG-SJP" 
          icon={MapPin} 
          tone="primary" 
        />
      </div>

      <div className="px-6 mt-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Controle de Vazios (Coluna D)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Vazios Locados TLOG"
            value={s.qtdTlog}
            hint="Aba: VAZIOS LOCADOS TLOG"
            icon={Package}
            tone="primary"
          />
          <StatCard
            label="Vazios Locados Renault"
            value={s.qtdRenault}
            hint="Aba: VAZIOS LOCADOS RENAULT"
            icon={Truck}
            tone="info"
          />
          <StatCard
            label="Vazios Armadores"
            value={s.qtdArmadores}
            hint="Aba: VAZIOS ARMADORES"
            icon={Key}
            tone="warning"
          />
        </div>
      </div>

      <div className="px-6 mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" /> Status da Operação
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Capacidade Utilizada</span>
              <span className="text-sm font-bold">{s.ocupacaoSaturacao} / {s.capacidadeTotal}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(ocupacaoPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              * A ocupação considera containers em pátio, de-para e todos os vazios locados/armadores.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}