import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest, CheioRow, VazioLocadoRow, ImportRecord } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UserRole = "CLIENTE" | "TRANSPORTADORA";

const initial: AppDataset & { userRole: UserRole } = {
  cheios: [],
  vaziosLocados: [],
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

// Fetch initial data from Supabase
export async function syncFromSupabase() {
  try {
    const [
      { data: cheios },
      { data: vazios },
      { data: imports },
      { data: priorities },
      { data: settings }
    ] = await Promise.all([
      supabase.from('containers_cheios').select('*'),
      supabase.from('vazios_locados').select('*'),
      supabase.from('import_history').select('*').order('imported_at', { ascending: false }).limit(50),
      supabase.from('priority_requests').select('*').order('solicitado_em', { ascending: false }),
      supabase.from('app_settings').select('*').single()
    ]);

    state = {
      ...state,
      cheios: (cheios || []).map(c => ({
        ...c,
        dataChegada: c.data_chegada,
        diasNoPatio: c.dias_no_patio,
        freeTime: c.free_time,
        demurrageVencimento: c.demurrage_vencimento,
        diasParaVencimento: c.dias_para_vencimento,
        dataEnvioFabrica: c.data_envio_fabrica,
        conteinerDePara: c.conteiner_de_para,
        dataDevolucaoVazio: c.data_devolucao_vazio,
        colunaAS: c.coluna_as
      })),
      vaziosLocados: (vazios || []).map(v => ({
        ...v,
        dataEntrada: v.data_entrada,
        dataDePara: v.data_de_para,
        cheioDePara: v.cheio_de_para,
        statusUso: v.status_uso,
        statusPatio: v.status_patio,
        diasNoPatio: v.dias_no_patio
      })),
      imports: (imports || []).map(i => ({
        id: i.id,
        fileName: i.file_name,
        importedAt: i.imported_at,
        itemCount: i.item_count,
        status: i.status as any
      })),
      priorityRequests: (priorities || []).map(p => ({
        ...p,
        solicitadoEm: p.solicitado_em,
        fabricaDestino: p.fabrica_destino,
        previsaoFabrica: p.previsao_fabrica
      })),
      settings: settings ? { capacidadePatio: settings.capacidade_patio } : initial.settings
    };
    emit();
  } catch (error) {
    console.error("Error syncing from Supabase:", error);
  }
}

// Subscribe to real-time changes
supabase.channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public' }, () => {
    syncFromSupabase();
  })
  .subscribe();

export function setUserRole(role: UserRole) {
  state = { ...state, userRole: role };
  emit();
}

export function getDataset() {
  return state;
}

export async function setDataset(updater: (prev: AppDataset & { userRole: UserRole }) => AppDataset & { userRole: UserRole }) {
  const newState = updater(state);
  
  // If imports changed, we need to sync the new data to Supabase
  if (newState.lastImportAt !== state.lastImportAt) {
    const lastImport = newState.imports[0];
    if (lastImport) {
      await supabase.from('import_history').insert({
        file_name: lastImport.fileName,
        item_count: lastImport.itemCount,
        status: lastImport.status
      });

      // Bulk update containers (this is a simplified version, in production you'd want to be more careful)
      // For now, we'll just clear and re-insert to keep it simple as requested
      await Promise.all([
        supabase.from('containers_cheios').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('vazios_locados').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);

      await Promise.all([
        supabase.from('containers_cheios').insert(newState.cheios.map(c => ({
          conteiner: c.conteiner,
          lacre: c.lacre,
          tipo: c.tipo,
          armador: c.armador,
          navio: c.navio,
          data_chegada: c.dataChegada,
          dias_no_patio: c.diasNoPatio,
          free_time: c.freeTime,
          demurrage_vencimento: c.demurrageVencimento,
          dias_para_vencimento: c.diasParaVencimento,
          status: c.status,
          fabrica: c.fabrica,
          data_envio_fabrica: c.dataEnvioFabrica,
          conteiner_de_para: c.conteinerDePara,
          data_devolucao_vazio: c.dataDevolucaoVazio,
          coluna_as: c.colunaAS
        }))),
        supabase.from('vazios_locados').insert(newState.vaziosLocados.map(v => ({
          conteiner: v.conteiner,
          armador: v.armador,
          tipo: v.tipo,
          data_entrada: v.dataEntrada,
          data_de_para: v.dataDePara,
          cheio_de_para: v.cheioDePara,
          status_uso: v.statusUso,
          status_patio: v.statusPatio,
          dias_no_patio: v.diasNoPatio
        })))
      ]);
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

  // If dispatched or finished, update the container status too
  const request = state.priorityRequests.find(r => r.id === id);
  if (request) {
    if (status === 'DESPACHADO') {
      await supabase.from('containers_cheios')
        .update({ 
          status: "ENVIADO PARA FABRICA",
          data_envio_fabrica: new Date().toISOString()
        })
        .eq('conteiner', request.conteiner);
    } else if (status === 'FINALIZADO') {
      await supabase.from('containers_cheios')
        .update({ status: "FINALIZADO" })
        .eq('conteiner', request.conteiner);
    }
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
  }).neq('id', '00000000-0000-0000-0000-000000000000'); // Update the single settings row

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

// Initial sync
syncFromSupabase();