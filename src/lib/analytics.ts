import type { 
  CheioRow, 
  VazioLocadoTlogRow, 
  VazioLocadoRenaultRow, 
  VazioArmadorRow 
} from "./types";

export function countArmadores(cheios: CheioRow[]) {
  const map: Record<string, number> = { MSC: 0, CMA: 0, MAERSK: 0, ONE: 0 };
  for (const c of cheios) {
    const a = (c.armador || "").toUpperCase();
    if (a.includes("MSC")) map.MSC++;
    else if (a.includes("CMA")) map.CMA++;
    else if (a.includes("MAERSK")) map.MAERSK++;
    else if (a.includes("ONE")) map.ONE++;
  }
  return map;
}

export function summary(
  cheios: CheioRow[],
  vaziosTlog: VazioLocadoTlogRow[],
  vaziosRenault: VazioLocadoRenaultRow[],
  vaziosArmadores: VazioArmadorRow[],
  capacity: number = 600
) {
  const emPatio = cheios.filter((c) => c.status === "EM PATIO TLOG-SJP").length;
  const dePara = cheios.filter((c) => c.status === "DEPARA EM PATIO TLOG-SJP").length;
  const enviadoFabrica = cheios.filter((c) => c.status === "ENVIADO PARA FABRICA").length;
  const programadas = cheios.filter((c) => c.status === "PROGRAMADA ENTRADA NO PATIO").length;
  const finalizados = cheios.filter((c) => c.status === "FINALIZADO").length;
  
  // Contagem baseada na Coluna D (mapeada para campos específicos no parser)
  const qtdTlog = vaziosTlog.filter(v => !!v.data_entrada).length;
  const qtdRenault = vaziosRenault.filter(v => !!v.status_patio).length;
  const qtdArmadores = vaziosArmadores.filter(v => !!v.status).length;

  const ocupacaoSaturacao = emPatio + dePara + qtdTlog + qtdRenault + qtdArmadores;

  return {
    emPatio,
    dePara,
    enviadoFabrica,
    programadas,
    finalizados,
    qtdTlog,
    qtdRenault,
    qtdArmadores,
    ocupacaoSaturacao,
    capacidadeTotal: capacity,
  };
}

export function buildDemurrageBuckets(cheios: CheioRow[]) {
  const buckets = [
    { label: "Vencido", daysRemaining: -1, count: 0, severity: "vencido" as const },
    { label: "0-3 dias", daysRemaining: 3, count: 0, severity: "urgente" as const },
    { label: "4-7 dias", daysRemaining: 7, count: 0, severity: "alerta" as const },
    { label: "8+ dias", daysRemaining: 999, count: 0, severity: "regular" as const },
  ];

  cheios.forEach((c) => {
    const d = c.diasParaVencimento ?? 999;
    if (d < 0) buckets[0].count++;
    else if (d <= 3) buckets[1].count++;
    else if (d <= 7) buckets[2].count++;
    else buckets[3].count++;
  });

  return buckets;
}

export function buildDemurrageRows(cheios: CheioRow[]) {
  return cheios.map((c) => ({
    conteiner: c.conteiner,
    navio: c.navio,
    armador: c.armador,
    chegada: c.dataChegada,
    freeTime: c.freeTime,
    vencimento: c.demurrageVencimento,
    diasRestantes: c.diasParaVencimento,
    statusLabel: (c.diasParaVencimento ?? 0) < 0 ? "PRAZO VENCIDO" : (c.diasParaVencimento ?? 0) <= 3 ? "URGENTE" : (c.diasParaVencimento ?? 0) <= 7 ? "ALERTA" : "REGULAR",
  })).sort((a, b) => (a.diasRestantes ?? 999) - (b.diasRestantes ?? 999));
}