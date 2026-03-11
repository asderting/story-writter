import { useState } from 'react';
import { usePresetStore } from '@/stores/presetStore';
import { useProjectStore } from '@/stores/projectStore';
import type { Preset, PresetCategory } from '@/types';
import { Plus, Trash2, Check, SlidersHorizontal, ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORIES: PresetCategory[] = [
  'story-opening', 'continuation', 'rewrite', 'dialogue', 'atmosphere',
  'pacing', 'description', 'concise', 'scene-transition', 'style',
  'character-focus', 'environment', 'custom',
];

export function PresetsSection() {
  const presets = usePresetStore((s) => s.presets);
  const addPreset = usePresetStore((s) => s.addPreset);
  const updatePreset = usePresetStore((s) => s.updatePreset);
  const deletePreset = usePresetStore((s) => s.deletePreset);

  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = () => {
    const preset = addPreset({
      name: 'New Preset',
      category: 'custom',
      description: '',
      promptTemplate: '',
      parameters: {
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
      },
      notes: '',
      compatibleModels: [],
      contextLayers: {
        includeStoryMemory: true,
        includeStyleMemory: true,
        includeCharacters: true,
        includeSettings: true,
        includeEnvironments: true,
        includeSceneMemory: true,
        includeLore: true,
        recentTextChars: 4000,
      },
    });
    setExpandedId(preset.id);
  };

  const handleSetActive = (presetId: string) => {
    if (project) {
      updateProject(project.id, { activePresetId: presetId });
    }
  };

  return (
    <div className="h-full overflow-auto p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-zinc-100">Presets</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg"
        >
          <Plus className="h-4 w-4" /> New Preset
        </button>
      </div>

      {presets.length === 0 && (
        <div className="text-center text-zinc-500 py-12">
          <SlidersHorizontal className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
          <p>No presets available.</p>
        </div>
      )}

      <div className="space-y-2">
        {presets.map((preset) => {
          const isExpanded = expandedId === preset.id;
          const isActive = project?.activePresetId === preset.id;

          return (
            <div
              key={preset.id}
              className={`bg-zinc-800 border rounded-lg ${
                isActive ? 'border-violet-500' : 'border-zinc-700'
              }`}
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : preset.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                <div className="flex-1">
                  <span className="font-medium text-zinc-200">{preset.name}</span>
                  {preset.description && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{preset.description}</p>
                  )}
                </div>
                <span className="text-xs bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">
                  {preset.category}
                </span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-xs text-violet-400">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetActive(preset.id)}
                      className="text-xs text-violet-400 hover:text-violet-300 px-2"
                    >
                      Use
                    </button>
                  )}
                  <button
                    onClick={() => deletePreset(preset.id)}
                    className="p-1 rounded hover:bg-zinc-700 text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 pt-0 space-y-3 border-t border-zinc-700">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Name</label>
                    <input
                      value={preset.name}
                      onChange={(e) => updatePreset(preset.id, { name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Category</label>
                    <select
                      value={preset.category}
                      onChange={(e) => updatePreset(preset.id, { category: e.target.value as PresetCategory })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Description</label>
                    <textarea
                      value={preset.description}
                      onChange={(e) => updatePreset(preset.id, { description: e.target.value })}
                      className="w-full h-16 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Prompt Template</label>
                    <textarea
                      value={preset.promptTemplate}
                      onChange={(e) => updatePreset(preset.id, { promptTemplate: e.target.value })}
                      className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="text-xs text-zinc-500">
                    Temperature: {preset.parameters.temperature} | Top P: {preset.parameters.topP} |
                    Max Tokens: {preset.parameters.maxTokens}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
