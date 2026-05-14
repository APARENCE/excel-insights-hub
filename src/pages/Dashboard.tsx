import { summary } from "@/lib/analytics";
...
export default function Dashboard() {
  const ds = useDataset();
  const s = summary(
    ds.cheios,
    ds.vaziosLocados,
    ds.settings.capacidadePatio,
    ds.vazioIngesys,
    // @ts-ignore – as propriedades foram adicionadas dinamicamente ao AppDataset
    ds.vaziosLocadosTlog,
    ds.vaziosLocadosRenault,
    ds.vaziosArmadores
  );

  const ocupacaoPct = Math.round((s.ocupacaoSaturacao / s.capacidadeTotal) * 1000) / 10;
  const livres = s.capacidadeTotal - s.ocupacaoSaturacao;

  return (
    <AppShell>
      <PageHeader
        title="Operação Spot Renault‑Terminal Tlog"
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

      {/* --- Cards existentes --- */}
      <div className="px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard label="Ocupação Atual" value={s.ocupacaoSaturacao} hint={`de ${s.capacidadeTotal} vagas`} icon={Car} tone="success" />
        <StatCard label="Programada Entrada" value={s.programadas} hint="Aguardando chegada" icon={ClipboardList} tone="warning" />
        <StatCard label="Depara em pátio" value={s.dePara} hint="Dê‑para realizados" icon={Repeat} tone="info" />
        <StatCard label="Em Pátio TLOG" value={s.emPatio} hint="No pátio TLOG‑SJP" icon={MapPin} tone="primary" />
        <StatCard label="Locado TLOG" value={s.locadoTlog} hint="Soma Coluna AA" icon={Key} tone="warning" />
        <StatCard label="Locado Renault" value={s.locadoRenault} hint="Soma Coluna AA" icon={Truck} tone="info" />
        <StatCard label="Vazio Ingesys" value={s.finalizados} hint="Coluna D preenchida" icon={PackageCheck} tone="destructive" />
      </div>

      {/* --- Novos cards para as abas importadas --- */}
      <div className="px-6 mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Vazios Locados TLOG"
          value={s.qtdTlog}
          hint="Contagem da aba VAZIOS LOCADOS TLOG (coluna D)"
          icon={Package}
          tone="primary"
        />
        <StatCard
          label="Vazios Locados Renault"
          value={s.qtdRenault}
          hint="Contagem da aba VAZIOS LOCADOS RENAULT (coluna D)"
          icon={Package}
          tone="info"
        />
        <StatCard
          label="Vazios Armadores"
          value={s.qtdArmadores}
          hint="Contagem da aba VAZIOS ARMADORES (coluna D)"
          icon={Package}
          tone="warning"
        />
      </div>

      {/* ... resto do dashboard permanece inalterado ... */}
    </AppShell>
  );
}