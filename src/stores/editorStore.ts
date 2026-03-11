import { create } from 'zustand';
import type { EditorMode, EditorStats, Snapshot, Revision } from '@/types';
import * as db from '@/lib/db';
import { estimateTokens } from '@/lib/context';

interface EditorState {
  mode: EditorMode;
  content: string;
  selectionText: string;
  selectionStart: number;
  selectionEnd: number;
  hasSelection: boolean;
  stats: EditorStats;
  selectionStats: EditorStats;
  showAdvancedPanel: boolean;
  showContextInspector: boolean;
  snapshots: Snapshot[];
  revisions: Revision[];
  compareOriginal: string;
  compareRevised: string;
  isComparing: boolean;
  undoStack: string[];
  redoStack: string[];

  // Actions
  setMode: (mode: EditorMode) => void;
  setContent: (content: string) => void;
  setSelection: (text: string, start: number, end: number) => void;
  clearSelection: () => void;
  toggleAdvancedPanel: () => void;
  toggleContextInspector: () => void;

  // Stats
  updateStats: (content: string) => void;
  updateSelectionStats: (text: string) => void;

  // Snapshots
  loadSnapshots: (projectId: string) => void;
  createSnapshot: (projectId: string, name: string, description?: string) => void;
  restoreSnapshot: (snapshotId: string) => string | null;
  deleteSnapshot: (snapshotId: string) => void;

  // Revisions
  loadRevisions: (projectId: string) => void;

  // Compare
  startCompare: (original: string, revised: string) => void;
  endCompare: () => void;

  // Undo/Redo
  pushUndo: (content: string) => void;
  undo: () => string | null;
  redo: () => string | null;

  // Insert text at position
  insertAtCursor: (text: string, position: number) => string;
  replaceSelection: (newText: string, fullContent: string) => string;
}

function computeStats(text: string): EditorStats {
  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estimatedTokens = estimateTokens(text);
  return { characters, words, estimatedTokens };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  mode: 'split',
  content: '',
  selectionText: '',
  selectionStart: 0,
  selectionEnd: 0,
  hasSelection: false,
  stats: { characters: 0, words: 0, estimatedTokens: 0 },
  selectionStats: { characters: 0, words: 0, estimatedTokens: 0 },
  showAdvancedPanel: false,
  showContextInspector: false,
  snapshots: [],
  revisions: [],
  compareOriginal: '',
  compareRevised: '',
  isComparing: false,
  undoStack: [],
  redoStack: [],

  setMode: (mode) => set({ mode }),

  setContent: (content) => {
    const stats = computeStats(content);
    set({ content, stats });
  },

  setSelection: (text, start, end) => {
    const selectionStats = computeStats(text);
    set({
      selectionText: text,
      selectionStart: start,
      selectionEnd: end,
      hasSelection: text.length > 0,
      selectionStats,
    });
  },

  clearSelection: () =>
    set({
      selectionText: '',
      selectionStart: 0,
      selectionEnd: 0,
      hasSelection: false,
      selectionStats: { characters: 0, words: 0, estimatedTokens: 0 },
    }),

  toggleAdvancedPanel: () => set((s) => ({ showAdvancedPanel: !s.showAdvancedPanel })),
  toggleContextInspector: () => set((s) => ({ showContextInspector: !s.showContextInspector })),

  updateStats: (content) => set({ stats: computeStats(content) }),
  updateSelectionStats: (text) => set({ selectionStats: computeStats(text) }),

  loadSnapshots: (projectId) => {
    set({ snapshots: db.getSnapshotsByProject(projectId) });
  },

  createSnapshot: (projectId, name, description = '') => {
    const { content } = get();
    const snapshot = db.createSnapshot({
      projectId,
      name,
      storyText: content,
      description,
    });
    set((s) => ({ snapshots: [...s.snapshots, snapshot] }));
  },

  restoreSnapshot: (snapshotId) => {
    const snapshot = db.getSnapshot(snapshotId);
    if (snapshot) {
      return snapshot.storyText;
    }
    return null;
  },

  deleteSnapshot: (snapshotId) => {
    db.deleteSnapshot(snapshotId);
    set((s) => ({ snapshots: s.snapshots.filter((sn) => sn.id !== snapshotId) }));
  },

  loadRevisions: (projectId) => {
    set({ revisions: db.getRevisionsByProject(projectId) });
  },

  startCompare: (original, revised) =>
    set({ isComparing: true, compareOriginal: original, compareRevised: revised, mode: 'compare' }),

  endCompare: () =>
    set({ isComparing: false, compareOriginal: '', compareRevised: '', mode: 'split' }),

  pushUndo: (content) => {
    set((s) => ({
      undoStack: [...s.undoStack.slice(-50), content],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, content } = get();
    if (undoStack.length === 0) return null;
    const prev = undoStack[undoStack.length - 1];
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, content],
    }));
    return prev;
  },

  redo: () => {
    const { redoStack, content } = get();
    if (redoStack.length === 0) return null;
    const next = redoStack[redoStack.length - 1];
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, content],
    }));
    return next;
  },

  insertAtCursor: (text, position) => {
    const { content } = get();
    return content.slice(0, position) + text + content.slice(position);
  },

  replaceSelection: (newText, fullContent) => {
    const { selectionStart, selectionEnd } = get();
    return fullContent.slice(0, selectionStart) + newText + fullContent.slice(selectionEnd);
  },
}));
