import { useEffect, useState, useCallback } from 'react';
import { AppSidebar, type SidebarSection } from '@/components/sidebar/AppSidebar';
import { TopBar } from '@/components/TopBar';
import { StatusBar } from '@/components/StatusBar';
import { EditorSection } from '@/components/sections/EditorSection';
import { ProjectsSection } from '@/components/sections/ProjectsSection';
import { GenerateSection } from '@/components/sections/GenerateSection';
import { EditSection } from '@/components/sections/EditSection';
import { LorebookSection } from '@/components/sections/LorebookSection';
import { CharactersSection } from '@/components/sections/CharactersSection';
import { PresetsSection } from '@/components/sections/PresetsSection';
import { ModelsSection } from '@/components/sections/ModelsSection';
import { HistorySection } from '@/components/sections/HistorySection';
import { SettingsSection } from '@/components/sections/SettingsSection';
import { useProjectStore } from '@/stores/projectStore';
import { useBackendStore } from '@/stores/backendStore';
import { useEditorStore } from '@/stores/editorStore';
import { usePresetStore } from '@/stores/presetStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useGenerationStore } from '@/stores/generationStore';
import { useMemoryStore } from '@/stores/memoryStore';

export default function App() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('projects');

  // Stores
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getActiveProject = useProjectStore((s) => s.getActiveProject);
  const updateProject = useProjectStore((s) => s.updateProject);

  const loadBackends = useBackendStore((s) => s.loadBackends);
  const getBackend = useBackendStore((s) => s.getBackend);

  const loadPresets = usePresetStore((s) => s.loadPresets);
  const getPreset = usePresetStore((s) => s.getPreset);

  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const stats = useEditorStore((s) => s.stats);
  const selectionStats = useEditorStore((s) => s.selectionStats);
  const hasSelection = useEditorStore((s) => s.hasSelection);
  const loadSnapshots = useEditorStore((s) => s.loadSnapshots);

  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const generate = useGenerationStore((s) => s.generate);
  const setAction = useGenerationStore((s) => s.setAction);

  const loadProjectMemory = useMemoryStore((s) => s.loadProjectMemory);

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
      loadProjectMemory(activeProjectId);
    }
  }, [activeProjectId, loadSnapshots, loadProjectMemory]);

  // Handlers
  const handleTitleChange = useCallback(
    (title: string) => {
      if (project) {
        updateProject(project.id, { title });
      }
    },
    [project, updateProject],
  );

  const handleContinue = useCallback(() => {
    if (!project?.activeBackendId) return;
    setAction('continue');
    generate();
  }, [project, setAction, generate]);

  const handleGenerate = useCallback(() => {
    if (!project?.activeBackendId) return;
    generate();
  }, [project, generate]);

  const handleSaveSnapshot = useCallback(() => {
    if (project) {
      const createSnapshot = useEditorStore.getState().createSnapshot;
      createSnapshot(project.id, `Snapshot ${new Date().toLocaleString()}`);
    }
  }, [project]);

  const handleOpenProject = useCallback(() => {
    setActiveSection('editor');
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case 'projects':
        return <ProjectsSection onOpenProject={handleOpenProject} />;
      case 'editor':
        return <EditorSection />;
      case 'generate':
        return <GenerateSection />;
      case 'edit':
        return <EditSection />;
      case 'lorebook':
        return <LorebookSection />;
      case 'characters':
        return <CharactersSection />;
      case 'presets':
        return <PresetsSection />;
      case 'models':
        return <ModelsSection />;
      case 'history':
        return <HistorySection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return null;
    }
  };

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
        <main className="flex-1 overflow-auto">{renderSection()}</main>

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
