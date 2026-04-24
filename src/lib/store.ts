import { useSyncExternalStore } from "react";
import type { AppDataset, PriorityRequest } from "./types";

const STORAGE_KEY = "tlog-renault-spot-v1";

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

let state: AppDataset & { userRole: UserRole } = load();
const listeners = new Set<() => void>();

function load(): AppDataset & { userRole: UserRole } {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as AppDataset & { userRole: UserRole };
    return { 
      ...initial, 
      ...parsed,
      userRole: parsed.userRole || "CLIENTE",
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

export function setUserRole(role: UserRole) {
  state = { ...state, userRole: role };
  persist();
  emit();
}

export function getDataset() {
  return state;
}

export function setDataset(updater: (prev: AppDataset & { userRole: UserRole }) => AppDataset & { userRole: UserRole }) {
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

    let newCheios = prev.cheios;
    if (status === 'DESPACHADO') {
      newCheios = prev.cheios.map(c => {
        if (c.conteiner === request.conteiner) {
          return {
            ...c,
            status: "ENVIADO PARA FABRICA" as const,
            dataEnvioFabrica: new Date().toISOString()
          };
        }
        return c;
      });
    } else if (status === 'FINALIZADO') {
      newCheios = prev.cheios.map(c => {
        if (c.conteiner === request.conteiner) {
          return {
            ...c,
            status: "FINALIZADO" as const
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