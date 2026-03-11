import { useGenerationStore } from '@/stores/generationStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import type { GenerationAction } from '@/types';
import { Wand2, Loader2, Square } from 'lucide-react';

const EDIT_ACTIONS: { value: GenerationAction; label: string; description: string }[] = [
  { value: 'rewrite', label: 'Rewrite', description: 'Rewrite the selected text with an instruction' },
  { value: 'paraphrase', label: 'Paraphrase', description: 'Polish and improve clarity while keeping meaning' },
  { value: 'expand', label: 'Expand', description: 'Add more detail and richness' },
  { value: 'shorten', label: 'Shorten', description: 'Compress while keeping key elements' },
  { value: 'style-transform', label: 'Style Transform', description: 'Change tone/style while keeping plot' },
  { value: 'selection-edit', label: 'Edit Selection', description: 'Edit only the selected portion' },
];

export function EditSection() {
  const project = useProjectStore((s) => s.getActiveProject());
  const selectedText = useEditorStore((s) => s.selectionText);
  const hasSelection = useEditorStore((s) => s.hasSelection);

  const currentAction = useGenerationStore((s) => s.currentAction);
  const instruction = useGenerationStore((s) => s.instruction);
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const setAction = useGenerationStore((s) => s.setAction);
  const setInstruction = useGenerationStore((s) => s.setInstruction);
  const generate = useGenerationStore((s) => s.generate);
  const cancelGeneration = useGenerationStore((s) => s.cancelGeneration);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Open a project first
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-zinc-100">Edit / Rewrite</h2>

      {!hasSelection && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 text-sm text-amber-400">
          Select text in the editor to use editing tools.
        </div>
      )}

      {hasSelection && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
          <div className="text-xs text-zinc-400 mb-1">Selected text</div>
          <p className="text-sm text-zinc-300 line-clamp-4">{selectedText}</p>
        </div>
      )}

      {/* Edit actions */}
      <div className="space-y-2">
        {EDIT_ACTIONS.map((a) => (
          <button
            key={a.value}
            onClick={() => setAction(a.value)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              currentAction === a.value
                ? 'bg-violet-900/30 border-violet-500'
                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="font-medium text-sm text-zinc-200">{a.label}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{a.description}</div>
          </button>
        ))}
      </div>

      {/* Instruction */}
      <div>
        <label className="block text-xs text-zinc-400 mb-2">Instruction</label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="How should the text be modified..."
          className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none"
        />
      </div>

      {/* Apply button */}
      <button
        onClick={isGenerating ? cancelGeneration : generate}
        disabled={!hasSelection || !project.activeBackendId}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          isGenerating
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isGenerating ? (
          <>
            <Square className="h-4 w-4" /> Stop
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" /> Apply
          </>
        )}
      </button>
    </div>
  );
}
