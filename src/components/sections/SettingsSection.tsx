import { useSettingsStore } from '@/stores/settingsStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { useProjectStore } from '@/stores/projectStore';
import type { ChunkSize } from '@/types';

export function SettingsSection() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const storyMemory = useMemoryStore((s) => s.storyMemory);
  const styleMemory = useMemoryStore((s) => s.styleMemory);
  const sceneMemory = useMemoryStore((s) => s.sceneMemory);
  const updateStoryMemory = useMemoryStore((s) => s.updateStoryMemory);
  const updateStyleMemory = useMemoryStore((s) => s.updateStyleMemory);
  const updateSceneMemory = useMemoryStore((s) => s.updateSceneMemory);

  return (
    <div className="h-full overflow-auto p-6 max-w-2xl mx-auto space-y-8">
      <h2 className="text-xl font-bold text-zinc-100">Settings</h2>

      {/* Editor Settings */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Editor</h3>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Font Size</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={12}
              max={24}
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              className="w-32 accent-violet-500"
            />
            <span className="text-xs text-zinc-400 w-8">{settings.fontSize}px</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Line Spacing</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1.2}
              max={2.5}
              step={0.1}
              value={settings.lineSpacing}
              onChange={(e) => updateSettings({ lineSpacing: Number(e.target.value) })}
              className="w-32 accent-violet-500"
            />
            <span className="text-xs text-zinc-400 w-8">{settings.lineSpacing}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Editor Width</span>
          <div className="flex gap-1">
            {(['narrow', 'medium', 'wide', 'full'] as const).map((w) => (
              <button
                key={w}
                onClick={() => updateSettings({ editorWidth: w })}
                className={`px-3 py-1 text-xs rounded ${
                  settings.editorWidth === w
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Generation Defaults */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Generation Defaults</h3>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Streaming</span>
          <input
            type="checkbox"
            checked={settings.streamingDefault}
            onChange={(e) => updateSettings({ streamingDefault: e.target.checked })}
            className="accent-violet-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Default Chunk Size</span>
          <select
            value={settings.defaultChunkSize}
            onChange={(e) => updateSettings({ defaultChunkSize: e.target.value as ChunkSize })}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          >
            <option value="very-short">Very Short</option>
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
      </section>

      {/* Project Memory (if project open) */}
      {project && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Project Memory</h3>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">System Prompt</label>
            <textarea
              value={project.systemPrompt}
              onChange={(e) => updateProject(project.id, { systemPrompt: e.target.value })}
              className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Story Memory</label>
            <textarea
              value={storyMemory?.content || ''}
              onChange={(e) => updateStoryMemory(project.id, e.target.value)}
              placeholder="General notes about the story the AI should remember..."
              className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Writing Style Memory</label>
            <textarea
              value={styleMemory?.content || ''}
              onChange={(e) => updateStyleMemory(project.id, e.target.value)}
              placeholder="Prose style guidelines for the AI..."
              className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Scene Memory</label>
            <textarea
              value={sceneMemory?.content || ''}
              onChange={(e) => updateSceneMemory(project.id, e.target.value)}
              placeholder="Current scene context..."
              className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
            />
          </div>
        </section>
      )}
    </div>
  );
}
