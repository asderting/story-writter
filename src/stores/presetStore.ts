import { create } from 'zustand';
import type { Preset } from '@/types';
import * as db from '@/lib/db';

interface PresetState {
  presets: Preset[];

  loadPresets: () => void;
  addPreset: (partial: Partial<Preset>) => Preset;
  updatePreset: (id: string, partial: Partial<Preset>) => void;
  deletePreset: (id: string) => void;
  getPreset: (id: string) => Preset | undefined;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],

  loadPresets: () => {
    const presets = db.getAllPresets();
    set({ presets });
  },

  addPreset: (partial) => {
    const preset = db.createPreset(partial);
    set((s) => ({ presets: [...s.presets, preset] }));
    return preset;
  },

  updatePreset: (id, partial) => {
    const updated = db.updatePreset(id, partial);
    if (updated) {
      set((s) => ({
        presets: s.presets.map((p) => (p.id === id ? updated : p)),
      }));
    }
  },

  deletePreset: (id) => {
    db.deletePreset(id);
    set((s) => ({ presets: s.presets.filter((p) => p.id !== id) }));
  },

  getPreset: (id) => get().presets.find((p) => p.id === id),
}));
