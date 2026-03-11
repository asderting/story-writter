// ============================================================================
// Story Studio - Prompt Templates
// Builds structured prompt messages for each generation action.
// ============================================================================

import type { GenerationAction } from '../../types';
import type { ComposedContext } from '../context';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface TemplateInput {
  instruction: string;
  sourceText: string;
  selectedText?: string;
  context: ComposedContext;
  action: GenerationAction;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Per-action instruction templates
// ---------------------------------------------------------------------------

const ACTION_TEMPLATES: Record<GenerationAction, (input: TemplateInput) => string> = {
  create: ({ instruction }) =>
    `Write a story passage based on the following prompt. Output ONLY the story text with no commentary or meta-text.\n\nPrompt: ${instruction}`,

  continue: ({ instruction, sourceText }) => {
    const parts = [
      'Continue the story naturally from where it left off. ' +
        'Maintain the same voice, tense, point-of-view, and pacing. ' +
        'Output ONLY the continuation text with no commentary.',
    ];
    if (instruction) {
      parts.push(`\nDirection: ${instruction}`);
    }
    parts.push(`\nStory so far (ending):\n"""\n${tail(sourceText, 2000)}\n"""`);
    return parts.join('');
  },

  expand: ({ instruction, selectedText, sourceText }) => {
    const passage = selectedText || tail(sourceText, 1500);
    const parts = [
      'Expand the following passage with richer detail, deeper characterization, ' +
        'and more vivid prose. Preserve the original meaning and plot points. ' +
        'Output ONLY the expanded text with no commentary.',
    ];
    if (instruction) {
      parts.push(`\nDirection: ${instruction}`);
    }
    parts.push(`\nPassage to expand:\n"""\n${passage}\n"""`);
    return parts.join('');
  },

  rewrite: ({ instruction, selectedText, sourceText }) => {
    const passage = selectedText || tail(sourceText, 1500);
    return (
      'Rewrite the following passage according to the instruction below. ' +
      'Output ONLY the rewritten text with no commentary.\n\n' +
      `Instruction: ${instruction}\n\n` +
      `Passage to rewrite:\n"""\n${passage}\n"""`
    );
  },

  paraphrase: ({ instruction, selectedText, sourceText }) => {
    const passage = selectedText || tail(sourceText, 1500);
    const parts = [
      'Polish and paraphrase the following passage. Improve clarity and flow ' +
        'while preserving the original meaning, events, and character voice. ' +
        'Output ONLY the polished text with no commentary.',
    ];
    if (instruction) {
      parts.push(`\nAdditional direction: ${instruction}`);
    }
    parts.push(`\nPassage:\n"""\n${passage}\n"""`);
    return parts.join('');
  },

  'style-transform': ({ instruction, selectedText, sourceText }) => {
    const passage = selectedText || tail(sourceText, 1500);
    return (
      'Transform the style and tone of the following passage according to the ' +
      'instruction. Keep the plot and characters intact but change the prose ' +
      'style. Output ONLY the transformed text with no commentary.\n\n' +
      `Style instruction: ${instruction}\n\n` +
      `Passage:\n"""\n${passage}\n"""`
    );
  },

  shorten: ({ instruction, selectedText, sourceText }) => {
    const passage = selectedText || tail(sourceText, 1500);
    const parts = [
      'Shorten and compress the following passage while retaining key plot ' +
        'points, character beats, and essential details. Make the prose tighter ' +
        'and more concise. Output ONLY the shortened text with no commentary.',
    ];
    if (instruction) {
      parts.push(`\nDirection: ${instruction}`);
    }
    parts.push(`\nPassage to shorten:\n"""\n${passage}\n"""`);
    return parts.join('');
  },

  insert: ({ instruction, sourceText, selectedText }) => {
    // selectedText is used as the "after" anchor; sourceText provides broader context
    const parts = [
      'Generate text to be inserted at the indicated point in the story. ' +
        'The new text should flow naturally from the preceding passage into the ' +
        'following passage. Output ONLY the text to insert with no commentary.',
    ];
    if (instruction) {
      parts.push(`\nDirection: ${instruction}`);
    }
    if (selectedText) {
      parts.push(
        `\nText BEFORE insertion point:\n"""\n${selectedText}\n"""`,
      );
    }
    parts.push(
      `\nSurrounding context:\n"""\n${tail(sourceText, 2000)}\n"""`,
    );
    return parts.join('');
  },

  'selection-edit': ({ instruction, selectedText, sourceText }) => {
    if (!selectedText) {
      // Fallback: treat as a rewrite of the tail
      return ACTION_TEMPLATES.rewrite({
        instruction,
        sourceText,
        selectedText: undefined,
        context: { systemMessage: '', contextBlocks: [], estimatedTokens: 0 },
        action: 'rewrite',
      });
    }
    return (
      'Edit ONLY the selected text according to the instruction below. ' +
      'Do not alter anything outside the selection. Output ONLY the edited ' +
      'version of the selected text with no commentary.\n\n' +
      `Instruction: ${instruction}\n\n` +
      `Selected text:\n"""\n${selectedText}\n"""\n\n` +
      `Surrounding context:\n"""\n${tail(sourceText, 1500)}\n"""`
    );
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the last `maxChars` characters of a string. */
function tail(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(-maxChars);
}

/** Merge context blocks into a single user-facing context string. */
function assembleContextContent(context: ComposedContext): string {
  if (context.contextBlocks.length === 0) return '';
  return context.contextBlocks.map((b) => b.content).join('\n\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the array of prompt messages ready to send to a chat-completion
 * endpoint. The result always starts with a system message, optionally
 * followed by a user message containing assembled context, and finally
 * the action-specific user instruction.
 */
export function buildPromptMessages(input: TemplateInput): PromptMessage[] {
  const { context, action } = input;
  const messages: PromptMessage[] = [];

  // 1. System message -------------------------------------------------------
  messages.push({
    role: 'system',
    content: context.systemMessage,
  });

  // 2. Context blocks (sent as a user message so the model treats them as
  //    reference material rather than instructions) -------------------------
  const contextContent = assembleContextContent(context);
  if (contextContent) {
    messages.push({
      role: 'user',
      content:
        'Here is reference material for the story. Use it to maintain ' +
        'consistency but do not repeat it verbatim.\n\n' +
        contextContent,
    });

    // Acknowledge receipt so the model stays in-character
    messages.push({
      role: 'assistant',
      content:
        'Understood. I have reviewed the reference material and will keep it ' +
        'in mind while writing.',
    });
  }

  // 3. Action-specific instruction ------------------------------------------
  const templateFn = ACTION_TEMPLATES[action];
  const userInstruction = templateFn(input);

  messages.push({
    role: 'user',
    content: userInstruction,
  });

  return messages;
}
