// ============================================================================
// Story Studio - Context Composer
// Assembles the full prompt from multiple memory/context layers.
// ============================================================================

import type {
  Project,
  StoryMemory,
  WritingStyleMemory,
  CharacterSheet,
  SettingSheet,
  EnvironmentSheet,
  SceneMemory,
  LoreEntry,
  ContextLayerConfig,
} from '../../types';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ContextComposerInput {
  project: Project;
  storyMemory?: StoryMemory;
  styleMemory?: WritingStyleMemory;
  characters?: CharacterSheet[];
  settings?: SettingSheet[];
  environments?: EnvironmentSheet[];
  sceneMemory?: SceneMemory;
  loreEntries?: LoreEntry[];
  recentText: string;
  selectedText?: string;
  config: ContextLayerConfig;
}

export interface ComposedContext {
  systemMessage: string;
  contextBlocks: ContextBlock[];
  estimatedTokens: number;
}

export interface ContextBlock {
  label: string;
  content: string;
  tokenEstimate: number;
}

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

/**
 * Estimate the number of tokens in a string using a simple heuristic of
 * roughly 4 characters per token.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Internal formatting helpers
// ---------------------------------------------------------------------------

function formatCharacter(c: CharacterSheet): string {
  const lines: string[] = [`## ${c.name}`];

  if (c.age) lines.push(`- **Age:** ${c.age}`);
  if (c.appearance) lines.push(`- **Appearance:** ${c.appearance}`);
  if (c.personality) lines.push(`- **Personality:** ${c.personality}`);
  if (c.motivations) lines.push(`- **Motivations:** ${c.motivations}`);
  if (c.relationships) lines.push(`- **Relationships:** ${c.relationships}`);
  if (c.speakingStyle) lines.push(`- **Speaking style:** ${c.speakingStyle}`);
  if (c.strengths) lines.push(`- **Strengths:** ${c.strengths}`);
  if (c.flaws) lines.push(`- **Flaws:** ${c.flaws}`);
  if (c.background) lines.push(`- **Background:** ${c.background}`);
  if (c.currentArc) lines.push(`- **Current arc:** ${c.currentArc}`);
  if (c.notes) lines.push(`- **Notes:** ${c.notes}`);

  return lines.join('\n');
}

function formatSetting(s: SettingSheet): string {
  const lines: string[] = [`## ${s.name}`];

  if (s.genre) lines.push(`- **Genre:** ${s.genre}`);
  if (s.tone) lines.push(`- **Tone:** ${s.tone}`);
  if (s.rules) lines.push(`- **Rules:** ${s.rules}`);
  if (s.technologyLevel) lines.push(`- **Technology level:** ${s.technologyLevel}`);
  if (s.atmosphere) lines.push(`- **Atmosphere:** ${s.atmosphere}`);
  if (s.factions) lines.push(`- **Factions:** ${s.factions}`);
  if (s.recentEvents) lines.push(`- **Recent events:** ${s.recentEvents}`);
  if (s.culturalNorms) lines.push(`- **Cultural norms:** ${s.culturalNorms}`);
  if (s.environmentDetails) lines.push(`- **Environment details:** ${s.environmentDetails}`);

  return lines.join('\n');
}

function formatEnvironment(e: EnvironmentSheet): string {
  const lines: string[] = [`## ${e.name}`];

  if (e.visualDetails) lines.push(`- **Visual details:** ${e.visualDetails}`);
  if (e.mood) lines.push(`- **Mood:** ${e.mood}`);
  if (e.sensoryDetails) lines.push(`- **Sensory details:** ${e.sensoryDetails}`);
  if (e.weather) lines.push(`- **Weather:** ${e.weather}`);
  if (e.soundscape) lines.push(`- **Soundscape:** ${e.soundscape}`);
  if (e.lighting) lines.push(`- **Lighting:** ${e.lighting}`);
  if (e.sceneNotes) lines.push(`- **Scene notes:** ${e.sceneNotes}`);

  return lines.join('\n');
}

function formatLoreEntry(l: LoreEntry): string {
  const lines: string[] = [`## ${l.title} (${l.type})`];

  if (l.content) lines.push(l.content);
  if (l.notes) lines.push(`_Note: ${l.notes}_`);

  return lines.join('\n');
}

/**
 * Determine whether a keyword-triggered lore entry should be activated based
 * on the recent story text and optional selected text.
 */
function loreMatchesKeywords(
  entry: LoreEntry,
  recentText: string,
  selectedText?: string,
): boolean {
  if (!entry.keywords || entry.keywords.length === 0) return false;

  const haystack = `${recentText} ${selectedText ?? ''}`.toLowerCase();

  return entry.keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

// ---------------------------------------------------------------------------
// System message builder
// ---------------------------------------------------------------------------

function buildSystemMessage(
  project: Project,
  styleMemory?: WritingStyleMemory,
  config?: ContextLayerConfig,
): string {
  const parts: string[] = [];

  // Base system prompt from the project (always included if present)
  if (project.systemPrompt) {
    parts.push(project.systemPrompt);
  }

  // Project metadata gives the model genre/tone awareness
  const meta: string[] = [];
  if (project.genre) meta.push(`Genre: ${project.genre}`);
  if (project.tone) meta.push(`Tone: ${project.tone}`);
  if (project.synopsis) meta.push(`Synopsis: ${project.synopsis}`);
  if (meta.length > 0) {
    parts.push(`[Project context]\n${meta.join('\n')}`);
  }

  // Writing-style memory
  if (config?.includeStyleMemory && styleMemory?.content) {
    parts.push(`[Writing style guide]\n${styleMemory.content}`);
  }

  // Core instruction: always produce raw story prose
  parts.push(
    'You are a creative fiction writer. Output ONLY the story text. ' +
      'Do not include any commentary, explanations, meta-text, or markdown ' +
      'formatting such as headers or code fences. Write in the same voice, ' +
      'tense, and point-of-view as the existing story unless instructed otherwise.',
  );

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Main composer
// ---------------------------------------------------------------------------

/**
 * Compose a full context payload from all available memory & context layers.
 *
 * The returned `ComposedContext` contains a ready-to-use system message, an
 * ordered array of labelled context blocks, and a total token estimate.
 */
export function composeContext(input: ContextComposerInput): ComposedContext {
  const {
    project,
    storyMemory,
    styleMemory,
    characters,
    settings,
    environments,
    sceneMemory,
    loreEntries,
    recentText,
    selectedText,
    config,
  } = input;

  const blocks: ContextBlock[] = [];

  // 1. Story memory ---------------------------------------------------------
  if (config.includeStoryMemory && storyMemory?.content) {
    const content = `[Story memory]\n${storyMemory.content}`;
    blocks.push({
      label: 'Story Memory',
      content,
      tokenEstimate: estimateTokens(content),
    });
  }

  // 2. Character sheets -----------------------------------------------------
  if (config.includeCharacters && characters && characters.length > 0) {
    const active = characters.filter((c) => c.alwaysInclude || c.activeInScene);
    if (active.length > 0) {
      const content =
        '[Characters]\n' + active.map(formatCharacter).join('\n\n');
      blocks.push({
        label: 'Characters',
        content,
        tokenEstimate: estimateTokens(content),
      });
    }
  }

  // 3. Setting sheets -------------------------------------------------------
  if (config.includeSettings && settings && settings.length > 0) {
    const active = settings.filter((s) => s.alwaysInclude || s.active);
    if (active.length > 0) {
      const content =
        '[Settings]\n' + active.map(formatSetting).join('\n\n');
      blocks.push({
        label: 'Settings',
        content,
        tokenEstimate: estimateTokens(content),
      });
    }
  }

  // 4. Environment sheets ---------------------------------------------------
  if (config.includeEnvironments && environments && environments.length > 0) {
    const active = environments.filter((e) => e.activeInScene);
    if (active.length > 0) {
      const content =
        '[Environments]\n' + active.map(formatEnvironment).join('\n\n');
      blocks.push({
        label: 'Environments',
        content,
        tokenEstimate: estimateTokens(content),
      });
    }
  }

  // 5. Scene memory ---------------------------------------------------------
  if (config.includeSceneMemory && sceneMemory?.content) {
    const content = `[Scene memory]\n${sceneMemory.content}`;
    blocks.push({
      label: 'Scene Memory',
      content,
      tokenEstimate: estimateTokens(content),
    });
  }

  // 6. Lore entries ---------------------------------------------------------
  if (config.includeLore && loreEntries && loreEntries.length > 0) {
    const activeLore = loreEntries.filter((entry) => {
      if (!entry.active) return false;
      if (entry.alwaysInclude) return true;
      return loreMatchesKeywords(entry, recentText, selectedText);
    });

    // Sort by priority (higher first)
    activeLore.sort((a, b) => b.priority - a.priority);

    if (activeLore.length > 0) {
      const content =
        '[Lorebook]\n' + activeLore.map(formatLoreEntry).join('\n\n');
      blocks.push({
        label: 'Lore Entries',
        content,
        tokenEstimate: estimateTokens(content),
      });
    }
  }

  // 7. Recent story text ----------------------------------------------------
  if (recentText) {
    const maxChars = config.recentTextChars ?? 4000;
    const trimmed =
      recentText.length > maxChars
        ? recentText.slice(-maxChars)
        : recentText;

    const content = `[Recent story text]\n${trimmed}`;
    blocks.push({
      label: 'Recent Story Text',
      content,
      tokenEstimate: estimateTokens(content),
    });
  }

  // 8. Selected text (if any) -----------------------------------------------
  if (selectedText) {
    const content = `[Selected text]\n${selectedText}`;
    blocks.push({
      label: 'Selected Text',
      content,
      tokenEstimate: estimateTokens(content),
    });
  }

  // Build system message ----------------------------------------------------
  const systemMessage = buildSystemMessage(project, styleMemory, config);

  // Total token estimate ----------------------------------------------------
  const systemTokens = estimateTokens(systemMessage);
  const blockTokens = blocks.reduce((sum, b) => sum + b.tokenEstimate, 0);

  return {
    systemMessage,
    contextBlocks: blocks,
    estimatedTokens: systemTokens + blockTokens,
  };
}
