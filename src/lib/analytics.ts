import type { CheioRow, VazioLocadoRow, VazioIngesysRow } from "./types";

const MS_DAY = 1000 * 60 * 60 * 24;

export function daysBetween(a?: string, b: string = new Date().toISOString()) {
  if (!a) return undefined;
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  if (isNaN(d1) || isNaN(d2)) return undefined;
  return Math.floor((d2 - d1) / MS_DAY);
}

export function daysUntil(target?: string) {
  if (!target) return undefined;
  const t = new Date(target).getTime();
  if (isNaN(t)) return undefined;
  return Math.floor((t - Date.now()) / MS_DAY);
}

export interface DemurrageBucket {
  label: string;
  count: number;
  severity: "vencido" | "urgente" | "alerta" | "regular";
  daysRemaining: number;
}

function rowDiasRestantes(c: CheioRow): number | undefined {
  if (c.diasParaVencimento != null && !isNaN(c.diasParaVencimento)) {
    return Math.round(c.diasParaVencimento);
  }
  if (c.demurrageVencimento) {
    const d = daysUntil(c.demurrageVencimento);
    if (d != null) return d;
  }
  return undefined;
}

export function buildDemurrageBuckets(cheios: CheioRow[]): DemurrageBucket[] {
  const map = new Map<number, number>();
  for (const c of cheios) {
    if (c.status === "FINALIZADO") continue;
    const d = rowDiasRestantes(c);
    if (d == null) continue;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  const arr = Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([d, count]) => ({
      daysRemaining: d,
      count,
      label: d < 0 ? `${Math.abs(d)}d vencido` : `${d}d`,
      severity:
        d < 0
          ? ("vencido" as const)
          : d <= 3
            ? ("urgente" as const)
            : d <= 7
              ? ("alerta" as const)
              : ("regular" as const),
    }));
  return arr;
}

export interface DemurrageRow {
  conteiner: string;
  navio?: string;
  armador?: string;
  chegada?: string;
  freeTime?: number;
  vencimento?: string;
  devolucao?: string;
  diasRestantes?: number;
  statusLabel: "PRAZO VENCIDO" | "URGENTE" | "ALERTA" | "DENTRO DO PRAZO";
}

export function buildDemurrageRows(cheios: CheioRow[]): DemurrageRow[] {
  return cheios
    .filter((c) => c.status !== "FINALIZADO" && c.status !== "PROGRAMADA ENTRADA NO PATIO")
    .map((c) => {
      const d = rowDiasRestantes(c);
      const statusLabel: DemurrageRow["statusLabel"] =
        d == null
          ? "DENTRO DO PRAZO"
          : d < 0
            ? "PRAZO VENCIDO"
            : d <= 3
              ? "URGENTE"
              : d <= 7
                ? "ALERTA"
                : "DENTRO DO PRAZO";
      return {
        conteiner: c.conteiner,
        navio: c.navio,
        armador: c.armador,
        chegada: c.dataChegada,
        freeTime: c.freeTime,
        vencimento: c.demurrageVencimento,
        devolucao: c.dataDevolucaoVazio,
        diasRestantes: d,
        statusLabel,
      };
    })
    .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999));
}

function countArmadores(cheios: CheioRow[]) {
  const counts = { MSC: 0, CMA: 0, MAERSK: 0, ONE: 0 };
  for (const c of cheios) {
    const arm = (c.armador ?? "").toUpperCase().trim();
    if (arm === "MSC") counts.MSC++;
    else if (arm === "CMA CGM" || arm === "CMA") counts.CMA++;
    else if (arm === "MAERSK") counts.MAERSK++;
    else if (arm === "ONE") counts.ONE++;
  }
  return counts;
}

export function summary(
  cheios: CheioRow[],
  vazios: VazioLocadoRow[],
  capacity: number = 600,
  ingesys: VazioIngesysRow[] = []
) {
  // Ocupação Atual baseada na coluna AA: EM PATIO TLOG-SJP, EM PROCESSO DEPARA, DEPARA EM PATIO TLOG-SJP
  const emPatio = cheios.filter((c) => c.status === "EM PATIO TLOG-SJP").length;
  const dePara = cheios.filter((c) => c.status === "DEPARA EM PATIO TLOG-SJP").length;
  const emProcessoDepara = cheios.filter((c) => c.status === "EM PROCESSO DEPARA").length;
  
  const enviadoFabrica = cheios.filter((c) => c.status === "ENVIADO PARA FABRICA").length;
  const programadas = cheios.filter((c) => c.status === "PROGRAMADA ENTRADA NO PATIO").length;
  const locadoTlog = cheios.filter((c) => c.status === "LOCADO TLOG").length;
  const locadoRenault = cheios.filter((c) => c.status === "LOCADO RENAULT").length;
  
  const fixedLocados = 71;
  const fixedVaziosArmadores = 53;
  
  const finalizados = ingesys.length;
  
  // Soma dos status solicitados para a ocupação real do pátio
  const ocupacao = emPatio + dePara + emProcessoDepara;
  
  // Ocupação total considerando os itens fixos (saturação)
  const ocupacaoSaturacao = ocupacao + fixedLocados + fixedVaziosArmadores;
  
  const armadorCounts = countArmadores(cheios);
  const totalArmadores = armadorCounts.MSC + armadorCounts.CMA + armadorCounts.MAERSK + armadorCounts.ONE;

  return {
    totalCheios: cheios.length,
    emPatio,
    dePara,
    emProcessoDepara,
    enviadoFabrica,
    finalizados,
    programadas,
    locadoTlog,
    locadoRenault,
    ocupacao,
    ocupacaoSaturacao,
    capacidadeTotal: capacity,
    armadorCounts,
    totalArmadores,
  };
}

export function statusDistribution(cheios: CheioRow[]) {
  const map = new Map<string, number>();
  for (const c of cheios) map.set(c.status, (map.get(c.status) ?? 0) + 1);
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function dailyMovement(cheios: CheioRow[]) {
  const entries = new Map<string, number>();
  const devolucoes = new Map<string, number>();
  for (const c of cheios) {
    if (c.dataChegada) {
      const k = c.dataChegada.slice(0, 10);
      entries.set(k, (entries.get(k) ?? 0) + 1);
    }
    const s = (c.status || "").toUpperCase();
    if (s.includes("FINALIZADO") || s.includes("VAZIO INGESYS") || s.includes("LOCADO")) {
      const k = (c.dataDevolucaoVazio || c.dataEnvioFabrica || c.dataChegada || "").slice(0, 10);
      if (k) devolucoes.set(k, (devolucoes.get(k) ?? 0) + 1);
    }
  }
  const days = Array.from(new Set([...entries.keys(), ...devolucoes.keys()])).sort();
  return days.slice(-12).map((d) => ({
    date: d.slice(5).split("-").reverse().join("/"),
    entradas: entries.get(d) ?? 0,
    devolucoes: devolucoes.get(d) ?? 0,
  }));
}