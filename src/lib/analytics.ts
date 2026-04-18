import type { CheioRow, VazioLocadoRow } from "./types";

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

export function buildDemurrageBuckets(cheios: CheioRow[]): DemurrageBucket[] {
  const map = new Map<number, number>();
  for (const c of cheios) {
    const d = c.diasParaVencimento ?? daysUntil(c.demurrageVencimento);
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
    .filter((c) => c.status !== "FINALIZADO" && c.status !== "DEVOLVIDO")
    .map((c) => {
      const d = c.diasParaVencimento ?? daysUntil(c.demurrageVencimento);
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
    .sort((a, b) => (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999));
}

export function summary(cheios: CheioRow[], vazios: VazioLocadoRow[]) {
  const emPatio = cheios.filter(
    (c) => c.status === "EM PATIO TLOG-SJP" || c.status === "DEPARA EM PATIO TLOG-SJP" || c.status === "EM PROCESSO DE DEPARA",
  ).length;
  const enviadoFabrica = cheios.filter((c) => c.status === "ENVIO HORSE" || c.status === "ENVIADO PARA FABRICA").length;
  const finalizados = cheios.filter((c) => c.status === "FINALIZADO" || c.status === "DEVOLVIDO").length;
  const dePara = cheios.filter((c) => c.status === "DEPARA EM PATIO TLOG-SJP" || c.status === "DÊ PARA REALIZADO").length;
  const vaziosEmPatio = vazios.filter(
    (v) => !v.statusPatio || !/(devolv|finaliz|sa[ií]da)/i.test(v.statusPatio),
  ).length;

  return {
    totalCheios: cheios.length,
    emPatio,
    enviadoFabrica,
    finalizados,
    dePara,
    totalVaziosLocados: vazios.length,
    vaziosEmPatio,
    capacidadeTotal: 600,
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
    if (c.status === "FINALIZADO" || c.status === "DEVOLVIDO") {
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
