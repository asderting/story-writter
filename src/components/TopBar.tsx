import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Sparkles,
  Save,
  Circle,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

interface TopBarProps {
  project: Project | null;
  activeModelName: string | null;
  activePresetName: string | null;
  isConnected: boolean;
  isGenerating: boolean;
  onTitleChange: (title: string) => void;
  onContinue: () => void;
  onGenerate: () => void;
  onSaveSnapshot: () => void;
}

export function TopBar({
  project,
  activeModelName,
  activePresetName,
  isConnected,
  isGenerating,
  onTitleChange,
  onContinue,
  onGenerate,
  onSaveSnapshot,
}: TopBarProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const startEditingTitle = () => {
    if (!project) return;
    setTitleDraft(project.title);
    setIsEditingTitle(true);
  };

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== project?.title) {
      onTitleChange(trimmed);
    }
    setIsEditingTitle(false);
  };

  const cancelEditing = () => {
    setIsEditingTitle(false);
  };

  return (
    <header className="flex items-center h-12 px-4 bg-zinc-900 border-b border-zinc-800 gap-4 shrink-0">
      {/* Project title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {project ? (
          isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') cancelEditing();
                }}
                onBlur={commitTitle}
                className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm text-zinc-100 outline-none focus:border-violet-500 w-64"
              />
              <button onClick={commitTitle} className="p-0.5 text-green-400 hover:text-green-300">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={cancelEditing} className="p-0.5 text-zinc-500 hover:text-zinc-300">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={startEditingTitle}
              className="text-sm font-medium text-zinc-100 hover:text-white truncate max-w-xs transition-colors"
              title="Click to edit title"
            >
              {project.title}
            </button>
          )
        ) : (
          <span className="text-sm text-zinc-500 italic">No project open</span>
        )}
      </div>

      {/* Model & preset badges */}
      <div className="flex items-center gap-2 shrink-0">
        {activeModelName && (
          <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 border border-zinc-700">
            {activeModelName}
          </span>
        )}
        {activePresetName && (
          <span className="inline-flex items-center rounded-md bg-zinc-800/60 px-2 py-0.5 text-xs text-zinc-400 border border-zinc-700/50">
            {activePresetName}
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onContinue}
          disabled={!project || isGenerating}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-violet-600 text-white hover:bg-violet-500',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Play className="h-3.5 w-3.5" />
          Continue
        </button>

        <button
          onClick={onGenerate}
          disabled={!project || isGenerating}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Generate
        </button>

        <button
          onClick={onSaveSnapshot}
          disabled={!project}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Save className="h-3.5 w-3.5" />
          Save Snapshot
        </button>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-1.5 shrink-0" title={isConnected ? 'Connected' : 'Disconnected'}>
        <Circle
          className={cn(
            'h-2.5 w-2.5 fill-current',
            isConnected ? 'text-emerald-400' : 'text-red-400'
          )}
        />
        <span className="text-xs text-zinc-500">
          {isConnected ? 'Connected' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
