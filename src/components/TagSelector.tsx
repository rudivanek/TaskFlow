import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Globe } from 'lucide-react';
import { Tag, useTaskTags } from '../hooks/useTags';
import { TagPill } from './TagPill';
import { TAG_COLORS } from '../utils/tagColors';

interface Props {
  taskId: string;
  projectId: string;
  availableTags: Tag[];
  onCreateTag: (name: string, color: string, isGlobal: boolean) => Promise<Tag | null>;
  initialTags: Tag[];
}

export function TagSelector({ taskId, projectId: _projectId, availableTags, onCreateTag, initialTags }: Props) {
  const { taskTags, addTag, removeTag } = useTaskTags(taskId, initialTags);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[7].value);
  const [newTagGlobal, setNewTagGlobal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreate(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const assignedIds = new Set(taskTags.map(t => t.id));
  const filteredTags = availableTags.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) && !assignedIds.has(t.id),
  );

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsCreating(true);
    const tag = await onCreateTag(newTagName, newTagColor, newTagGlobal);
    if (tag) {
      await addTag(tag.id, tag);
      setNewTagName('');
      setNewTagColor(TAG_COLORS[7].value);
      setNewTagGlobal(false);
      setShowCreate(false);
    }
    setIsCreating(false);
  };

  return (
    <div className="relative flex items-center gap-1 flex-wrap min-w-0" ref={dropdownRef}>
      {taskTags.map(tag => (
        <TagPill key={tag.id} tag={tag} size="xs" onRemove={() => removeTag(tag.id)} />
      ))}

      <button
        onClick={e => { e.stopPropagation(); setIsOpen(v => !v); }}
        className="w-5 h-5 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex-shrink-0"
        title="Add tag"
      >
        <Plus className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-6 z-50 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2"
          onClick={e => e.stopPropagation()}
        >
          {!showCreate ? (
            <>
              <div className="px-2 mb-1">
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {filteredTags.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400 text-center">
                    {search ? 'No tags found' : 'All tags assigned'}
                  </p>
                ) : (
                  filteredTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag.id, tag)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors"
                    >
                      <TagPill tag={tag} size="xs" />
                      {tag.project_id === null && (
                        <Globe className="w-3 h-3 text-slate-300 ml-auto flex-shrink-0" aria-label="Global tag" />
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-blue-500 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Create new tag
                </button>
              </div>
            </>
          ) : (
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-slate-700 mb-2">Create New Tag</p>

              <input
                type="text"
                placeholder="Tag name..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateTag(); }}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 mb-2"
                autoFocus
              />

              <p className="text-[10px] text-slate-400 mb-1.5">Color</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TAG_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setNewTagColor(c.value)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      newTagColor === c.value ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>

              {newTagName && (
                <div className="mb-2">
                  <p className="text-[10px] text-slate-400 mb-1">Preview</p>
                  <TagPill
                    tag={{ id: 'preview', name: newTagName, color: newTagColor, project_id: null, created_by: null }}
                    size="xs"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTagGlobal}
                  onChange={e => setNewTagGlobal(e.target.checked)}
                  className="w-3 h-3 rounded"
                />
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Make global (all projects)
                </span>
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCreate(false); setNewTagName(''); }}
                  className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || isCreating}
                  className="flex-1 px-2 py-1.5 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-40"
                >
                  {isCreating ? '...' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
