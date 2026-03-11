import { useState } from 'react';
import { useMemoryStore } from '@/stores/memoryStore';
import { useProjectStore } from '@/stores/projectStore';
import type { CharacterSheet } from '@/types';
import { Plus, Trash2, Users, ChevronDown, ChevronRight } from 'lucide-react';

export function CharactersSection() {
  const project = useProjectStore((s) => s.getActiveProject());
  const characters = useMemoryStore((s) => s.characters);
  const addCharacter = useMemoryStore((s) => s.addCharacter);
  const updateCharacter = useMemoryStore((s) => s.updateCharacter);
  const deleteCharacter = useMemoryStore((s) => s.deleteCharacter);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Open a project first
      </div>
    );
  }

  const handleAdd = () => {
    const char = addCharacter(project.id, { name: 'New Character' });
    setExpandedId(char.id);
  };

  const fields: { key: keyof CharacterSheet; label: string; multiline?: boolean }[] = [
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age' },
    { key: 'appearance', label: 'Appearance', multiline: true },
    { key: 'personality', label: 'Personality', multiline: true },
    { key: 'motivations', label: 'Motivations', multiline: true },
    { key: 'relationships', label: 'Relationships', multiline: true },
    { key: 'speakingStyle', label: 'Speaking Style', multiline: true },
    { key: 'strengths', label: 'Strengths', multiline: true },
    { key: 'flaws', label: 'Flaws', multiline: true },
    { key: 'background', label: 'Background', multiline: true },
    { key: 'currentArc', label: 'Current Arc', multiline: true },
    { key: 'notes', label: 'Notes', multiline: true },
  ];

  return (
    <div className="h-full overflow-auto p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-zinc-100">Characters</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg"
        >
          <Plus className="h-4 w-4" /> Add Character
        </button>
      </div>

      {characters.length === 0 && (
        <div className="text-center text-zinc-500 py-12">
          <Users className="h-12 w-12 mx-auto mb-3 text-zinc-600" />
          <p>No characters yet. Add one to enrich your story context.</p>
        </div>
      )}

      <div className="space-y-3">
        {characters.map((char) => {
          const isExpanded = expandedId === char.id;
          return (
            <div
              key={char.id}
              className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-zinc-750"
                onClick={() => setExpandedId(isExpanded ? null : char.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                )}
                <span className="font-medium text-zinc-200 flex-1">{char.name || 'Unnamed'}</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-zinc-400" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={char.activeInScene}
                      onChange={(e) => updateCharacter(char.id, { activeInScene: e.target.checked })}
                      className="accent-violet-500"
                    />
                    In Scene
                  </label>
                  <label className="flex items-center gap-1 text-xs text-zinc-400" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={char.alwaysInclude}
                      onChange={(e) => updateCharacter(char.id, { alwaysInclude: e.target.checked })}
                      className="accent-violet-500"
                    />
                    Always Include
                  </label>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCharacter(char.id);
                    }}
                    className="p-1 rounded hover:bg-zinc-700 text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 pt-0 space-y-3 border-t border-zinc-700">
                  {fields.map(({ key, label, multiline }) => (
                    <div key={key}>
                      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
                      {multiline ? (
                        <textarea
                          value={(char[key] as string) || ''}
                          onChange={(e) => updateCharacter(char.id, { [key]: e.target.value })}
                          className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 resize-none focus:outline-none focus:border-violet-500"
                        />
                      ) : (
                        <input
                          value={(char[key] as string) || ''}
                          onChange={(e) => updateCharacter(char.id, { [key]: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
