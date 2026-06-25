import { useState, useEffect, useCallback } from 'react';
import { Task, Phase, Status, Responsible } from '../types';
import { useAuth } from './AuthContext';
import * as taskServices from '../services/taskServices';
import KanbanTaskDetailModal from './KanbanTaskDetailModal';
import { isOverdue, isDueToday, isDueSoon, formatDisplayDate } from '../utils/dateUtils';
import { Search, Loader2, MessageSquare, Calendar, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';

interface KanbanBoardProps {
  projectId: string;
  phases: Phase[];
  statuses: Status[];
  responsibles: Responsible[];
}

export default function KanbanBoard({ projectId, phases, statuses, responsibles }: KanbanBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'task_id' | 'task_sort'>('task_sort');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [error, setError] = useState('');

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
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    try {
      const updated = await taskServices.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(updated);
      }
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
      if (selectedTask?.id === taskId) setSelectedTask(updated);
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
      if (selectedTask?.id === taskId) setSelectedTask(updated);
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

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDrop = async (statusId: string) => {
    if (!draggedTaskId) return;
    await handleUpdate(draggedTaskId, { status_id: statusId });
    setDraggedTaskId(null);
  };

  const getCardColor = (task: Task) => {
    if (isOverdue(task.end_date)) return 'border-l-red-400';
    if (isDueToday(task.end_date)) return 'border-l-amber-400';
    if (isDueSoon(task.end_date)) return 'border-l-blue-400';
    return 'border-l-slate-200';
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
      </div>

      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-h-0">
          {(['Not Started', 'Doing', 'Done'] as const)
            .map(name => statuses.find(s => s.status === name))
            .filter((s): s is Status => !!s)
            .map(status => {
            const statusTasks = filteredTasks.filter(t => t.status_id === status.id);

            return (
              <div
                key={status.id}
                className="flex flex-col w-72 min-w-[288px] bg-slate-50 rounded-xl"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(status.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-3">
                  <h3 className="text-sm font-semibold text-slate-700">{status.status}</h3>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {statusTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {statusTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onClick={() => setSelectedTask(task)}
                      className={`bg-white rounded-lg border border-slate-200 border-l-4 ${getCardColor(task)} p-3 cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          #{task.task_id}
                        </span>
                        {task.task_comment && (
                          <MessageSquare className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-slate-800 font-medium line-clamp-2 mb-2">
                        {task.task_name || 'Untitled task'}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.phase_id && (
                          <span className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                            {phases.find(p => p.id === task.phase_id)?.phase}
                          </span>
                        )}
                        {task.responsible_id && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {responsibles.find(r => r.id === task.responsible_id)?.responsible}
                          </span>
                        )}
                      </div>
                      {task.start_date && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDisplayDate(task.start_date)} - {formatDisplayDate(task.end_date)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Unassigned column */}
          {filteredTasks.filter(t => !t.status_id).length > 0 && (
            <div className="flex flex-col w-72 min-w-[288px] bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between px-3 py-3">
                <h3 className="text-sm font-semibold text-slate-400">No Status</h3>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {filteredTasks.filter(t => !t.status_id).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {filteredTasks.filter(t => !t.status_id).map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onClick={() => setSelectedTask(task)}
                    className={`bg-white rounded-lg border border-slate-200 border-l-4 ${getCardColor(task)} p-3 cursor-pointer hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        #{task.task_id}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium line-clamp-2">
                      {task.task_name || 'Untitled task'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedTask && (
        <KanbanTaskDetailModal
          task={selectedTask}
          phases={phases}
          statuses={statuses}
          responsibles={responsibles}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate}
          onUpdateDate={handleUpdateDate}
          onUpdateDays={handleUpdateDays}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
