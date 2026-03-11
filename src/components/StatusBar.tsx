import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorStats } from '@/types';

interface StatusBarProps {
  stats: EditorStats;
  selectionStats: EditorStats | null;
  hasSelection: boolean;
  isSaving: boolean;
  isConnected: boolean;
  modelName: string | null;
}

export function StatusBar({
  stats,
  selectionStats,
  hasSelection,
  isSaving,
  isConnected,
  modelName,
}: StatusBarProps) {
  return (
    <footer className="flex items-center h-7 px-4 bg-zinc-950 border-t border-zinc-800 text-xs text-zinc-500 gap-4 shrink-0 select-none">
      {/* Text stats */}
      <div className="flex items-center gap-3">
        <span>{stats.characters.toLocaleString()} chars</span>
        <span>{stats.words.toLocaleString()} words</span>
        <span>~{stats.estimatedTokens.toLocaleString()} tokens</span>
      </div>

      {/* Selection stats */}
      {hasSelection && selectionStats && (
        <div className="flex items-center gap-3 border-l border-zinc-800 pl-4">
          <span className="text-violet-400">Sel:</span>
          <span>{selectionStats.characters.toLocaleString()} chars</span>
          <span>{selectionStats.words.toLocaleString()} words</span>
          <span>~{selectionStats.estimatedTokens.toLocaleString()} tokens</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Autosave */}
      <span className={cn(isSaving ? 'text-amber-400' : 'text-zinc-600')}>
        {isSaving ? 'Saving...' : 'Saved'}
      </span>

      {/* Connection */}
      <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-4">
        <Circle
          className={cn(
            'h-2 w-2 fill-current',
            isConnected ? 'text-emerald-400' : 'text-red-400'
          )}
        />
        <span>{isConnected ? 'Connected' : 'Offline'}</span>
      </div>

      {/* Model */}
      {modelName && (
        <span className="border-l border-zinc-800 pl-4 text-zinc-400 truncate max-w-48">
          {modelName}
        </span>
      )}
    </footer>
  );
}
