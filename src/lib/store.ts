"use client";

import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest, CheioRow, VazioLocadoRow, VazioIngesysRow, ImportRecord, VazioGenericRow } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DATASET_STORAGE_KEY = "tlog:dataset";
const INGESYS_STORAGE_KEY = "tlog:vazio-ingesys";

export type UserRole = "CLIENTE" | "TRANSPORTADORA";

const initial: AppDataset & { userRole: UserRole } = {
  cheios: [],
  vaziosLocados: [],
  vazioIngesys: [],
  vaziosLocadosRenault: [],
  vaziosLocadosTlog: [],
  vaziosArmadores: [],
  imports: [],
  priorityRequests: [],
  userRole: "CLIENTE",
  settings: {
    capacidadePatio: 600,
  },
  armadorCounts: { MSC: 0, CMA: 0, MAERSK: 0 },
};

// Carrega os dados salvos localmente para evitar perda no refresh
function loadLocalDataset(): AppDataset & { userRole: UserRole } {
  if (typeof window === 'undefined') return initial;
  try {
    const saved = window.localStorage.getItem(DATASET_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...initial, ...parsed };
    }
  } catch (e) {
    console.error("Erro ao carregar dataset local:", e);
  }
  return initial;
}

// Salva os dados localmente de forma síncrona
function saveLocalDataset(data: AppDataset & { userRole: UserRole }) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao salvar dataset local:", e);
  }
}

let state: AppDataset & { userRole: UserRole } = loadLocalDataset();
const listeners = new Set<() => void>();

function emit() {
  saveLocalDataset(state);
  for (const l of listeners) l();
}

const toInt = (val: any) => (val != null && !isNaN(Number(val)) ? Math.round(Number(val)) : null);

export async function syncFromSupabase() {
  if (typeof window === 'undefined') return;

  console.log("[SUPABASE] Iniciando sincronização...");

  try {
    const results = await Promise.allSettled([
      supabase.from('containers_cheios').select('*'),
      supabase.from('vazios_locados').select('*'),
      supabase.from('vazio_ingesys').select('*'),
      supabase.from('import_history').select('*').order('imported_at', { ascending: false }).limit(50),
      supabase.from('priority_requests').select('*').order('solicitado_em', { ascending: false }),
      supabase.from('app_settings').select('*').maybeSingle(),
      supabase.from('vazios_locados_renault').select('*'),
      supabase.from('vazios_locados_tlog').select('*'),
      supabase.from('vazios_armadores').select('*')
    ]);

    const getData = (idx: number) => {
      const res = results[idx];
      return res.status === 'fulfilled' ? (res.value as any).data : null;
    };

    const cheiosData = getData(0);
    const vaziosData = getData(1);
    const ingesysData = getData(2);
    const importsData = getData(3);
    const prioritiesData = getData(4);
    const settingsData = getData(5);
    const renaultData = getData(6);
    const tlogData = getData(7);
    const armadoresData = getData(8);

    state = {
      ...state,
      cheios: cheiosData ? cheiosData.map((c: any) => ({
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
      vaziosLocados: vaziosData ? vaziosData.map((v: any) => ({
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
      vazioIngesys: ingesysData ? ingesysData.map((i: any) => ({
        conteiner: i.conteiner,
        statusD: i.status_d
      })) : state.vazioIngesys,
      vaziosLocadosRenault: renaultData ? renaultData.map((v: any) => ({
        id: v.id,
        conteiner: v.conteiner,
        colunaD: v.coluna_d || "N/A"
      })) : state.vaziosLocadosRenault,
      vaziosLocadosTlog: tlogData ? tlogData.map((v: any) => ({
        id: v.id,
        conteiner: v.conteiner,
        colunaD: v.coluna_d || "N/A"
      })) : state.vaziosLocadosTlog,
      vaziosArmadores: armadoresData ? armadoresData.map((v: any) => ({
        id: v.id,
        conteiner: v.conteiner,
        colunaD: v.coluna_d || "N/A"
      })) : state.vaziosArmadores,
      imports: importsData ? importsData.map((i: any) => ({
        id: i.id,
        fileName: i.file_name,
        importedAt: i.imported_at,
        itemCount: i.item_count,
        status: i.status as any
      })) : state.imports,
      priorityRequests: prioritiesData ? prioritiesData.map((p: any) => ({
        id: p.id,
        conteiner: p.conteiner,
        nivel: p.nivel,
        status: p.status,
        solicitadoEm: p.solicitado_em,
        fabricaDestino: p.fabrica_destino,
        previsaoFabrica: p.previsao_fabrica,
        observacao: p.observacao
      })) : state.priorityRequests,
      settings: settingsData ? { capacidadePatio: settingsData.capacidade_patio } : state.settings,
      armadorCounts: countArmadores(state.cheios)
    };
    emit();
    console.log("[SUPABASE] Sincronização concluída com sucesso.");
  } catch (error) {
    console.error("[SUPABASE] Erro na sincronização:", error);
  }
}

if (typeof window !== 'undefined') {
  supabase.channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'priority_requests' }, () => syncFromSupabase())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'containers_cheios' }, () => syncFromSupabase())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vazio_ingesys' }, () => syncFromSupabase())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vazios_locados_renault' }, () => syncFromSupabase())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vazios_locados_tlog' }, () => syncFromSupabase())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vazios_armadores' }, () => syncFromSupabase())
    .subscribe();
}

export function setUserRole(role: UserRole) {
  state = { ...state, userRole: role };
  emit();
}

export async function setDataset(updater: (prev: AppDataset & { userRole: UserRole }) => AppDataset & { userRole: UserRole }) {
  const oldLastImport = state.lastImportAt;
  const newState = updater(state);
  
  // Atualiza o estado local imediatamente para persistência instantânea
  state = newState;
  emit();

  if (newState.lastImportAt !== oldLastImport) {
    const lastImport = newState.imports[0];
    if (lastImport) {
      try {
        await supabase.from('import_history').insert({
          file_name: lastImport.fileName,
          item_count: lastImport.itemCount,
          status: lastImport.status
        });

        const tables = [
          { name: 'containers_cheios', data: newState.cheios, map: (c: CheioRow) => ({
            conteiner: c.conteiner, lacre: c.lacre, tipo: c.tipo, armador: c.armador, navio: c.navio,
            data_chegada: c.dataChegada, dias_no_patio: toInt(c.diasNoPatio), free_time: toInt(c.freeTime),
            demurrage_vencimento: c.demurrageVencimento, dias_para_vencimento: toInt(c.diasParaVencimento),
            status: c.status, fabrica: c.fabrica, data_envio_fabrica: c.dataEnvioFabrica,
            conteiner_de_para: c.conteinerDePara, data_devolucao_vazio: c.dataDevolucaoVazio, coluna_as: c.colunaAS
          })},
          { name: 'vazios_locados', data: newState.vaziosLocados, map: (v: VazioLocadoRow) => ({
            conteiner: v.conteiner, armador: v.armador, tipo: v.tipo, data_entrada: v.dataEntrada,
            data_de_para: v.dataDePara, cheio_de_para: v.cheioDePara, status_uso: v.statusUso,
            status_patio: v.statusPatio, dias_no_patio: toInt(v.diasNoPatio)
          })},
          { name: 'vazio_ingesys', data: newState.vazioIngesys, map: (i: VazioIngesysRow) => ({
            conteiner: i.conteiner, status_d: i.statusD
          })},
          { name: 'vazios_locados_renault', data: newState.vaziosLocadosRenault, map: (v: VazioGenericRow) => ({
            conteiner: v.conteiner, coluna_d: v.colunaD
          })},
          { name: 'vazios_locados_tlog', data: newState.vaziosLocadosTlog, map: (v: VazioGenericRow) => ({
            conteiner: v.conteiner, coluna_d: v.colunaD
          })},
          { name: 'vazios_armadores', data: newState.vaziosArmadores, map: (v: VazioGenericRow) => ({
            conteiner: v.conteiner, coluna_d: v.colunaD
          })}
        ];

        for (const table of tables) {
          if (table.data.length > 0) {
            console.log(`[SUPABASE] Atualizando tabela: ${table.name}`);
            await supabase.from(table.name).delete().neq('conteiner', '_none_');
            const { error } = await supabase.from(table.name).insert(table.data.map(table.map as any));
            if (error) console.error(`[SUPABASE] Erro ao inserir em ${table.name}:`, error);
          }
        }
        
        toast.success("Dados sincronizados com Supabase!");
        await syncFromSupabase();
      } catch (e) {
        console.error("[SUPABASE] Erro crítico no salvamento:", e);
        toast.error("Erro ao salvar no banco de dados.");
      }
    }
  }
}

export async function clearDataset() {
  try {
    console.log("[SUPABASE] Iniciando limpeza completa de dados...");
    
    // Limpa o localStorage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DATASET_STORAGE_KEY);
      window.localStorage.removeItem(INGESYS_STORAGE_KEY);
    }

    // Deleta todos os registros de todas as tabelas operacionais
    await Promise.all([
      supabase.from('containers_cheios').delete().neq('conteiner', '_none_'),
      supabase.from('vazios_locados').delete().neq('conteiner', '_none_'),
      supabase.from('vazio_ingesys').delete().neq('conteiner', '_none_'),
      supabase.from('vazios_locados_renault').delete().neq('conteiner', '_none_'),
      supabase.from('vazios_locados_tlog').delete().neq('conteiner', '_none_'),
      supabase.from('vazios_armadores').delete().neq('conteiner', '_none_'),
      supabase.from('import_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('priority_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ]);

    // Reseta o estado local mantendo apenas as configurações e o perfil do usuário
    state = {
      ...initial,
      userRole: state.userRole,
      settings: state.settings
    };
    
    emit();
    toast.success("Todos os dados foram limpos com sucesso!");
  } catch (error) {
    console.error("[SUPABASE] Erro ao limpar dados:", error);
    toast.error("Erro ao realizar a limpeza dos dados.");
  }
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

function countArmadores(cheios: CheioRow[]) {
  const counts: Record<string, number> = { MSC: 0, CMA: 0, MAERSK: 0 };
  for (const c of cheios) {
    const arm = (c.armador ?? "").toUpperCase();
    if (arm.includes("MSC")) counts.MSC += 1;
    if (arm.includes("CMA")) counts.CMA += 1;
    if (arm.includes("MAERSK")) counts.MAERSK += 1;
  }
  return counts;
}