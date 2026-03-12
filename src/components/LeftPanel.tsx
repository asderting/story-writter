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
  Search,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface Props {
  onOpenProject: () => void;
  onClose: () => void;
}

export function LeftPanel({ onOpenProject, onClose }: Props) {
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

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-200">Stories</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="p-1.5 rounded hover:bg-zinc-800 text-violet-400"
            title="New Story"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <div className="p-3 border-b border-zinc-800 space-y-1">
          <button
            onClick={() => handleCreate()}
            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Blank Story
          </button>
          {DEFAULT_PROJECT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleCreate(t.id)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="text-sm text-zinc-300">{t.name}</div>
              <div className="text-xs text-zinc-600">{t.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stories..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Story list */}
      <div className="flex-1 overflow-auto px-2 pb-2">
        {filtered.length === 0 && (
          <div className="text-center text-zinc-600 py-8 text-xs">
            No stories yet
          </div>
        )}

        {filtered.map((p) => (
          <div
            key={p.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-0.5 transition-colors ${
              p.id === activeProjectId
                ? 'bg-violet-600/20 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
            onClick={() => handleOpen(p)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {p.pinned && <Pin className="h-3 w-3 text-yellow-500 shrink-0" />}
                <span className="text-sm truncate">{p.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {p.genre && (
                  <span className="text-[10px] text-zinc-600">{p.genre}</span>
                )}
                <span className="text-[10px] text-zinc-700">
                  {p.storyContent.split(/\s+/).filter(Boolean).length}w
                </span>
              </div>
            </div>

            <div className="hidden group-hover:flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => updateProject(p.id, { pinned: !p.pinned })}
                className={`p-1 rounded hover:bg-zinc-700 ${p.pinned ? 'text-yellow-500' : 'text-zinc-600'}`}
              >
                <Pin className="h-3 w-3" />
              </button>
              <button
                onClick={() => duplicateProject(p.id)}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-600"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={() => deleteProject(p.id)}
                className="p-1 rounded hover:bg-zinc-700 text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
