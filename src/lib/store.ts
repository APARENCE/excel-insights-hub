import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest, CheioRow, VazioLocadoRow, VazioIngesysRow, ImportRecord } from "./types";
import { supabase } from "@/integrations/supabase/client";
import{ toast } from "sonner";

const INGESYS_STORAGE_KEY = "tlog:vazio-ingesys";

function loadLocalVazioIngesys(): VazioIngesysRow[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(INGESYS_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalVazioIngesys(rows: VazioIngesysRow[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INGESYS_STORAGE_KEY, JSON.stringify(rows));
}

export type UserRole = "CLIENTE" | "TRANSPORTADORA";

const initial: AppDataset & { userRole: UserRole } = {
  cheios: [],
  vaziosLocados: [],
  vazioIngesys: [],
  imports: [],
  priorityRequests: [],
  userRole: "CLIENTE",
  settings: {
    capacidadePatio: 600,
  },
};

let state: AppDataset & { userRole: UserRole } = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

const toInt = (val: any) => (val != null && !isNaN(Number(val)) ? Math.round(Number(val)) : null);

export async function syncFromSupabase() {
  if (typeof window === 'undefined') return;

  try {
    const [
      cheiosRes,
      vaziosRes,
      ingesysRes,
      importsRes,
      prioritiesRes,
      settingsRes
    ] = await Promise.all([
      supabase.from('containers_cheios').select('*'),
      supabase.from('vazios_locados').select('*'),
      supabase.from('vazio_ingesys').select('*'),
      supabase.from('import_history').select('*').order('imported_at', { ascending: false }).limit(50),
      supabase.from('priority_requests').select('*').order('solicitado_em', { ascending: false }),
      supabase.from('app_settings').select('*').maybeSingle()
    ]);

    state = {
      ...state,
      cheios: cheiosRes.data ? cheiosRes.data.map(c => ({
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
        colunaAS: c.coluna_as
      })) : state.cheios,
      vaziosLocados: vaziosRes.data ? vaziosRes.data.map(v => ({
        conteiner: v.conteiner,
        armador: v.armador,
        tipo: v.tipo,
        dataEntrada: v.data_entrada,
        dataDePara: v.data_de_para,
        cheioDePara: v.cheio_de_para,
        statusUso: v.status_uso,
        statusPatio: v.status_patio,
        diasNoPatio: v.dias_no_patio
      })) : state.vaziosLocados,
      vazioIngesys: ingesysRes.error ? loadLocalVazioIngesys() : ingesysRes.data ? ingesysRes.data.map(i => ({
        conteiner: i.conteiner,
        statusD: i.status_d
      })) : state.vazioIngesys,
      imports: importsRes.data ? importsRes.data.map(i => ({
        id: i.id,
        fileName: i.file_name,
        importedAt: i.imported_at,
        itemCount: i.item_count,
        status: i.status as any
      })) : state.imports,
      priorityRequests: prioritiesRes.data ? prioritiesRes.data.map(p => ({
        id: p.id,
        conteiner: p.conteiner,
        nivel: p.nivel,
        status: p.status,
        solicitadoEm: p.solicitado_em,
        fabricaDestino: p.fabrica_destino,
        previsaoFabrica: p.previsao_fabrica,
        observacao: p.observacao
      })) : state.priorityRequests,
      settings: settingsRes.data ? { capacidadePatio: settingsRes.data.capacidade_patio } : state.settings
    };
    emit();
  } catch (error) {
    console.error("Erro ao sincronizar do Supabase:", error);
  }
}

if (typeof window !== 'undefined') {
  supabase.channel('custom-all-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'priority_requests' }, () => syncFromSupabase())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'containers_cheios' }, () => syncFromSupabase())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vazio_ingesys' }, () => syncFromSupabase())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => syncFromSupabase())
    .subscribe();
}

export function setUserRole(role: UserRole) {
  state = { ...state, userRole: role };
  emit();
}

export async function setDataset(updater: (prev: AppDataset & { userRole: UserRole }) => AppDataset & { userRole: UserRole }) {
  const oldLastImport = state.lastImportAt;
  const newState = updater(state);
  
  if (newState.lastImportAt !== oldLastImport) {
    const lastImport = newState.imports[0];
    if (lastImport) {
      try {
        await supabase.from('import_history').insert({
          file_name: lastImport.fileName,
          item_count: lastImport.itemCount,
          status: lastImport.status
        });

        await Promise.all([
          supabase.from('containers_cheios').delete().neq('conteiner', '_none_'),
          supabase.from('vazios_locados').delete().neq('conteiner', '_none_'),
          supabase.from('vazio_ingesys').delete().neq('conteiner', '_none_')
        ]);

        if (newState.cheios.length > 0) {
          await supabase.from('containers_cheios').insert(newState.cheios.map(c => ({
            conteiner: c.conteiner,
            lacre: c.lacre,
            tipo: c.tipo,
            armador: c.armador,
            navio: c.navio,
            data_chegada: c.dataChegada,
            dias_no_patio: toInt(c.diasNoPatio),
            free_time: toInt(c.freeTime),
            demurrage_vencimento: c.demurrageVencimento,
            dias_para_vencimento: toInt(c.diasParaVencimento),
            status: c.status,
            fabrica: c.fabrica,
            data_envio_fabrica: c.dataEnvioFabrica,
            conteiner_de_para: c.conteinerDePara,
            data_devolucao_vazio: c.dataDevolucaoVazio,
            coluna_as: c.colunaAS
          })));
        }

        if (newState.vaziosLocados.length > 0) {
          await supabase.from('vazios_locados').insert(newState.vaziosLocados.map(v => ({
            conteiner: v.conteiner,
            armador: v.armador,
            tipo: v.tipo,
            data_entrada: v.dataEntrada,
            data_de_para: v.dataDePara,
            cheio_de_para: v.cheioDePara,
            status_uso: v.statusUso,
            status_patio: v.statusPatio,
            dias_no_patio: toInt(v.diasNoPatio)
          })));
        }

        saveLocalVazioIngesys(newState.vazioIngesys);

        if (newState.vazioIngesys.length > 0) {
          await supabase.from('vazio_ingesys').insert(newState.vazioIngesys.map(i => ({
            conteiner: i.conteiner,
            status_d: i.statusD
          })));
        }
        
        toast.success("Dados sincronizados com sucesso!");
      } catch (e) {
        console.error("Erro na persistência:", e);
        toast.error("Erro ao salvar no banco.");
      }
    }
  }
  
  state = newState;
  emit();
}

export async function addPriorityRequest(req: PriorityRequest) {
  const { error } = await supabase.from('priority_requests').insert({
    conteiner: req.conteiner,
    nivel: req.nivel,
    status: req.status,
    fabrica_destino: req.fabricaDestino,
    previsao_fabrica: req.previsaoFabrica,
    observacao: req.observacao
  });
  if (error) toast.error("Erro ao salvar prioridade");
  else syncFromSupabase();
}

export async function updatePriorityStatus(id: string, status: PriorityRequest["status"]) {
  const { error } = await supabase.from('priority_requests').update({ status }).eq('id', id);
  if (error) {
    toast.error("Erro ao atualizar status");
    return;
  }
  const request = state.priorityRequests.find(r => r.id === id);
  if (request && (status === 'DESPACHADO' || status === 'FINALIZADO')) {
    await supabase.from('containers_cheios')
      .update({ status: "ENVIADO PARA FABRICA", data_envio_fabrica: new Date().toISOString() })
      .eq('conteiner', request.conteiner);
  }
  syncFromSupabase();
}

export async function deletePriorityRequest(id: string) {
  const { error } = await supabase.from('priority_requests').delete().eq('id', id);
  if (error) toast.error("Erro ao excluir");
  else syncFromSupabase();
}

export async function updateSettings(settings: Partial<AppDataset["settings"]>) {
  const { error } = await supabase.from('app_settings').update({
    capacidade_patio: settings.capacidadePatio
  }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) toast.error("Erro ao salvar configurações");
  else syncFromSupabase();
}

export function useDataset() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => initial,
  );
}