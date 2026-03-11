import { useState } from 'react';
import { useMemoryStore } from '@/stores/memoryStore';
import { useProjectStore } from '@/stores/projectStore';
import type { LoreEntry, LoreEntryType } from '@/types';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

const LORE_TYPES: { value: LoreEntryType; label: string }[] = [
  { value: 'character', label: 'Character' },
  { value: 'location', label: 'Location' },
  { value: 'faction', label: 'Faction' },
  { value: 'magic-system', label: 'Magic System' },
  { value: 'item', label: 'Item' },
  { value: 'timeline-event', label: 'Timeline Event' },
  { value: 'world-rule', label: 'World Rule' },
  { value: 'prose-constraint', label: 'Prose Constraint' },
  { value: 'environment', label: 'Environment' },
  { value: 'social-rule', label: 'Social Rule' },
];

export function LorebookSection() {
  const project = useProjectStore((s) => s.getActiveProject());
  const loreEntries = useMemoryStore((s) => s.loreEntries);
  const addLoreEntry = useMemoryStore((s) => s.addLoreEntry);
  const updateLoreEntry = useMemoryStore((s) => s.updateLoreEntry);
  const deleteLoreEntry = useMemoryStore((s) => s.deleteLoreEntry);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<LoreEntryType | 'all'>('all');

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Open a project first
      </div>
    );
  }

  const filtered =
    filterType === 'all'
      ? loreEntries
      : loreEntries.filter((e) => e.type === filterType);

  const handleAdd = () => {
    const entry = addLoreEntry(project.id, {
      title: 'New Lore Entry',
      type: 'world-rule',
      content: '',
      keywords: [],
      priority: 5,
      active: true,
    });
    setExpandedId(entry.id);
  };

  return (
    <div className="h-full overflow-auto p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-zinc-100">Lorebook</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg"
        >
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-1 mb-4">
        <button
          onClick={() => setFilterType('all')}
          className={`px-2 py-1 text-xs rounded ${
            filterType === 'all' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          All ({loreEntries.length})
        </button>
        {LORE_TYPES.map((t) => {
          const count = loreEntries.filter((e) => e.type === t.value).length;
          if (count === 0) return null;
          return (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-2 py-1 text-xs rounded ${
                filterType === t.value ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-zinc-500 py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
          <p>No lore entries. Add world-building details to enrich your AI context.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((entry) => {
          const isExpanded = expandedId === entry.id;
          return (
            <div key={entry.id} className="bg-zinc-800 border border-zinc-700 rounded-lg">
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                <span className="font-medium text-zinc-200 flex-1">{entry.title}</span>
                <span className="text-xs bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">{entry.type}</span>
                <span className="text-xs text-zinc-500">P{entry.priority}</span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <label className="flex items-center gap-1 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={entry.active}
                      onChange={(e) => updateLoreEntry(entry.id, { active: e.target.checked })}
                      className="accent-violet-500"
                    />
                    Active
                  </label>
                  <button onClick={() => deleteLoreEntry(entry.id)} className="p-1 rounded hover:bg-zinc-700 text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 pt-0 space-y-3 border-t border-zinc-700">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Title</label>
                    <input
                      value={entry.title}
                      onChange={(e) => updateLoreEntry(entry.id, { title: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Type</label>
                    <select
                      value={entry.type}
                      onChange={(e) => updateLoreEntry(entry.id, { type: e.target.value as LoreEntryType })}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                    >
                      {LORE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Content</label>
                    <textarea
                      value={entry.content}
                      onChange={(e) => updateLoreEntry(entry.id, { content: e.target.value })}
                      className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Keywords (comma-separated)</label>
                    <input
                      value={entry.keywords.join(', ')}
                      onChange={(e) =>
                        updateLoreEntry(entry.id, {
                          keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                        })
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-zinc-400 mb-1">Priority (1-10)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={entry.priority}
                        onChange={(e) => updateLoreEntry(entry.id, { priority: Number(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="flex items-end gap-3 pb-1">
                      <label className="flex items-center gap-1 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          checked={entry.alwaysInclude}
                          onChange={(e) => updateLoreEntry(entry.id, { alwaysInclude: e.target.checked })}
                          className="accent-violet-500"
                        />
                        Always Include
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Notes</label>
                    <textarea
                      value={entry.notes}
                      onChange={(e) => updateLoreEntry(entry.id, { notes: e.target.value })}
                      className="w-full h-16 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
