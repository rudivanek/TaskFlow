import { useState, useCallback, useRef } from 'react';
import { Task, Subtask, Status } from '../types';
import * as taskServices from '../services/taskServices';
import { DownwardSubtaskInfo } from '../components/DownwardSyncModal';

interface StatusSyncOptions {
  tasks: Task[];
  statuses: Status[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setError: (msg: string) => void;
  setSelectedTask?: React.Dispatch<React.SetStateAction<Task | null>>;
  onSubtaskStatusSuggested?: (taskId: string, suggestedStatusName: string) => void;
}

export interface PendingDownwardSync {
  taskId: string;
  newStatusId: string | null;
  newStatusName: string;
  subtasksToChange: DownwardSubtaskInfo[];
  totalSubtasks: number;
}

export function useStatusSync({
  tasks,
  statuses,
  setTasks,
  setError,
  setSelectedTask,
}: StatusSyncOptions) {
  const [pendingDownwardSync, setPendingDownwardSync] = useState<PendingDownwardSync | null>(null);
  const [syncingTaskIds, setSyncingTaskIds] = useState<Set<string>>(new Set());
  const subtaskCacheRef = useRef<Map<string, Subtask[]>>(new Map());

  const getStatusName = useCallback((statusId: string | null | undefined): string | null => {
    if (!statusId) return null;
    return statuses.find(s => s.id === statusId)?.status ?? null;
  }, [statuses]);

  const findStatusByName = useCallback((name: string): Status | undefined => {
    return statuses.find(s => s.status.toLowerCase() === name.toLowerCase());
  }, [statuses]);

  const getSubtaskStatusName = (sub: Subtask): string => {
    if (sub.done) return 'Done';
    if (sub.doing) return 'Doing';
    return 'Not Started';
  };

  const changeTaskStatus = useCallback(async (
    taskId: string,
    newStatusId: string | null,
    opts?: { source?: 'user' | 'sync' }
  ) => {
    const source = opts?.source ?? 'user';

    // Block if a modal is already open for this task tree
    if (source === 'user' && pendingDownwardSync) return;
    if (source === 'user' && syncingTaskIds.has(taskId)) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // No change needed
    if (task.status_id === newStatusId) return;

    // Save main task status right away (optimistic)
    const updates: Partial<Task> = { status_id: newStatusId };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    if (setSelectedTask) {
      setSelectedTask(prev => (prev && prev.id === taskId ? { ...prev, ...updates } : prev));
    }

    try {
      const updated = await taskServices.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      if (setSelectedTask) {
        setSelectedTask(prev => (prev && prev.id === taskId ? updated : prev));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status_id: task.status_id } : t));
      if (setSelectedTask) {
        setSelectedTask(prev => (prev && prev.id === taskId ? { ...prev, status_id: task.status_id } : prev));
      }
      return;
    }

    // Downward sync: only for user-initiated changes
    if (source !== 'user') return;

    // Fetch subtasks
    let subtasks: Subtask[] = [];
    try {
      subtasks = await taskServices.fetchSubtasks(taskId);
      subtaskCacheRef.current.set(taskId, subtasks);
    } catch {
      return;
    }

    if (subtasks.length === 0) return;

    const newStatusName = newStatusId ? getStatusName(newStatusId) : null;
    if (!newStatusName) return;

    // Check which subtasks differ
    const toChange: DownwardSubtaskInfo[] = [];
    for (const sub of subtasks) {
      const subStatusName = getSubtaskStatusName(sub);
      if (subStatusName.toLowerCase() !== newStatusName.toLowerCase()) {
        toChange.push({
          id: sub.id,
          subtask_name: sub.subtask_name,
          currentStatusName: subStatusName,
        });
      }
    }

    if (toChange.length === 0) return;

    setPendingDownwardSync({
      taskId,
      newStatusId,
      newStatusName,
      subtasksToChange: toChange,
      totalSubtasks: subtasks.length,
    });
  }, [tasks, statuses, pendingDownwardSync, syncingTaskIds, getStatusName, setTasks, setSelectedTask, setError]);

  const confirmDownwardSync = useCallback(async () => {
    if (!pendingDownwardSync) return;
    const { taskId, newStatusId, newStatusName, subtasksToChange } = pendingDownwardSync;
    setPendingDownwardSync(null);

    setSyncingTaskIds(prev => new Set(prev).add(taskId));

    const ids = subtasksToChange.map(s => s.id);
    try {
      await taskServices.batchUpdateSubtaskStatus(ids, newStatusName);
      // Update cache
      const cached = subtaskCacheRef.current.get(taskId) ?? [];
      const updated = cached.map(s => {
        if (ids.includes(s.id)) {
          const lower = newStatusName.toLowerCase();
          if (lower === 'done') return { ...s, not_started: false, doing: false, done: true };
          if (lower === 'doing' || lower === 'in progress') return { ...s, not_started: false, doing: true, done: false };
          return { ...s, not_started: true, doing: false, done: false };
        }
        return s;
      });
      subtaskCacheRef.current.set(taskId, updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update subtasks');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSyncingTaskIds(prev => { const n = new Set(prev); n.delete(taskId); return n; });
    }
  }, [pendingDownwardSync, setError]);

  const dismissDownwardSync = useCallback(() => {
    setPendingDownwardSync(null);
  }, []);

  // Upward sync: called by SubtaskList after a subtask toggle
  // Returns the suggested status name for the parent, or null if no suggestion
  const evaluateUpwardSync = useCallback((subtasks: Subtask[]): string | null => {
    if (subtasks.length === 0) return null;
    const allDone = subtasks.every(s => s.done);
    const allNotStarted = subtasks.every(s => s.not_started);
    if (allDone) return 'Done';
    if (allNotStarted) return 'Not Started';
    // Check if all subtasks share the same non-mixed status
    const statuses = subtasks.map(s => getSubtaskStatusName(s));
    const unique = [...new Set(statuses.map(s => s.toLowerCase()))];
    if (unique.length === 1) {
      const name = statuses[0];
      // Only suggest if it's not "Not Started" (already handled) or "Done" (already handled)
      const lower = name.toLowerCase();
      if (lower !== 'not started' && lower !== 'done') {
        return name;
      }
    }
    // Mixed → suggest Doing
    return 'Doing';
  }, []);

  // Apply upward sync: change parent task status with source: 'sync'
  const applyUpwardSync = useCallback(async (
    taskId: string,
    suggestedStatusName: string,
    currentStatusName: string | null
  ) => {
    if (currentStatusName && currentStatusName.toLowerCase() === suggestedStatusName.toLowerCase()) return;
    const targetStatus = findStatusByName(suggestedStatusName);
    if (!targetStatus) return;
    await changeTaskStatus(taskId, targetStatus.id, { source: 'sync' });
  }, [findStatusByName, changeTaskStatus]);

  return {
    changeTaskStatus,
    pendingDownwardSync,
    confirmDownwardSync,
    dismissDownwardSync,
    syncingTaskIds,
    evaluateUpwardSync,
    applyUpwardSync,
    getSubtaskStatusName,
  };
}
