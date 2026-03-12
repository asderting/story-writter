import { useEffect, useState, useCallback } from 'react';
import { StoryEditor } from '@/components/StoryEditor';
import { LeftPanel } from '@/components/LeftPanel';
import { RightPanel } from '@/components/RightPanel';
import { BottomBar } from '@/components/BottomBar';
import { useProjectStore } from '@/stores/projectStore';
import { useBackendStore } from '@/stores/backendStore';
import { useEditorStore } from '@/stores/editorStore';
import { usePresetStore } from '@/stores/presetStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGenerationStore } from '@/stores/generationStore';
import { useMemoryStore } from '@/stores/memoryStore';

export type RightTab = 'memory' | 'lorebook' | 'characters' | 'model' | 'settings' | 'history';

export default function App() {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('memory');

  // Stores
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getActiveProject = useProjectStore((s) => s.getActiveProject);
  const updateProject = useProjectStore((s) => s.updateProject);

  const loadBackends = useBackendStore((s) => s.loadBackends);
  const getBackend = useBackendStore((s) => s.getBackend);

  const loadPresets = usePresetStore((s) => s.loadPresets);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const loadSnapshots = useEditorStore((s) => s.loadSnapshots);

  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const generate = useGenerationStore((s) => s.generate);
  const setAction = useGenerationStore((s) => s.setAction);

  const loadProjectMemory = useMemoryStore((s) => s.loadProjectMemory);
  const clearMemory = useMemoryStore((s) => s.clearMemory);

  const project = getActiveProject();
  const activeBackend = project?.activeBackendId ? getBackend(project.activeBackendId) : undefined;
  const isConnected = activeBackend?.status === 'connected';

  // Initialize stores on mount
  useEffect(() => {
    loadSettings();
    loadProjects();
    loadBackends();
    loadPresets();
  }, [loadSettings, loadProjects, loadBackends, loadPresets]);

  // Load project-specific data when active project changes
  useEffect(() => {
    if (activeProjectId) {
      loadSnapshots(activeProjectId);
      loadProjectMemory(activeProjectId);
    } else {
      clearMemory();
    }
  }, [activeProjectId, loadSnapshots, loadProjectMemory, clearMemory]);

  // When opening a project, switch to editor (close left panel)
  const handleOpenProject = useCallback(() => {
    setLeftOpen(false);
  }, []);

  const handleSend = useCallback(() => {
    if (!project?.activeBackendId || !project?.activeModelId) return;
    setAction('continue');
    generate();
  }, [project, setAction, generate]);

  const handleOpenRightTab = useCallback((tab: RightTab) => {
    if (rightOpen && rightTab === tab) {
      setRightOpen(false);
    } else {
      setRightTab(tab);
      setRightOpen(true);
    }
  }, [rightOpen, rightTab]);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Left Panel - Story Library (slides over) */}
      {leftOpen && (
        <div className="absolute inset-0 z-40 flex">
          <div className="w-80 bg-zinc-900 border-r border-zinc-800 h-full shadow-2xl flex flex-col">
            <LeftPanel onOpenProject={handleOpenProject} onClose={() => setLeftOpen(false)} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setLeftOpen(false)} />
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar - minimal */}
        <div className="flex items-center justify-between h-10 px-3 border-b border-zinc-800 bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"
              title="Story Library"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            {project ? (
              <input
                className="bg-transparent text-sm text-zinc-200 font-medium border-none outline-none w-64 placeholder-zinc-600"
                value={project.title}
                onChange={(e) => updateProject(project.id, { title: e.target.value })}
                placeholder="Untitled Story"
              />
            ) : (
              <span className="text-sm text-zinc-500">No story open</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {project?.activeModelId && (
              <span className="px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                {project.activeModelId}
              </span>
            )}
            {isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Connected" />
            )}
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400"
              title="Options"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Editor + Right Panel */}
        <div className="flex flex-1 min-h-0">
          {/* Editor area */}
          <div className="flex-1 flex flex-col min-w-0">
            <StoryEditor />
            <BottomBar
              onSend={handleSend}
              onOpenTab={handleOpenRightTab}
            />
          </div>

          {/* Right Panel - Options */}
          {rightOpen && (
            <div className="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
              <RightPanel
                activeTab={rightTab}
                onTabChange={setRightTab}
                onClose={() => setRightOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
