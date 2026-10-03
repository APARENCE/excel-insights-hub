export type ContainerStatus =
  | "EM PATIO TLOG-SJP"
  | "DEPARA EM PATIO TLOG-SJP"
  | "EM PROCESSO DEPARA"
  | "ENVIADO PARA FABRICA"
  | "FINALIZADO"
  | "PROGRAMADA ENTRADA NO PATIO"
  | "LOCADO RENAULT"
  | "LOCADO TLOG"
  | "VAZIO INGESYS"
  | "OUTRO";

export type PriorityLevel = "CRITICA" | "ALTA" | "NORMAL";
export type RequestStatus = "PENDENTE" | "CARREGANDO" | "DESPACHADO" | "FINALIZADO";

export interface PriorityRequest {
  id: string;
  conteiner: string;
  nivel: PriorityLevel;
  status: RequestStatus;
  solicitadoEm: string;
  carregandoEm?: string;    // quando foi para CARREGANDO
  despachadoEm?: string;    // quando foi para DESPACHADO
  finalizadoEm?: string;    // quando foi para FINALIZADO
  fabricaDestino?: string;
  previsaoFabrica?: string;
  observacao?: string;
}

export interface ProcessTimes {
  totalMinutes: number | null;           // solicitadoEm -> finalizadoEm
  carregandoMinutes: number | null;      // solicitadoEm -> carregandoEm
  despachandoMinutes: number | null;     // carregandoEm -> despachadoEm
  finalizandoMinutes: number | null;     // despachadoEm -> finalizadoEm
  isComplete: boolean;
}

export function calculateProcessTimes(req: PriorityRequest): ProcessTimes {
  const start = req.solicitadoEm ? new Date(req.solicitadoEm).getTime() : null;
  const carregando = req.carregandoEm ? new Date(req.carregandoEm).getTime() : null;
  const despachado = req.despachadoEm ? new Date(req.despachadoEm).getTime() : null;
  const finalizado = req.finalizadoEm ? new Date(req.finalizadoEm).getTime() : null;

  if (!start) {
    return { totalMinutes: null, carregandoMinutes: null, despachandoMinutes: null, finalizandoMinutes: null, isComplete: false };
  }

  const carregandoMinutes = carregando ? Math.round((carregando - start) / 60000) : null;
  const despachandoMinutes = (carregando && despachado) ? Math.round((despachado - carregando) / 60000) : null;
  const finalizandoMinutes = (despachado && finalizado) ? Math.round((finalizado - despachado) / 60000) : null;
  const totalMinutes = finalizado ? Math.round((finalizado - start) / 60000) : null;

  return {
    totalMinutes,
    carregandoMinutes,
    despachandoMinutes,
    finalizandoMinutes,
    isComplete: !!finalizado
  };
}

export function formatMinutes(min: number | null): string {
  if (min === null) return "—";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

export interface CheioRow {
  conteiner: string;
  lacre?: string;
  tipo?: string;
  armador?: string;
  navio?: string;
  dataChegada?: string;
  diasNoPatio?: number;
  freeTime?: number;
  demurrageVencimento?: string;
  diasParaVencimento?: number;
  status: ContainerStatus;
  fabrica?: string;
  dataEnvioFabrica?: string;
  conteinerDePara?: string;
  dataDevolucaoVazio?: string;
  colunaAS?: string;
  raw?: Record<string, unknown>;
}

export interface VazioLocadoRow {
  conteiner: string;
  armador?: string;
  tipo?: string;
  dataEntrada?: string;
  dataDePara?: string;
  cheioDePara?: string;
  statusUso?: string;
  statusPatio?: string;
  diasNoPatio?: number;
  dataRetorno?: string;
}

export interface VazioGenericRow {
  id: string;
  conteiner: string;
  colunaD: string;
}

export interface VazioIngesysRow {
  conteiner: string;
  statusD: string;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  importedAt: string;
  itemCount: number;
  status: "success" | "error";
}

export interface AppSettings {
  capacidadePatio: number;
  onedriveSpreadsheetUrl?: string;
}

export interface AppDataset {
  cheios: CheioRow[];
  vaziosLocados: VazioLocadoRow[];
  vazioIngesys: VazioIngesysRow[];
  vaziosLocadosRenault: VazioGenericRow[];
  vaziosLocadosTlog: VazioGenericRow[];
  vaziosArmadores: VazioGenericRow[];
  imports: ImportRecord[];
  priorityRequests: PriorityRequest[];
  lastImportAt?: string;
  activeImportId?: string;
  settings: AppSettings;
  armadorCounts: Record<string, number>;
}