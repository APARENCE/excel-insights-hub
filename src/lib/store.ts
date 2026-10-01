"use client";

import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest, CheioRow, VazioLocadoRow, VazioIngesysRow, ImportRecord, VazioGenericRow } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchExcelFromOneDrive, isOneDriveLink } from "./onedrive-service";

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
      onedriveSpreadsheetUrl: "",
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

// Sincronização automática ao montar o aplicativo - garante que os dados
// reflitam o banco sempre que o app for recarregado
;(async () => {
  if (typeof window !== 'undefined') {
    try {
      await syncFromSupabase();
    } catch (e) {
      console.error("[STORE] Erro na sincronização automática inicial:", e);
    }
  }
})();

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

export async function saveDatasetToSupabase(dataset: AppDataset = state) {
  console.log("[DEBUG] === INICIANDO SALVAMENTO NO SUPABASE ===");
  console.log("[DEBUG] Dataset recebido:", {
    cheios: dataset.cheios?.length || 0,
    vaziosLocados: dataset.vaziosLocados?.length || 0,
    vazioIngesys: dataset.vazioIngesys?.length || 0,
    vaziosLocadosRenault: dataset.vaziosLocadosRenault?.length || 0,
    vaziosLocadosTlog: dataset.vaziosLocadosTlog?.length || 0,
    vaziosArmadores: dataset.vaziosArmadores?.length || 0,
  });

  // Verifica sessão
  const { data: { session } } = await supabase.auth.getSession();
  console.log("[DEBUG] Sessão ativa:", !!session, session?.user?.email);
  
  if (!session) {
    console.log("[DEBUG] Nenhuma sessão ativa. Salvamento abortado.");
    toast.error("Você precisa estar logado para salvar no Supabase. Faça login primeiro.");
    return false;
  }

  const lastImport = dataset.imports[0];
  if (!lastImport) {
    console.log("[DEBUG] Nenhuma importação encontrada para salvar.");
    toast.error("Nenhuma importação para salvar.");
    return false;
  }

  console.log("[DEBUG] Importação:", lastImport.id, lastImport.fileName, "itens:", lastImport.itemCount);

  const toastId = toast.loading("Salvando dados no Supabase...");

  try {
    // 1. Salva o histórico de importação
    console.log("[DEBUG] Salvando import_history...");
    const { error: importError } = await supabase.from('import_history').upsert({
      id: lastImport.id,
      file_name: lastImport.fileName,
      item_count: lastImport.itemCount,
      status: lastImport.status,
      imported_at: lastImport.importedAt
    });

    if (importError) {
      console.error("[DEBUG] Erro ao salvar import_history:", importError);
      throw importError;
    }
    console.log("[DEBUG] import_history salvo com sucesso");

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
      console.log(`[DEBUG] === Processando tabela: ${table.name} ===`);
      console.log(`[DEBUG] Registros para salvar: ${table.data.length}`);
      
      if (table.data.length === 0) {
        console.log(`[DEBUG] Tabela ${table.name}: 0 registros, pulando insert`);
        continue;
      }

      // Deleta registros existentes
      console.log(`[DEBUG] Limpando tabela ${table.name}...`);
      const { error: delError } = await supabase.from(table.name).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delError) {
        console.error(`[ERRO] Erro ao limpar tabela ${table.name}:`, delError);
        throw delError;
      }
      console.log("[DEBUG] Limpeza concluída");

      if (table.data.length > 0) {
        const mappedData = table.data.map(table.map as any);
        console.log(`[DEBUG] Dados mapeados para ${table.name}: ${mappedData.length} registros`);
        console.log(`[DEBUG] Primeiro registro:`, JSON.stringify(mappedData[0], null, 2));
        
        const chunkSize = 100;
        let totalInserted = 0;
        for (let i = 0; i < mappedData.length; i += chunkSize) {
          const chunk = mappedData.slice(i, i + chunkSize);
          console.log(`[DEBUG] Inserindo lote ${i/chunkSize + 1}/${Math.ceil(mappedData.length/chunkSize)} na tabela ${table.name} (${chunk.length} registros)...`);
          
          let retries = 0;
          while (retries < 3) {
            const { error: insError } = await supabase.from(table.name).insert(chunk);
            if (!insError) break;
            
            retries++;
            console.error(`[ERRO] Tentativa ${retries} falhou no lote ${i/chunkSize + 1}:`, insError);
            if (retries === 3) {
              console.error(`[ERRO CRÍTICO] Falha permanente no lote ${i/chunkSize + 1} após 3 tentativas`);
              throw insError;
            }
            await new Promise(r => setTimeout(r, 1000 * retries));
          }
          
          totalInserted += chunk.length;
          console.log(`[DEBUG] Lote inserido com sucesso. Total até agora: ${totalInserted}`);
        }
        console.log(`[SUCESSO] Tabela ${table.name} salva com ${totalInserted} registros`);
      }
    }

    toast.success("Dados salvos com sucesso no Supabase!", { id: toastId });
    console.log("[DEBUG] === SALVAMENTO CONCLUÍDO COM SUCESSO ===");
    return true;
  } catch (error: any) {
    console.error("[ERRO CRÍTICO] Erro crítico ao salvar dados:", error);
    toast.error(`Erro ao salvar no banco de dados: ${error.message || error}`, { id: toastId });
    return false;
  }
}

export async function syncFromSupabase() {
  if (typeof window === 'undefined') return;

  try {
    // VERIFICAÇÃO DE SEGURANÇA: Só prossegue se houver uma sessão ativa no Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log("[SUPABASE] Sem sessão ativa. Mantendo dados locais.");
      return;
    }

    console.log("[SUPABASE] Sincronizando configurações e dados...");

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

    // Removida trava de segurança que impedia sincronização.
    // Agora sempre sincroniza do Supabase quando há sessão ativa,
    // garantindo que os dados persistem após recarregar a página.

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
    
        // Atualiza activeImportId: sempre o mais recente de todos os imports
        let activeImportId = state.activeImportId;
        if (combinedImports.length > 0) {
          // O mais recente é o primeiro na lista (descending order)
          const newestImport = combinedImports[0];
          if (!activeImportId || new Date(newestImport.importedAt).getTime() > new Date(activeImportId).getTime()) {
            activeImportId = newestImport.id;
          }
        } else if (!activeImportId) {
          activeImportId = undefined;
        }
    
        // Merge de priorityRequests: combina local com do Supabase
        let mergedPriorityRequests = [...state.priorityRequests];
        if (prioritiesData && prioritiesData.length > 0) {
          const supabasePri = prioritiesData.map((p: any) => ({
            id: p.id,
            conteiner: p.conteiner,
            nivel: p.nivel,
            status: p.status,
            solicitadoEm: p.solicitado_em,
            fabricaDestino: p.fabrica_destino,
            previsaoFabrica: p.previsao_fabrica,
            observacao: p.observacao
          }));
          // Adiciona do Supabase se não existir localmente
          for (const sup of supabasePri) {
            if (!mergedPriorityRequests.some(r => r.id === sup.id)) {
              mergedPriorityRequests.push(sup);
            }
          }
        }
        // Ordena por solicitadoEm descending
        mergedPriorityRequests.sort((a: any, b: any) => new Date(b.solicitadoEm).getTime() - new Date(a.solicitadoEm).getTime());
    
        // Maps functions para merge de dados
        const mapCheio = (c: any) => ({
          conteiner: c.conteiner, lacre: c.lacre, tipo: c.tipo, armador: c.armador, navio: c.navio,
          dataChegada: c.data_chegada, diasNoPatio: c.dias_no_patio, freeTime: c.free_time,
          demurrageVencimento: c.demurrage_vencimento, diasParaVencimento: c.dias_para_vencimento,
          status: c.status, fabrica: c.fabrica, dataEnvioFabrica: c.data_envio_fabrica,
          conteinerDePara: c.conteiner_de_para, dataDevolucaoVazio: c.data_devolucao_vazio, colunaAS: c.coluna_as
        });
    
        const mapVazioLocado = (v: any) => ({
          conteiner: v.conteiner, armador: v.armador, tipo: v.tipo, dataEntrada: v.data_entrada,
          dataDePara: v.data_de_para, cheioDePara: v.cheio_de_para, statusUso: v.status_uso,
          statusPatio: v.status_patio, diasNoPatio: v.dias_no_patio
        });
    
        const mapVazioIngesys = (i: any) => ({
          conteiner: i.conteiner, statusD: i.status_d
        });
    
        const mapRenault = (v: any) => ({
          id: v.id, conteiner: v.conteiner, colunaD: v.coluna_d || "N/A"
        });
    
        const mapTlog = (v: any) => ({
          id: v.id, conteiner: v.conteiner, colunaD: v.coluna_d || "N/A"
        });
    
        const mapArmadores = (v: any) => ({
          id: v.id, conteiner: v.conteiner, colunaD: v.coluna_d || "N/A"
        });
    
        // Merge inteligente: PRIORIZA o Supabase para reconhecer TODOS os dados do banco.
        // Se Supabase tem dados (qualquer quantidade > 0), usa ele - reflete a última atualização real.
        // Só usa localStorage como fallback se Supabase estiver VAZIO (0 registros).
        // Isso garante: reconhece TODOS os dados do Supabase + protege contra perda se banco estiver vazio.
                        const mergeData = (localData: any[], supabaseData: any[], mapFunc: any) => {
                          const localCount = localData ? localData.length : 0;
                          const supaCount = supabaseData ? supabaseData.length : 0;
                          
                          // Se Supabase tem dados válidos (> 0), USA O SUPABASE (reconhece todos os dados do banco)
                          if (supaCount > 0) {
                            return supabaseData.map(mapFunc);
                          }
                          // Se Supabase está vazio (0), mantém localStorage como fallback (não perde dados)
                          else if (localCount > 0) {
                            return localData.map(mapFunc);
                          }
                          // Nenhum dado em nenhum dos dois
                          return [];
                        };
    
        state = {
          // Dados principais: merge inteligente
          // - Se Supabase tem dados, usa eles (números se atualizam)
          // - Se apenas localStorage, mantém dados (não perde nada)
          // - Isso garante: números atualizados + dados preservados
          cheios: mergeData(state.cheios, cheiosData, mapCheio),
          vaziosLocados: mergeData(state.vaziosLocados, vaziosData, mapVazioLocado),
          vazioIngesys: mergeData(state.vazioIngesys, ingesysData, mapVazioIngesys),
          vaziosLocadosRenault: mergeData(state.vaziosLocadosRenault, renaultData, mapRenault),
          vaziosLocadosTlog: mergeData(state.vaziosLocadosTlog, tlogData, mapTlog),
          vaziosArmadores: mergeData(state.vaziosArmadores, armadoresData, mapArmadores),
    
          // Metadados
          activeImportId: activeImportId,
          imports: combinedImports,
          priorityRequests: mergedPriorityRequests,
    
          // Configurações: atualiza do Supabase quando disponível
                    settings: settingsData ? {
                      capacidadePatio: settingsData.capacidade_patio,
                      onedriveSpreadsheetUrl: settingsData.onedrive_spreadsheet_url || ""
                    } : state.settings,
    
          // Contadores recalculados a partir dos dados atuais
          armadorCounts: countArmadores(state.cheios)
        };

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
      if (state.activeImportId) {
        localStorage.setItem("tlog:active_import_id", state.activeImportId);
      }
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
  
    // Persiste automaticamente no Supabase quando um novo upload é ativado
    if (newState.lastImportAt !== oldLastImport) {
      try {
        await saveDatasetToSupabase(newState);
      } catch (e) {
        console.error("[STORE] Falha no salvamento automático:", e);
      }
    }
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
      lastImportAt: new Date().toISOString()
    }));

    toast.success("Dados do upload restaurados e ativados com sucesso!");
  } catch (e) {
    console.error(e);
    toast.error("Erro ao restaurar os dados do upload.");
  }
}

export async function clearDataset() {
  console.log("[STORE] Limpando todos os dados locais e remotos...");

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
      if (key.startsWith("tlog:payload:")) {
        localStorage.removeItem(key);
      }
    }
  }

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
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
  if (settings.capacidadePatio === undefined && settings.onedriveSpreadsheetUrl === undefined) return;

  state = {
    ...state,
    settings: {
      ...state.settings,
      capacidadePatio: settings.capacidadePatio ?? state.settings.capacidadePatio,
      onedriveSpreadsheetUrl: settings.onedriveSpreadsheetUrl ?? state.settings.onedriveSpreadsheetUrl
    }
  };
  
  if (typeof window !== 'undefined') {
    localStorage.setItem("tlog:settings", JSON.stringify(state.settings));
  }
  emit();

  const { error } = await supabase.from('app_settings').upsert({
    id: '00000000-0000-0000-0000-000000000000',
    capacidade_patio: state.settings.capacidadePatio,
    onedrive_spreadsheet_url: state.settings.onedriveSpreadsheetUrl || null
  });

  if (error) {
    console.error("[SUPABASE] Erro ao salvar configurações:", error);
    toast.error("Erro ao salvar configurações no banco de dados.");
  } else {
    toast.success("Configurações salvas com sucesso!");
    syncFromSupabase();
  }
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