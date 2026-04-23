import { useSyncExternalStore } from "react";
import type { AppDataset } from "./types";

const STORAGE_KEY = "tlog-renault-spot-v1";

const initial: AppDataset = {
  cheios: [],
  vaziosLocados: [],
  imports: [],
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

export function updateSettings(settings: Partial<AppDataset["settings"]>) {
  setDataset((prev) => ({
    ...prev,
    settings: { ...prev.settings, ...settings },
  }));
}

export function clearDataset() {
  state = initial;
  persist();
  emit();
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