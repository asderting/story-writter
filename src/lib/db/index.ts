// ============================================================================
// Story Studio - localStorage Persistence Layer
// ============================================================================
//
// A clean database-like API backed by localStorage with JSON serialization.
// Each entity type is stored under its own localStorage key as a JSON array
// (or object for singletons like AppSettings).
// ============================================================================

import type {
  AppSettings,
  Backend,
  CharacterSheet,
  ChunkSize,
  ContextLayerConfig,
  EnvironmentSheet,
  GenerationHistory,
  GenerationParameters,
  LoreEntry,
  Preset,
  PresetCategory,
  Project,
  ProjectTemplate,
  Revision,
  SceneCard,
  SceneMemory,
  SettingSheet,
  Snapshot,
  StoryMemory,
  WritingStyleMemory,
} from '../../types';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  PROJECTS: 'story-studio:projects',
  BACKENDS: 'story-studio:backends',
  PRESETS: 'story-studio:presets',
  LORE_ENTRIES: 'story-studio:lore-entries',
  CHARACTER_SHEETS: 'story-studio:character-sheets',
  SETTING_SHEETS: 'story-studio:setting-sheets',
  ENVIRONMENT_SHEETS: 'story-studio:environment-sheets',
  REVISIONS: 'story-studio:revisions',
  SNAPSHOTS: 'story-studio:snapshots',
  GENERATION_HISTORY: 'story-studio:generation-history',
  SCENE_CARDS: 'story-studio:scene-cards',
  STORY_MEMORY: 'story-studio:story-memory',
  WRITING_STYLE_MEMORY: 'story-studio:writing-style-memory',
  SCENE_MEMORY: 'story-studio:scene-memory',
  APP_SETTINGS: 'story-studio:app-settings',
  INITIALIZED: 'story-studio:initialized',
} as const;

// ============================================================================
// ID Generation
// ============================================================================

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now(): string {
  return new Date().toISOString();
}

// ============================================================================
// Generic Storage Helpers
// ============================================================================

function readCollection<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch (e) {
    console.error(`[db] Failed to read collection "${key}":`, e);
    return [];
  }
}

function writeCollection<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[db] Failed to write collection "${key}":`, e);
    throw new Error(`Storage write failed for "${key}". LocalStorage may be full.`);
  }
}

function readSingleton<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`[db] Failed to read singleton "${key}":`, e);
    return null;
  }
}

function writeSingleton<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[db] Failed to write singleton "${key}":`, e);
    throw new Error(`Storage write failed for "${key}". LocalStorage may be full.`);
  }
}

// ============================================================================
// Generic CRUD Factory
// ============================================================================

interface EntityWithId {
  id: string;
}

interface EntityWithProjectId extends EntityWithId {
  projectId: string;
}

interface EntityWithTimestamps extends EntityWithId {
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates standard CRUD operations for a given entity collection.
 */
function createCrud<T extends EntityWithId>(storageKey: string) {
  return {
    getAll(): T[] {
      return readCollection<T>(storageKey);
    },

    get(id: string): T | null {
      const items = readCollection<T>(storageKey);
      return items.find((item) => item.id === id) ?? null;
    },

    create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
      const items = readCollection<T>(storageKey);
      const timestamp = now();
      const newItem = {
        ...data,
        id: generateId(),
        createdAt: timestamp,
        updatedAt: timestamp,
      } as unknown as T;
      items.push(newItem);
      writeCollection(storageKey, items);
      return newItem;
    },

    update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): T | null {
      const items = readCollection<T>(storageKey);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const updated = {
        ...items[index],
        ...updates,
        id, // Prevent id overwrite
        updatedAt: now(),
      } as T;
      items[index] = updated;
      writeCollection(storageKey, items);
      return updated;
    },

    delete(id: string): boolean {
      const items = readCollection<T>(storageKey);
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return false;
      items.splice(index, 1);
      writeCollection(storageKey, items);
      return true;
    },
  };
}

/**
 * Adds getByProject to a CRUD object for project-scoped entities.
 */
function withProjectScope<T extends EntityWithProjectId>(
  crud: ReturnType<typeof createCrud<T>>,
  storageKey: string,
) {
  return {
    ...crud,

    getByProject(projectId: string): T[] {
      const items = readCollection<T>(storageKey);
      return items.filter((item) => item.projectId === projectId);
    },
  };
}

// ============================================================================
// Projects
// ============================================================================

const projectCrud = createCrud<Project>(STORAGE_KEYS.PROJECTS);

export const projects = {
  ...projectCrud,

  search(query: string): Project[] {
    const all = projectCrud.getAll();
    if (!query.trim()) return all;
    const lower = query.toLowerCase();
    return all.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.genre.toLowerCase().includes(lower) ||
        p.tags.some((t) => t.toLowerCase().includes(lower)),
    );
  },

  getActive(): Project[] {
    return projectCrud.getAll().filter((p) => !p.archived);
  },

  getArchived(): Project[] {
    return projectCrud.getAll().filter((p) => p.archived);
  },

  getPinned(): Project[] {
    return projectCrud.getAll().filter((p) => p.pinned && !p.archived);
  },

  /**
   * Deletes a project and all associated data (cascade).
   */
  deleteCascade(projectId: string): boolean {
    const deleted = projectCrud.delete(projectId);
    if (!deleted) return false;

    // Remove all project-scoped entities
    const cascadeKeys: Array<{ key: string }> = [
      { key: STORAGE_KEYS.LORE_ENTRIES },
      { key: STORAGE_KEYS.CHARACTER_SHEETS },
      { key: STORAGE_KEYS.SETTING_SHEETS },
      { key: STORAGE_KEYS.ENVIRONMENT_SHEETS },
      { key: STORAGE_KEYS.REVISIONS },
      { key: STORAGE_KEYS.SNAPSHOTS },
      { key: STORAGE_KEYS.GENERATION_HISTORY },
      { key: STORAGE_KEYS.SCENE_CARDS },
    ];

    for (const { key } of cascadeKeys) {
      const items = readCollection<EntityWithProjectId>(key);
      const filtered = items.filter((item) => item.projectId !== projectId);
      writeCollection(key, filtered);
    }

    // Remove singleton memories for this project
    const memoryKeys = [
      STORAGE_KEYS.STORY_MEMORY,
      STORAGE_KEYS.WRITING_STYLE_MEMORY,
      STORAGE_KEYS.SCENE_MEMORY,
    ];
    for (const key of memoryKeys) {
      const items = readCollection<EntityWithProjectId>(key);
      const filtered = items.filter((item) => item.projectId !== projectId);
      writeCollection(key, filtered);
    }

    return true;
  },
};

// ============================================================================
// Backends
// ============================================================================

export const backends = createCrud<Backend>(STORAGE_KEYS.BACKENDS);

// ============================================================================
// Presets
// ============================================================================

export const presets = createCrud<Preset>(STORAGE_KEYS.PRESETS);

// ============================================================================
// Lore Entries
// ============================================================================

export const loreEntries = withProjectScope(
  createCrud<LoreEntry>(STORAGE_KEYS.LORE_ENTRIES),
  STORAGE_KEYS.LORE_ENTRIES,
);

// ============================================================================
// Character Sheets
// ============================================================================

export const characterSheets = withProjectScope(
  createCrud<CharacterSheet>(STORAGE_KEYS.CHARACTER_SHEETS),
  STORAGE_KEYS.CHARACTER_SHEETS,
);

// ============================================================================
// Setting Sheets
// ============================================================================

export const settingSheets = withProjectScope(
  createCrud<SettingSheet>(STORAGE_KEYS.SETTING_SHEETS),
  STORAGE_KEYS.SETTING_SHEETS,
);

// ============================================================================
// Environment Sheets
// ============================================================================

export const environmentSheets = withProjectScope(
  createCrud<EnvironmentSheet>(STORAGE_KEYS.ENVIRONMENT_SHEETS),
  STORAGE_KEYS.ENVIRONMENT_SHEETS,
);

// ============================================================================
// Revisions (append-only: create + read)
// ============================================================================

const revisionStorage = STORAGE_KEYS.REVISIONS;

export const revisions = {
  create(data: Omit<Revision, 'id' | 'createdAt'>): Revision {
    const items = readCollection<Revision>(revisionStorage);
    const revision: Revision = {
      ...data,
      id: generateId(),
      createdAt: now(),
    };
    items.push(revision);
    writeCollection(revisionStorage, items);
    return revision;
  },

  getAll(): Revision[] {
    return readCollection<Revision>(revisionStorage);
  },

  getByProject(projectId: string): Revision[] {
    return readCollection<Revision>(revisionStorage).filter(
      (r) => r.projectId === projectId,
    );
  },
};

// ============================================================================
// Snapshots
// ============================================================================

const snapshotCrud = createCrud<Snapshot>(STORAGE_KEYS.SNAPSHOTS);

export const snapshots = {
  create(data: Omit<Snapshot, 'id' | 'createdAt'>): Snapshot {
    const items = readCollection<Snapshot>(STORAGE_KEYS.SNAPSHOTS);
    const snapshot: Snapshot = {
      ...data,
      id: generateId(),
      createdAt: now(),
    };
    items.push(snapshot);
    writeCollection(STORAGE_KEYS.SNAPSHOTS, items);
    return snapshot;
  },

  get(id: string): Snapshot | null {
    return snapshotCrud.get(id);
  },

  getByProject(projectId: string): Snapshot[] {
    return readCollection<Snapshot>(STORAGE_KEYS.SNAPSHOTS).filter(
      (s) => s.projectId === projectId,
    );
  },

  delete(id: string): boolean {
    return snapshotCrud.delete(id);
  },
};

// ============================================================================
// Generation History (append-only: create + read)
// ============================================================================

const historyStorage = STORAGE_KEYS.GENERATION_HISTORY;

export const generationHistory = {
  create(data: Omit<GenerationHistory, 'id' | 'createdAt'>): GenerationHistory {
    const items = readCollection<GenerationHistory>(historyStorage);
    const entry: GenerationHistory = {
      ...data,
      id: generateId(),
      createdAt: now(),
    };
    items.push(entry);
    writeCollection(historyStorage, items);
    return entry;
  },

  getAll(): GenerationHistory[] {
    return readCollection<GenerationHistory>(historyStorage);
  },

  getByProject(projectId: string): GenerationHistory[] {
    return readCollection<GenerationHistory>(historyStorage).filter(
      (h) => h.projectId === projectId,
    );
  },
};

// ============================================================================
// Scene Cards
// ============================================================================

const sceneCardCrud = createCrud<SceneCard>(STORAGE_KEYS.SCENE_CARDS);

export const sceneCards = {
  ...withProjectScope(sceneCardCrud, STORAGE_KEYS.SCENE_CARDS),

  /**
   * Returns scene cards for a project sorted by chapterIndex, then sceneIndex.
   */
  getByProjectOrdered(projectId: string): SceneCard[] {
    return readCollection<SceneCard>(STORAGE_KEYS.SCENE_CARDS)
      .filter((sc) => sc.projectId === projectId)
      .sort((a, b) => {
        if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex;
        return a.sceneIndex - b.sceneIndex;
      });
  },

  /**
   * Reorders scene cards within a project by applying a new ordering.
   * Accepts an array of { id, chapterIndex, sceneIndex } objects.
   */
  reorder(
    projectId: string,
    ordering: Array<{ id: string; chapterIndex: number; sceneIndex: number }>,
  ): SceneCard[] {
    const allItems = readCollection<SceneCard>(STORAGE_KEYS.SCENE_CARDS);
    const orderMap = new Map(ordering.map((o) => [o.id, o]));
    const timestamp = now();

    const updated = allItems.map((item) => {
      if (item.projectId !== projectId) return item;
      const newOrder = orderMap.get(item.id);
      if (!newOrder) return item;
      return {
        ...item,
        chapterIndex: newOrder.chapterIndex,
        sceneIndex: newOrder.sceneIndex,
        updatedAt: timestamp,
      };
    });

    writeCollection(STORAGE_KEYS.SCENE_CARDS, updated);
    return updated
      .filter((sc) => sc.projectId === projectId)
      .sort((a, b) => {
        if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex;
        return a.sceneIndex - b.sceneIndex;
      });
  },
};

// ============================================================================
// Memory Types (per-project singletons stored as collections keyed by projectId)
// ============================================================================

function createMemoryAccessor<T extends EntityWithProjectId & { content: string; updatedAt: string }>(
  storageKey: string,
) {
  return {
    get(projectId: string): T | null {
      const items = readCollection<T>(storageKey);
      return items.find((item) => item.projectId === projectId) ?? null;
    },

    upsert(projectId: string, content: string): T {
      const items = readCollection<T>(storageKey);
      const index = items.findIndex((item) => item.projectId === projectId);
      const timestamp = now();

      if (index !== -1) {
        const updated = {
          ...items[index],
          content,
          updatedAt: timestamp,
        };
        items[index] = updated;
        writeCollection(storageKey, items);
        return updated;
      }

      const newItem = {
        id: generateId(),
        projectId,
        content,
        updatedAt: timestamp,
      } as unknown as T;
      items.push(newItem);
      writeCollection(storageKey, items);
      return newItem;
    },

    delete(projectId: string): boolean {
      const items = readCollection<T>(storageKey);
      const index = items.findIndex((item) => item.projectId === projectId);
      if (index === -1) return false;
      items.splice(index, 1);
      writeCollection(storageKey, items);
      return true;
    },
  };
}

export const storyMemory = createMemoryAccessor<StoryMemory>(STORAGE_KEYS.STORY_MEMORY);
export const writingStyleMemory = createMemoryAccessor<WritingStyleMemory>(STORAGE_KEYS.WRITING_STYLE_MEMORY);
export const sceneMemory = createMemoryAccessor<SceneMemory>(STORAGE_KEYS.SCENE_MEMORY);

// ============================================================================
// App Settings (singleton)
// ============================================================================

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 16,
  lineSpacing: 1.6,
  editorWidth: 'medium',
  autosaveInterval: 30000,
  backupInterval: 300000,
  streamingDefault: true,
  candidateCountDefault: 1,
  defaultChunkSize: 'medium' as ChunkSize,
};

export const appSettings = {
  get(): AppSettings {
    const stored = readSingleton<AppSettings>(STORAGE_KEYS.APP_SETTINGS);
    if (!stored) {
      writeSingleton(STORAGE_KEYS.APP_SETTINGS, DEFAULT_APP_SETTINGS);
      return { ...DEFAULT_APP_SETTINGS };
    }
    // Merge with defaults to handle schema migrations gracefully
    return { ...DEFAULT_APP_SETTINGS, ...stored };
  },

  update(updates: Partial<AppSettings>): AppSettings {
    const current = appSettings.get();
    const updated = { ...current, ...updates };
    writeSingleton(STORAGE_KEYS.APP_SETTINGS, updated);
    return updated;
  },

  reset(): AppSettings {
    writeSingleton(STORAGE_KEYS.APP_SETTINGS, DEFAULT_APP_SETTINGS);
    return { ...DEFAULT_APP_SETTINGS };
  },
};

// ============================================================================
// Default Presets
// ============================================================================

function defaultGenerationParams(overrides: Partial<GenerationParameters> = {}): GenerationParameters {
  return {
    temperature: 0.8,
    topP: 0.95,
    topK: 40,
    minP: 0.05,
    repetitionPenalty: 1.1,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    maxTokens: 1024,
    stopSequences: [],
    streaming: true,
    ...overrides,
  };
}

function defaultContextLayers(overrides: Partial<ContextLayerConfig> = {}): ContextLayerConfig {
  return {
    includeStoryMemory: true,
    includeStyleMemory: true,
    includeCharacters: true,
    includeSettings: true,
    includeEnvironments: true,
    includeSceneMemory: true,
    includeLore: true,
    recentTextChars: 4000,
    ...overrides,
  };
}

export const DEFAULT_PRESETS: Array<Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Balanced Fiction',
    category: 'continuation' as PresetCategory,
    description:
      'A well-rounded preset suitable for most fiction writing. Provides a good balance between creativity and coherence.',
    promptTemplate: 'Continue the story naturally, maintaining the established tone and pacing.',
    parameters: defaultGenerationParams({
      temperature: 0.8,
      topP: 0.95,
      maxTokens: 1024,
    }),
    notes: 'Good default for general fiction writing.',
    compatibleModels: [],
    contextLayers: defaultContextLayers(),
  },
  {
    name: 'Creative Prose',
    category: 'style' as PresetCategory,
    description:
      'Higher creativity settings for literary prose, poetry, or experimental writing. Produces more surprising and varied output.',
    promptTemplate:
      'Write with vivid, evocative prose. Favor fresh metaphors, sensory detail, and rhythmic sentence structure.',
    parameters: defaultGenerationParams({
      temperature: 1.0,
      topP: 0.98,
      topK: 60,
      maxTokens: 1536,
      repetitionPenalty: 1.15,
    }),
    notes: 'Best with models that have strong literary training. May need re-rolls for coherence.',
    compatibleModels: [],
    contextLayers: defaultContextLayers({ recentTextChars: 6000 }),
  },
  {
    name: 'Controlled Coherent',
    category: 'continuation' as PresetCategory,
    description:
      'Low-temperature settings for maximum coherence and predictability. Ideal for plot-critical scenes, factual exposition, or continuity-sensitive passages.',
    promptTemplate:
      'Continue the story with careful attention to established facts, character details, and plot consistency.',
    parameters: defaultGenerationParams({
      temperature: 0.5,
      topP: 0.85,
      topK: 20,
      maxTokens: 768,
      repetitionPenalty: 1.05,
    }),
    notes: 'Use when accuracy and consistency matter more than stylistic flair.',
    compatibleModels: [],
    contextLayers: defaultContextLayers({ recentTextChars: 8000 }),
  },
  {
    name: 'Dialogue Heavy',
    category: 'dialogue' as PresetCategory,
    description:
      'Optimized for writing natural, character-driven dialogue with distinct voices. Slightly elevated temperature for personality.',
    promptTemplate:
      'Write dialogue that reveals character personality and advances the scene. Each character should have a distinct voice and speech pattern.',
    parameters: defaultGenerationParams({
      temperature: 0.85,
      topP: 0.92,
      topK: 45,
      maxTokens: 1024,
      repetitionPenalty: 1.2,
      frequencyPenalty: 0.1,
    }),
    notes: 'Higher repetition penalty helps avoid characters sounding alike.',
    compatibleModels: [],
    contextLayers: defaultContextLayers({
      includeCharacters: true,
      includeSceneMemory: true,
      recentTextChars: 5000,
    }),
  },
  {
    name: 'Descriptive Lush',
    category: 'description' as PresetCategory,
    description:
      'Tuned for rich environmental descriptions, atmosphere-building, and sensory detail. Great for setting scenes and immersive world-building.',
    promptTemplate:
      'Write richly detailed descriptions engaging all senses. Build atmosphere through specific, evocative details rather than abstract adjectives.',
    parameters: defaultGenerationParams({
      temperature: 0.9,
      topP: 0.96,
      topK: 50,
      maxTokens: 1280,
      repetitionPenalty: 1.18,
      presencePenalty: 0.15,
    }),
    notes: 'Presence penalty encourages covering more sensory dimensions.',
    compatibleModels: [],
    contextLayers: defaultContextLayers({
      includeEnvironments: true,
      includeSettings: true,
      recentTextChars: 4000,
    }),
  },
  {
    name: 'Scene Transition',
    category: 'scene-transition' as PresetCategory,
    description:
      'Concise, purposeful writing for bridging between scenes. Keeps momentum while smoothly shifting time, place, or perspective.',
    promptTemplate:
      'Write a smooth transition that shifts the scene. Be concise but grounding -- establish the new time, place, or POV quickly.',
    parameters: defaultGenerationParams({
      temperature: 0.65,
      topP: 0.9,
      topK: 30,
      maxTokens: 512,
    }),
    notes: 'Lower max tokens keeps transitions tight.',
    compatibleModels: [],
    contextLayers: defaultContextLayers({ recentTextChars: 3000 }),
  },
  {
    name: 'Story Opening',
    category: 'story-opening' as PresetCategory,
    description:
      'Crafted for writing compelling opening paragraphs that hook readers. Balances intrigue with clarity.',
    promptTemplate:
      'Write a compelling opening that hooks the reader immediately. Establish voice, intrigue, and a sense of the world within the first few sentences.',
    parameters: defaultGenerationParams({
      temperature: 0.88,
      topP: 0.94,
      topK: 50,
      maxTokens: 1024,
      presencePenalty: 0.1,
    }),
    notes: 'Works well for first chapters and new scenes.',
    compatibleModels: [],
    contextLayers: defaultContextLayers({
      includeStoryMemory: true,
      includeStyleMemory: true,
      recentTextChars: 2000,
    }),
  },
  {
    name: 'Concise Rewrite',
    category: 'rewrite' as PresetCategory,
    description:
      'Tightens prose by removing unnecessary words, passive voice, and redundancy while preserving meaning and voice.',
    promptTemplate:
      'Rewrite the selected text to be more concise and punchy. Remove filler words, tighten sentences, and strengthen verbs. Preserve the original meaning and voice.',
    parameters: defaultGenerationParams({
      temperature: 0.55,
      topP: 0.88,
      topK: 25,
      maxTokens: 768,
    }),
    notes: 'Low temperature for faithful rewrites.',
    compatibleModels: [],
    contextLayers: defaultContextLayers({ recentTextChars: 3000 }),
  },
];

// ============================================================================
// Default Project Templates
// ============================================================================

export const DEFAULT_PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'template-blank',
    name: 'Blank Project',
    description: 'A clean slate with no predefined settings. Start from scratch.',
    genre: '',
    tone: '',
    systemPrompt:
      'You are a creative fiction writing assistant. Help the author write compelling prose that matches their vision.',
    storyMemory: '',
    styleMemory: '',
    tags: [],
  },
  {
    id: 'template-fantasy-novel',
    name: 'Fantasy Novel',
    description:
      'Pre-configured for epic or contemporary fantasy with world-building context layers enabled.',
    genre: 'Fantasy',
    tone: 'Epic, mythic, immersive',
    systemPrompt:
      'You are a fantasy fiction writing assistant specializing in rich world-building, magic systems, and epic narratives. Write prose that balances sweeping scope with intimate character moments. Use vivid sensory details for magical elements. Maintain internal consistency with established world rules.',
    storyMemory:
      'This is a fantasy story. Key world elements to track: magic system rules, political factions, geography, prophecies or central conflicts, and character lineages.',
    styleMemory:
      'Write in a literary fantasy style. Use rich but not purple prose. Favor concrete sensory details over abstract descriptions. Battle scenes should be visceral and grounded. Dialogue should reflect character background and social station.',
    tags: ['fantasy', 'world-building', 'magic'],
  },
  {
    id: 'template-science-fiction',
    name: 'Science Fiction',
    description:
      'Set up for hard or soft science fiction with technology-aware context and speculative elements.',
    genre: 'Science Fiction',
    tone: 'Speculative, cerebral, forward-looking',
    systemPrompt:
      'You are a science fiction writing assistant. Help create stories that explore technology, society, and the human condition through a speculative lens. Maintain scientific plausibility appropriate to the subgenre. Balance ideas with character-driven narrative.',
    storyMemory:
      'This is a science fiction story. Key elements to track: technology level and rules, political/social structures, alien species or AI entities, timeline of future history, and scientific principles that drive the plot.',
    styleMemory:
      'Write in a clean, precise style suited to science fiction. Technical descriptions should be vivid but accessible. Avoid excessive jargon unless it serves characterization. Action scenes should consider physics and technology. Internal monologue can explore philosophical implications.',
    tags: ['sci-fi', 'speculative', 'technology'],
  },
  {
    id: 'template-romance',
    name: 'Romance',
    description:
      'Configured for romance writing with emphasis on character chemistry, emotional beats, and relationship development.',
    genre: 'Romance',
    tone: 'Emotional, intimate, warm',
    systemPrompt:
      'You are a romance writing assistant. Focus on emotional authenticity, character chemistry, and relationship development. Write scenes that build tension and intimacy naturally. Dialogue should crackle with subtext. Internal thoughts should reveal vulnerability and desire.',
    storyMemory:
      'This is a romance story. Key elements to track: relationship timeline and milestones, emotional wounds and growth arcs for each lead, secondary character relationships, external conflicts that test the relationship, and the central love story premise.',
    styleMemory:
      'Write with emotional depth and sensory awareness. Use body language and micro-expressions to convey unspoken feelings. Dialogue should have layers of subtext. Pacing should alternate between high-tension moments and tender intimacy. Internal monologue is essential for revealing character vulnerability.',
    tags: ['romance', 'character-driven', 'emotional'],
  },
  {
    id: 'template-dark-fantasy',
    name: 'Dark Fantasy',
    description:
      'Grim, morally complex fantasy with horror undertones. Configured for darker tone and atmosphere-heavy prose.',
    genre: 'Dark Fantasy',
    tone: 'Grim, atmospheric, morally ambiguous',
    systemPrompt:
      'You are a dark fantasy writing assistant. Write prose that embraces moral ambiguity, grim consequences, and atmospheric horror. Magic should feel dangerous and costly. Characters should face impossible choices. The world should feel beautiful and terrible in equal measure.',
    storyMemory:
      'This is a dark fantasy story. Key elements to track: the cost and corruption of magic, moral compromises characters have made, looming threats and power dynamics, dark history and forbidden knowledge, and the thin line between heroism and villainy.',
    styleMemory:
      'Write in a dark, atmospheric style. Prose should be visceral and unflinching. Use Gothic imagery and unsettling beauty. Violence should have weight and consequence. Moments of hope should feel fragile and earned. Avoid gratuitous darkness -- every grim element should serve the story.',
    tags: ['dark-fantasy', 'gothic', 'horror', 'grimdark'],
  },
  {
    id: 'template-modern-thriller',
    name: 'Modern Thriller',
    description:
      'Fast-paced contemporary thriller with emphasis on tension, plot twists, and tight prose.',
    genre: 'Thriller',
    tone: 'Tense, fast-paced, suspenseful',
    systemPrompt:
      'You are a thriller writing assistant. Write taut, propulsive prose that keeps readers on edge. Manage information reveals carefully. End chapters on hooks. Dialogue should be sharp and purposeful. Action sequences should be clear and choreographed.',
    storyMemory:
      'This is a modern thriller. Key elements to track: the central mystery or threat, clues and red herrings planted, character knowledge (who knows what and when), ticking clocks and deadlines, and the antagonist\'s plan and motivations.',
    styleMemory:
      'Write in a lean, propulsive style. Short paragraphs and punchy sentences for action scenes. Vary sentence length to control pacing. Use present-tense internal thoughts for immediacy. Dialogue should do double duty -- reveal character while advancing plot. Every scene must either raise stakes or reveal information.',
    tags: ['thriller', 'suspense', 'mystery', 'action'],
  },
];

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initializes the database with default data if this is the first run.
 * Call this once at application startup.
 */
export function initializeDatabase(): void {
  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (initialized) return;

  // Seed default presets
  const existingPresets = readCollection<Preset>(STORAGE_KEYS.PRESETS);
  if (existingPresets.length === 0) {
    const timestamp = now();
    const seededPresets: Preset[] = DEFAULT_PRESETS.map((preset) => ({
      ...preset,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    writeCollection(STORAGE_KEYS.PRESETS, seededPresets);
  }

  // Seed default app settings
  const existingSettings = readSingleton<AppSettings>(STORAGE_KEYS.APP_SETTINGS);
  if (!existingSettings) {
    writeSingleton(STORAGE_KEYS.APP_SETTINGS, DEFAULT_APP_SETTINGS);
  }

  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
}

// ============================================================================
// Utility: Export / Import (for backup and restore)
// ============================================================================

export interface DatabaseExport {
  version: number;
  exportedAt: string;
  data: {
    projects: Project[];
    backends: Backend[];
    presets: Preset[];
    loreEntries: LoreEntry[];
    characterSheets: CharacterSheet[];
    settingSheets: SettingSheet[];
    environmentSheets: EnvironmentSheet[];
    revisions: Revision[];
    snapshots: Snapshot[];
    generationHistory: GenerationHistory[];
    sceneCards: SceneCard[];
    storyMemory: StoryMemory[];
    writingStyleMemory: WritingStyleMemory[];
    sceneMemory: SceneMemory[];
    appSettings: AppSettings;
  };
}

const CURRENT_EXPORT_VERSION = 1;

/**
 * Exports the entire database as a JSON-serializable object.
 */
export function exportDatabase(): DatabaseExport {
  return {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: now(),
    data: {
      projects: readCollection<Project>(STORAGE_KEYS.PROJECTS),
      backends: readCollection<Backend>(STORAGE_KEYS.BACKENDS),
      presets: readCollection<Preset>(STORAGE_KEYS.PRESETS),
      loreEntries: readCollection<LoreEntry>(STORAGE_KEYS.LORE_ENTRIES),
      characterSheets: readCollection<CharacterSheet>(STORAGE_KEYS.CHARACTER_SHEETS),
      settingSheets: readCollection<SettingSheet>(STORAGE_KEYS.SETTING_SHEETS),
      environmentSheets: readCollection<EnvironmentSheet>(STORAGE_KEYS.ENVIRONMENT_SHEETS),
      revisions: readCollection<Revision>(STORAGE_KEYS.REVISIONS),
      snapshots: readCollection<Snapshot>(STORAGE_KEYS.SNAPSHOTS),
      generationHistory: readCollection<GenerationHistory>(STORAGE_KEYS.GENERATION_HISTORY),
      sceneCards: readCollection<SceneCard>(STORAGE_KEYS.SCENE_CARDS),
      storyMemory: readCollection<StoryMemory>(STORAGE_KEYS.STORY_MEMORY),
      writingStyleMemory: readCollection<WritingStyleMemory>(STORAGE_KEYS.WRITING_STYLE_MEMORY),
      sceneMemory: readCollection<SceneMemory>(STORAGE_KEYS.SCENE_MEMORY),
      appSettings: appSettings.get(),
    },
  };
}

/**
 * Imports a full database export, replacing all existing data.
 */
export function importDatabase(dump: DatabaseExport): void {
  if (!dump.version || !dump.data) {
    throw new Error('Invalid database export format.');
  }

  writeCollection(STORAGE_KEYS.PROJECTS, dump.data.projects ?? []);
  writeCollection(STORAGE_KEYS.BACKENDS, dump.data.backends ?? []);
  writeCollection(STORAGE_KEYS.PRESETS, dump.data.presets ?? []);
  writeCollection(STORAGE_KEYS.LORE_ENTRIES, dump.data.loreEntries ?? []);
  writeCollection(STORAGE_KEYS.CHARACTER_SHEETS, dump.data.characterSheets ?? []);
  writeCollection(STORAGE_KEYS.SETTING_SHEETS, dump.data.settingSheets ?? []);
  writeCollection(STORAGE_KEYS.ENVIRONMENT_SHEETS, dump.data.environmentSheets ?? []);
  writeCollection(STORAGE_KEYS.REVISIONS, dump.data.revisions ?? []);
  writeCollection(STORAGE_KEYS.SNAPSHOTS, dump.data.snapshots ?? []);
  writeCollection(STORAGE_KEYS.GENERATION_HISTORY, dump.data.generationHistory ?? []);
  writeCollection(STORAGE_KEYS.SCENE_CARDS, dump.data.sceneCards ?? []);
  writeCollection(STORAGE_KEYS.STORY_MEMORY, dump.data.storyMemory ?? []);
  writeCollection(STORAGE_KEYS.WRITING_STYLE_MEMORY, dump.data.writingStyleMemory ?? []);
  writeCollection(STORAGE_KEYS.SCENE_MEMORY, dump.data.sceneMemory ?? []);

  if (dump.data.appSettings) {
    writeSingleton(STORAGE_KEYS.APP_SETTINGS, dump.data.appSettings);
  }

  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
}

/**
 * Clears all Story Studio data from localStorage.
 */
export function clearDatabase(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
}

// ============================================================================
// Convenience: Create project from template
// ============================================================================

/**
 * Creates a new project from a template, optionally overriding fields.
 */
export function createProjectFromTemplate(
  template: ProjectTemplate,
  overrides: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Project {
  const project = projects.create({
    title: overrides.title ?? `Untitled ${template.name}`,
    description: overrides.description ?? template.description,
    genre: overrides.genre ?? template.genre,
    tags: overrides.tags ?? [...template.tags],
    tone: overrides.tone ?? template.tone,
    systemPrompt: overrides.systemPrompt ?? template.systemPrompt,
    storyContent: overrides.storyContent ?? '',
    synopsis: overrides.synopsis ?? '',
    notes: overrides.notes ?? '',
    pinned: overrides.pinned ?? false,
    archived: overrides.archived ?? false,
    activeModelId: overrides.activeModelId,
    activeBackendId: overrides.activeBackendId,
    activePresetId: overrides.activePresetId,
  } as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);

  // Seed memory from template
  if (template.storyMemory) {
    storyMemory.upsert(project.id, template.storyMemory);
  }
  if (template.styleMemory) {
    writingStyleMemory.upsert(project.id, template.styleMemory);
  }

  return project;
}

// ============================================================================
// Convenience Wrappers (flat function API used by stores)
// ============================================================================

// Projects
export const getAllProjects = () => projects.getAll();
export const getProject = (id: string) => projects.get(id);
export const createProject = (data: Partial<Project>) =>
  projects.create(data as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
export const updateProject = (id: string, updates: Partial<Project>) => projects.update(id, updates);
export const deleteProject = (id: string) => projects.deleteCascade(id);

// Backends
export const getAllBackends = () => backends.getAll();
export const createBackend = (data: Partial<Backend>) =>
  backends.create(data as Omit<Backend, 'id' | 'createdAt' | 'updatedAt'>);
export const updateBackend = (id: string, updates: Partial<Backend>) => backends.update(id, updates);
export const deleteBackend = (id: string) => backends.delete(id);

// Presets
export const getAllPresets = () => presets.getAll();
export const createPreset = (data: Partial<Preset>) =>
  presets.create(data as Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>);
export const updatePreset = (id: string, updates: Partial<Preset>) => presets.update(id, updates);
export const deletePreset = (id: string) => presets.delete(id);

// Characters
export const getCharactersByProject = (projectId: string) => characterSheets.getByProject(projectId);
export const createCharacter = (data: Partial<CharacterSheet>) =>
  characterSheets.create(data as Omit<CharacterSheet, 'id' | 'createdAt' | 'updatedAt'>);
export const updateCharacter = (id: string, updates: Partial<CharacterSheet>) => characterSheets.update(id, updates);
export const deleteCharacter = (id: string) => characterSheets.delete(id);

// Settings (world settings)
export const getSettingsByProject = (projectId: string) => settingSheets.getByProject(projectId);
export const createSetting = (data: Partial<SettingSheet>) =>
  settingSheets.create(data as Omit<SettingSheet, 'id' | 'createdAt' | 'updatedAt'>);
export const updateSetting = (id: string, updates: Partial<SettingSheet>) => settingSheets.update(id, updates);
export const deleteSetting = (id: string) => settingSheets.delete(id);

// Environments
export const getEnvironmentsByProject = (projectId: string) => environmentSheets.getByProject(projectId);
export const createEnvironment = (data: Partial<EnvironmentSheet>) =>
  environmentSheets.create(data as Omit<EnvironmentSheet, 'id' | 'createdAt' | 'updatedAt'>);
export const updateEnvironment = (id: string, updates: Partial<EnvironmentSheet>) => environmentSheets.update(id, updates);
export const deleteEnvironment = (id: string) => environmentSheets.delete(id);

// Lore Entries
export const getLoreEntriesByProject = (projectId: string) => loreEntries.getByProject(projectId);
export const createLoreEntry = (data: Partial<LoreEntry>) =>
  loreEntries.create(data as Omit<LoreEntry, 'id' | 'createdAt' | 'updatedAt'>);
export const updateLoreEntry = (id: string, updates: Partial<LoreEntry>) => loreEntries.update(id, updates);
export const deleteLoreEntry = (id: string) => loreEntries.delete(id);

// Snapshots
export const getSnapshotsByProject = (projectId: string) => snapshots.getByProject(projectId);
export const createSnapshot = (data: Omit<Snapshot, 'id' | 'createdAt'>) => snapshots.create(data);
export const getSnapshot = (id: string) => snapshots.get(id);
export const deleteSnapshot = (id: string) => snapshots.delete(id);

// Revisions
export const getRevisionsByProject = (projectId: string) => revisions.getByProject(projectId);

// Generation History
export const getGenerationHistoryByProject = (projectId: string) => generationHistory.getByProject(projectId);
export const createGenerationHistory = (data: Omit<GenerationHistory, 'id' | 'createdAt'>) =>
  generationHistory.create(data);

// Memory
export const getStoryMemory = (projectId: string) => storyMemory.get(projectId);
export const upsertStoryMemory = (projectId: string, content: string) => storyMemory.upsert(projectId, content);
export const getWritingStyleMemory = (projectId: string) => writingStyleMemory.get(projectId);
export const upsertWritingStyleMemory = (projectId: string, content: string) => writingStyleMemory.upsert(projectId, content);
export const getSceneMemory = (projectId: string) => sceneMemory.get(projectId);
export const upsertSceneMemory = (projectId: string, content: string) => sceneMemory.upsert(projectId, content);

// App Settings
export const getAppSettings = () => appSettings.get();
export const updateAppSettings = (updates: Partial<AppSettings>) => appSettings.update(updates);
