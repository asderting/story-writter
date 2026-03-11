import { create } from 'zustand';
import type {
  GenerationAction,
  GenerationParameters,
  GenerationResult,
  ChunkSize,
  ContextLayerConfig,
} from '@/types';
import { createBackendAdapter } from '@/lib/backends';
import { composeContext } from '@/lib/context';
import { buildPromptMessages } from '@/lib/templates';
import { useProjectStore } from './projectStore';
import { useBackendStore } from './backendStore';
import { useMemoryStore } from './memoryStore';
import * as db from '@/lib/db';

interface GenerationState {
  isGenerating: boolean;
  streamingText: string;
  error: string | null;
  candidates: GenerationResult[];
  currentAction: GenerationAction;
  instruction: string;
  selectedText: string;
  selectionRange: { start: number; end: number } | null;
  chunkSize: ChunkSize;
  customChunkTokens: number;
  chunkGuidance: string;
  autoGenerate: boolean;

  parameters: GenerationParameters;

  contextConfig: ContextLayerConfig;

  // Actions
  setAction: (action: GenerationAction) => void;
  setInstruction: (text: string) => void;
  setSelectedText: (text: string, start?: number, end?: number) => void;
  setChunkSize: (size: ChunkSize) => void;
  setCustomChunkTokens: (tokens: number) => void;
  setChunkGuidance: (guidance: string) => void;
  setAutoGenerate: (auto: boolean) => void;
  updateParameter: <K extends keyof GenerationParameters>(key: K, value: GenerationParameters[K]) => void;
  setParameters: (params: Partial<GenerationParameters>) => void;
  updateContextConfig: <K extends keyof ContextLayerConfig>(key: K, value: ContextLayerConfig[K]) => void;
  generate: () => Promise<void>;
  cancelGeneration: () => void;
  acceptCandidate: (index: number) => void;
  clearCandidates: () => void;

  // Internal
  _abortController: AbortController | null;
}

const defaultParameters: GenerationParameters = {
  temperature: 0.8,
  topP: 0.95,
  topK: 40,
  minP: 0.05,
  repetitionPenalty: 1.1,
  frequencyPenalty: 0,
  presencePenalty: 0,
  maxTokens: 1024,
  stopSequences: [],
  streaming: true,
  seed: undefined,
};

const defaultContextConfig: ContextLayerConfig = {
  includeStoryMemory: true,
  includeStyleMemory: true,
  includeCharacters: true,
  includeSettings: true,
  includeEnvironments: true,
  includeSceneMemory: true,
  includeLore: true,
  recentTextChars: 4000,
};

export const useGenerationStore = create<GenerationState>((set, get) => ({
  isGenerating: false,
  streamingText: '',
  error: null,
  candidates: [],
  currentAction: 'continue',
  instruction: '',
  selectedText: '',
  selectionRange: null,
  chunkSize: 'medium',
  customChunkTokens: 256,
  chunkGuidance: '',
  autoGenerate: false,
  parameters: { ...defaultParameters },
  contextConfig: { ...defaultContextConfig },
  _abortController: null,

  setAction: (action) => set({ currentAction: action }),
  setInstruction: (text) => set({ instruction: text }),
  setSelectedText: (text, start, end) =>
    set({
      selectedText: text,
      selectionRange: start !== undefined && end !== undefined ? { start, end } : null,
    }),
  setChunkSize: (size) => set({ chunkSize: size }),
  setCustomChunkTokens: (tokens) => set({ customChunkTokens: tokens }),
  setChunkGuidance: (guidance) => set({ chunkGuidance: guidance }),
  setAutoGenerate: (auto) => set({ autoGenerate: auto }),

  updateParameter: (key, value) =>
    set((s) => ({ parameters: { ...s.parameters, [key]: value } })),
  setParameters: (params) =>
    set((s) => ({ parameters: { ...s.parameters, ...params } })),

  updateContextConfig: (key, value) =>
    set((s) => ({ contextConfig: { ...s.contextConfig, [key]: value } })),

  generate: async () => {
    const state = get();
    const project = useProjectStore.getState().getActiveProject();
    if (!project) return;

    const backendId = project.activeBackendId;
    if (!backendId) return;
    const backend = useBackendStore.getState().getBackend(backendId);
    if (!backend) return;

    const memoryState = useMemoryStore.getState();

    const adapter = createBackendAdapter(backend);
    const abortController = new AbortController();

    set({ isGenerating: true, streamingText: '', error: null, _abortController: abortController });

    try {
      // Compose context
      const composed = composeContext({
        project,
        storyMemory: memoryState.storyMemory || undefined,
        styleMemory: memoryState.styleMemory || undefined,
        characters: memoryState.characters,
        settings: memoryState.settings,
        environments: memoryState.environments,
        sceneMemory: memoryState.sceneMemory || undefined,
        loreEntries: memoryState.loreEntries,
        recentText: project.storyContent.slice(-state.contextConfig.recentTextChars),
        selectedText: state.selectedText || undefined,
        config: state.contextConfig,
      });

      // Determine effective max tokens based on chunk size
      let effectiveMaxTokens = state.parameters.maxTokens;
      const chunkMap: Record<ChunkSize, number> = {
        'very-short': 64,
        short: 150,
        medium: 300,
        long: 600,
        custom: state.customChunkTokens,
      };
      if (state.chunkSize !== 'custom' || state.customChunkTokens) {
        effectiveMaxTokens = chunkMap[state.chunkSize];
      }

      // Build instruction with chunk guidance
      let fullInstruction = state.instruction;
      if (state.chunkGuidance) {
        fullInstruction = fullInstruction
          ? `${fullInstruction}\n\nAdditional guidance: ${state.chunkGuidance}`
          : state.chunkGuidance;
      }

      const messages = buildPromptMessages({
        instruction: fullInstruction,
        sourceText: project.storyContent,
        selectedText: state.selectedText || undefined,
        context: composed,
        action: state.currentAction,
      });

      const modelName = project.activeModelId || backend.defaultModel || '';

      if (!modelName) {
        throw new Error('No model selected. Please select a model in the Models section.');
      }

      if (state.parameters.streaming) {
        // Streaming generation
        let fullText = '';
        const stream = adapter.generateCompletionStream({
          model: modelName,
          messages,
          temperature: state.parameters.temperature,
          topP: state.parameters.topP,
          maxTokens: effectiveMaxTokens,
          stopSequences: state.parameters.stopSequences,
          frequencyPenalty: state.parameters.frequencyPenalty,
          presencePenalty: state.parameters.presencePenalty,
          seed: state.parameters.seed,
          stream: true,
        });

        for await (const chunk of stream) {
          if (abortController.signal.aborted) break;
          fullText += chunk;
          set({ streamingText: fullText });
        }

        const result: GenerationResult = {
          id: crypto.randomUUID(),
          text: fullText,
          timestamp: new Date().toISOString(),
          model: modelName,
          parameters: { ...state.parameters, maxTokens: effectiveMaxTokens },
          instruction: fullInstruction,
          action: state.currentAction,
          accepted: false,
        };

        set((s) => ({ candidates: [...s.candidates, result] }));

        // Save to history
        db.createGenerationHistory({
          projectId: project.id,
          actionType: state.currentAction,
          compiledPrompt: JSON.stringify(messages),
          outputText: fullText,
          parameters: { ...state.parameters, maxTokens: effectiveMaxTokens },
          modelUsed: modelName,
          accepted: false,
        });
      } else {
        // Non-streaming generation
        const text = await adapter.generateCompletion({
          model: modelName,
          messages,
          temperature: state.parameters.temperature,
          topP: state.parameters.topP,
          maxTokens: effectiveMaxTokens,
          stopSequences: state.parameters.stopSequences,
          frequencyPenalty: state.parameters.frequencyPenalty,
          presencePenalty: state.parameters.presencePenalty,
          seed: state.parameters.seed,
          stream: false,
        });

        const result: GenerationResult = {
          id: crypto.randomUUID(),
          text,
          timestamp: new Date().toISOString(),
          model: modelName,
          parameters: { ...state.parameters, maxTokens: effectiveMaxTokens },
          instruction: fullInstruction,
          action: state.currentAction,
          accepted: false,
        };

        set((s) => ({ candidates: [...s.candidates, result] }));

        db.createGenerationHistory({
          projectId: project.id,
          actionType: state.currentAction,
          compiledPrompt: JSON.stringify(messages),
          outputText: text,
          parameters: { ...state.parameters, maxTokens: effectiveMaxTokens },
          modelUsed: modelName,
          accepted: false,
        });
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Generation error:', e);
        set({ error: e.message || 'Generation failed' });
      }
    } finally {
      set({ isGenerating: false, _abortController: null });
    }
  },

  cancelGeneration: () => {
    const { _abortController } = get();
    if (_abortController) {
      _abortController.abort();
    }
    set({ isGenerating: false });
  },

  acceptCandidate: (index) => {
    const { candidates } = get();
    if (index >= 0 && index < candidates.length) {
      const updated = [...candidates];
      updated[index] = { ...updated[index], accepted: true };
      set({ candidates: updated });
    }
  },

  clearCandidates: () => set({ candidates: [], streamingText: '' }),
}));
