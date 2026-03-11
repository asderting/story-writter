import { create } from 'zustand';
import type { AppSettings } from '@/types';
import * as db from '@/lib/db';

interface SettingsState {
  settings: AppSettings;
  loadSettings: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  fontSize: 16,
  lineSpacing: 1.8,
  editorWidth: 'medium',
  autosaveInterval: 30000,
  backupInterval: 300000,
  streamingDefault: true,
  candidateCountDefault: 1,
  defaultChunkSize: 'medium',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,

  loadSettings: () => {
    const stored = db.getAppSettings();
    set({ settings: { ...defaultSettings, ...stored } });
  },

  updateSettings: (partial) => {
    set((s) => {
      const newSettings = { ...s.settings, ...partial };
      db.updateAppSettings(newSettings);
      return { settings: newSettings };
    });
  },
}));
