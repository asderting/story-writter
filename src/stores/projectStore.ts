import { create } from 'zustand';
import type { Project } from '@/types';
import * as db from '@/lib/db';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  searchQuery: string;
  sortBy: 'updatedAt' | 'title' | 'createdAt';

  // Actions
  loadProjects: () => void;
  createProject: (partial: Partial<Project>) => Project;
  updateProject: (id: string, partial: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => Project;
  setActiveProject: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'updatedAt' | 'title' | 'createdAt') => void;
  getActiveProject: () => Project | null;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  searchQuery: '',
  sortBy: 'updatedAt',

  loadProjects: () => {
    const projects = db.getAllProjects();
    set({ projects });
  },

  createProject: (partial) => {
    const project = db.createProject(partial);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  updateProject: (id, partial) => {
    const updated = db.updateProject(id, partial);
    if (updated) {
      set((s) => ({
        projects: s.projects.map((p) => (p.id === id ? updated : p)),
      }));
    }
  },

  deleteProject: (id) => {
    db.deleteProject(id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
    }));
  },

  duplicateProject: (id) => {
    const original = db.getProject(id);
    if (!original) throw new Error('Project not found');
    const dup = db.createProject({
      ...original,
      title: `${original.title} (Copy)`,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    });
    set((s) => ({ projects: [...s.projects, dup] }));
    return dup;
  },

  setActiveProject: (id) => set({ activeProjectId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find((p) => p.id === activeProjectId) || null;
  },
}));
