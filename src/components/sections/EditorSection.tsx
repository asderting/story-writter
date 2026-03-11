import { useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectStore } from '@/stores/projectStore';
import { useGenerationStore } from '@/stores/generationStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Check, X, Loader2 } from 'lucide-react';

export function EditorSection() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const content = useEditorStore((s) => s.content);
  const setContent = useEditorStore((s) => s.setContent);
  const setSelection = useEditorStore((s) => s.setSelection);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const pushUndo = useEditorStore((s) => s.pushUndo);

  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.updateProject);

  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const streamingText = useGenerationStore((s) => s.streamingText);
  const candidates = useGenerationStore((s) => s.candidates);
  const acceptCandidate = useGenerationStore((s) => s.acceptCandidate);
  const clearCandidates = useGenerationStore((s) => s.clearCandidates);

  const settings = useSettingsStore((s) => s.settings);

  // Sync editor content with project on mount / project change
  useEffect(() => {
    if (project) {
      setContent(project.storyContent);
    }
  }, [project?.id]);

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

  const editorWidthClass = {
    narrow: 'max-w-2xl',
    medium: 'max-w-4xl',
    wide: 'max-w-6xl',
    full: 'max-w-full',
  }[settings.editorWidth];

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <p>Open a project to start writing</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor */}
      <div className="flex-1 overflow-auto flex justify-center p-6">
        <div className={`w-full ${editorWidthClass}`}>
          <textarea
            ref={textareaRef}
            className="editor-textarea w-full h-full min-h-[600px] bg-transparent text-zinc-100 p-4 leading-relaxed"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineSpacing,
            }}
            value={content}
            onChange={handleChange}
            onSelect={handleSelect}
            placeholder="Begin your story..."
            spellCheck
          />
        </div>
      </div>

      {/* Streaming preview */}
      {isGenerating && streamingText && (
        <div className="border-t border-zinc-700 bg-zinc-800/50 p-4 max-h-48 overflow-auto">
          <div className="flex items-center gap-2 text-xs text-violet-400 mb-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating...
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{streamingText}</p>
        </div>
      )}

      {/* Candidates */}
      {candidates.length > 0 && !isGenerating && (
        <div className="border-t border-zinc-700 bg-zinc-800/50 p-4 max-h-64 overflow-auto">
          <div className="text-xs text-zinc-400 mb-2">
            {candidates.length} candidate{candidates.length > 1 ? 's' : ''} generated
          </div>
          {candidates.map((c, i) => (
            <div
              key={c.id}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 mb-2"
            >
              <p className="text-sm text-zinc-300 whitespace-pre-wrap mb-2 max-h-32 overflow-auto">
                {c.text}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(i)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded"
                >
                  <Check className="h-3 w-3" /> Accept
                </button>
                <button
                  onClick={clearCandidates}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded"
                >
                  <X className="h-3 w-3" /> Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
