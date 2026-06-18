"use client";

import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest, CheioRow, VazioLocadoRow, VazioIngesysRow, ImportRecord, VazioGenericRow } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

/**
 * Salva no Supabase SEM apagar dados locais se falhar.
 * Só envia, nunca puxa.
 */
export async function saveDatasetToSupabase(dataset: AppDataset = state) {
  const lastImport = dataset.imports[0];
  if (!lastImport) {
    console.log("[SUPABASE] Nenhuma importação para salvar.");
    return false;
  }

  const toastId = toast.loading("Salvando no Supabase...");

  try {
    const { error: importError } = await supabase.from('import_history').upsert({
      id: lastImport.id,
      file_name: lastImport.fileName,
      item_count: lastImport.itemCount,
      status: lastImport.status,
      imported_at: lastImport.importedAt
    });
    if (importError) throw importError;

    const tables = [
      { name: 'containers_cheios', data: dataset.cheios, map: (c: CheioRow) => ({
        id: crypto.randomUUID(),
        conteiner: c.conteiner, lacre: c.lacre, tipo: c.tipo, armador: c.armador, navio: c.navio,
        data_chegada: c.dataChegada, dias_no_patio: toInt(c.diasNoPatio), free_time: toInt(c.freeTime),
        demurrage_vencimento: c.demurrageVencimento, dias_para_vencimento: toInt(c.diasParaVencimento),
        status: c.status, fabrica: c.fabrica, data_envio_fabrica: c.dataEnvioFabrica,
        conteiner_de_para: c.conteinerDePara, data_devolucao_vazio: c.dataDevolucaoVazio, coluna_as: c.colunaAS
      })},
      { name: 'vazios_locados', data: dataset.vaziosLocados, map: (v: VazioLocadoRow) => ({
        id: crypto.randomUUID(),
        conteiner: v.conteiner, armador: v.armador, tipo: v.tipo, data_entrada: v.dataEntrada,
        data_de_para: v.dataDePara, cheio_de_para: v.cheioDePara, status_uso: v.statusUso,
        status_patio: v.statusPatio, dias_no_patio: toInt(v.diasNoPatio)
      })},
      { name: 'vazio_ingesys', data: dataset.vazioIngesys, map: (i: VazioIngesysRow) => ({
        id: crypto.randomUUID(),
        conteiner: i.conteiner, status_d: i.statusD
      })},
      { name: 'vazios_locados_renault', data: dataset.vaziosLocadosRenault, map: (v: VazioGenericRow) => ({
        conteiner: v.conteiner, coluna_d: v.colunaD
      })},
      { name: 'vazios_locados_tlog', data: dataset.vaziosLocadosTlog, map: (v: VazioGenericRow) => ({
        conteiner: v.conteiner, coluna_d: v.colunaD
      })},
      { name: 'vazios_armadores', data: dataset.vaziosArmadores, map: (v: VazioGenericRow) => ({
        conteiner: v.conteiner, coluna_d: v.colunaD
      })}
    ];

    for (const table of tables) {
      console.log(`[SUPABASE] Salvando tabela: ${table.name} (${table.data.length} registros)`);
      
      // Deleta e reinsere tudo (upsert não funciona bem com UUIDs aleatórios)
      const { error: delError } = await supabase.from(table.name).delete().neq('conteiner', '_none_');
      if (delError) throw delError;

      if (table.data.length > 0) {
        const mappedData = table.data.map(table.map as any);
        const chunkSize = 100;
        for (let i = 0; i < mappedData.length; i += chunkSize) {
          const chunk = mappedData.slice(i, i + chunkSize);
          const { error: insError } = await supabase.from(table.name).insert(chunk);
          if (insError) throw insError;
        }
      }
    }

    toast.success("Dados salvos no Supabase com sucesso!", { id: toastId });
    return true;
  } catch (error: any) {
    console.error("[SUPABASE] Falha ao salvar (dados locais PRESERVADOS):", error);
    toast.error(`Falha ao salvar no banco: ${error.message || error}. Seus dados locais estão seguros.`, { id: toastId });
    return false;
  }
}

/**
 * NÃO USA MAIS AUTOMATICAMENTE.
 * Só chame manualmente se QUISER sobrescrever o local com o remoto.
 */
export async function forceSyncFromSupabase() {
  if (typeof window === 'undefined') return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Faça login para sincronizar.");
      return;
    }

    const toastId = toast.loading("Baixando do Supabase...");

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

    const getData = (idx: number) => results[idx].status === 'fulfilled' ? (results[idx].value as any).data : null;

    const cheiosData = getData(0);
    const vaziosData = getData(1);
    const ingesysData = getData(2);
    const importsData = getData(3);
    const prioritiesData = getData(4);
    const settingsData = getData(5);
    const renaultData = getData(6);
    const tlogData = getData(7);
    const armadoresData = getData(8);

    // Só atualiza se o remoto tiver MAIS dados que o local (proteção extra)
    const localTotal = state.cheios.length + state.vaziosLocados.length;
    const remoteTotal = (cheiosData?.length || 0) + (vaziosData?.length || 0);

    if (remoteTotal > 0 && remoteTotal >= localTotal) {
      state = {
        ...state,
        cheios: cheiosData?.map((c: any) => ({
          conteiner: c.conteiner, lacre: c.lacre, tipo: c.tipo, armador: c.armador, navio: c.navio,
          dataChegada: c.data_chegada, diasNoPatio: c.dias_no_patio, freeTime: c.free_time,
          demurrageVencimento: c.demurrage_vencimento, diasParaVencimento: c.dias_para_vencimento,
          status: c.status, fabrica: c.fabrica, dataEnvioFabrica: c.data_envio_fabrica,
          conteinerDePara: c.conteiner_de_para, dataDevolucaoVazio: c.data_devolucao_vazio, colunaAS: c.coluna_as
        })) || state.cheios,
        vaziosLocados: vaziosData?.map((v: any) => ({
          conteiner: v.conteiner, armador: v.armador, tipo: v.tipo, dataEntrada: v.data_entrada,
          dataDePara: v.data_de_para, cheioDePara: v.cheio_de_para, statusUso: v.status_uso,
          statusPatio: v.status_patio, diasNoPatio: v.dias_no_patio
        })) || state.vaziosLocados,
        vazioIngesys: ingesysData?.map((i: any) => ({
          conteiner: i.conteiner, statusD: i.status_d
        })) || state.vazioIngesys,
        vaziosLocadosRenault: renaultData?.map((v: any) => ({
          id: v.id, conteiner: v.conteiner, colunaD: v.coluna_d || "N/A"
        })) || state.vaziosLocadosRenault,
        vaziosLocadosTlog: tlogData?.map((v: any) => ({
          id: v.id, conteiner: v.conteiner, colunaD: v.coluna_d || "N/A"
        })) || state.vaziosLocadosTlog,
        vaziosArmadores: armadoresData?.map((v: any) => ({
          id: v.id, conteiner: v.conteiner, colunaD: v.coluna_d || "N/A"
        })) || state.vaziosArmadores,
        imports: importsData?.map((i: any) => ({
          id: i.id, fileName: i.file_name, importedAt: i.imported_at,
          itemCount: i.item_count, status: i.status
        })) || state.imports,
        priorityRequests: prioritiesData?.map((p: any) => ({
          id: p.id, conteiner: p.conteiner, nivel: p.nivel, status: p.status,
          solicitadoEm: p.solicitado_em, fabricaDestino: p.fabrica_destino,
          previsaoFabrica: p.previsao_fabrica, observacao: p.observacao
        })) || state.priorityRequests,
        settings: settingsData ? { capacidadePatio: settingsData.capacidade_patio } : state.settings,
        armadorCounts: countArmadores(state.cheios)
      };

      // Persiste no localStorage
      localStorage.setItem("tlog:cheios", JSON.stringify(state.cheios));
      localStorage.setItem("tlog:vazios_locados", JSON.stringify(state.vaziosLocados));
      localStorage.setItem("tlog:vazio_ingesys", JSON.stringify(state.vazioIngesys));
      localStorage.setItem("tlog:vazios_locados_renault", JSON.stringify(state.vaziosLocadosRenault));
      localStorage.setItem("tlog:vazios_locados_tlog", JSON.stringify(state.vaziosLocadosTlog));
      localStorage.setItem("tlog:vazios_armadores", JSON.stringify(state.vaziosArmadores));
      localStorage.setItem("tlog:imports", JSON.stringify(state.imports));
      localStorage.setItem("tlog:priority_requests", JSON.stringify(state.priorityRequests));
      localStorage.setItem("tlog:settings", JSON.stringify(state.settings));

      emit();
      toast.success("Sincronização manual concluída!", { id: toastId });
    } else {
      toast.warning("Dados locais são mais recentes/completos. Nada foi alterado.", { id: toastId });
    }
  } catch (error) {
    console.error("[SUPABASE] Erro no sync manual:", error);
    toast.error("Erro ao baixar do Supabase.");
  }
}

// REMOVIDO: listener de realtime que disparava sync automático

export function setUserRole(role: UserRole) {
  state = { ...state, userRole: role };
  emit();
}

export async function setDataset(updater: (prev: AppDataset & { userRole: UserRole }) => AppDataset & { userRole: UserRole }) {
  const oldLastImport = state.lastImportAt;
  const newState = updater(state);
  
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

  state = newState;
  emit();
  
  // Salva no Supabase em background, SEM bloquear a UI
  if (newState.lastImportAt !== oldLastImport) {
    saveDatasetToSupabase(newState).catch(() => {}); // Erro já tratado dentro da função
  }
}

export async function restoreImport(importId: string) {
  if (typeof window === 'undefined') return;
  
  const payloadStr = localStorage.getItem(`tlog:payload:${importId}`);
  if (!payloadStr) {
    toast.error("Dados deste upload não encontrados localmente.");
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
      lastImportAt: new Date().toISOString()
    }));

    toast.success("Dados restaurados e ativados!");
  } catch (e) {
    console.error(e);
    toast.error("Erro ao restaurar upload.");
  }
}

export async function clearDataset() {
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

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("tlog:payload:")) localStorage.removeItem(key);
    }
  }

  state = {
    ...state,
    cheios: [], vaziosLocados: [], vazioIngesys: [],
    vaziosLocadosRenault: [], vaziosLocadosTlog: [], vaziosArmadores: [],
    imports: [], priorityRequests: [],
    lastImportAt: undefined, activeImportId: undefined,
    armadorCounts: { MSC: 0, CMA: 0, MAERSK: 0 }
  };
  emit();

  // Limpa remoto também (best effort)
  try {
    await Promise.all([
      supabase.from('containers_cheios').delete().neq('conteiner', '_none_'),
      supabase.from('vazios_locados').delete().neq('conteiner', '_none_'),
      supabase.from('vazio_ingesys').delete().neq('conteiner', '_none_'),
      supabase.from('vazios_locados_renault').delete().neq('conteiner', '_none_'),
      supabase.from('vazios_locados_tlog').delete().neq('conteiner', '_none_'),
      supabase.from('vazios_armadores').delete().neq('conteiner', '_none_'),
      supabase.from('import_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('priority_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ]);
    toast.success("Tudo limpo (local e remoto).");
  } catch (e) {
    toast.error("Local limpo, mas falha ao limpar remoto.");
  }
}

export async function addPriorityRequest(req: PriorityRequest) {
  const { error } = await supabase.from('priority_requests').insert({
    conteiner: req.conteiner, nivel: req.nivel, status: req.status,
    fabrica_destino: req.fabricaDestino, previsao_fabrica: req.previsaoFabrica,
    observacao: req.observacao
  });
  if (error) toast.error("Erro ao salvar prioridade");
  else {
    // Atualiza local imediatamente
    state = { ...state, priorityRequests: [req, ...state.priorityRequests] };
    emit();
  }
}

export async function updatePriorityStatus(id: string, status: PriorityRequest["status"]) {
  const { error } = await supabase.from('priority_requests').update({ status }).eq('id', id);
  if (error) { toast.error("Erro ao atualizar"); return; }
  
  const request = state.priorityRequests.find(r => r.id === id);
  if (request && (status === 'DESPACHADO' || status === 'FINALIZADO')) {
    await supabase.from('containers_cheios')
      .update({ status: "ENVIADO PARA FABRICA", data_envio_fabrica: new Date().toISOString() })
      .eq('conteiner', request.conteiner);
  }
  // Atualiza local
  state = { ...state, priorityRequests: state.priorityRequests.map(r => r.id === id ? { ...r, status } : r) };
  emit();
}

export async function deletePriorityRequest(id: string) {
  const { error } = await supabase.from('priority_requests').delete().eq('id', id);
  if (error) { toast.error("Erro ao excluir"); return; }
  state = { ...state, priorityRequests: state.priorityRequests.filter(r => r.id !== id) };
  emit();
}

export async function updateSettings(settings: Partial<AppDataset["settings"]>) {
  if (settings.capacidadePatio === undefined) return;
  state = { ...state, settings: { ...state.settings, capacidadePatio: settings.capacidadePatio } };
  if (typeof window !== 'undefined') localStorage.setItem("tlog:settings", JSON.stringify(state.settings));
  emit();
  const { error } = await supabase.from('app_settings').upsert({ id: '00000000-0000-0000-0000-000000000000', capacidade_patio: settings.capacidadePatio });
  if (error) toast.error("Erro ao salvar config no banco");
  else toast.success("Configurações salvas!");
}

export function useDataset() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => initial,
  );
}