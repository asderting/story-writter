import { useGenerationStore } from '@/stores/generationStore';
import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import type { GenerationAction, ChunkSize } from '@/types';
import { Sparkles, Loader2, Square } from 'lucide-react';

const ACTIONS: { value: GenerationAction; label: string }[] = [
  { value: 'continue', label: 'Continue' },
  { value: 'create', label: 'Create' },
  { value: 'expand', label: 'Expand' },
  { value: 'rewrite', label: 'Rewrite' },
  { value: 'paraphrase', label: 'Paraphrase' },
  { value: 'style-transform', label: 'Style Transform' },
  { value: 'shorten', label: 'Shorten' },
  { value: 'insert', label: 'Insert' },
  { value: 'selection-edit', label: 'Edit Selection' },
];

const CHUNK_SIZES: { value: ChunkSize; label: string; tokens: string }[] = [
  { value: 'very-short', label: 'Very Short', tokens: '~64 tokens' },
  { value: 'short', label: 'Short', tokens: '~150 tokens' },
  { value: 'medium', label: 'Medium', tokens: '~300 tokens' },
  { value: 'long', label: 'Long', tokens: '~600 tokens' },
  { value: 'custom', label: 'Custom', tokens: '' },
];

export function GenerateSection() {
  const project = useProjectStore((s) => s.getActiveProject());

  const currentAction = useGenerationStore((s) => s.currentAction);
  const instruction = useGenerationStore((s) => s.instruction);
  const chunkSize = useGenerationStore((s) => s.chunkSize);
  const customChunkTokens = useGenerationStore((s) => s.customChunkTokens);
  const parameters = useGenerationStore((s) => s.parameters);
  const contextConfig = useGenerationStore((s) => s.contextConfig);
  const isGenerating = useGenerationStore((s) => s.isGenerating);

  const setAction = useGenerationStore((s) => s.setAction);
  const setInstruction = useGenerationStore((s) => s.setInstruction);
  const setChunkSize = useGenerationStore((s) => s.setChunkSize);
  const setCustomChunkTokens = useGenerationStore((s) => s.setCustomChunkTokens);
  const updateParameter = useGenerationStore((s) => s.updateParameter);
  const updateContextConfig = useGenerationStore((s) => s.updateContextConfig);
  const generate = useGenerationStore((s) => s.generate);
  const cancelGeneration = useGenerationStore((s) => s.cancelGeneration);

  const selectedText = useEditorStore((s) => s.selectionText);
  const hasSelection = useEditorStore((s) => s.hasSelection);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Open a project first
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-zinc-100">Generate</h2>

      {/* Action */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Action</label>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => setAction(a.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                currentAction === a.value
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instruction */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Instruction</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Optional: describe what you want..."
          className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
        />
      </div>

      {/* Selected text preview */}
      {hasSelection && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
          <div className="text-xs text-zinc-400 mb-1">Selected text</div>
          <p className="text-sm text-zinc-300 line-clamp-3">{selectedText}</p>
        </div>
      )}

      {/* Chunk size */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Output Length</label>
        <div className="flex flex-wrap gap-2">
          {CHUNK_SIZES.map((c) => (
            <button
              key={c.value}
              onClick={() => setChunkSize(c.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                chunkSize === c.value
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {c.label}
              {c.tokens && <span className="ml-1 text-xs opacity-60">{c.tokens}</span>}
            </button>
          ))}
        </div>
        {chunkSize === 'custom' && (
          <input
            type="number"
            value={customChunkTokens}
            onChange={(e) => setCustomChunkTokens(Number(e.target.value))}
            className="mt-2 w-32 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
            min={16}
            max={4096}
          />
        )}
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        <label className="block text-xs text-zinc-400">Parameters</label>
        {[
          { key: 'temperature' as const, label: 'Temperature', min: 0, max: 2, step: 0.05 },
          { key: 'topP' as const, label: 'Top P', min: 0, max: 1, step: 0.05 },
          { key: 'topK' as const, label: 'Top K', min: 0, max: 100, step: 1 },
          { key: 'repetitionPenalty' as const, label: 'Repetition Penalty', min: 1, max: 2, step: 0.05 },
          { key: 'maxTokens' as const, label: 'Max Tokens', min: 16, max: 4096, step: 16 },
        ].map(({ key, label, min, max, step }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 w-36">{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={parameters[key]}
              onChange={(e) => updateParameter(key, Number(e.target.value))}
              className="flex-1 accent-violet-500"
            />
            <span className="text-xs text-zinc-400 w-12 text-right">{parameters[key]}</span>
          </div>
        ))}

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={parameters.streaming}
            onChange={(e) => updateParameter('streaming', e.target.checked)}
            className="accent-violet-500"
          />
          Streaming
        </label>
      </div>

      {/* Context layers */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Context Layers</label>
        <div className="space-y-1">
          {[
            { key: 'includeStoryMemory' as const, label: 'Story Memory' },
            { key: 'includeStyleMemory' as const, label: 'Writing Style' },
            { key: 'includeCharacters' as const, label: 'Characters' },
            { key: 'includeSettings' as const, label: 'Settings' },
            { key: 'includeEnvironments' as const, label: 'Environments' },
            { key: 'includeSceneMemory' as const, label: 'Scene Memory' },
            { key: 'includeLore' as const, label: 'Lorebook' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={contextConfig[key] as boolean}
                onChange={(e) => updateContextConfig(key, e.target.checked)}
                className="accent-violet-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={isGenerating ? cancelGeneration : generate}
        disabled={!project.activeBackendId}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          isGenerating
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isGenerating ? (
          <>
            <Square className="h-4 w-4" /> Stop Generating
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> Generate
          </>
        )}
      </button>

      {!project.activeBackendId && (
        <p className="text-xs text-amber-500 text-center">
          Configure a backend in the Models section first
        </p>
      )}
    </div>
  );
}
