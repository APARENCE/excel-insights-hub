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

export type ContainerStatus =
  | "EM PATIO TLOG-SJP"
  | "DEPARA EM PATIO TLOG-SJP"
  | "ENVIADO PARA FABRICA"
  | "PROGRAMADA ENTRADA NO PATIO"
  | "FINALIZADO"
  | "LOCADO TLOG"
  | "LOCADO RENAULT"
  | "VAZIO INGESYS"
  | "OUTRO";

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
}

export interface VazioIngesysRow {
  conteiner: string;
  statusD: string;
}

export interface VazioLocadoTlogRow {
  id: string;
  conteiner: string;
  armador?: string;
  status?: string;
  data_entrada?: string;
  status_patio?: string;
  dias_no_patio?: number;
}

export interface VazioLocadoRenaultRow {
  id: string;
  conteiner: string;
  status?: string;
  data_entrada?: string;
  status_patio?: string;
}

export interface VazioArmadorRow {
  id: string;
  conteiner: string;
  armador?: string;
  status?: string;
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

export type PriorityLevel = "NORMAL" | "ALTA" | "CRITICA";
export type RequestStatus = "PENDENTE" | "CARREGANDO" | "DESPACHADO" | "FINALIZADO";

export interface PriorityRequest {
  id: string;
  conteiner: string;
  nivel: PriorityLevel;
  status: RequestStatus;
  solicitadoEm: string;
  fabricaDestino?: string;
  previsaoFabrica?: string;
  observacao?: string;
}

export interface AppDataset {
  cheios: CheioRow[];
  vaziosLocados: VazioLocadoRow[];
  vazioIngesys: VazioIngesysRow[];
  vaziosLocadosTlog: VazioLocadoTlogRow[];
  vaziosLocadosRenault: VazioLocadoRenaultRow[];
  vaziosArmadores: VazioArmadorRow[];
  imports: ImportRecord[];
  priorityRequests: PriorityRequest[];
  lastImportAt?: string;
  settings: AppSettings;
  armadorCounts: Record<string, number>;
  userRole: "CLIENTE" | "TRANSPORTADORA";
}