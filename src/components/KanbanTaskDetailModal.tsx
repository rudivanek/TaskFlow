import { useState, useEffect } from 'react';
import { Task, Phase, Status, Responsible } from '../types';
import * as taskServices from '../services/taskServices';
import SubtaskList from './SubtaskList';
import SubtaskStatusModal from './SubtaskStatusModal';
import { isOverdue, isDueToday, isDueSoon } from '../utils/dateUtils';
import { X, MessageSquare, Calendar, Loader2 } from 'lucide-react';

interface KanbanTaskDetailModalProps {
  task: Task;
  phases: Phase[];
  statuses: Status[];
  responsibles: Responsible[];
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onUpdateDate: (taskId: string, field: 'start_date' | 'end_date', value: string) => void;
  onUpdateDays: (taskId: string, days: number) => void;
  onDelete: (taskId: string) => void;
}

export default function KanbanTaskDetailModal({
  task,
  phases,
  statuses,
  responsibles,
  onClose,
  onUpdate,
  onUpdateDate,
  onUpdateDays,
  onDelete,
}: KanbanTaskDetailModalProps) {
  const [taskName, setTaskName] = useState(task.task_name);
  const [comment, setComment] = useState(task.task_comment || '');
  const [pendingStatusSuggestion, setPendingStatusSuggestion] = useState<string | null>(null);

  const handleSubtaskStatusChange = (suggestedStatusName: string) => {
    const currentStatusName = statuses.find(s => s.id === task.status_id)?.status;
    if (currentStatusName === suggestedStatusName) return;
    setPendingStatusSuggestion(suggestedStatusName);
  };

  const confirmStatusSuggestion = () => {
    if (!pendingStatusSuggestion) return;
    const targetStatus = statuses.find(s => s.status === pendingStatusSuggestion);
    setPendingStatusSuggestion(null);
    if (!targetStatus) return;
    onUpdate(task.id, { status_id: targetStatus.id });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = () => {
    const updates: Partial<Task> = {};
    if (taskName !== task.task_name) updates.task_name = taskName;
    if (comment !== task.task_comment) updates.task_comment = comment;
    if (Object.keys(updates).length > 0) onUpdate(task.id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">#{task.task_id}</span>
            <h2 className="text-lg font-semibold text-slate-900">Task Details</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task Name</label>
            <input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phase</label>
              <select
                value={task.phase_id || ''}
                onChange={(e) => onUpdate(task.id, { phase_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">None</option>
                {phases.map(p => <option key={p.id} value={p.id}>{p.phase}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={task.status_id || ''}
                onChange={(e) => onUpdate(task.id, { status_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">None</option>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.status}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Responsible</label>
            <select
              value={task.responsible_id || ''}
              onChange={(e) => onUpdate(task.id, { responsible_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">None</option>
              {responsibles.map(r => <option key={r.id} value={r.id}>{r.responsible}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={task.start_date}
                onChange={(e) => onUpdateDate(task.id, 'start_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Days</label>
              <input
                type="number"
                min={1}
                value={task.days}
                onChange={(e) => onUpdateDays(task.id, parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={task.end_date}
                onChange={(e) => onUpdateDate(task.id, 'end_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
              placeholder="Add notes..."
            />
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subtasks</label>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <SubtaskList taskMainId={task.id} onStatusChange={handleSubtaskStatusChange} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100">
          <button
            onClick={() => { onDelete(task.id); onClose(); }}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete Task
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {pendingStatusSuggestion && (
        <SubtaskStatusModal
          suggestedStatusName={pendingStatusSuggestion}
          onConfirm={confirmStatusSuggestion}
          onDismiss={() => setPendingStatusSuggestion(null)}
        />
      )}
    </div>
  );
}
