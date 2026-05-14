import type {
  CheioRow,
  VazioLocadoRow,
  VazioIngesysRow,
  VazioLocadoTlogRow,
  VazioLocadoRenaultRow,
  VazioArmadorRow,
} from "./types";

...

export function summary(
  cheios: CheioRow[],
  vazios: VazioLocadoRow[],
  capacity: number = 600,
  ingesys: VazioIngesysRow[] = [],
  vaziosTlog: VazioLocadoTlogRow[] = [],
  vaziosRenault: VazioLocadoRenaultRow[] = [],
  vaziosArmadores: VazioArmadorRow[] = []
) {
  const emPatio = cheios.filter((c) => c.status === "EM PATIO TLOG-SJP").length;
  const dePara = cheios.filter((c) => c.status === "DEPARA EM PATIO TLOG-SJP").length;
  const enviadoFabrica = cheios.filter((c) => c.status === "ENVIADO PARA FABRICA").length;
  const programadas = cheios.filter((c) => c.status === "PROGRAMADA ENTRADA NO PATIO").length;
  const locadoTlog = cheios.filter((c) => c.status === "LOCADO TLOG").length;
  const locadoRenault = cheios.filter((c) => c.status === "LOCADO RENAULT").length;

  // ---- NOVAS CONTAS ----
  // Coluna D nas novas abas contém o status; contamos apenas linhas onde D tem valor.
  const qtdTlog = vaziosTlog.filter((r) => !!r.status).length;
  const qtdRenault = vaziosRenault.filter((r) => !!r.status).length;
  const qtdArmadores = vaziosArmadores.filter((r) => !!r.status).length;

  const fixedLocados = 71; // mantido para compatibilidade
  const fixedVaziosArmadores = 53;

  const finalizados = ingesys.length;
  const ocupacao = emPatio + dePara;
  const ocupacaoSaturacao = emPatio + dePara + fixedLocados + fixedVaziosArmadores + qtdTlog + qtdRenault + qtdArmadores;

  const armadorCounts = countArmadores(cheios);
  const totalArmadores = armadorCounts.MSC + armadorCounts.CMA + armadorCounts.MAERSK + armadorCounts.ONE;

  return {
    totalCheios: cheios.length,
    emPatio,
    dePara,
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
    // novos campos expostos para o Dashboard
    qtdTlog,
    qtdRenault,
    qtdArmadores,
  };
}