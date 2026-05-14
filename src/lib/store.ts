import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  AppDataset,
  CheioRow,
  VazioLocadoRow,
  VazioIngesysRow,
  ImportRecord,
  VazioLocadoTlogRow,
  VazioLocadoRenaultRow,
  VazioArmadorRow,
} from "./types";
import { countArmadores } from "./analytics";

function loadLocalVazioIngesys(): VazioIngesysRow[] {
  try {
    const raw = localStorage.getItem("@tlog/vazio_ingesys");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const DEFAULT_DATASET: AppDataset = {
  cheios: [],
  vaziosLocados: [],
  vazioIngesys: [],
  imports: [],
  priorityRequests: [],
  settings: { capacidadePatio: 600 },
  armadorCounts: {},
  userRole: "CLIENTE",
  vaziosLocadosTlog: [],
  vaziosLocadosRenault: [],
  vaziosArmadores: [],
};

let state: AppDataset = { ...DEFAULT_DATASET };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeToDataset(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): AppDataset {
  return state;
}

export function useDataset(): AppDataset {
  try {
    const { useSyncExternalStore } = require("react");
    return useSyncExternalStore(subscribeToDataset, getSnapshot, getSnapshot);
  } catch {
    return state;
  }
}

export function setDataset(update: AppDataset | ((prev: AppDataset) => AppDataset)) {
  if (typeof update === "function") {
    state = update(state);
  } else {
    state = update;
  }
  try {
    localStorage.setItem("@tlog/dataset", JSON.stringify(state));
  } catch {}
  emit();
}

export function updateSettings(settings: Partial<AppDataset["settings"]>) {
  state = { ...state, settings: { ...state.settings, ...settings } };
  emit();
}

export function setUserRole(role: "CLIENTE" | "TRANSPORTADORA") {
  state = { ...state, userRole: role };
  emit();
}

export function addPriorityRequest(req: import("./types").PriorityRequest) {
  state = { ...state, priorityRequests: [req, ...state.priorityRequests] };
  supabase
    .from("priority_requests")
    .insert({
      id: req.id,
      conteiner: req.conteiner,
      nivel: req.nivel,
      status: req.status,
      solicitado_em: req.solicitadoEm,
      fabrica_destino: req.fabricaDestino,
      previsao_fabrica: req.previsaoFabrica,
      observacao: req.observacao,
    })
    .then(({ error }) => {
      if (error) toast.error("Erro ao salvar prioridade.");
    });
  emit();
}

export function updatePriorityStatus(id: string, status: import("./types").RequestStatus) {
  state = {
    ...state,
    priorityRequests: state.priorityRequests.map((r) =>
      r.id === id ? { ...r, status } : r,
    ),
  };
  supabase
    .from("priority_requests")
    .update({ status })
    .eq("id", id)
    .then(({ error }) => {
      if (error) toast.error("Erro ao atualizar status.");
    });
  emit();
}

export function deletePriorityRequest(id: string) {
  state = {
    ...state,
    priorityRequests: state.priorityRequests.filter((r) => r.id !== id),
  };
  supabase
    .from("priority_requests")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) toast.error("Erro ao remover prioridade.");
    });
  emit();
}

export async function syncFromSupabase() {
  if (typeof window === "undefined") return;

  try {
    const [
      cheiosRes,
      vaziosRes,
      ingesysRes,
      importsRes,
      prioritiesRes,
      settingsRes,
      vaziosTlogRes,
      vaziosRenaultRes,
      vaziosArmadoresRes,
    ] = await Promise.all([
      supabase.from("containers_cheios").select("*"),
      supabase.from("vazios_locados").select("*"),
      supabase.from("vazio_ingesys").select("*"),
      supabase
        .from("import_history")
        .select("*")
        .order("imported_at", { ascending: false })
        .limit(50),
      supabase
        .from("priority_requests")
        .select("*")
        .order("solicitado_em", { ascending: false }),
      supabase.from("app_settings").select("*").maybeSingle(),
      supabase.from("vazios_locados_tlog").select("*"),
      supabase.from("vazios_locados_renault").select("*"),
      supabase.from("vazios_armadores").select("*"),
    ]);

    state = {
      ...state,
      cheios: cheiosRes.data
        ? cheiosRes.data.map((c: any) => ({
            conteiner: c.conteiner,
            lacre: c.lacre,
            tipo: c.tipo,
            armador: c.armador,
            navio: c.navio,
            dataChegada: c.data_chegada,
            diasNoPatio: c.dias_no_patio,
            freeTime: c.free_time,
            demurrageVencimento: c.demurrage_vencimento,
            diasParaVencimento: c.dias_para_vencimento,
            status: c.status,
            fabrica: c.fabrica,
            dataEnvioFabrica: c.data_envio_fabrica,
            conteinerDePara: c.conteiner_de_para,
            dataDevolucaoVazio: c.data_devolucao_vazio,
            colunaAS: c.coluna_as,
          }))
        : state.cheios,
      vaziosLocados: vaziosRes.data
        ? vaziosRes.data.map((v: any) => ({
            conteiner: v.conteiner,
            armador: v.armador,
            tipo: v.tipo,
            dataEntrada: v.data_entrada,
            dataDePara: v.data_de_para,
            cheioDePara: v.cheio_de_para,
            statusUso: v.status_uso,
            statusPatio: v.status_patio,
            diasNoPatio: v.dias_no_patio,
          }))
        : state.vaziosLocados,
      vazioIngesys: ingesysRes.error
        ? loadLocalVazioIngesys()
        : ingesysRes.data
          ? ingesysRes.data.map((i: any) => ({
              conteiner: i.conteiner,
              statusD: i.status_d,
            }))
          : state.vazioIngesys,
      vaziosLocadosTlog: vaziosTlogRes.data
        ? vaziosTlogRes.data.map((r: any) => ({
            id: r.id,
            conteiner: r.conteiner,
            armador: r.armador,
            status: r.status,
            data_entrada: r.data_entrada,
            status_patio: r.status_patio,
            dias_no_patio: r.dias_no_patio,
          }))
        : [],
      vaziosLocadosRenault: vaziosRenaultRes.data
        ? vaziosRenaultRes.data.map((r: any) => ({
            id: r.id,
            conteiner: r.conteiner,
            status: r.status,
            data_entrada: r.data_entrada,
            status_patio: r.status_patio,
          }))
        : [],
      vaziosArmadores: vaziosArmadoresRes.data
        ? vaziosArmadoresRes.data.map((r: any) => ({
            id: r.id,
            conteiner: r.conteiner,
            armador: r.armador,
            status: r.status,
          }))
        : [],
      imports: importsRes.data
        ? importsRes.data.map((i: any) => ({
            id: i.id,
            fileName: i.file_name,
            importedAt: i.imported_at,
            itemCount: i.item_count,
            status: i.status as any,
          }))
        : state.imports,
      priorityRequests: prioritiesRes.data
        ? prioritiesRes.data.map((p: any) => ({
            id: p.id,
            conteiner: p.conteiner,
            nivel: p.nivel,
            status: p.status,
            solicitadoEm: p.solicitado_em,
            fabricaDestino: p.fabrica_destino,
            previsaoFabrica: p.previsao_fabrica,
            observacao: p.observacao,
          }))
        : state.priorityRequests,
      settings: settingsRes.data
        ? { capacidadePatio: settingsRes.data.capacidade_patio }
        : state.settings,
      armadorCounts: countArmadores(state.cheios),
    };
    emit();
  } catch (error) {
    console.error("Erro ao sincronizar do Supabase:", error);
    toast.error("Falha ao sincronizar dados.");
  }
}