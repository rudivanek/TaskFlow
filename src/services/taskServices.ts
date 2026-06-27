import { supabase } from '../lib/supabase';
import { Task, Subtask, Phase, Status, Responsible } from '../types';
import { calculateEndDate, calculateDays, todayString } from '../utils/dateUtils';

export async function fetchTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks_main')
    .select('*')
    .eq('project_id', projectId)
    .order('task_sort', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createTask(
  projectId: string,
  userId: string,
  taskName: string,
  currentTaskCount: number,
  statusId?: string
): Promise<Task> {
  const { data: nextId, error: rpcError } = await supabase.rpc('get_next_task_id_for_project', {
    project_id_param: projectId,
  });
  if (rpcError) throw rpcError;

  const today = todayString();
  const { data, error } = await supabase
    .from('tasks_main')
    .insert({
      task_id: nextId,
      task_sort: currentTaskCount,
      task_name: taskName,
      start_date: today,
      days: 1,
      end_date: today,
      project_id: projectId,
      user_id: userId,
      ...(statusId ? { status_id: statusId } : {}),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks_main')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks_main').delete().eq('id', taskId);
  if (error) throw error;
}

export async function updateTasksOrder(tasks: { id: string; task_sort: number }[]): Promise<void> {
  for (const t of tasks) {
    await supabase.from('tasks_main').update({ task_sort: t.task_sort }).eq('id', t.id);
  }
}

export async function updateTaskDate(
  taskId: string,
  field: 'start_date' | 'end_date',
  value: string,
  currentTask: Task
): Promise<Task> {
  let updates: Partial<Task>;
  if (field === 'start_date') {
    const newEnd = calculateEndDate(value, currentTask.days);
    updates = { start_date: value, end_date: newEnd };
  } else {
    const newDays = calculateDays(currentTask.start_date, value);
    updates = { end_date: value, days: newDays };
  }
  return updateTask(taskId, updates);
}

export async function updateTaskDays(taskId: string, days: number, startDate: string): Promise<Task> {
  const safeDays = Math.max(0, days);
  const newEnd = calculateEndDate(startDate, safeDays);
  return updateTask(taskId, { days: safeDays, end_date: newEnd });
}

export async function setMultipleDependencies(
  taskId: string,
  dependsOnTaskIds: number[],
  projectId: string
): Promise<Task> {
  const { data, error } = await supabase.rpc('set_multiple_dependencies', {
    p_task_id: taskId,
    p_depends_on_task_ids: dependsOnTaskIds,
    p_project_id: projectId,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function cascadeDependencyDates(taskId: string): Promise<Task[]> {
  const { data, error } = await supabase.rpc('cascade_dependency_dates', {
    p_task_id: taskId,
  });
  if (error) throw error;
  return data || [];
}

// Subtasks
export async function fetchSubtasks(taskMainId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from('tasks_sub')
    .select('*')
    .eq('task_main_id', taskMainId)
    .order('subtask_sort', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createSubtask(taskMainId: string, name: string, currentCount: number): Promise<Subtask> {
  const { data, error } = await supabase
    .from('tasks_sub')
    .insert({
      task_main_id: taskMainId,
      subtask_name: name,
      subtask_sort: currentCount,
      not_started: true,
      doing: false,
      done: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubtask(subtaskId: string, updates: Partial<Subtask>): Promise<void> {
  const { error } = await supabase.from('tasks_sub').update(updates).eq('id', subtaskId);
  if (error) throw error;
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const { error } = await supabase.from('tasks_sub').delete().eq('id', subtaskId);
  if (error) throw error;
}

export async function updateSubtasksOrder(subtasks: { id: string; subtask_sort: number }[]): Promise<void> {
  for (const s of subtasks) {
    await supabase.from('tasks_sub').update({ subtask_sort: s.subtask_sort }).eq('id', s.id);
  }
}

// Lookup tables
export async function fetchPhases(): Promise<Phase[]> {
  const { data, error } = await supabase.from('phases').select('*').order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchStatuses(): Promise<Status[]> {
  const { data, error } = await supabase.from('statuses').select('*').order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function fetchResponsibles(): Promise<Responsible[]> {
  const { data, error } = await supabase.from('responsibles').select('*').order('sort_order');
  if (error) throw error;
  return data || [];
}
