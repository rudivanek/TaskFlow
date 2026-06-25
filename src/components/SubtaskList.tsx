import { useState, useEffect } from 'react';
import { Subtask } from '../types';
import * as taskServices from '../services/taskServices';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface SubtaskListProps {
  taskMainId: string;
}

export default function SubtaskList({ taskMainId }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubtasks();
  }, [taskMainId]);

  const loadSubtasks = async () => {
    try {
      const data = await taskServices.fetchSubtasks(taskMainId);
      setSubtasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const sub = await taskServices.createSubtask(taskMainId, newName.trim(), subtasks.length);
      setSubtasks([...subtasks, sub]);
      setNewName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await taskServices.deleteSubtask(id);
      setSubtasks(subtasks.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const cycleStatus = async (subtask: Subtask) => {
    const updates: Partial<Subtask> = subtask.done
      ? { not_started: true, doing: false, done: false }
      : { not_started: false, doing: false, done: true };
    try {
      await taskServices.updateSubtask(subtask.id, updates);
      setSubtasks(subtasks.map(s => s.id === subtask.id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (subtask: Subtask) => {
    if (subtask.done) return { label: 'Done', color: 'bg-green-100 text-green-700' };
    return { label: 'Not Started', color: 'bg-slate-100 text-slate-600' };
  };

  if (loading) return <div className="px-12 py-2 text-xs text-slate-400">Loading subtasks...</div>;

  return (
    <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 ml-8">
      {subtasks.map(subtask => {
        const status = getStatusBadge(subtask);
        return (
          <div key={subtask.id} className="flex items-center gap-2 py-1.5 group">
            <GripVertical className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab" />
            <button
              onClick={() => cycleStatus(subtask)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${status.color}`}
            >
              {status.label}
            </button>
            <span className={`flex-1 text-sm ${subtask.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {subtask.subtask_name}
            </span>
            <button
              onClick={() => handleDelete(subtask.id)}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 rounded transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      <div className="flex items-center gap-2 mt-1">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder="Add subtask..."
          className="flex-1 text-sm px-2 py-1 border border-slate-200 rounded bg-white"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="p-1 text-primary-600 hover:bg-primary-50 rounded disabled:opacity-30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
