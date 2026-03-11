import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { useEditorStore } from '@/stores/editorStore';
import { DEFAULT_PROJECT_TEMPLATES, createProjectFromTemplate } from '@/lib/db';
import type { Project } from '@/types';
import {
  Plus,
  Trash2,
  Copy,
  Pin,
  Archive,
  Search,
  FolderOpen,
} from 'lucide-react';

interface Props {
  onOpenProject: () => void;
}

export function ProjectsSection({ onOpenProject }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const createProject = useProjectStore((s) => s.createProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const loadProjectMemory = useMemoryStore((s) => s.loadProjectMemory);
  const setContent = useEditorStore((s) => s.setContent);

  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const filtered = projects
    .filter((p) => !p.archived)
    .filter(
      (p) =>
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.genre.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleOpen = (project: Project) => {
    setActiveProject(project.id);
    loadProjectMemory(project.id);
    setContent(project.storyContent);
    onOpenProject();
  };

  const handleCreate = (templateId?: string) => {
    const template = DEFAULT_PROJECT_TEMPLATES.find((t) => t.id === templateId);
    let project: Project;
    if (template) {
      project = createProjectFromTemplate(template);
    } else {
      project = createProject({ title: 'Untitled Story' });
    }
    loadProjects();
    handleOpen(project);
    setShowTemplates(false);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEFAULT_PROJECT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleCreate(t.id)}
              className="text-left p-4 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-violet-500 transition-colors"
            >
              <div className="font-medium text-zinc-200">{t.name}</div>
              <div className="text-xs text-zinc-500 mt-1">{t.description}</div>
              {t.genre && (
                <span className="inline-block mt-2 text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                  {t.genre}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-auto space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-zinc-500 py-12">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
            <p>No projects yet. Create one to get started!</p>
          </div>
        )}

        {filtered.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
              p.id === activeProjectId
                ? 'bg-violet-900/20 border-violet-600'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
            }`}
            onClick={() => handleOpen(p)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {p.pinned && <Pin className="h-3 w-3 text-yellow-500" />}
                <span className="font-medium text-zinc-200 truncate">{p.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {p.genre && (
                  <span className="text-xs bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">
                    {p.genre}
                  </span>
                )}
                <span className="text-xs text-zinc-500">
                  {new Date(p.updatedAt).toLocaleDateString()}
                </span>
                <span className="text-xs text-zinc-600">
                  {p.storyContent.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => updateProject(p.id, { pinned: !p.pinned })}
                className={`p-1.5 rounded hover:bg-zinc-700 ${p.pinned ? 'text-yellow-500' : 'text-zinc-500'}`}
                title="Pin"
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => duplicateProject(p.id)}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500"
                title="Duplicate"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => updateProject(p.id, { archived: true })}
                className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500"
                title="Archive"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="p-1.5 rounded hover:bg-zinc-700 text-red-500"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
