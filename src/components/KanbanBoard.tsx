import React, { useState, useEffect, useCallback } from 'react';
import { Task, Phase, Status, Responsible, AppUser } from '../types';
import { useAuth } from './AuthContext';
import * as taskServices from '../services/taskServices';
import KanbanTaskDetailModal from './KanbanTaskDetailModal';
import DownwardSyncModal from './DownwardSyncModal';
import { useStatusSync } from '../hooks/useStatusSync';
import { isOverdue, isDueToday, isDueSoon, formatDisplayDate } from '../utils/dateUtils';
import { useIsMobile } from '../utils/isMobile';
import { Search, Loader2, MessageSquare, Calendar, ChevronsUpDown, ChevronUp, ChevronDown, Plus, Trash2, Check, X } from 'lucide-react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getStatusRowStyles } from '../utils/statusStyles';

interface KanbanBoardProps {
  projectId: string;
  phases: Phase[];
  statuses: Status[];
  responsibles: Responsible[];
  users: AppUser[];
}

function getCardColor(task: Task) {
  if (isOverdue(task.end_date)) return 'border-l-red-400';
  if (isDueToday(task.end_date)) return 'border-l-amber-400';
  if (isDueSoon(task.end_date)) return 'border-l-blue-400';
  return 'border-l-slate-200';
}

interface DraggableCardProps {
  task: Task;
  mobile: boolean;
  users: AppUser[];
  phases: Phase[];
  responsibles: Responsible[];
  statuses: Status[];
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onOpen: (task: Task) => void;
}

function DraggableCard({ task, mobile, users, phases, responsibles, statuses, confirmDeleteId, setConfirmDeleteId, onDelete, onOpen }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const statusName = task.status_id ? statuses.find(s => s.id === task.status_id)?.status : undefined;
  const statusStyle = getStatusRowStyles(statusName);
  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...statusStyle.style,
    ...statusStyle.accentBorder,
  };
  if (mobile) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={() => onOpen(task)}
        className={`bg-white rounded-md border border-slate-200 border-l-4 ${getCardColor(task)} p-1.5 cursor-pointer select-none touch-none transition-colors duration-150 ${statusStyle.className}`}
      >
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded">#{task.task_id}</span>
          {task.assigned_user_id && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />}
        </div>
        <p className="text-[11px] leading-snug text-slate-800 font-medium line-clamp-2">{task.task_name || 'Untitled task'}</p>
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      className={`bg-white rounded-lg border border-slate-200 border-l-4 ${getCardColor(task)} p-3 cursor-pointer hover:shadow-md transition-shadow select-none touch-none transition-colors duration-150 ${statusStyle.className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">#{task.task_id}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.task_comment && <MessageSquare className="w-3 h-3 text-slate-400" />}
          {confirmDeleteId === task.id ? (
            <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-slate-500">Delete?</span>
              <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); setConfirmDeleteId(null); }} title="Confirm delete" className="p-0.5 rounded text-red-600 hover:bg-red-50"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} title="Cancel" className="p-0.5 rounded text-slate-400 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
            </span>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(task.id); }} title="Delete task" className="p-0.5 rounded text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-800 font-medium line-clamp-2 mb-2">{task.task_name || 'Untitled task'}</p>
      {task.assigned_user_id && (
        <p className="text-xs text-slate-500 mb-2 truncate">{users.find(u => u.id === task.assigned_user_id)?.full_name || users.find(u => u.id === task.assigned_user_id)?.email || 'Unknown user'}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {task.phase_id && <span className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">{phases.find(p => p.id === task.phase_id)?.phase}</span>}
        {task.responsible_id && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{responsibles.find(r => r.id === task.responsible_id)?.responsible}</span>}
      </div>
      {task.start_date && (
        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400"><Calendar className="w-3 h-3" /><span>{formatDisplayDate(task.start_date)} - {formatDisplayDate(task.end_date)}</span></div>
      )}
    </div>
  );
}

interface DroppableColumnProps {
  id: string;
  title: string;
  count: number;
  mobile: boolean;
  isUnassigned?: boolean;
  children: React.ReactNode;
}

function DroppableColumn({ id, title, count, mobile, isUnassigned, children }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const widthClass = mobile ? 'flex-1 min-w-0' : 'w-72 min-w-[288px]';
  const highlight = isOver ? 'ring-2 ring-primary-400 bg-primary-50/50' : '';
  return (
    <div ref={setNodeRef} className={`flex flex-col bg-slate-50 rounded-xl ${widthClass} ${highlight} transition-colors`}>
      <div className={`flex items-center justify-between ${mobile ? 'px-1.5 py-2' : 'px-3 py-3'}`}>
        <h3 className={`font-semibold truncate ${mobile ? 'text-xs' : 'text-sm'} ${isUnassigned ? 'text-slate-400' : 'text-slate-700'}`}>{title}</h3>
        <span className={`bg-slate-200 text-slate-600 rounded-full ${mobile ? 'text-[10px] px-1.5' : 'text-xs px-2 py-0.5'}`}>{count}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">{children}</div>
    </div>
  );
}

export default function KanbanBoard({ projectId, phases, statuses, responsibles, users }: KanbanBoardProps) {
  const { user } = useAuth();
  const mobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'task_id' | 'task_sort'>('task_sort');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const statusSync = useStatusSync({ tasks, statuses, setTasks, setError, setSelectedTask });

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskServices.fetchTasks(projectId);
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleUpdate = async (taskId: string, updates: Partial<Task>) => {
    // Route status_id changes through the central status handler
    if ('status_id' in updates && Object.keys(updates).length === 1) {
      await statusSync.changeTaskStatus(taskId, updates.status_id ?? null, { source: 'user' });
      return;
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    try {
      const updated = await taskServices.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      setSelectedTask(prev => (prev && prev.id === taskId ? updated : prev));
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
      await loadTasks();
    }
  };

  const handleUpdateDate = async (taskId: string, field: 'start_date' | 'end_date', value: string) => {
    if (!value) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      const updated = await taskServices.updateTaskDate(taskId, field, value, task);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      setSelectedTask(prev => (prev && prev.id === taskId ? updated : prev));
      if (updated.dependencies_task_ids && updated.dependencies_task_ids.length > 0) {
        const cascaded = await taskServices.cascadeDependencyDates(taskId);
        if (cascaded.length > 0) {
          setTasks(prev => prev.map(t => cascaded.find(c => c.id === t.id) || t));
        }
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateDays = async (taskId: string, days: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      const updated = await taskServices.updateTaskDays(taskId, days, task.start_date);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      setSelectedTask(prev => (prev && prev.id === taskId ? updated : prev));
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await taskServices.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateTask = async () => {
    if (!user || creating) return;
    try {
      setCreating(true);
      const notStartedStatus = statuses.find(s => s.status.toLowerCase() === 'not started');
      const newTask = await taskServices.createTask(projectId, user.id, '', tasks.length, notStartedStatus?.id);
      setTasks(prev => [...prev, newTask]);
      setSelectedTask(newTask);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
      setTimeout(() => setError(''), 3000);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedTask) return;
      if (e.altKey && e.key === 'n') { e.preventDefault(); handleCreateTask(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tasks, projectId, statuses, user, creating, selectedTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragStart = (event: any) => {
    setConfirmDeleteId(null);
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: any) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const targetId = over.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (targetId === 'unassigned') {
      if (!task.status_id) return;
      await statusSync.changeTaskStatus(taskId, null, { source: 'user' });
    } else {
      if (task.status_id === targetId) return;
      await statusSync.changeTaskStatus(taskId, targetId, { source: 'user' });
    }
  };

  const filteredTasks = tasks
    .filter(t => !searchQuery || t.task_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const av = sortField === 'task_id' ? (a.task_id ?? 0) : (a.task_sort ?? 0);
      const bv = sortField === 'task_id' ? (b.task_id ?? 0) : (b.task_sort ?? 0);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const handleSort = (field: 'task_id' | 'task_sort') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: 'task_id' | 'task_sort' }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg"
          />
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filteredTasks.length} tasks</span>
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => handleSort('task_id')}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${sortField === 'task_id' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            ID <SortIcon field="task_id" />
          </button>
          <button
            onClick={() => handleSort('task_sort')}
            title="Sort by manual sort order"
            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${sortField === 'task_sort' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Sort <SortIcon field="task_sort" />
          </button>
        </div>
        <button
          onClick={handleCreateTask}
          disabled={creating}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors ${mobile ? 'min-h-[40px]' : ''}`}
        >
          <Plus className="w-3.5 h-3.5" /> New task
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex-1 ${mobile ? 'flex flex-col gap-1.5 p-2' : 'overflow-x-auto p-4'}`}>
          <div className={`h-full min-h-0 ${mobile ? 'flex gap-1.5' : 'flex gap-4'}`}>
            {(['Not Started', 'Doing', 'Done'] as const)
              .map(name => statuses.find(s => s.status === name))
              .filter((s): s is Status => !!s)
              .map(status => {
                const statusTasks = filteredTasks.filter(t => t.status_id === status.id);
                return (
                  <DroppableColumn key={status.id} id={status.id} title={status.status} count={statusTasks.length} mobile={mobile}>
                    {statusTasks.map(task => (
                      <DraggableCard
                        key={task.id}
                        task={task}
                        mobile={mobile}
                        users={users}
                        phases={phases}
                        responsibles={responsibles}
                        statuses={statuses}
                        confirmDeleteId={confirmDeleteId}
                        setConfirmDeleteId={setConfirmDeleteId}
                        onDelete={handleDelete}
                        onOpen={setSelectedTask}
                      />
                    ))}
                  </DroppableColumn>
                );
              })}
          </div>

          {/* Unassigned column */}
          {filteredTasks.filter(t => !t.status_id).length > 0 && (
            mobile ? (
              <DroppableColumn id="unassigned" title="No Status" count={filteredTasks.filter(t => !t.status_id).length} mobile={mobile} isUnassigned>
                {filteredTasks.filter(t => !t.status_id).map(task => (
                  <DraggableCard
                    key={task.id}
                    task={task}
                    mobile={mobile}
                    users={users}
                    phases={phases}
                    responsibles={responsibles}
                    statuses={statuses}
                    confirmDeleteId={confirmDeleteId}
                    setConfirmDeleteId={setConfirmDeleteId}
                    onDelete={handleDelete}
                    onOpen={setSelectedTask}
                  />
                ))}
              </DroppableColumn>
            ) : (
              <DroppableColumn id="unassigned" title="No Status" count={filteredTasks.filter(t => !t.status_id).length} mobile={mobile} isUnassigned>
                {filteredTasks.filter(t => !t.status_id).map(task => (
                  <DraggableCard
                    key={task.id}
                    task={task}
                    mobile={mobile}
                    users={users}
                    phases={phases}
                    responsibles={responsibles}
                    statuses={statuses}
                    confirmDeleteId={confirmDeleteId}
                    setConfirmDeleteId={setConfirmDeleteId}
                    onDelete={handleDelete}
                    onOpen={setSelectedTask}
                  />
                ))}
              </DroppableColumn>
            )
          )}
        </div>

        <DragOverlay>
          {activeDragId ? (() => {
            const task = tasks.find(t => t.id === activeDragId);
            if (!task) return null;
            return (
              <div className={`bg-white rounded-md border border-slate-200 border-l-4 ${getCardColor(task)} p-1.5 shadow-xl scale-105 max-w-[200px]`}>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded">#{task.task_id}</span>
                </div>
                <p className="text-[11px] leading-snug text-slate-800 font-medium line-clamp-2">{task.task_name || 'Untitled task'}</p>
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>

      {/* Detail modal */}
      {selectedTask && (
        <KanbanTaskDetailModal
          task={selectedTask}
          phases={phases}
          statuses={statuses}
          responsibles={responsibles}
          users={users}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate}
          onUpdateDate={handleUpdateDate}
          onUpdateDays={handleUpdateDays}
          onDelete={handleDelete}
          onStatusChange={(taskId, statusId, source) => statusSync.changeTaskStatus(taskId, statusId, { source })}
          subtaskRefreshNonce={statusSync.subtaskRefresh?.taskMainId === selectedTask.id ? statusSync.subtaskRefresh.nonce : undefined}
        />
      )}

      {statusSync.pendingDownwardSync && (
        <DownwardSyncModal
          newStatusName={statusSync.pendingDownwardSync.newStatusName}
          subtasksToChange={statusSync.pendingDownwardSync.subtasksToChange}
          totalSubtasks={statusSync.pendingDownwardSync.totalSubtasks}
          onConfirm={statusSync.confirmDownwardSync}
          onDismiss={statusSync.dismissDownwardSync}
        />
      )}
    </div>
  );
}
