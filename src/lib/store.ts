"use client";

import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest, CheioRow, VazioLocadoRow, VazioIngesysRow, ImportRecord, VazioGenericRow } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INGESYS_STORAGE_KEY = "tlog:vazio-ingesys";
const RENAULT_STORAGE_KEY = "tlog:vazios-renault";
const TLOG_STORAGE_KEY = "tlog:vazios-tlog";
const ARMADORES_STORAGE_KEY = "tlog:vazios-armadores";

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

function loadLocalVazios(key: string): VazioGenericRow[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveLocalVazios(key: string, rows: VazioGenericRow[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

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

let state: AppDataset & { userRole: UserRole } = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// Sanitizadores estritos para evitar erros de tipo no PostgreSQL
const toInt = (val: any) => {
  if (val == null || val === "") return null;
  const n = Math.round(Number(val));
  return isNaN(n) ? null : n;
};

const toISOString = (val: any) => {
  if (!val || val === "") return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
};

export async function syncFromSupabase() {
  if (typeof window === 'undefined') return;

  console.log("[SUPABASE] Iniciando sincronização...");

  try {
    const results = await Promise.allSettled([
      supabase.from('containers_cheios').select('*'),
      supabase.from('vazios_locados').select('*'),
      supabase.from('import_history').select('*').order('imported_at', { ascending: false }).limit(50),
      supabase.from('priority_requests').select('*').order('solicitado_em', { ascending: false }),
      supabase.from('app_settings').select('*').maybeSingle(),
    ]);

    const getData = (idx: number) => {
      const res = results[idx];
      return res.status === 'fulfilled' && !(res.value as any).error ? (res.value as any).data : null;
    };

    const cheiosData = getData(0);
    const vaziosData = getData(1);
    const importsData = getData(2);
    const prioritiesData = getData(3);
    const settingsData = getData(4);

    const localRenault = loadLocalVazios(RENAULT_STORAGE_KEY);
    const localTlog = loadLocalVazios(TLOG_STORAGE_KEY);
    const localArmadores = loadLocalVazios(ARMADORES_STORAGE_KEY);
    const localIngesys = loadLocalVazioIngesys();

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
      vazioIngesys: localIngesys,
      vaziosLocadosRenault: localRenault,
      vaziosLocadosTlog: localTlog,
      vaziosArmadores: localArmadores,
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
      // Salva sempre localmente primeiro para garantir resiliência imediata
      saveLocalVazioIngesys(newState.vazioIngesys);
      saveLocalVazios(RENAULT_STORAGE_KEY, newState.vaziosLocadosRenault);
      saveLocalVazios(TLOG_STORAGE_KEY, newState.vaziosLocadosTlog);
      saveLocalVazios(ARMADORES_STORAGE_KEY, newState.vaziosArmadores);

      const toastId = toast.loading("Sincronizando dados com o Supabase...");

      try {
        // 1. Salva o histórico de importação
        const { error: histError } = await supabase.from('import_history').insert({
          file_name: lastImport.fileName,
          item_count: lastImport.itemCount,
          status: lastImport.status
        });

        if (histError) {
          console.error("[SUPABASE] Erro ao salvar histórico:", histError);
          toast.error(`Erro ao salvar histórico: ${histError.message}`, { id: toastId });
          return;
        }

        // Tabelas que realmente existem no Supabase
        const tables = [
          { 
            name: 'containers_cheios', 
            data: newState.cheios, 
            map: (c: CheioRow) => ({
              conteiner: c.conteiner, 
              lacre: c.lacre || null, 
              tipo: c.tipo || null, 
              armador: c.armador || null, 
              navio: c.navio || null,
              data_chegada: toISOString(c.dataChegada), 
              dias_no_patio: toInt(c.diasNoPatio), 
              free_time: toInt(c.freeTime),
              demurrage_vencimento: toISOString(c.demurrageVencimento), 
              dias_para_vencimento: toInt(c.diasParaVencimento),
              status: c.status, 
              fabrica: c.fabrica || null, 
              data_envio_fabrica: toISOString(c.dataEnvioFabrica),
              conteiner_de_para: c.conteinerDePara || null, 
              data_devolucao_vazio: toISOString(c.dataDevolucaoVazio), 
              coluna_as: c.colunaAS || null
            })
          },
          { 
            name: 'vazios_locados', 
            data: newState.vaziosLocados, 
            map: (v: VazioLocadoRow) => ({
              conteiner: v.conteiner, 
              armador: v.armador || null, 
              tipo: v.tipo || null, 
              data_entrada: toISOString(v.dataEntrada),
              data_de_para: toISOString(v.dataDePara), 
              cheio_de_para: v.cheioDePara || null, 
              status_uso: v.statusUso || null,
              status_patio: v.statusPatio || null, 
              dias_no_patio: toInt(v.diasNoPatio)
            })
          }
        ];

        const errors: string[] = [];

        for (const table of tables) {
          if (table.data.length > 0) {
            console.log(`[SUPABASE] Atualizando tabela: ${table.name}`);
            
            // Mapeia e sanitiza os dados antes de enviar
            const sanitizedData = table.data.map(table.map as any);

            // Deleta os registros antigos
            const { error: delError } = await supabase.from(table.name).delete().neq('conteiner', '_none_');
            if (delError) {
              console.error(`[SUPABASE] Erro ao limpar tabela ${table.name}:`, delError);
              errors.push(`Limpeza ${table.name}: ${delError.message}`);
              continue;
            }

            // Insere os novos dados sanitizados
            const { error: insError } = await supabase.from(table.name).insert(sanitizedData);
            if (insError) {
              console.error(`[SUPABASE] Erro ao inserir dados na tabela ${table.name}:`, insError);
              errors.push(`Inserção ${table.name}: ${insError.message}`);
            }
          }
        }
        
        if (errors.length > 0) {
          toast.error(`Erro na sincronização:\n${errors.join('\n')}`, {
            id: toastId,
            duration: 8000
          });
        } else {
          toast.success("Dados sincronizados com Supabase com sucesso!", { id: toastId });
        }
        
        await syncFromSupabase();
      } catch (e: any) {
        console.error("[SUPABASE] Erro crítico no salvamento:", e);
        toast.error(`Erro crítico de banco de dados: ${e.message || e}`, { id: toastId });
      }
    }
  }
  
  state = newState;
  emit();
}

export async function clearAllDataset() {
  const toastId = toast.loading("Limpando todos os dados do sistema e do Supabase...");
  try {
    // 1. Deleta os dados das tabelas no Supabase
    const p1 = supabase.from('containers_cheios').delete().neq('conteiner', '_none_');
    const p2 = supabase.from('vazios_locados').delete().neq('conteiner', '_none_');
    const p3 = supabase.from('import_history').delete().neq('status', '_none_');

    const results = await Promise.all([p1, p2, p3]);
    const errors = results.filter(r => r.error).map(r => r.error?.message);

    if (errors.length > 0) {
      throw new Error(errors.join(" | "));
    }

    // 2. Limpa o LocalStorage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(INGESYS_STORAGE_KEY);
      window.localStorage.removeItem(RENAULT_STORAGE_KEY);
      window.localStorage.removeItem(TLOG_STORAGE_KEY);
      window.localStorage.removeItem(ARMADORES_STORAGE_KEY);
    }

    // 3. Reseta o estado local
    state = {
      ...initial,
      userRole: state.userRole,
      settings: state.settings,
    };
    emit();

    toast.success("Todos os dados foram apagados com sucesso!", { id: toastId });
  } catch (e: any) {
    console.error("[SUPABASE] Erro ao limpar dados:", e);
    toast.error(`Erro ao limpar dados: ${e.message || e}`, { id: toastId });
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