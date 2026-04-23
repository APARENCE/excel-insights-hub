export type ContainerStatus =
  | "EM PATIO TLOG-SJP"
  | "DEPARA EM PATIO TLOG-SJP"
  | "ENVIADO PARA FABRICA"
  | "FINALIZADO"
  | "PROGRAMADA ENTRADA NO PATIO"
  | "OUTRO";

export type PriorityLevel = "CRITICA" | "ALTA" | "NORMAL";
export type RequestStatus = "PENDENTE" | "CARREGANDO" | "DESPACHADO";

export interface PriorityRequest {
  id: string;
  conteiner: string;
  nivel: PriorityLevel;
  status: RequestStatus;
  solicitadoEm: string;
  previsaoFabrica?: string;
  observacao?: string;
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

export interface ImportRecord {
  id: string;
  fileName: string;
  importedAt: string;
  itemCount: number;
  status: "success" | "error";
}

export interface AppSettings {
  capacidadePatio: number;
}

export interface AppDataset {
  cheios: CheioRow[];
  vaziosLocados: VazioLocadoRow[];
  imports: ImportRecord[];
  priorityRequests: PriorityRequest[];
  lastImportAt?: string;
  settings: AppSettings;
}