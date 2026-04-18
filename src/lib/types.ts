export type ContainerStatus =
  | "EM PATIO TLOG-SJP"
  | "DEPARA EM PATIO TLOG-SJP"
  | "EM PROCESSO DE DEPARA"
  | "ENVIO HORSE"
  | "FINALIZADO"
  | "DEVOLVIDO"
  | "DÊ PARA REALIZADO"
  | "ENVIADO PARA FABRICA"
  | "OUTRO";

export interface CheioRow {
  conteiner: string;
  lacre?: string;
  tipo?: string;
  armador?: string;
  navio?: string;
  dataChegada?: string; // ISO
  diasNoPatio?: number;
  freeTime?: number;
  demurrageVencimento?: string; // ISO
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

export interface AppDataset {
  cheios: CheioRow[];
  vaziosLocados: VazioLocadoRow[];
  imports: ImportRecord[];
  lastImportAt?: string;
}
