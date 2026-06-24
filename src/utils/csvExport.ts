import { Task, Subtask, Phase, Status, Responsible } from '../types';

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getSubtaskStatus(s: Subtask): string {
  if (s.done) return 'Done';
  if (s.doing) return 'In Progress';
  return 'Not Started';
}

function lookupPhase(id: string | null, phases: Phase[]): string {
  if (!id) return '';
  return phases.find((p) => p.id === id)?.phase || '';
}

function lookupStatus(id: string | null, statuses: Status[]): string {
  if (!id) return '';
  return statuses.find((s) => s.id === id)?.status || '';
}

function lookupResponsible(id: string | null, responsibles: Responsible[]): string {
  if (!id) return '';
  return responsibles.find((r) => r.id === id)?.responsible || '';
}

function buildTaskRow(task: Task, phases: Phase[], statuses: Status[], responsibles: Responsible[]): string[] {
  return [
    String(task.task_id),
    String(task.task_sort),
    'Task',
    task.task_name,
    lookupPhase(task.phase_id, phases),
    lookupStatus(task.status_id, statuses),
    lookupResponsible(task.responsible_id, responsibles),
    formatDate(task.start_date),
    String(task.days),
    formatDate(task.end_date),
    task.depends_on_task_ids ? task.depends_on_task_ids.join(';') : '',
    task.dependencies_task_ids ? task.dependencies_task_ids.join(';') : '',
    task.task_comment || '',
  ];
}

function buildSubtaskRow(subtask: Subtask, parentTaskId: number): string[] {
  return [
    `${parentTaskId}.${subtask.subtask_sort}`,
    '',
    'Subtask',
    subtask.subtask_name,
    '',
    getSubtaskStatus(subtask),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
}

const CSV_HEADERS = ['ID', 'Sort ID', 'Type', 'Task', 'Phase', 'Status', 'Responsible', 'Start Date', 'Days', 'End Date', 'Depends On', 'Dependencies', 'Comments'];

export function exportTasksCsv(
  tasks: Task[],
  phases: Phase[],
  statuses: Status[],
  responsibles: Responsible[],
  projectName: string
): void {
  const rows: string[][] = [CSV_HEADERS];
  for (const task of tasks) {
    rows.push(buildTaskRow(task, phases, statuses, responsibles));
  }
  downloadCsv(rows, `${projectName}_tasks.csv`);
}

export function exportTasksWithSubtasksCsv(
  tasks: Task[],
  subtasksMap: Map<string, Subtask[]>,
  phases: Phase[],
  statuses: Status[],
  responsibles: Responsible[],
  projectName: string
): void {
  const rows: string[][] = [CSV_HEADERS];
  for (const task of tasks) {
    rows.push(buildTaskRow(task, phases, statuses, responsibles));
    const subtasks = subtasksMap.get(task.id);
    if (subtasks) {
      for (const sub of subtasks) {
        rows.push(buildSubtaskRow(sub, task.task_id));
      }
    }
  }
  downloadCsv(rows, `${projectName}_tasks_with_subtasks.csv`);
}

function downloadCsv(rows: string[][], filename: string): void {
  const csvContent = rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
