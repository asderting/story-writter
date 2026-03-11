import { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { getGenerationHistoryByProject } from '@/lib/db';
import type { GenerationHistory } from '@/types';
import { Clock, Check, X } from 'lucide-react';

export function HistorySection() {
  const project = useProjectStore((s) => s.getActiveProject());
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      const items = getGenerationHistoryByProject(project.id);
      setHistory(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  }, [project?.id]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Open a project first
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-zinc-100 mb-6">Generation History</h2>

      {history.length === 0 && (
        <div className="text-center text-zinc-500 py-12">
          <Clock className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
          <p>No generation history yet. Generate some text to see it here.</p>
        </div>
      )}

      <div className="space-y-2">
        {history.map((entry) => (
          <div key={entry.id} className="bg-zinc-800 border border-zinc-700 rounded-lg">
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">
                    {entry.actionType}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-600">{entry.modelUsed}</span>
                </div>
                <p className="text-sm text-zinc-300 mt-1 line-clamp-1">
                  {entry.outputText.substring(0, 120)}...
                </p>
              </div>
              {entry.accepted ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-zinc-600" />
              )}
            </div>

            {expandedId === entry.id && (
              <div className="p-4 pt-0 space-y-2 border-t border-zinc-700">
                <div>
                  <span className="text-xs text-zinc-400">Output:</span>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap mt-1 max-h-64 overflow-auto">
                    {entry.outputText}
                  </p>
                </div>
                <div className="text-xs text-zinc-500">
                  Temp: {entry.parameters.temperature} | Top P: {entry.parameters.topP} | Max
                  Tokens: {entry.parameters.maxTokens}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
