import { useState, useEffect, useCallback } from 'react';
import { Task, Phase, Status, Responsible } from '../types';
import { useAuth } from './AuthContext';
import * as taskServices from '../services/taskServices';
import TaskRow from './TaskRow';
import { Plus, Search, Filter, Loader2, ChevronsUpDown, ChevronUp, ChevronDown, AlertTriangle, X } from 'lucide-react';

type SortField = 'task_id' | 'task_sort';
type SortDir = 'asc' | 'desc';

interface TaskGridProps {
  projectId: string;
  phases: Phase[];
  statuses: Status[];
  responsibles: Responsible[];
}

interface PendingDelete {
  taskId: string;
  taskIdNum: number;
  dependents: Task[];
}

export default function TaskGrid({ projectId, phases, statuses, responsibles }: TaskGridProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('task_sort');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<number[]>([]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        handleCreateTask();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tasks, projectId]);

  const handleCreateTask = async () => {
    if (!user) return;
    try {
      const newTask = await taskServices.createTask(projectId, user.id, '', tasks.length);
      setTasks([...tasks, newTask]);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdate = async (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    try {
      const updated = await taskServices.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      if (updates.start_date || updates.end_date || updates.days) {
        const task = tasks.find(t => t.id === taskId);
        if (task?.dependencies_task_ids && task.dependencies_task_ids.length > 0) {
          const cascaded = await taskServices.cascadeDependencyDates(taskId);
          if (cascaded.length > 0) {
            setTasks(prev => prev.map(t => {
              const c = cascaded.find(ct => ct.id === t.id);
              return c || t;
            }));
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
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
      if (updated.dependencies_task_ids && updated.dependencies_task_ids.length > 0) {
        const cascaded = await taskServices.cascadeDependencyDates(taskId);
        if (cascaded.length > 0) {
          setTasks(prev => prev.map(t => {
            const c = cascaded.find(ct => ct.id === t.id);
            return c || t;
          }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update date');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateDays = async (taskId: string, days: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      const updated = await taskServices.updateTaskDays(taskId, days, task.start_date);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      if (updated.dependencies_task_ids && updated.dependencies_task_ids.length > 0) {
        const cascaded = await taskServices.cascadeDependencyDates(taskId);
        if (cascaded.length > 0) {
          setTasks(prev => prev.map(t => {
            const c = cascaded.find(ct => ct.id === t.id);
            return c || t;
          }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update days');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateDependencies = async (taskId: string, depsString: string) => {
    const cleaned = depsString.replace(/#/g, '').trim();
    const ids = cleaned
      ? cleaned.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      : [];

    try {
      const updated = await taskServices.setMultipleDependencies(taskId, ids, projectId);
      if (updated) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
      }
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to set dependencies');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = (taskId: string, taskIdNum: number) => {
    const dependents = tasks.filter(t =>
      t.depends_on_task_ids && t.depends_on_task_ids.includes(taskIdNum)
    );
    setPendingDelete({ taskId, taskIdNum, dependents });
  };

  const execDelete = async (taskId: string) => {
    try {
      await taskServices.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleForceDelete = async () => {
    if (!pendingDelete) return;
    const { taskId, taskIdNum, dependents } = pendingDelete;
    setPendingDelete(null);
    try {
      for (const dep of dependents) {
        const filtered = (dep.depends_on_task_ids || []).filter(id => id !== taskIdNum);
        await taskServices.setMultipleDependencies(dep.id, filtered, projectId);
      }
      await execDelete(taskId);
      await loadTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
      setTimeout(() => setError(''), 3000);
    }
  };

  const dragEnabled = sortField === 'task_sort' && sortDir === 'asc';

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (taskId !== draggedId) setDragOverId(taskId);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = sortedTasks.findIndex(t => t.id === draggedId);
    const toIdx = sortedTasks.findIndex(t => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...sortedTasks];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updates = reordered.map((t, i) => ({ id: t.id, task_sort: i }));
    setTasks(prev =>
      prev.map(t => {
        const u = updates.find(u => u.id === t.id);
        return u ? { ...t, task_sort: u.task_sort } : t;
      })
    );
    setDraggedId(null);
    setDragOverId(null);
    try {
      await taskServices.updateTasksOrder(updates);
    } catch (err: any) {
      setError(err.message || 'Failed to save order');
      setTimeout(() => setError(''), 3000);
      await loadTasks();
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = !searchQuery || t.task_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || t.status_id === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const av = a[sortField] ?? 0;
    const bv = b[sortField] ?? 0;
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 ml-1 text-slate-600" />
      : <ChevronDown className="w-3 h-3 ml-1 text-slate-600" />;
  }

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
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5"
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{s.status}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-400">{sortedTasks.length} tasks</span>
          <button
            onClick={handleCreateTask}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              <th className="w-8 px-1 py-2"></th>
              <th className="w-10 px-2 py-2">
                <button onClick={() => handleSort('task_id')} className="flex items-center hover:text-slate-700">
                  ID <SortIcon field="task_id" />
                </button>
              </th>
              <th className="w-14 px-2 py-2">
                <button onClick={() => handleSort('task_sort')} className="flex items-center hover:text-slate-700" title="Sort by order. When active, drag rows to reorder.">
                  Sort <SortIcon field="task_sort" />
                </button>
              </th>
              <th className="px-2 py-2">Task Name</th>
              <th className="w-[120px] px-1 py-2">Phase</th>
              <th className="w-[120px] px-1 py-2">Status</th>
              <th className="w-[120px] px-1 py-2">Responsible</th>
              <th className="w-[110px] px-1 py-2">Start</th>
              <th className="w-[50px] px-1 py-2">Days</th>
              <th className="w-[110px] px-1 py-2">End</th>
              <th className="w-[100px] px-1 py-2">Depends On</th>
              <th className="w-[60px] px-1 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                phases={phases}
                statuses={statuses}
                responsibles={responsibles}
                allTasks={tasks}
                onUpdate={handleUpdate}
                onUpdateDate={handleUpdateDate}
                onUpdateDays={handleUpdateDays}
                onUpdateDependencies={handleUpdateDependencies}
                onDelete={handleDelete}
                onDepsHover={setHighlightedTaskIds}
                isHighlighted={highlightedTaskIds.includes(task.task_id)}
                isDragging={draggedId === task.id}
                isDragOver={dragOverId === task.id}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDrop={(e) => handleDrop(e, task.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </tbody>
        </table>

        {sortedTasks.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <p className="text-sm">No tasks yet</p>
            <button
              onClick={handleCreateTask}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first task
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setPendingDelete(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-800">Delete task</h3>
                {pendingDelete.dependents.length === 0 ? (
                  <p className="text-sm text-slate-500 mt-1">
                    This will permanently delete the task and all its subtasks. This cannot be undone.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-slate-500 mt-1">
                      The following {pendingDelete.dependents.length === 1 ? 'task depends' : 'tasks depend'} on this task:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pendingDelete.dependents.map(t => (
                        <span key={t.id} className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-mono text-slate-600">
                          #{t.task_id}{t.task_name ? ` — ${t.task_name}` : ''}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500 mt-3">
                      Deleting will remove these dependency links. The dependent tasks will remain.
                    </p>
                  </>
                )}
              </div>
              <button onClick={() => setPendingDelete(null)} className="flex-shrink-0 p-1 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForceDelete}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
