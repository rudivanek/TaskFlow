import { useState, useEffect, useCallback } from 'react';
import { Task, Phase, Status, Responsible } from '../types';
import { useAuth } from './AuthContext';
import * as taskServices from '../services/taskServices';
import TaskRow from './TaskRow';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';

interface TaskGridProps {
  projectId: string;
  phases: Phase[];
  statuses: Status[];
  responsibles: Responsible[];
}

export default function TaskGrid({ projectId, phases, statuses, responsibles }: TaskGridProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
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

  const handleDelete = async (taskId: string, taskIdNum: number) => {
    const dependents = tasks.filter(t =>
      t.depends_on_task_ids && t.depends_on_task_ids.includes(taskIdNum)
    );
    if (dependents.length > 0) {
      setError(`Cannot delete: tasks ${dependents.map(t => '#' + t.task_id).join(', ')} depend on this task`);
      setTimeout(() => setError(''), 4000);
      return;
    }
    try {
      await taskServices.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = !searchQuery || t.task_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || t.status_id === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <span className="text-xs text-slate-400">{filteredTasks.length} tasks</span>
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
            <tr className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              <th className="w-8 px-1 py-2"></th>
              <th className="w-10 px-2 py-2">ID</th>
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
            {filteredTasks.map(task => (
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
              />
            ))}
          </tbody>
        </table>

        {filteredTasks.length === 0 && !loading && (
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
    </div>
  );
}
