import { Task, Subtask, Phase, Status, Responsible } from '../types';
import * as XLSX from 'xlsx-js-style';

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

function getAllDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatDateDDMMYYYY(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function exportGanttToExcel(
  tasks: Task[],
  phases: Phase[],
  statuses: Status[],
  responsibles: Responsible[],
  projectName: string
): void {
  const allDates = new Set<string>();
  for (const task of tasks) {
    if (task.start_date && task.end_date) {
      const dates = getAllDatesInRange(task.start_date, task.end_date);
      dates.forEach((d) => allDates.add(d));
    }
  }
  const sortedDates = Array.from(allDates).sort();

  const headers = [
    'Project Name',
    'ID',
    'Sort ID',
    'Task',
    'Phase',
    'Status',
    'Responsible',
    'Start Date',
    'End Date',
    'Dependencies',
    ...sortedDates.map(formatDateDDMMYYYY),
  ];

  const rows: (string | number)[][] = [headers];

  for (const task of tasks) {
    const taskDates = new Set(
      task.start_date && task.end_date ? getAllDatesInRange(task.start_date, task.end_date) : []
    );

    const row: (string | number)[] = [
      projectName,
      task.task_id,
      task.task_sort,
      task.task_name,
      lookupPhase(task.phase_id, phases),
      lookupStatus(task.status_id, statuses),
      lookupResponsible(task.responsible_id, responsibles),
      task.start_date || '',
      task.end_date || '',
      task.depends_on_task_ids ? task.depends_on_task_ids.join(';') : '',
      ...sortedDates.map((date) => (taskDates.has(date) ? task.task_id : '')),
    ];
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const dateColStart = 10;
  const ganttCellStyle = {
    fill: { fgColor: { rgb: 'DEDEDE' } },
    font: { color: { rgb: 'DEDEDE' } },
  };

  for (let rowIdx = 1; rowIdx <= tasks.length; rowIdx++) {
    for (let colIdx = dateColStart; colIdx < dateColStart + sortedDates.length; colIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      const cell = ws[cellRef];
      if (cell && cell.v !== '' && cell.v !== undefined && cell.v !== null) {
        cell.s = ganttCellStyle;
      }
    }
  }

  const colWidths: XLSX.ColInfo[] = [
    { wch: 16 },
    { wch: 5 },
    { wch: 7 },
    { wch: 40 },
    { wch: 20 },
    { wch: 14 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    ...sortedDates.map(() => ({ wch: 12 }) as XLSX.ColInfo),
  ];
  ws['!cols'] = colWidths;

  ws['!freeze'] = { xSplit: 10, ySplit: 1, topLeftCell: 'K2', state: 'frozen' };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Gantt');

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `${projectName}_gantt_${timestamp}.xlsx`);
}
