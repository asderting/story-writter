import { useRef, useEffect, useState, useCallback } from 'react';
import {
  PenLine,
  Maximize2,
  Minimize2,
  Palette,
  Zap,
  MessageSquare,
  X,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editorStore';
import { useGenerationStore } from '@/stores/generationStore';
import type { GenerationAction } from '@/types';

interface SelectionToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

interface ToolbarAction {
  label: string;
  icon: React.ReactNode;
  action: GenerationAction;
  instruction: string;
}

const actions: ToolbarAction[] = [
  {
    label: 'Rewrite',
    icon: <PenLine className="w-4 h-4" />,
    action: 'rewrite',
    instruction: 'Rewrite this text while preserving meaning but improving prose quality.',
  },
  {
    label: 'Expand',
    icon: <Maximize2 className="w-4 h-4" />,
    action: 'expand',
    instruction: 'Expand this text with more detail, description, and depth.',
  },
  {
    label: 'Shorten',
    icon: <Minimize2 className="w-4 h-4" />,
    action: 'shorten',
    instruction: 'Shorten this text while preserving key meaning and impact.',
  },
  {
    label: 'More Vivid',
    icon: <Palette className="w-4 h-4" />,
    action: 'style-transform',
    instruction: 'Make this text more vivid and descriptive with richer sensory details.',
  },
  {
    label: 'More Tense',
    icon: <Zap className="w-4 h-4" />,
    action: 'style-transform',
    instruction: 'Increase the tension and urgency in this text.',
  },
];

export function SelectionToolbar({ textareaRef }: SelectionToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const hasSelection = useEditorStore((s) => s.hasSelection);
  const selectionText = useEditorStore((s) => s.selectionText);
  const selectionStart = useEditorStore((s) => s.selectionStart);
  const selectionEnd = useEditorStore((s) => s.selectionEnd);

  const setAction = useGenerationStore((s) => s.setAction);
  const setInstruction = useGenerationStore((s) => s.setInstruction);
  const setSelectedText = useGenerationStore((s) => s.setSelectedText);
  const generate = useGenerationStore((s) => s.generate);
  const isGenerating = useGenerationStore((s) => s.isGenerating);

  // Position the toolbar above the selection
  const updatePosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !hasSelection) return;

    const textareaRect = textarea.getBoundingClientRect();

    // Estimate position from selection indices
    // Create a mirror div to measure text position
    const mirror = document.createElement('div');
    const computed = window.getComputedStyle(textarea);
    const properties = [
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
      'letterSpacing', 'wordSpacing', 'textIndent',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'boxSizing', 'whiteSpace', 'wordWrap', 'overflowWrap',
    ] as const;

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.height = 'auto';
    mirror.style.overflow = 'hidden';

    for (const prop of properties) {
      mirror.style[prop as any] = computed[prop as any];
    }
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';

    // Text before selection
    const textBefore = textarea.value.substring(0, selectionStart);
    const span = document.createElement('span');
    span.textContent = textBefore;
    mirror.appendChild(span);

    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);

    document.body.appendChild(mirror);
    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    const relativeTop = markerRect.top - mirrorRect.top;
    const relativeLeft = markerRect.left - mirrorRect.left;

    document.body.removeChild(mirror);

    // Calculate toolbar position
    const scrollTop = textarea.scrollTop;
    const top = textareaRect.top + relativeTop - scrollTop - 50;
    const left = Math.min(
      Math.max(textareaRect.left + relativeLeft, textareaRect.left + 20),
      textareaRect.right - 350
    );

    setPosition({
      top: Math.max(top, textareaRect.top - 50),
      left: Math.max(left, 10),
    });
  }, [hasSelection, selectionStart, textareaRef]);

  useEffect(() => {
    if (hasSelection) {
      updatePosition();
    }
    setShowCustomInput(false);
    setCustomInstruction('');
  }, [hasSelection, selectionText, updatePosition]);

  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  const handleAction = useCallback(
    (action: GenerationAction, instruction: string) => {
      setAction(action);
      setInstruction(instruction);
      setSelectedText(selectionText, selectionStart, selectionEnd);
      generate();
    },
    [setAction, setInstruction, setSelectedText, generate, selectionText, selectionStart, selectionEnd]
  );

  const handleCustomSubmit = useCallback(() => {
    if (!customInstruction.trim()) return;
    handleAction('selection-edit', customInstruction.trim());
    setShowCustomInput(false);
    setCustomInstruction('');
  }, [customInstruction, handleAction]);

  if (!hasSelection || isGenerating) return null;

  return (
    <div
      ref={toolbarRef}
      className={cn(
        'fixed z-50 flex items-center gap-0.5',
        'bg-zinc-800 border border-zinc-600/60 rounded-lg shadow-xl shadow-black/40',
        'p-1 animate-in fade-in slide-in-from-bottom-2 duration-150'
      )}
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {!showCustomInput ? (
        <>
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => handleAction(a.action, a.instruction)}
              title={a.label}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
                'text-zinc-300 hover:text-white hover:bg-zinc-700',
                'transition-colors duration-100'
              )}
            >
              {a.icon}
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          ))}

          <div className="w-px h-5 bg-zinc-600 mx-0.5" />

          <button
            onClick={() => setShowCustomInput(true)}
            title="Custom Edit"
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium',
              'text-amber-400 hover:text-amber-300 hover:bg-zinc-700',
              'transition-colors duration-100'
            )}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Custom</span>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-1.5 px-1">
          <input
            ref={customInputRef}
            type="text"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomSubmit();
              if (e.key === 'Escape') {
                setShowCustomInput(false);
                setCustomInstruction('');
              }
            }}
            placeholder="Describe how to edit..."
            className={cn(
              'w-64 px-2.5 py-1.5 text-xs rounded-md',
              'bg-zinc-900 border border-zinc-600 text-zinc-200',
              'placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60',
              'transition-colors'
            )}
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customInstruction.trim()}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              customInstruction.trim()
                ? 'text-amber-400 hover:text-amber-300 hover:bg-zinc-700'
                : 'text-zinc-600 cursor-not-allowed'
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setShowCustomInput(false);
              setCustomInstruction('');
            }}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
