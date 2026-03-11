import { create } from 'zustand';
import type { Backend, ModelProfile } from '@/types';
import * as db from '@/lib/db';
import { testBackendConnection, createBackendAdapter } from '@/lib/backends';

interface BackendState {
  backends: Backend[];
  availableModels: Record<string, string[]>; // backendId -> model names
  loading: Record<string, boolean>;

  loadBackends: () => void;
  addBackend: (partial: Partial<Backend>) => Backend;
  updateBackend: (id: string, partial: Partial<Backend>) => void;
  removeBackend: (id: string) => void;
  testConnection: (id: string) => Promise<{ success: boolean; error?: string }>;
  fetchModels: (id: string) => Promise<string[]>;
  getBackend: (id: string) => Backend | undefined;
}

export const useBackendStore = create<BackendState>((set, get) => ({
  backends: [],
  availableModels: {},
  loading: {},

  loadBackends: () => {
    const backends = db.getAllBackends();
    set({ backends });
  },

  addBackend: (partial) => {
    const backend = db.createBackend(partial);
    set((s) => ({ backends: [...s.backends, backend] }));
    return backend;
  },

  updateBackend: (id, partial) => {
    const updated = db.updateBackend(id, partial);
    if (updated) {
      set((s) => ({
        backends: s.backends.map((b) => (b.id === id ? updated : b)),
      }));
    }
  },

  removeBackend: (id) => {
    db.deleteBackend(id);
    set((s) => ({
      backends: s.backends.filter((b) => b.id !== id),
    }));
  },

  testConnection: async (id) => {
    const backend = get().backends.find((b) => b.id === id);
    if (!backend) return { success: false, error: 'Backend not found' };

    set((s) => ({ loading: { ...s.loading, [id]: true } }));
    try {
      const result = await testBackendConnection(backend);
      const status = result.success ? 'connected' : 'error';
      get().updateBackend(id, { status });
      if (result.models) {
        set((s) => ({
          availableModels: { ...s.availableModels, [id]: result.models! },
        }));
      }
      return { success: result.success, error: result.error };
    } catch (e: any) {
      get().updateBackend(id, { status: 'error' });
      return { success: false, error: e.message };
    } finally {
      set((s) => ({ loading: { ...s.loading, [id]: false } }));
    }
  },

  fetchModels: async (id) => {
    const backend = get().backends.find((b) => b.id === id);
    if (!backend) return [];
    try {
      const adapter = createBackendAdapter(backend);
      const models = await adapter.listModels();
      set((s) => ({
        availableModels: { ...s.availableModels, [id]: models },
      }));
      return models;
    } catch {
      return [];
    }
  },

  getBackend: (id) => get().backends.find((b) => b.id === id),
}));
