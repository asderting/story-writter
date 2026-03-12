import { useState, useEffect } from 'react';
import { useMemoryStore } from '@/stores/memoryStore';
import { useProjectStore } from '@/stores/projectStore';
import { useBackendStore } from '@/stores/backendStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGenerationStore } from '@/stores/generationStore';
import { getGenerationHistoryByProject } from '@/lib/db';
import type { RightTab } from '@/App';
import type { CharacterSheet, LoreEntryType, BackendType, ChunkSize, GenerationHistory } from '@/types';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Check,
  Loader2,
  Server,
  BookOpen,
  Users,
  Clock,
  Settings,
} from 'lucide-react';

interface Props {
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  onClose: () => void;
}

const TABS: { key: RightTab; label: string; icon: typeof BookOpen }[] = [
  { key: 'memory', label: 'Memory', icon: Settings },
  { key: 'lorebook', label: 'Lore', icon: BookOpen },
  { key: 'characters', label: 'Chars', icon: Users },
  { key: 'model', label: 'Model', icon: Server },
  { key: 'history', label: 'History', icon: Clock },
  { key: 'settings', label: 'Config', icon: Settings },
];

export function RightPanel({ activeTab, onTabChange, onClose }: Props) {
  return (
    <>
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-800 shrink-0">
        <div className="flex-1 flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? 'text-violet-400 border-b-2 border-violet-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 mr-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'memory' && <MemoryTab />}
        {activeTab === 'lorebook' && <LorebookTab />}
        {activeTab === 'characters' && <CharactersTab />}
        {activeTab === 'model' && <ModelTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </>
  );
}

// =============================================================================
// Memory Tab
// =============================================================================
function MemoryTab() {
  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);
  const storyMemory = useMemoryStore((s) => s.storyMemory);
  const styleMemory = useMemoryStore((s) => s.styleMemory);
  const sceneMemory = useMemoryStore((s) => s.sceneMemory);
  const updateStoryMemory = useMemoryStore((s) => s.updateStoryMemory);
  const updateStyleMemory = useMemoryStore((s) => s.updateStyleMemory);
  const updateSceneMemory = useMemoryStore((s) => s.updateSceneMemory);

  if (!project) return <EmptyState text="Open a story first" />;

  return (
    <div className="p-3 space-y-4">
      <Section title="Memory" hint="Broad story context placed at the top of the AI's context window. Put character names, world setting, key facts here.">
        <textarea
          value={storyMemory?.content || ''}
          onChange={(e) => updateStoryMemory(project.id, e.target.value)}
          placeholder="[ Character: Alice; Traits: curious, brave ]&#10;[ Setting: Victorian London ]&#10;[ Genre: Mystery ]"
          className="w-full h-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 resize-none focus:outline-none focus:border-violet-500 placeholder-zinc-600"
        />
      </Section>

      <Section title="Author's Note" hint="Inserted closer to the end of context. Use to nudge the AI's style, tone, or focus for the current scene.">
        <textarea
          value={sceneMemory?.content || ''}
          onChange={(e) => updateSceneMemory(project.id, e.target.value)}
          placeholder="[ Style: vivid, atmospheric prose ]&#10;[ Focus: building tension ]"
          className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 resize-none focus:outline-none focus:border-violet-500 placeholder-zinc-600"
        />
      </Section>

      <Section title="Writing Style" hint="Persistent style guidelines for the AI.">
        <textarea
          value={styleMemory?.content || ''}
          onChange={(e) => updateStyleMemory(project.id, e.target.value)}
          placeholder="Third person limited. Short, punchy sentences. Show don't tell."
          className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 resize-none focus:outline-none focus:border-violet-500 placeholder-zinc-600"
        />
      </Section>

      <Section title="System Prompt" hint="Override the default system prompt sent to the AI.">
        <textarea
          value={project.systemPrompt}
          onChange={(e) => updateProject(project.id, { systemPrompt: e.target.value })}
          placeholder="You are a creative fiction writer..."
          className="w-full h-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 resize-none focus:outline-none focus:border-violet-500 placeholder-zinc-600"
        />
      </Section>
    </div>
  );
}

// =============================================================================
// Lorebook Tab
// =============================================================================
const LORE_TYPES: { value: LoreEntryType; label: string }[] = [
  { value: 'character', label: 'Character' },
  { value: 'location', label: 'Location' },
  { value: 'faction', label: 'Faction' },
  { value: 'magic-system', label: 'Magic System' },
  { value: 'item', label: 'Item' },
  { value: 'timeline-event', label: 'Timeline Event' },
  { value: 'world-rule', label: 'World Rule' },
  { value: 'prose-constraint', label: 'Prose Constraint' },
  { value: 'environment', label: 'Environment' },
  { value: 'social-rule', label: 'Social Rule' },
];

function LorebookTab() {
  const project = useProjectStore((s) => s.getActiveProject());
  const loreEntries = useMemoryStore((s) => s.loreEntries);
  const addLoreEntry = useMemoryStore((s) => s.addLoreEntry);
  const updateLoreEntry = useMemoryStore((s) => s.updateLoreEntry);
  const deleteLoreEntry = useMemoryStore((s) => s.deleteLoreEntry);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!project) return <EmptyState text="Open a story first" />;

  const handleAdd = () => {
    const entry = addLoreEntry(project.id, {
      title: 'New Entry',
      type: 'world-rule',
      content: '',
      keywords: [],
      priority: 5,
      active: true,
    });
    setExpandedId(entry.id);
  };

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-400">{loreEntries.length} entries</span>
        <button onClick={handleAdd} className="flex items-center gap-1 px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {loreEntries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        return (
          <div key={entry.id} className="bg-zinc-800 border border-zinc-700 rounded-lg">
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0" /> : <ChevronRight className="h-3 w-3 text-zinc-500 shrink-0" />}
              <span className="text-xs text-zinc-200 flex-1 truncate">{entry.title}</span>
              <span className="text-[10px] bg-zinc-700 text-zinc-500 px-1 py-0.5 rounded">{entry.type}</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={entry.active}
                  onChange={(e) => updateLoreEntry(entry.id, { active: e.target.checked })}
                  className="accent-violet-500 w-3 h-3"
                />
                <button onClick={() => deleteLoreEntry(entry.id)} className="p-0.5 rounded hover:bg-zinc-700 text-red-500">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-zinc-700 pt-2">
                <input
                  value={entry.title}
                  onChange={(e) => updateLoreEntry(entry.id, { title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                  placeholder="Title"
                />
                <select
                  value={entry.type}
                  onChange={(e) => updateLoreEntry(entry.id, { type: e.target.value as LoreEntryType })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  {LORE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <textarea
                  value={entry.content}
                  onChange={(e) => updateLoreEntry(entry.id, { content: e.target.value })}
                  placeholder="Content..."
                  className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
                />
                <input
                  value={entry.keywords.join(', ')}
                  onChange={(e) => updateLoreEntry(entry.id, { keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })}
                  placeholder="Keywords (comma-separated)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500">Priority</label>
                    <input
                      type="number" min={1} max={10}
                      value={entry.priority}
                      onChange={(e) => updateLoreEntry(entry.id, { priority: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-[10px] text-zinc-400 pt-4">
                    <input type="checkbox" checked={entry.alwaysInclude} onChange={(e) => updateLoreEntry(entry.id, { alwaysInclude: e.target.checked })} className="accent-violet-500 w-3 h-3" />
                    Always Include
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {loreEntries.length === 0 && (
        <div className="text-center text-zinc-600 py-6 text-xs">
          No lore entries yet. Add world-building details to enrich your AI context.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Characters Tab
// =============================================================================
function CharactersTab() {
  const project = useProjectStore((s) => s.getActiveProject());
  const characters = useMemoryStore((s) => s.characters);
  const addCharacter = useMemoryStore((s) => s.addCharacter);
  const updateCharacter = useMemoryStore((s) => s.updateCharacter);
  const deleteCharacter = useMemoryStore((s) => s.deleteCharacter);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!project) return <EmptyState text="Open a story first" />;

  const handleAdd = () => {
    const char = addCharacter(project.id, { name: 'New Character' });
    setExpandedId(char.id);
  };

  const fields: { key: keyof CharacterSheet; label: string; multiline?: boolean }[] = [
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age' },
    { key: 'appearance', label: 'Appearance', multiline: true },
    { key: 'personality', label: 'Personality', multiline: true },
    { key: 'motivations', label: 'Motivations', multiline: true },
    { key: 'relationships', label: 'Relationships', multiline: true },
    { key: 'speakingStyle', label: 'Speaking Style', multiline: true },
    { key: 'background', label: 'Background', multiline: true },
    { key: 'notes', label: 'Notes', multiline: true },
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-400">{characters.length} characters</span>
        <button onClick={handleAdd} className="flex items-center gap-1 px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {characters.map((char) => {
        const isExpanded = expandedId === char.id;
        return (
          <div key={char.id} className="bg-zinc-800 border border-zinc-700 rounded-lg">
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : char.id)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3 text-zinc-500" /> : <ChevronRight className="h-3 w-3 text-zinc-500" />}
              <span className="text-xs text-zinc-200 flex-1 truncate">{char.name || 'Unnamed'}</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <label className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                  <input type="checkbox" checked={char.activeInScene} onChange={(e) => updateCharacter(char.id, { activeInScene: e.target.checked })} className="accent-violet-500 w-3 h-3" />
                  Scene
                </label>
                <button onClick={() => deleteCharacter(char.id)} className="p-0.5 rounded hover:bg-zinc-700 text-red-500">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-zinc-700 pt-2">
                {fields.map(({ key, label, multiline }) => (
                  <div key={key}>
                    <label className="text-[10px] text-zinc-500">{label}</label>
                    {multiline ? (
                      <textarea
                        value={(char[key] as string) || ''}
                        onChange={(e) => updateCharacter(char.id, { [key]: e.target.value })}
                        className="w-full h-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
                      />
                    ) : (
                      <input
                        value={(char[key] as string) || ''}
                        onChange={(e) => updateCharacter(char.id, { [key]: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {characters.length === 0 && (
        <div className="text-center text-zinc-600 py-6 text-xs">
          No characters yet. Add one to enrich your AI context.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Model Tab
// =============================================================================
const BACKEND_TYPES: { value: BackendType; label: string; defaultUrl: string }[] = [
  { value: 'lm-studio', label: 'LM Studio', defaultUrl: 'http://localhost:1234' },
  { value: 'ollama', label: 'Ollama', defaultUrl: 'http://localhost:11434' },
  { value: 'openai-compatible', label: 'OpenAI Compatible', defaultUrl: 'http://localhost:8080' },
];

function ModelTab() {
  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);
  const backends = useBackendStore((s) => s.backends);
  const availableModels = useBackendStore((s) => s.availableModels);
  const loading = useBackendStore((s) => s.loading);
  const addBackend = useBackendStore((s) => s.addBackend);
  const removeBackend = useBackendStore((s) => s.removeBackend);
  const testConnection = useBackendStore((s) => s.testConnection);
  const fetchModels = useBackendStore((s) => s.fetchModels);

  const parameters = useGenerationStore((s) => s.parameters);
  const updateParameter = useGenerationStore((s) => s.updateParameter);
  const chunkSize = useGenerationStore((s) => s.chunkSize);
  const setChunkSize = useGenerationStore((s) => s.setChunkSize);

  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<BackendType>('lm-studio');
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('http://localhost:1234');

  const handleAdd = () => {
    addBackend({
      type: newType,
      name: newName || `${newType} Backend`,
      baseUrl: newUrl,
      status: 'unknown',
      capabilities: {
        supportsChatCompletions: true,
        supportsCompletions: true,
        supportsStreaming: true,
        supportsEdit: false,
        supportsStructuredOutput: false,
      },
    });
    setShowAdd(false);
    setNewName('');
  };

  const handleSetActive = (backendId: string, modelName?: string) => {
    if (project) {
      const effectiveModel = modelName || (availableModels[backendId] || [])[0] || undefined;
      updateProject(project.id, {
        activeBackendId: backendId,
        activeModelId: effectiveModel,
      });
    }
  };

  return (
    <div className="p-3 space-y-4">
      {/* Generation Parameters */}
      <Section title="Generation" hint="Control how the AI generates text.">
        <div className="space-y-2">
          {[
            { key: 'temperature' as const, label: 'Temperature', min: 0, max: 2, step: 0.05 },
            { key: 'topP' as const, label: 'Top P', min: 0, max: 1, step: 0.05 },
            { key: 'topK' as const, label: 'Top K', min: 0, max: 100, step: 1 },
            { key: 'repetitionPenalty' as const, label: 'Rep Penalty', min: 1, max: 2, step: 0.05 },
            { key: 'maxTokens' as const, label: 'Max Tokens', min: 16, max: 4096, step: 16 },
          ].map(({ key, label, min, max, step }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-20">{label}</span>
              <input type="range" min={min} max={max} step={step} value={parameters[key]} onChange={(e) => updateParameter(key, Number(e.target.value))} className="flex-1 accent-violet-500 h-1" />
              <span className="text-[10px] text-zinc-400 w-10 text-right">{parameters[key]}</span>
            </div>
          ))}
        </div>

        <div className="mt-2">
          <label className="text-[10px] text-zinc-500">Output Length</label>
          <div className="flex gap-1 mt-1">
            {(['very-short', 'short', 'medium', 'long'] as ChunkSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setChunkSize(size)}
                className={`px-2 py-0.5 text-[10px] rounded ${
                  chunkSize === size ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-1.5 mt-2 text-xs text-zinc-400">
          <input type="checkbox" checked={parameters.streaming} onChange={(e) => updateParameter('streaming', e.target.checked)} className="accent-violet-500 w-3 h-3" />
          Streaming
        </label>
      </Section>

      {/* Backends */}
      <Section title="Backends" hint="Connect to a local LLM server.">
        {backends.map((b) => {
          const models = availableModels[b.id] || [];
          const isLoading = loading[b.id];
          const isActive = project?.activeBackendId === b.id;

          return (
            <div key={b.id} className={`bg-zinc-800 border rounded-lg p-2 mb-2 ${isActive ? 'border-violet-500' : 'border-zinc-700'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'connected' ? 'bg-green-500' : b.status === 'error' ? 'bg-red-500' : 'bg-zinc-500'}`} />
                  <span className="text-xs text-zinc-200">{b.name}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={async () => { await testConnection(b.id); await fetchModels(b.id); }}
                    disabled={isLoading}
                    className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </button>
                  <button onClick={() => removeBackend(b.id)} className="p-1 rounded hover:bg-zinc-700 text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{b.baseUrl}</div>

              {models.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {models.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSetActive(b.id, m)}
                      className={`px-1.5 py-0.5 text-[10px] rounded border ${
                        isActive && project?.activeModelId === m
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}

              {!isActive && (
                <button onClick={() => handleSetActive(b.id)} className="mt-1 text-[10px] text-violet-400 hover:text-violet-300">
                  Set active
                </button>
              )}
              {isActive && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-violet-400">
                  <Check className="h-3 w-3" /> Active
                </div>
              )}
            </div>
          );
        })}

        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
            <Plus className="h-3 w-3" /> Add Backend
          </button>
        ) : (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 space-y-2">
            <div className="flex gap-1">
              {BACKEND_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  onClick={() => { setNewType(bt.value); setNewUrl(bt.defaultUrl); }}
                  className={`px-2 py-0.5 text-[10px] rounded ${newType === bt.value ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}
                >
                  {bt.label}
                </button>
              ))}
            </div>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500" />
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500" />
            <div className="flex gap-1">
              <button onClick={handleAdd} className="px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded">Add</button>
              <button onClick={() => setShowAdd(false)} className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 rounded">Cancel</button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

// =============================================================================
// History Tab
// =============================================================================
function HistoryTab() {
  const project = useProjectStore((s) => s.getActiveProject());
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      const items = getGenerationHistoryByProject(project.id);
      setHistory(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  }, [project?.id]);

  if (!project) return <EmptyState text="Open a story first" />;

  return (
    <div className="p-3 space-y-1">
      {history.length === 0 && (
        <div className="text-center text-zinc-600 py-6 text-xs">
          No generation history yet.
        </div>
      )}

      {history.map((entry) => (
        <div key={entry.id} className="bg-zinc-800 border border-zinc-700 rounded-lg">
          <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] bg-zinc-700 text-zinc-400 px-1 rounded">{entry.actionType}</span>
                <span className="text-[10px] text-zinc-600">{new Date(entry.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{entry.outputText.substring(0, 80)}</p>
            </div>
            {entry.accepted && <Check className="h-3 w-3 text-green-500 shrink-0" />}
          </div>

          {expandedId === entry.id && (
            <div className="px-3 pb-2 border-t border-zinc-700 pt-2">
              <p className="text-xs text-zinc-300 whitespace-pre-wrap max-h-48 overflow-auto">{entry.outputText}</p>
              <div className="text-[10px] text-zinc-600 mt-1">
                {entry.modelUsed} | T:{entry.parameters.temperature} P:{entry.parameters.topP}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Settings Tab
// =============================================================================
function SettingsTab() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <div className="p-3 space-y-4">
      <Section title="Editor">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Font Size</span>
            <div className="flex items-center gap-2">
              <input type="range" min={12} max={24} value={settings.fontSize} onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })} className="w-24 accent-violet-500 h-1" />
              <span className="text-[10px] text-zinc-500 w-6">{settings.fontSize}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Line Spacing</span>
            <div className="flex items-center gap-2">
              <input type="range" min={1.2} max={2.5} step={0.1} value={settings.lineSpacing} onChange={(e) => updateSettings({ lineSpacing: Number(e.target.value) })} className="w-24 accent-violet-500 h-1" />
              <span className="text-[10px] text-zinc-500 w-6">{settings.lineSpacing}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Width</span>
            <div className="flex gap-1">
              {(['narrow', 'medium', 'wide', 'full'] as const).map((w) => (
                <button key={w} onClick={() => updateSettings({ editorWidth: w })} className={`px-2 py-0.5 text-[10px] rounded ${settings.editorWidth === w ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// =============================================================================
// Shared helpers
// =============================================================================
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-300 mb-1">{title}</h3>
      {hint && <p className="text-[10px] text-zinc-600 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-zinc-600 text-xs">
      {text}
    </div>
  );
}
