"use client";

import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest, CheioRow, VazioLocadoRow, VazioIngesysRow, ImportRecord, VazioGenericRow } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  activeImportId: undefined,
  settings: {
    capacidadePatio: 600,
  },
  armadorCounts: { MSC: 0, CMA: 0, MAERSK: 0 },
};

// Inicializa o estado imediatamente a partir do localStorage para carregamento instantâneo (Offline-First)
function getInitialState(): AppDataset & { userRole: UserRole } {
  if (typeof window === 'undefined') return initial;
  try {
    const localCheios = window.localStorage.getItem("tlog:cheios");
    const localVazios = window.localStorage.getItem("tlog:vazios_locados");
    const localIngesys = window.localStorage.getItem("tlog:vazio_ingesys");
    const localRenault = window.localStorage.getItem("tlog:vazios_locados_renault");
    const localTlog = window.localStorage.getItem("tlog:vazios_locados_tlog");
    const localArmadores = window.localStorage.getItem("tlog:vazios_armadores");
    const localImports = window.localStorage.getItem("tlog:imports");
    const localPriorities = window.localStorage.getItem("tlog:priority_requests");
    const localSettings = window.localStorage.getItem("tlog:settings");
    const localActiveImportId = window.localStorage.getItem("tlog:active_import_id");

    return {
      cheios: localCheios ? JSON.parse(localCheios) : initial.cheios,
      vaziosLocados: localVazios ? JSON.parse(localVazios) : initial.vaziosLocados,
      vazioIngesys: localIngesys ? JSON.parse(localIngesys) : initial.vazioIngesys,
      vaziosLocadosRenault: localRenault ? JSON.parse(localRenault) : initial.vaziosLocadosRenault,
      vaziosLocadosTlog: localTlog ? JSON.parse(localTlog) : initial.vaziosLocadosTlog,
      vaziosArmadores: localArmadores ? JSON.parse(localArmadores) : initial.vaziosArmadores,
      imports: localImports ? JSON.parse(localImports) : initial.imports,
      priorityRequests: localPriorities ? JSON.parse(localPriorities) : initial.priorityRequests,
      userRole: "CLIENTE",
      activeImportId: localActiveImportId || undefined,
      settings: localSettings ? JSON.parse(localSettings) : initial.settings,
      armadorCounts: { MSC: 0, CMA: 0, MAERSK: 0 },
    };
  } catch {
    return initial;
  }
}

let state: AppDataset & { userRole: UserRole } = getInitialState();
const listeners = new Set<() => void>();

function emit() {
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

    // Mescla o histórico de importações do Supabase com o histórico local para evitar perdas
    const localImports = state.imports;
    const supabaseImports = importsData ? importsData.map((i: any) => ({
      id: i.id,
      fileName: i.file_name,
      importedAt: i.imported_at,
      itemCount: i.item_count,
      status: i.status as any
    })) : [];

    const combinedImports = [...supabaseImports];
    for (const local of localImports) {
      if (!combinedImports.some(i => i.id === local.id)) {
        combinedImports.push(local);
      }
    }
    combinedImports.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

    state = {
      ...state,
      cheios: cheiosData && cheiosData.length > 0 ? cheiosData.map((c: any) => ({
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
      vaziosLocados: vaziosData && vaziosData.length > 0 ? vaziosData.map((v: any) => ({
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
      vazioIngesys: ingesysData && ingesysData.length > 0 ? ingesysData.map((i: any) => ({
        conteiner: i.conteiner,
        statusD: i.status_d
      })) : state.vazioIngesys,
      vaziosLocadosRenault: renaultData && renaultData.length > 0 ? renaultData.map((v: any) => ({
        id: v.id,
        conteiner: v.conteiner,
        colunaD: v.coluna_d || "N/A"
      })) : state.vaziosLocadosRenault,
      vaziosLocadosTlog: tlogData && tlogData.length > 0 ? tlogData.map((v: any) => ({
        id: v.id,
        conteiner: v.conteiner,
        colunaD: v.coluna_d || "N/A"
      })) : state.vaziosLocadosTlog,
      vaziosArmadores: armadoresData && armadoresData.length > 0 ? armadoresData.map((v: any) => ({
        id: v.id,
        conteiner: v.conteiner,
        colunaD: v.coluna_d || "N/A"
      })) : state.vaziosArmadores,
      imports: combinedImports,
      priorityRequests: prioritiesData && prioritiesData.length > 0 ? prioritiesData.map((p: any) => ({
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

    // Atualiza o localStorage com os dados mais recentes
    if (typeof window !== 'undefined') {
      localStorage.setItem("tlog:cheios", JSON.stringify(state.cheios));
      localStorage.setItem("tlog:vazios_locados", JSON.stringify(state.vaziosLocados));
      localStorage.setItem("tlog:vazio_ingesys", JSON.stringify(state.vazioIngesys));
      localStorage.setItem("tlog:vazios_locados_renault", JSON.stringify(state.vaziosLocadosRenault));
      localStorage.setItem("tlog:vazios_locados_tlog", JSON.stringify(state.vaziosLocadosTlog));
      localStorage.setItem("tlog:vazios_armadores", JSON.stringify(state.vaziosArmadores));
      localStorage.setItem("tlog:imports", JSON.stringify(state.imports));
      localStorage.setItem("tlog:priority_requests", JSON.stringify(state.priorityRequests));
      localStorage.setItem("tlog:settings", JSON.stringify(state.settings));
    }

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
  
  // Salva imediatamente no localStorage para persistência instantânea offline-first
  if (typeof window !== 'undefined') {
    localStorage.setItem("tlog:cheios", JSON.stringify(newState.cheios));
    localStorage.setItem("tlog:vazios_locados", JSON.stringify(newState.vaziosLocados));
    localStorage.setItem("tlog:vazio_ingesys", JSON.stringify(newState.vazioIngesys));
    localStorage.setItem("tlog:vazios_locados_renault", JSON.stringify(newState.vaziosLocadosRenault));
    localStorage.setItem("tlog:vazios_locados_tlog", JSON.stringify(newState.vaziosLocadosTlog));
    localStorage.setItem("tlog:vazios_armadores", JSON.stringify(newState.vaziosArmadores));
    localStorage.setItem("tlog:imports", JSON.stringify(newState.imports));
    localStorage.setItem("tlog:priority_requests", JSON.stringify(newState.priorityRequests));
    localStorage.setItem("tlog:settings", JSON.stringify(newState.settings));
    if (newState.activeImportId) {
      localStorage.setItem("tlog:active_import_id", newState.activeImportId);
    } else {
      localStorage.removeItem("tlog:active_import_id");
    }
  }
  
  if (newState.lastImportAt !== oldLastImport) {
    const lastImport = newState.imports[0];
    if (lastImport) {
      try {
        // Usa upsert com o ID do cliente para garantir consistência perfeita de IDs
        await supabase.from('import_history').upsert({
          id: lastImport.id,
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
            try {
              console.log(`[SUPABASE] Atualizando tabela: ${table.name}`);
              // Deleta registros existentes de forma segura
              const { error: delError } = await supabase.from(table.name).delete().neq('conteiner', '_none_');
              if (delError) {
                if (delError.code === '42P01') {
                  console.warn(`[SUPABASE] Tabela ${table.name} não existe no banco de dados. Pulando.`);
                  continue;
                }
                console.warn(`[SUPABASE] Erro ao limpar tabela ${table.name}:`, delError);
                continue;
              }
              
              // Insere os novos registros em lotes (chunks) de 100 para evitar limites de payload ou timeouts
              const mappedData = table.data.map(table.map as any);
              const chunkSize = 100;
              for (let i = 0; i < mappedData.length; i += chunkSize) {
                const chunk = mappedData.slice(i, i + chunkSize);
                const { error: insError } = await supabase.from(table.name).insert(chunk);
                if (insError) {
                  console.error(`[SUPABASE] Erro ao inserir lote na tabela ${table.name}:`, insError);
                  toast.error(`Erro ao salvar lote na tabela ${table.name}: ${insError.message}`);
                  throw insError;
                }
              }
            } catch (tableErr) {
              console.error(`[SUPABASE] Erro inesperado ao processar tabela ${table.name}:`, tableErr);
            }
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
  
  state = newState;
  emit();
}

export async function restoreImport(importId: string) {
  if (typeof window === 'undefined') return;
  
  const payloadStr = localStorage.getItem(`tlog:payload:${importId}`);
  if (!payloadStr) {
    toast.error("Dados deste upload não foram encontrados localmente.");
    return;
  }

  try {
    const parsed = JSON.parse(payloadStr);
    
    await setDataset((prev) => ({
      ...prev,
      cheios: parsed.cheios || [],
      vaziosLocados: parsed.vaziosLocados || [],
      vazioIngesys: parsed.vazioIngesys || [],
      vaziosLocadosRenault: parsed.vaziosLocadosRenault || [],
      vaziosLocadosTlog: parsed.vaziosLocadosTlog || [],
      vaziosArmadores: parsed.vaziosArmadores || [],
      activeImportId: importId,
      lastImportAt: new Date().toISOString() // Força a sincronização com o Supabase
    }));

    toast.success("Dados do upload restaurados e ativados com sucesso!");
  } catch (e) {
    console.error(e);
    toast.error("Erro ao restaurar os dados do upload.");
  }
}

export async function clearDataset() {
  console.log("[STORE] Limpando todos os dados locais e remotos...");

  // 1. Limpa o localStorage imediatamente
  if (typeof window !== 'undefined') {
    localStorage.removeItem("tlog:cheios");
    localStorage.removeItem("tlog:vazios_locados");
    localStorage.removeItem("tlog:vazio_ingesys");
    localStorage.removeItem("tlog:vazios_locados_renault");
    localStorage.removeItem("tlog:vazios_locados_tlog");
    localStorage.removeItem("tlog:vazios_armadores");
    localStorage.removeItem("tlog:imports");
    localStorage.removeItem("tlog:priority_requests");
    localStorage.removeItem("tlog:active_import_id");

    // Limpa todos os payloads salvos
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("tlog:payload:")) {
        localStorage.removeItem(key);
      }
    }
  }

  // 2. Reseta o estado em memória
  state = {
    ...state,
    cheios: [],
    vaziosLocados: [],
    vazioIngesys: [],
    vaziosLocadosRenault: [],
    vaziosLocadosTlog: [],
    vaziosArmadores: [],
    imports: [],
    priorityRequests: [],
    lastImportAt: undefined,
    activeImportId: undefined,
    armadorCounts: { MSC: 0, CMA: 0, MAERSK: 0 }
  };

  emit();

  // 3. Limpa as tabelas no Supabase
  const tablesWithConteiner = [
    'containers_cheios',
    'vazios_locados',
    'vazio_ingesys',
    'vazios_locados_renault',
    'vazios_locados_tlog',
    'vazios_armadores'
  ];

  const tablesWithId = [
    'import_history',
    'priority_requests'
  ];

  try {
    for (const table of tablesWithConteiner) {
      await supabase.from(table).delete().neq('conteiner', '_none_');
    }
    for (const table of tablesWithId) {
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    toast.success("Banco de dados e histórico limpos com sucesso!");
  } catch (e) {
    console.error("[SUPABASE] Erro ao limpar tabelas remota:", e);
    toast.error("Dados locais limpos, mas houve um erro ao limpar o Supabase.");
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