import { useProjectStore } from '@/stores/projectStore';
import { useEditorStore } from '@/stores/editorStore';
import { useGenerationStore } from '@/stores/generationStore';
import type { RightTab } from '@/App';
import {
  Send,
  RotateCcw,
  Undo2,
  Redo2,
  BookOpen,
  Clock,
  Users,
  Settings,
  Server,
  Loader2,
  Square,
} from 'lucide-react';
import { useCallback } from 'react';

interface Props {
  onSend: () => void;
  onOpenTab: (tab: RightTab) => void;
}

export function BottomBar({ onSend, onOpenTab }: Props) {
  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setContent = useEditorStore((s) => s.setContent);
  const content = useEditorStore((s) => s.content);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);

  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const cancelGeneration = useGenerationStore((s) => s.cancelGeneration);
  const generate = useGenerationStore((s) => s.generate);
  const setAction = useGenerationStore((s) => s.setAction);

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev !== null && project) {
      setContent(prev);
      updateProject(project.id, { storyContent: prev });
    }
  }, [undo, project, setContent, updateProject]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next !== null && project) {
      setContent(next);
      updateProject(project.id, { storyContent: next });
    }
  }, [redo, project, setContent, updateProject]);

  const handleRetry = useCallback(() => {
    if (!project?.activeBackendId || !project?.activeModelId) return;
    setAction('continue');
    generate();
  }, [project, setAction, generate]);

  const canSend = project?.activeBackendId && project?.activeModelId && !isGenerating;

  return (
    <div className="flex items-center justify-between h-10 px-3 border-t border-zinc-800 bg-zinc-900/80 shrink-0">
      {/* Left side - context buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onOpenTab('lorebook')}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          title="Lorebook"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Lore</span>
        </button>
        <button
          onClick={() => onOpenTab('characters')}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          title="Characters"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Characters</span>
        </button>
        <button
          onClick={() => onOpenTab('memory')}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          title="Memory"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="hidden sm:inline">Memory</span>
        </button>
        <button
          onClick={() => onOpenTab('model')}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          title="Model Settings"
        >
          <Server className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Model</span>
        </button>
        <button
          onClick={() => onOpenTab('settings')}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Right side - action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <div className="w-px h-5 bg-zinc-800 mx-1" />

        <button
          onClick={() => onOpenTab('history')}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          title="History"
        >
          <Clock className="h-4 w-4" />
        </button>

        <button
          onClick={handleRetry}
          disabled={!canSend}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Retry"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Send / Stop button */}
        {isGenerating ? (
          <button
            onClick={cancelGeneration}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg ml-1 transition-colors"
          >
            <Square className="h-3.5 w-3.5" /> Stop
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!canSend}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg ml-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send (Ctrl+Enter)"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        )}
      </div>
    </div>
  );
}
