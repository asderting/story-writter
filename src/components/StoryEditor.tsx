import { useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { useGenerationStore } from '@/stores/generationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Loader2, Check, X } from 'lucide-react';

export function StoryEditor() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const content = useEditorStore((s) => s.content);
  const setContent = useEditorStore((s) => s.setContent);
  const setSelection = useEditorStore((s) => s.setSelection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const stats = useEditorStore((s) => s.stats);

  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const streamingText = useGenerationStore((s) => s.streamingText);
  const candidates = useGenerationStore((s) => s.candidates);
  const acceptCandidate = useGenerationStore((s) => s.acceptCandidate);
  const clearCandidates = useGenerationStore((s) => s.clearCandidates);
  const error = useGenerationStore((s) => s.error);

  const settings = useSettingsStore((s) => s.settings);

  // Sync editor content with project on mount / project change
  useEffect(() => {
    if (project) {
      setContent(project.storyContent);
    }
  }, [project?.id]);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (isGenerating && streamingText && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [isGenerating, streamingText]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      pushUndo(content);
      setContent(value);
      if (project) {
        updateProject(project.id, { storyContent: value });
      }
    },
    [content, project, pushUndo, setContent, updateProject],
  );

  const handleSelect = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start !== end) {
      setSelection(el.value.substring(start, end), start, end);
    } else {
      clearSelection();
    }
  }, [setSelection, clearSelection]);

  const handleAccept = useCallback(
    (index: number) => {
      const candidate = candidates[index];
      if (!candidate || !project) return;
      acceptCandidate(index);
      const newContent = content + candidate.text;
      pushUndo(content);
      setContent(newContent);
      updateProject(project.id, { storyContent: newContent });
      clearCandidates();
    },
    [candidates, project, content, acceptCandidate, pushUndo, setContent, updateProject, clearCandidates],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl+Enter to send
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const generate = useGenerationStore.getState().generate;
        const setAction = useGenerationStore.getState().setAction;
        if (project?.activeBackendId && project?.activeModelId) {
          setAction('continue');
          generate();
        }
      }
    },
    [project],
  );

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl text-zinc-800">&#9998;</div>
          <p className="text-zinc-500 text-lg">Open or create a story to begin writing</p>
          <p className="text-zinc-600 text-sm">Use the menu button in the top-left corner</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Main editor */}
      <div className="flex-1 overflow-auto flex justify-center">
        <div className="w-full max-w-3xl px-6 py-8">
          <textarea
            ref={textareaRef}
            className="editor-textarea w-full bg-transparent text-zinc-200 placeholder-zinc-700"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineSpacing,
              minHeight: 'calc(100vh - 140px)',
              fontFamily: "'Merriweather', 'Georgia', serif",
            }}
            value={content}
            onChange={handleChange}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            placeholder="Begin your story..."
            spellCheck
          />
        </div>
      </div>

      {/* Streaming preview - inline at bottom of editor */}
      {isGenerating && streamingText && (
        <div className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur px-6 py-3 max-h-48 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-violet-400 mb-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </div>
            <p className="text-sm text-emerald-300/80 whitespace-pre-wrap" style={{ fontFamily: "'Merriweather', 'Georgia', serif" }}>
              {streamingText}
            </p>
          </div>
        </div>
      )}

      {/* Candidates */}
      {candidates.length > 0 && !isGenerating && (
        <div className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur px-6 py-3 max-h-64 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <div className="text-xs text-zinc-500 mb-2">
              {candidates.length} result{candidates.length > 1 ? 's' : ''} generated
            </div>
            {candidates.map((c, i) => (
              <div key={c.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 mb-2">
                <p className="text-sm text-emerald-300/80 whitespace-pre-wrap mb-3 max-h-32 overflow-auto" style={{ fontFamily: "'Merriweather', 'Georgia', serif" }}>
                  {c.text}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(i)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
                  >
                    <Check className="h-3 w-3" /> Accept
                  </button>
                  <button
                    onClick={clearCandidates}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg"
                  >
                    <X className="h-3 w-3" /> Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isGenerating && (
        <div className="border-t border-red-900/50 bg-red-950/50 px-6 py-2">
          <div className="max-w-3xl mx-auto text-sm text-red-400">{error}</div>
        </div>
      )}

      {/* Word count - subtle, bottom-right */}
      <div className="absolute bottom-12 right-4 text-xs text-zinc-600">
        {stats.words} words
      </div>
    </div>
  );
}
