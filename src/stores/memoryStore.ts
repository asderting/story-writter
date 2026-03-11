import { create } from 'zustand';
import type {
  StoryMemory,
  WritingStyleMemory,
  SceneMemory,
  CharacterSheet,
  SettingSheet,
  EnvironmentSheet,
  LoreEntry,
} from '@/types';
import * as db from '@/lib/db';

interface MemoryState {
  storyMemory: StoryMemory | null;
  styleMemory: WritingStyleMemory | null;
  sceneMemory: SceneMemory | null;
  characters: CharacterSheet[];
  settings: SettingSheet[];
  environments: EnvironmentSheet[];
  loreEntries: LoreEntry[];

  // Load all memory for a project
  loadProjectMemory: (projectId: string) => void;
  clearMemory: () => void;

  // Story Memory
  updateStoryMemory: (projectId: string, content: string) => void;

  // Style Memory
  updateStyleMemory: (projectId: string, content: string) => void;

  // Scene Memory
  updateSceneMemory: (projectId: string, content: string) => void;

  // Characters
  addCharacter: (projectId: string, partial: Partial<CharacterSheet>) => CharacterSheet;
  updateCharacter: (id: string, partial: Partial<CharacterSheet>) => void;
  deleteCharacter: (id: string) => void;

  // Settings
  addSetting: (projectId: string, partial: Partial<SettingSheet>) => SettingSheet;
  updateSetting: (id: string, partial: Partial<SettingSheet>) => void;
  deleteSetting: (id: string) => void;

  // Environments
  addEnvironment: (projectId: string, partial: Partial<EnvironmentSheet>) => EnvironmentSheet;
  updateEnvironment: (id: string, partial: Partial<EnvironmentSheet>) => void;
  deleteEnvironment: (id: string) => void;

  // Lore
  addLoreEntry: (projectId: string, partial: Partial<LoreEntry>) => LoreEntry;
  updateLoreEntry: (id: string, partial: Partial<LoreEntry>) => void;
  deleteLoreEntry: (id: string) => void;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  storyMemory: null,
  styleMemory: null,
  sceneMemory: null,
  characters: [],
  settings: [],
  environments: [],
  loreEntries: [],

  loadProjectMemory: (projectId) => {
    set({
      storyMemory: db.getStoryMemory(projectId),
      styleMemory: db.getWritingStyleMemory(projectId),
      sceneMemory: db.getSceneMemory(projectId),
      characters: db.getCharactersByProject(projectId),
      settings: db.getSettingsByProject(projectId),
      environments: db.getEnvironmentsByProject(projectId),
      loreEntries: db.getLoreEntriesByProject(projectId),
    });
  },

  clearMemory: () => {
    set({
      storyMemory: null,
      styleMemory: null,
      sceneMemory: null,
      characters: [],
      settings: [],
      environments: [],
      loreEntries: [],
    });
  },

  updateStoryMemory: (projectId, content) => {
    const mem = db.upsertStoryMemory(projectId, content);
    set({ storyMemory: mem });
  },

  updateStyleMemory: (projectId, content) => {
    const mem = db.upsertWritingStyleMemory(projectId, content);
    set({ styleMemory: mem });
  },

  updateSceneMemory: (projectId, content) => {
    const mem = db.upsertSceneMemory(projectId, content);
    set({ sceneMemory: mem });
  },

  // Characters
  addCharacter: (projectId, partial) => {
    const char = db.createCharacter({ ...partial, projectId });
    set((s) => ({ characters: [...s.characters, char] }));
    return char;
  },
  updateCharacter: (id, partial) => {
    const updated = db.updateCharacter(id, partial);
    if (updated) {
      set((s) => ({
        characters: s.characters.map((c) => (c.id === id ? updated : c)),
      }));
    }
  },
  deleteCharacter: (id) => {
    db.deleteCharacter(id);
    set((s) => ({ characters: s.characters.filter((c) => c.id !== id) }));
  },

  // Settings
  addSetting: (projectId, partial) => {
    const setting = db.createSetting({ ...partial, projectId });
    set((s) => ({ settings: [...s.settings, setting] }));
    return setting;
  },
  updateSetting: (id, partial) => {
    const updated = db.updateSetting(id, partial);
    if (updated) {
      set((s) => ({
        settings: s.settings.map((s2) => (s2.id === id ? updated : s2)),
      }));
    }
  },
  deleteSetting: (id) => {
    db.deleteSetting(id);
    set((s) => ({ settings: s.settings.filter((s2) => s2.id !== id) }));
  },

  // Environments
  addEnvironment: (projectId, partial) => {
    const env = db.createEnvironment({ ...partial, projectId });
    set((s) => ({ environments: [...s.environments, env] }));
    return env;
  },
  updateEnvironment: (id, partial) => {
    const updated = db.updateEnvironment(id, partial);
    if (updated) {
      set((s) => ({
        environments: s.environments.map((e) => (e.id === id ? updated : e)),
      }));
    }
  },
  deleteEnvironment: (id) => {
    db.deleteEnvironment(id);
    set((s) => ({ environments: s.environments.filter((e) => e.id !== id) }));
  },

  // Lore
  addLoreEntry: (projectId, partial) => {
    const entry = db.createLoreEntry({ ...partial, projectId });
    set((s) => ({ loreEntries: [...s.loreEntries, entry] }));
    return entry;
  },
  updateLoreEntry: (id, partial) => {
    const updated = db.updateLoreEntry(id, partial);
    if (updated) {
      set((s) => ({
        loreEntries: s.loreEntries.map((e) => (e.id === id ? updated : e)),
      }));
    }
  },
  deleteLoreEntry: (id) => {
    db.deleteLoreEntry(id);
    set((s) => ({ loreEntries: s.loreEntries.filter((e) => e.id !== id) }));
  },
}));
