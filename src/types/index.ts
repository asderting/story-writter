// ============================================================================
// Story Studio - Core Types
// ============================================================================

// --- Backend & Model Types ---

export type BackendType = 'lm-studio' | 'ollama' | 'openai-compatible';

export interface Backend {
  id: string;
  type: BackendType;
  name: string;
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  capabilities: BackendCapabilities;
  createdAt: string;
  updatedAt: string;
}

export interface BackendCapabilities {
  supportsChatCompletions: boolean;
  supportsCompletions: boolean;
  supportsStreaming: boolean;
  supportsEdit: boolean;
  supportsStructuredOutput: boolean;
}

export interface ModelProfile {
  id: string;
  backendId: string;
  modelName: string;
  displayName: string;
  contextLength: number;
  supportsStreaming: boolean;
  supportsEdit: boolean;
  notes: string;
  tags: string[];
}

// --- Project Types ---

export interface Project {
  id: string;
  title: string;
  description: string;
  genre: string;
  tags: string[];
  tone: string;
  activeModelId?: string;
  activeBackendId?: string;
  activePresetId?: string;
  systemPrompt: string;
  storyContent: string;
  synopsis: string;
  notes: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Memory / Context Types ---

export interface StoryMemory {
  id: string;
  projectId: string;
  content: string;
  updatedAt: string;
}

export interface WritingStyleMemory {
  id: string;
  projectId: string;
  content: string;
  updatedAt: string;
}

export interface CharacterSheet {
  id: string;
  projectId: string;
  name: string;
  age: string;
  appearance: string;
  personality: string;
  motivations: string;
  relationships: string;
  speakingStyle: string;
  strengths: string;
  flaws: string;
  background: string;
  currentArc: string;
  notes: string;
  alwaysInclude: boolean;
  activeInScene: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettingSheet {
  id: string;
  projectId: string;
  name: string;
  genre: string;
  tone: string;
  rules: string;
  technologyLevel: string;
  atmosphere: string;
  factions: string;
  recentEvents: string;
  culturalNorms: string;
  environmentDetails: string;
  alwaysInclude: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentSheet {
  id: string;
  projectId: string;
  name: string;
  visualDetails: string;
  mood: string;
  sensoryDetails: string;
  weather: string;
  soundscape: string;
  lighting: string;
  sceneNotes: string;
  activeInScene: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SceneMemory {
  id: string;
  projectId: string;
  content: string;
  updatedAt: string;
}

// --- Lorebook Types ---

export type LoreEntryType =
  | 'character'
  | 'location'
  | 'faction'
  | 'magic-system'
  | 'item'
  | 'timeline-event'
  | 'world-rule'
  | 'prose-constraint'
  | 'environment'
  | 'social-rule';

export interface LoreEntry {
  id: string;
  projectId: string;
  title: string;
  type: LoreEntryType;
  content: string;
  keywords: string[];
  category: string;
  priority: number;
  alwaysInclude: boolean;
  active: boolean;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// --- Preset Types ---

export type PresetCategory =
  | 'story-opening'
  | 'continuation'
  | 'rewrite'
  | 'dialogue'
  | 'atmosphere'
  | 'pacing'
  | 'description'
  | 'concise'
  | 'scene-transition'
  | 'style'
  | 'character-focus'
  | 'environment'
  | 'custom';

export interface Preset {
  id: string;
  name: string;
  category: PresetCategory;
  description: string;
  promptTemplate: string;
  parameters: GenerationParameters;
  notes: string;
  compatibleModels: string[];
  contextLayers: ContextLayerConfig;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationParameters {
  temperature: number;
  topP: number;
  topK: number;
  minP: number;
  repetitionPenalty: number;
  frequencyPenalty: number;
  presencePenalty: number;
  maxTokens: number;
  stopSequences: string[];
  seed?: number;
  streaming: boolean;
}

export interface ContextLayerConfig {
  includeStoryMemory: boolean;
  includeStyleMemory: boolean;
  includeCharacters: boolean;
  includeSettings: boolean;
  includeEnvironments: boolean;
  includeSceneMemory: boolean;
  includeLore: boolean;
  recentTextChars: number;
}

// --- Generation Types ---

export type GenerationAction =
  | 'create'
  | 'continue'
  | 'expand'
  | 'rewrite'
  | 'paraphrase'
  | 'style-transform'
  | 'shorten'
  | 'insert'
  | 'selection-edit';

export type ChunkSize = 'very-short' | 'short' | 'medium' | 'long' | 'custom';

export interface GenerationRequest {
  action: GenerationAction;
  instruction: string;
  sourceText: string;
  selectedText?: string;
  selectionStart?: number;
  selectionEnd?: number;
  projectId: string;
  backendId: string;
  modelName: string;
  parameters: GenerationParameters;
  contextLayers: ContextLayerConfig;
  chunkSize: ChunkSize;
  customChunkTokens?: number;
  candidateCount: number;
}

export interface GenerationResult {
  id: string;
  text: string;
  timestamp: string;
  model: string;
  parameters: GenerationParameters;
  instruction: string;
  action: GenerationAction;
  accepted: boolean;
}

// --- History & Revision Types ---

export interface Revision {
  id: string;
  projectId: string;
  actionType: GenerationAction;
  targetStart?: number;
  targetEnd?: number;
  originalText: string;
  newText: string;
  instruction: string;
  modelUsed: string;
  parameters: GenerationParameters;
  createdAt: string;
}

export interface Snapshot {
  id: string;
  projectId: string;
  name: string;
  storyText: string;
  description: string;
  createdAt: string;
}

export interface GenerationHistory {
  id: string;
  projectId: string;
  actionType: GenerationAction;
  compiledPrompt: string;
  outputText: string;
  parameters: GenerationParameters;
  modelUsed: string;
  accepted: boolean;
  createdAt: string;
}

// --- Scene / Chapter Types ---

export interface SceneCard {
  id: string;
  projectId: string;
  title: string;
  chapterIndex: number;
  sceneIndex: number;
  goal: string;
  pov: string;
  conflict: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// --- Editor Types ---

export type EditorMode = 'focus' | 'split' | 'compare' | 'version';

export interface EditorStats {
  characters: number;
  words: number;
  estimatedTokens: number;
}

// --- App Settings ---

export interface AppSettings {
  theme: 'dark' | 'light';
  fontSize: number;
  lineSpacing: number;
  editorWidth: 'narrow' | 'medium' | 'wide' | 'full';
  autosaveInterval: number;
  backupInterval: number;
  defaultBackendId?: string;
  defaultPresetId?: string;
  streamingDefault: boolean;
  candidateCountDefault: number;
  defaultChunkSize: ChunkSize;
}

// --- Template Types ---

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  genre: string;
  tone: string;
  systemPrompt: string;
  storyMemory: string;
  styleMemory: string;
  tags: string[];
}
