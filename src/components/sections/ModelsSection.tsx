import { useState } from 'react';
import { useBackendStore } from '@/stores/backendStore';
import { useProjectStore } from '@/stores/projectStore';
import type { BackendType } from '@/types';
import {
  Plus,
  Trash2,
  RefreshCw,
  Check,
  X,
  Loader2,
  Server,
} from 'lucide-react';

const BACKEND_TYPES: { value: BackendType; label: string; defaultUrl: string }[] = [
  { value: 'lm-studio', label: 'LM Studio', defaultUrl: 'http://localhost:1234' },
  { value: 'ollama', label: 'Ollama', defaultUrl: 'http://localhost:11434' },
  { value: 'openai-compatible', label: 'OpenAI Compatible', defaultUrl: 'http://localhost:8080' },
];

export function ModelsSection() {
  const backends = useBackendStore((s) => s.backends);
  const availableModels = useBackendStore((s) => s.availableModels);
  const loading = useBackendStore((s) => s.loading);
  const addBackend = useBackendStore((s) => s.addBackend);
  const updateBackend = useBackendStore((s) => s.updateBackend);
  const removeBackend = useBackendStore((s) => s.removeBackend);
  const testConnection = useBackendStore((s) => s.testConnection);
  const fetchModels = useBackendStore((s) => s.fetchModels);

  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

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
      updateProject(project.id, {
        activeBackendId: backendId,
        ...(modelName ? { activeModelId: modelName } : {}),
      });
    }
  };

  return (
    <div className="h-full overflow-auto p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-zinc-100">Models & Backends</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg"
        >
          <Plus className="h-4 w-4" /> Add Backend
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-6 bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Type</label>
            <div className="flex gap-2">
              {BACKEND_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  onClick={() => {
                    setNewType(bt.value);
                    setNewUrl(bt.defaultUrl);
                  }}
                  className={`px-3 py-1.5 text-sm rounded border ${
                    newType === bt.value
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {bt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="My Backend"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">URL</label>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-sm bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Backend list */}
      {backends.length === 0 && (
        <div className="text-center text-zinc-500 py-12">
          <Server className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
          <p>No backends configured. Add one to start generating.</p>
        </div>
      )}

      <div className="space-y-4">
        {backends.map((b) => {
          const models = availableModels[b.id] || [];
          const isLoading = loading[b.id];
          const isActive = project?.activeBackendId === b.id;

          return (
            <div
              key={b.id}
              className={`bg-zinc-800 border rounded-lg p-4 ${
                isActive ? 'border-violet-500' : 'border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      b.status === 'connected'
                        ? 'bg-green-500'
                        : b.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-zinc-500'
                    }`}
                  />
                  <span className="font-medium text-zinc-200">{b.name}</span>
                  <span className="text-xs text-zinc-500">{b.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      await testConnection(b.id);
                      await fetchModels(b.id);
                    }}
                    disabled={isLoading}
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400"
                    title="Test connection"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeBackend(b.id)}
                    className="p-1.5 rounded hover:bg-zinc-700 text-red-500"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-zinc-500 mb-3">{b.baseUrl}</div>

              {/* Model selection */}
              {models.length > 0 && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Models</label>
                  <div className="flex flex-wrap gap-1">
                    {models.map((m) => (
                      <button
                        key={m}
                        onClick={() => handleSetActive(b.id, m)}
                        className={`px-2 py-1 text-xs rounded border ${
                          isActive && project?.activeModelId === m
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isActive && (
                <button
                  onClick={() => handleSetActive(b.id)}
                  className="mt-2 text-xs text-violet-400 hover:text-violet-300"
                >
                  Set as active backend
                </button>
              )}
              {isActive && (
                <div className="mt-2 flex items-center gap-1 text-xs text-violet-400">
                  <Check className="h-3 w-3" /> Active
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
