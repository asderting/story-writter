import { useEffect, useState, useCallback } from 'react';
import { AppSidebar, type SidebarSection } from '@/components/sidebar/AppSidebar';
import { TopBar } from '@/components/TopBar';
import { StatusBar } from '@/components/StatusBar';
import { useProjectStore } from '@/stores/projectStore';
import { useBackendStore } from '@/stores/backendStore';
import { useEditorStore } from '@/stores/editorStore';
import { usePresetStore } from '@/stores/presetStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGenerationStore } from '@/stores/generationStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { cn } from '@/lib/utils';
import {
  FolderOpen,
  PenTool,
  Sparkles,
  Wand2,
  BookOpen,
  Users,
  SlidersHorizontal,
  Server,
  Clock,
  Settings,
} from 'lucide-react';

// --- Placeholder section components ---

const sectionMeta: Record<SidebarSection, { label: string; icon: React.ElementType }> = {
  projects: { label: 'Projects', icon: FolderOpen },
  editor: { label: 'Editor', icon: PenTool },
  generate: { label: 'Generate', icon: Sparkles },
  edit: { label: 'Edit / Rewrite', icon: Wand2 },
  lorebook: { label: 'Lorebook', icon: BookOpen },
  characters: { label: 'Characters', icon: Users },
  presets: { label: 'Presets', icon: SlidersHorizontal },
  models: { label: 'Models', icon: Server },
  history: { label: 'History', icon: Clock },
  settings: { label: 'Settings', icon: Settings },
};

function SectionPlaceholder({ section }: { section: SidebarSection }) {
  const meta = sectionMeta[section];
  const Icon = meta.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
      <Icon className="h-12 w-12 text-zinc-600" />
      <h2 className="text-xl font-semibold text-zinc-300">{meta.label}</h2>
      <p className="text-sm text-zinc-500">This section is under construction.</p>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('projects');

  // Stores
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getActiveProject = useProjectStore((s) => s.getActiveProject);
  const updateProject = useProjectStore((s) => s.updateProject);

  const loadBackends = useBackendStore((s) => s.loadBackends);
  const backends = useBackendStore((s) => s.backends);
  const getBackend = useBackendStore((s) => s.getBackend);

  const loadPresets = usePresetStore((s) => s.loadPresets);
  const presets = usePresetStore((s) => s.presets);
  const getPreset = usePresetStore((s) => s.getPreset);

  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const stats = useEditorStore((s) => s.stats);
  const selectionStats = useEditorStore((s) => s.selectionStats);
  const hasSelection = useEditorStore((s) => s.hasSelection);
  const loadSnapshots = useEditorStore((s) => s.loadSnapshots);

  const isGenerating = useGenerationStore((s) => s.isGenerating);

  // Derived
  const project = getActiveProject();
  const activeBackend = project?.activeBackendId ? getBackend(project.activeBackendId) : undefined;
  const activePreset = project?.activePresetId ? getPreset(project.activePresetId) : undefined;
  const isConnected = activeBackend?.status === 'connected';
  const activeModelName = project?.activeModelId ?? null;
  const activePresetName = activePreset?.name ?? null;

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
    }
  }, [activeProjectId, loadSnapshots]);

  // Handlers
  const handleTitleChange = useCallback(
    (title: string) => {
      if (project) {
        updateProject(project.id, { title });
      }
    },
    [project, updateProject]
  );

  const handleContinue = useCallback(() => {
    // Will be implemented when generation panel is built
  }, []);

  const handleGenerate = useCallback(() => {
    // Will be implemented when generation panel is built
  }, []);

  const handleSaveSnapshot = useCallback(() => {
    if (project) {
      const saveSnapshot = useEditorStore.getState().saveSnapshot;
      saveSnapshot(project.id, `Snapshot ${new Date().toLocaleString()}`);
    }
  }, [project]);

  return (
    <div className="flex h-screen w-screen bg-zinc-900 text-zinc-100 overflow-hidden">
      {/* Left sidebar */}
      <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      {/* Main area: top bar + content + status bar */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <TopBar
          project={project}
          activeModelName={activeModelName}
          activePresetName={activePresetName}
          isConnected={isConnected}
          isGenerating={isGenerating}
          onTitleChange={handleTitleChange}
          onContinue={handleContinue}
          onGenerate={handleGenerate}
          onSaveSnapshot={handleSaveSnapshot}
        />

        {/* Content area */}
        <main className="flex-1 overflow-auto">
          <SectionPlaceholder section={activeSection} />
        </main>

        {/* Status bar */}
        <StatusBar
          stats={stats}
          selectionStats={hasSelection ? selectionStats : null}
          hasSelection={hasSelection}
          isSaving={false}
          isConnected={isConnected}
          modelName={activeModelName}
        />
      </div>
    </div>
  );
}
