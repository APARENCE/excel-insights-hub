import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest } from "./types";

const STORAGE_KEY = "tlog-renault-spot-v1";

const initial: AppDataset = {
  cheios: [],
  vaziosLocados: [],
  imports: [],
  priorityRequests: [],
  settings: {
    capacidadePatio: 600,
  },
};

let state: AppDataset = load();
const listeners = new Set<() => void>();

function load(): AppDataset {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as AppDataset;
    return { 
      ...initial, 
      ...parsed,
      settings: parsed.settings || initial.settings,
      priorityRequests: parsed.priorityRequests || [],
    };
  } catch {
    return initial;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Persist error", e);
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getDataset(): AppDataset {
  return state;
}

export function setDataset(updater: (prev: AppDataset) => AppDataset) {
  state = updater(state);
  persist();
  emit();
}

export function addPriorityRequest(req: PriorityRequest) {
  setDataset(prev => ({
    ...prev,
    priorityRequests: [req, ...prev.priorityRequests]
  }));
}

export function updatePriorityStatus(id: string, status: PriorityRequest["status"]) {
  setDataset(prev => {
    const request = prev.priorityRequests.find(r => r.id === id);
    if (!request) return prev;

    const newPriorityRequests = prev.priorityRequests.map(r => 
      r.id === id ? { ...r, status } : r
    );

    // Se o status for DESPACHADO, atualizamos o container no estoque (Colunas AA e AD)
    let newCheios = prev.cheios;
    if (status === 'DESPACHADO') {
      newCheios = prev.cheios.map(c => {
        if (c.conteiner === request.conteiner) {
          return {
            ...c,
            status: "ENVIADO PARA FABRICA" as const, // Coluna AA
            dataEnvioFabrica: new Date().toISOString() // Coluna AD
          };
        }
        return c;
      });
    }

    return {
      ...prev,
      priorityRequests: newPriorityRequests,
      cheios: newCheios
    };
  });
}

export function deletePriorityRequest(id: string) {
  setDataset(prev => ({
    ...prev,
    priorityRequests: prev.priorityRequests.filter(r => r.id !== id)
  }));
}

export function updateSettings(settings: Partial<AppDataset["settings"]>) {
  setDataset((prev) => ({
    ...prev,
    settings: { ...prev.settings, ...settings },
  }));
}

export function useDataset(): AppDataset {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => initial,
  );
}