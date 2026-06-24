import { useState, useRef, useEffect } from 'react';
import { Task, Phase, Status, Responsible } from '../types';
import { ChevronRight, ChevronDown, MessageSquare, Trash2, GripVertical } from 'lucide-react';
import SubtaskList from './SubtaskList';

interface TaskRowProps {
  task: Task;
  phases: Phase[];
  statuses: Status[];
  responsibles: Responsible[];
  allTasks: Task[];
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onUpdateDate: (taskId: string, field: 'start_date' | 'end_date', value: string) => void;
  onUpdateDays: (taskId: string, days: number) => void;
  onUpdateDependencies: (taskId: string, depsString: string) => void;
  onDelete: (taskId: string, taskIdNum: number) => void;
  onDepsHover: (ids: number[]) => void;
  isHighlighted?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLTableCellElement>;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  isDragging?: boolean;
  dragEnabled?: boolean;
}

function DateCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => { if (e.target.value) onChange(e.target.value); }}
      className="w-full text-xs bg-transparent border border-transparent hover:border-slate-200 focus:border-primary-300 rounded px-1 py-1 transition-all cursor-pointer"
    />
  );
}

export default function TaskRow({
  task,
  phases,
  statuses,
  responsibles,
  allTasks,
  onUpdate,
  onUpdateDate,
  onUpdateDays,
  onUpdateDependencies,
  onDelete,
  onDepsHover,
  isHighlighted = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver = false,
  isDragging = false,
  dragEnabled = false,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [depsValue, setDepsValue] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [commentValue, setCommentValue] = useState(task.task_comment || '');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCommentValue(task.task_comment || '');
  }, [task.task_comment]);

  const handleNameBlur = (value: string) => {
    if (value !== task.task_name) {
      onUpdate(task.id, { task_name: value });
    }
    setEditingField(null);
  };

  const handleDepsBlur = () => {
    onUpdateDependencies(task.id, depsValue);
    setEditingField(null);
  };

  const handleCommentSave = () => {
    if (commentValue !== task.task_comment) {
      onUpdate(task.id, { task_comment: commentValue });
    }
    setShowComment(false);
  };

  const depsDisplay = task.depends_on_task_ids?.map(id => `#${id}`).join(', ') || '';

  return (
    <>
      <tr
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`group border-b border-slate-100 transition-colors
          ${isDragging ? 'opacity-40' : ''}
          ${isDragOver ? 'border-t-2 border-t-primary-400 bg-primary-50/40' : isHighlighted ? 'bg-slate-100' : 'hover:bg-slate-50/50'}
        `}
      >
        {/* Expand */}
        <td className="w-8 px-1 text-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </td>

        {/* ID */}
        <td className="w-10 px-2 text-center">
          <span className="text-xs font-mono text-slate-400">#{task.task_id}</span>
        </td>

        {/* Sort / Drag handle */}
        <td className="w-14 px-2 text-center">
          {dragEnabled ? (
            <div className="flex items-center justify-center gap-1">
              <div
                draggable
                onDragStart={onDragStart}
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </div>
              <span className="text-xs font-mono text-slate-400">{task.task_sort}</span>
            </div>
          ) : (
            <span className="text-xs font-mono text-slate-400">{task.task_sort}</span>
          )}
        </td>

        {/* Task Name */}
        <td className="px-2 py-1.5">
          <input
            ref={nameRef}
            defaultValue={task.task_name}
            onBlur={(e) => handleNameBlur(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="w-full text-sm bg-transparent border-0 px-1 py-0.5 rounded hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-primary-300 transition-all"
            placeholder="Task name..."
          />
        </td>

        {/* Phase */}
        <td className="w-[120px] px-1">
          <select
            value={task.phase_id || ''}
            onChange={(e) => onUpdate(task.id, { phase_id: e.target.value || null })}
            className="w-full text-xs bg-transparent border border-transparent hover:border-slate-200 focus:border-primary-300 rounded px-1 py-1 transition-all"
          >
            <option value="">-</option>
            {phases.map(p => <option key={p.id} value={p.id}>{p.phase}</option>)}
          </select>
        </td>

        {/* Status */}
        <td className="w-[120px] px-1">
          <select
            value={task.status_id || ''}
            onChange={(e) => onUpdate(task.id, { status_id: e.target.value || null })}
            className="w-full text-xs bg-transparent border border-transparent hover:border-slate-200 focus:border-primary-300 rounded px-1 py-1 transition-all"
          >
            <option value="">-</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.status}</option>)}
          </select>
        </td>

        {/* Responsible */}
        <td className="w-[120px] px-1">
          <select
            value={task.responsible_id || ''}
            onChange={(e) => onUpdate(task.id, { responsible_id: e.target.value || null })}
            className="w-full text-xs bg-transparent border border-transparent hover:border-slate-200 focus:border-primary-300 rounded px-1 py-1 transition-all"
          >
            <option value="">-</option>
            {responsibles.map(r => <option key={r.id} value={r.id}>{r.responsible}</option>)}
          </select>
        </td>

        {/* Start Date */}
        <td className="w-[110px] px-1">
          <DateCell
            value={task.start_date}
            onChange={(v) => onUpdateDate(task.id, 'start_date', v)}
          />
        </td>

        {/* Days */}
        <td className="w-[50px] px-1">
          <input
            type="number"
            min={0}
            value={task.days}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 0) onUpdateDays(task.id, val);
            }}
            className="w-full text-xs text-center bg-transparent border border-transparent hover:border-slate-200 focus:border-primary-300 rounded px-1 py-1 transition-all font-mono"
          />
        </td>

        {/* End Date */}
        <td className="w-[110px] px-1">
          <DateCell
            value={task.end_date}
            onChange={(v) => onUpdateDate(task.id, 'end_date', v)}
          />
        </td>

        {/* Depends On */}
        <td
          className="w-[100px] px-1"
          onMouseEnter={() => onDepsHover(task.depends_on_task_ids || [])}
          onMouseLeave={() => onDepsHover([])}
        >
          {editingField === 'deps' ? (
            <input
              autoFocus
              value={depsValue}
              onChange={(e) => setDepsValue(e.target.value)}
              onBlur={handleDepsBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDepsBlur(); if (e.key === 'Escape') setEditingField(null); }}
              className="w-full text-xs font-mono px-1 py-1 border border-primary-300 rounded"
              placeholder="1,2,3"
            />
          ) : (
            <button
              onClick={() => { setEditingField('deps'); setDepsValue(task.depends_on_task_ids?.join(',') || ''); }}
              className="w-full text-left text-xs font-mono text-slate-500 px-1 py-1 border border-transparent hover:border-slate-200 rounded truncate"
            >
              {depsDisplay || '-'}
            </button>
          )}
        </td>

        {/* Actions */}
        <td className="w-[60px] px-1">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowComment(!showComment)}
              className={`p-1 rounded transition-colors ${
                task.task_comment ? 'text-primary-500 hover:bg-primary-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
              }`}
              title="Comment"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(task.id, task.task_id)}
              className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Comment row */}
      {showComment && (
        <tr className="border-b border-slate-100">
          <td colSpan={11} className="px-12 py-2 bg-slate-50">
            <textarea
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
              onBlur={handleCommentSave}
              placeholder="Add a comment..."
              rows={2}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg resize-none bg-white"
            />
          </td>
        </tr>
      )}

      {/* Subtasks */}
      {expanded && (
        <tr className="border-b border-slate-100">
          <td colSpan={11}>
            <SubtaskList taskMainId={task.id} />
          </td>
        </tr>
      )}
    </>
  );
}
