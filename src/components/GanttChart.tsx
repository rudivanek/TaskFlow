import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Task, Phase, Status, Responsible } from '../types';
import * as taskServices from '../services/taskServices';
import { parseISO, differenceInCalendarDays, addDays, format } from 'date-fns';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { formatDisplayDate } from '../utils/dateUtils';

interface GanttChartProps {
  projectId: string;
  phases: Phase[];
  statuses: Status[];
  responsibles: Responsible[];
}

type DragMode = 'move' | 'resize-left' | 'resize-right';

interface DragState {
  taskId: string;
  mode: DragMode;
  startMouseX: number;
  originalStartDate: string;
  originalEndDate: string;
  originalDays: number;
}

const DAY_WIDTHS = [20, 32, 48, 64];

export default function GanttChart({ projectId, phases, statuses, responsibles }: GanttChartProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ startDate: string; endDate: string; days: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayWidth = DAY_WIDTHS[zoomLevel];
  const rowHeight = 40;
  const headerHeight = 52;
  const labelWidth = 220;

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

  // Drag handlers
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startMouseX;
      const deltaDays = Math.round(deltaX / dayWidth);

      const origStart = parseISO(dragState.originalStartDate);
      const origEnd = parseISO(dragState.originalEndDate);

      let newStart: Date;
      let newEnd: Date;
      let newDays: number;

      if (dragState.mode === 'move') {
        newStart = addDays(origStart, deltaDays);
        newEnd = addDays(origEnd, deltaDays);
        newDays = dragState.originalDays;
      } else if (dragState.mode === 'resize-left') {
        newStart = addDays(origStart, deltaDays);
        newEnd = origEnd;
        newDays = differenceInCalendarDays(newEnd, newStart) + 1;
        if (newDays < 1) {
          newStart = newEnd;
          newDays = 1;
        }
      } else {
        newStart = origStart;
        newEnd = addDays(origEnd, deltaDays);
        newDays = differenceInCalendarDays(newEnd, newStart) + 1;
        if (newDays < 1) {
          newEnd = newStart;
          newDays = 1;
        }
      }

      setDragPreview({
        startDate: format(newStart, 'yyyy-MM-dd'),
        endDate: format(newEnd, 'yyyy-MM-dd'),
        days: newDays,
      });
    };

    const handleMouseUp = async () => {
      if (dragPreview && dragState) {
        const task = tasks.find(t => t.id === dragState.taskId);
        if (task && (
          dragPreview.startDate !== task.start_date ||
          dragPreview.endDate !== task.end_date
        )) {
          try {
            const updated = await taskServices.updateTask(dragState.taskId, {
              start_date: dragPreview.startDate,
              end_date: dragPreview.endDate,
              days: dragPreview.days,
            });
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

            if (updated.dependencies_task_ids && updated.dependencies_task_ids.length > 0) {
              const cascaded = await taskServices.cascadeDependencyDates(updated.id);
              if (cascaded.length > 0) {
                setTasks(prev => prev.map(t => cascaded.find(c => c.id === t.id) || t));
              }
            }
          } catch (err) {
            console.error('Failed to update task:', err);
            await loadTasks();
          }
        }
      }
      setDragState(null);
      setDragPreview(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, dragPreview, dayWidth, tasks, loadTasks]);

  const handleBarMouseDown = (e: React.MouseEvent, task: Task, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      taskId: task.id,
      mode,
      startMouseX: e.clientX,
      originalStartDate: task.start_date,
      originalEndDate: task.end_date,
      originalDays: task.days,
    });
    setDragPreview({
      startDate: task.start_date,
      endDate: task.end_date,
      days: task.days,
    });
  };

  const { minDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return { minDate: today, maxDate: addDays(today, 30), totalDays: 30 };
    }
    let min = parseISO(tasks[0].start_date);
    let max = parseISO(tasks[0].end_date);
    for (const t of tasks) {
      const s = parseISO(t.start_date);
      const e = parseISO(t.end_date);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    min = addDays(min, -2);
    max = addDays(max, 5);
    return { minDate: min, maxDate: max, totalDays: differenceInCalendarDays(max, min) + 1 };
  }, [tasks]);

  const getBarX = (dateStr: string) => {
    return differenceInCalendarDays(parseISO(dateStr), minDate) * dayWidth;
  };

  const getBarWidth = (startStr: string, endStr: string) => {
    const days = differenceInCalendarDays(parseISO(endStr), parseISO(startStr)) + 1;
    return Math.max(days * dayWidth, dayWidth);
  };

  const getStatusColor = (statusId: string | null) => {
    if (!statusId) return { bar: '#94a3b8', bg: '#f1f5f9' };
    const status = statuses.find(s => s.id === statusId);
    if (!status) return { bar: '#94a3b8', bg: '#f1f5f9' };
    switch (status.status.toLowerCase()) {
      case 'done': return { bar: '#22c55e', bg: '#dcfce7' };
      case 'in progress': return { bar: '#3b82f6', bg: '#dbeafe' };
      case 'in review': return { bar: '#8b5cf6', bg: '#ede9fe' };
      case 'blocked': return { bar: '#ef4444', bg: '#fee2e2' };
      default: return { bar: '#94a3b8', bg: '#f1f5f9' };
    }
  };

  const dateHeaders = useMemo(() => {
    const headers: { date: Date; label: string; isWeekStart: boolean; isToday: boolean }[] = [];
    const today = format(new Date(), 'yyyy-MM-dd');
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(minDate, i);
      headers.push({
        date,
        label: format(date, 'd'),
        isWeekStart: date.getDay() === 1,
        isToday: format(date, 'yyyy-MM-dd') === today,
      });
    }
    return headers;
  }, [minDate, totalDays]);

  const monthHeaders = useMemo(() => {
    const months: { label: string; startX: number; width: number }[] = [];
    let currentMonth = '';
    let startIdx = 0;
    for (let i = 0; i < dateHeaders.length; i++) {
      const monthLabel = format(dateHeaders[i].date, 'MMM yyyy');
      if (monthLabel !== currentMonth) {
        if (currentMonth) {
          months.push({ label: currentMonth, startX: startIdx * dayWidth, width: (i - startIdx) * dayWidth });
        }
        currentMonth = monthLabel;
        startIdx = i;
      }
    }
    if (currentMonth) {
      months.push({ label: currentMonth, startX: startIdx * dayWidth, width: (dateHeaders.length - startIdx) * dayWidth });
    }
    return months;
  }, [dateHeaders, dayWidth]);

  const getDependencyPaths = () => {
    const paths: { from: Task; to: Task; path: string }[] = [];
    for (const task of tasks) {
      if (!task.depends_on_task_ids || task.depends_on_task_ids.length === 0) continue;
      const toIdx = tasks.indexOf(task);
      const toY = toIdx * rowHeight + rowHeight / 2;

      const toStartDate = dragState?.taskId === task.id && dragPreview ? dragPreview.startDate : task.start_date;
      const toX = getBarX(toStartDate);

      for (const depId of task.depends_on_task_ids) {
        const fromTask = tasks.find(t => t.task_id === depId);
        if (!fromTask) continue;
        const fromIdx = tasks.indexOf(fromTask);
        const fromY = fromIdx * rowHeight + rowHeight / 2;

        const fromEndDate = dragState?.taskId === fromTask.id && dragPreview ? dragPreview.endDate : fromTask.end_date;
        const fromX = getBarX(fromEndDate) + dayWidth;

        const midX = fromX + 10;
        const path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX - 4} ${toY}`;
        paths.push({ from: fromTask, to: task, path });
      }
    }
    return paths;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  const chartWidth = totalDays * dayWidth;
  const chartHeight = tasks.length * rowHeight;
  const depPaths = getDependencyPaths();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <span className="text-sm text-slate-600 font-medium">{tasks.length} tasks</span>
        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-200 border border-slate-400"></span>
            Drag edges to resize
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 border border-dashed border-slate-400"></span>
            Drag center to move
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setZoomLevel(Math.max(0, zoomLevel - 1))}
            disabled={zoomLevel === 0}
            className="p-1.5 hover:bg-slate-100 rounded-md disabled:opacity-30 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs text-slate-400 w-8 text-center">{Math.round((dayWidth / 32) * 100)}%</span>
          <button
            onClick={() => setZoomLevel(Math.min(DAY_WIDTHS.length - 1, zoomLevel + 1))}
            disabled={zoomLevel === DAY_WIDTHS.length - 1}
            className="p-1.5 hover:bg-slate-100 rounded-md disabled:opacity-30 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Drag info tooltip */}
      {dragState && dragPreview && (
        <div className="absolute top-16 right-4 z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          <div className="font-medium">{dragState.mode === 'move' ? 'Moving' : 'Resizing'}</div>
          <div className="text-slate-300 mt-0.5">
            {formatDisplayDate(dragPreview.startDate)} to {formatDisplayDate(dragPreview.endDate)} ({dragPreview.days}d)
          </div>
        </div>
      )}

      {/* Chart area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task labels (fixed) */}
        <div className="flex-shrink-0 border-r border-slate-200 bg-white z-20" style={{ width: labelWidth }}>
          <div className="h-[52px] border-b border-slate-200 flex items-end px-3 pb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Task</span>
          </div>
          <div className="overflow-hidden">
            {tasks.map((task) => {
              const color = getStatusColor(task.status_id);
              const isDragging = dragState?.taskId === task.id;
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-2 px-3 border-b border-slate-50 transition-colors ${
                    hoveredTaskId === task.id || isDragging ? 'bg-primary-50/50' : ''
                  }`}
                  style={{ height: rowHeight }}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                >
                  <span className="text-xs font-mono text-slate-400 w-6">#{task.task_id}</span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color.bar }} />
                  <span className="text-sm text-slate-700 truncate">{task.task_name || 'Untitled'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline (scrollable) */}
        <div ref={scrollRef} className="flex-1 overflow-auto" style={{ cursor: dragState ? (dragState.mode === 'move' ? 'grabbing' : 'col-resize') : undefined }}>
          <div style={{ width: chartWidth, minWidth: '100%' }}>
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200" style={{ height: headerHeight }}>
              {/* Month row */}
              <div className="flex h-6 border-b border-slate-100">
                {monthHeaders.map((m, i) => (
                  <div
                    key={i}
                    className="text-xs font-medium text-slate-500 px-2 flex items-center border-r border-slate-100"
                    style={{ width: m.width, marginLeft: i === 0 ? m.startX : 0 }}
                  >
                    {m.width > 50 && m.label}
                  </div>
                ))}
              </div>
              {/* Day row */}
              <div className="flex h-[26px]">
                {dateHeaders.map((h, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-center text-xs flex-shrink-0 border-r border-slate-50 ${
                      h.isToday ? 'bg-primary-50 text-primary-700 font-semibold' :
                      h.isWeekStart ? 'text-slate-500' : 'text-slate-400'
                    }`}
                    style={{ width: dayWidth }}
                  >
                    {dayWidth >= 28 && h.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Chart body */}
            <div className="relative select-none" style={{ height: chartHeight }}>
              {/* Grid lines */}
              <svg className="absolute inset-0 pointer-events-none" width={chartWidth} height={chartHeight}>
                {dateHeaders.map((h, i) => h.isToday && (
                  <line
                    key={`today-${i}`}
                    x1={i * dayWidth + dayWidth / 2}
                    y1={0}
                    x2={i * dayWidth + dayWidth / 2}
                    y2={chartHeight}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    opacity={0.4}
                  />
                ))}
                {dateHeaders.map((h, i) => h.isWeekStart && (
                  <line
                    key={`week-${i}`}
                    x1={i * dayWidth}
                    y1={0}
                    x2={i * dayWidth}
                    y2={chartHeight}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                ))}
              </svg>

              {/* Row backgrounds */}
              {tasks.map((task, idx) => (
                <div
                  key={`row-${task.id}`}
                  className={`absolute left-0 right-0 border-b border-slate-50 transition-colors ${
                    hoveredTaskId === task.id || dragState?.taskId === task.id ? 'bg-primary-50/30' : ''
                  }`}
                  style={{ top: idx * rowHeight, height: rowHeight }}
                  onMouseEnter={() => !dragState && setHoveredTaskId(task.id)}
                  onMouseLeave={() => !dragState && setHoveredTaskId(null)}
                />
              ))}

              {/* Dependency arrows */}
              <svg className="absolute inset-0 pointer-events-none" width={chartWidth} height={chartHeight}>
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#94a3b8" />
                  </marker>
                  <marker id="arrowhead-active" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" />
                  </marker>
                </defs>
                {depPaths.map((dep, i) => {
                  const isHighlighted = hoveredTaskId === dep.from.id || hoveredTaskId === dep.to.id ||
                    dragState?.taskId === dep.from.id || dragState?.taskId === dep.to.id;
                  return (
                    <path
                      key={i}
                      d={dep.path}
                      fill="none"
                      stroke={isHighlighted ? '#3b82f6' : '#94a3b8'}
                      strokeWidth={isHighlighted ? 2 : 1.5}
                      markerEnd={isHighlighted ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                      opacity={isHighlighted ? 1 : 0.5}
                      className="transition-all duration-150"
                    />
                  );
                })}
              </svg>

              {/* Task bars */}
              {tasks.map((task, idx) => {
                const isDragging = dragState?.taskId === task.id;
                const startDate = isDragging && dragPreview ? dragPreview.startDate : task.start_date;
                const endDate = isDragging && dragPreview ? dragPreview.endDate : task.end_date;

                const x = getBarX(startDate);
                const width = getBarWidth(startDate, endDate);
                const y = idx * rowHeight + 8;
                const barHeight = rowHeight - 16;
                const color = getStatusColor(task.status_id);
                const isHovered = hoveredTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className={`absolute group/bar transition-shadow duration-150 ${
                      isDragging ? 'z-30 shadow-lg' : isHovered ? 'z-20 shadow-md' : 'z-10 shadow-sm'
                    }`}
                    style={{ left: x, top: y, width, height: barHeight }}
                    onMouseEnter={() => !dragState && setHoveredTaskId(task.id)}
                    onMouseLeave={() => !dragState && setHoveredTaskId(null)}
                  >
                    {/* Left resize handle */}
                    <div
                      onMouseDown={(e) => handleBarMouseDown(e, task, 'resize-left')}
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group/handle"
                    >
                      <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-full transition-all ${
                        isHovered || isDragging ? 'bg-slate-500/60' : 'bg-transparent'
                      }`} />
                    </div>

                    {/* Bar body (drag to move) */}
                    <div
                      onMouseDown={(e) => handleBarMouseDown(e, task, 'move')}
                      className={`absolute inset-0 rounded-md border-[1.5px] cursor-grab active:cursor-grabbing transition-all duration-150 ${
                        isDragging ? 'ring-2 ring-primary-400/50' : ''
                      }`}
                      style={{
                        backgroundColor: color.bg,
                        borderColor: color.bar,
                      }}
                      title={`#${task.task_id} ${task.task_name}\n${startDate} to ${endDate} (${isDragging && dragPreview ? dragPreview.days : task.days}d)\nDrag to move, edges to resize`}
                    >
                      {/* Progress fill */}
                      <div
                        className="absolute inset-0 rounded-[4px] opacity-20"
                        style={{ backgroundColor: color.bar }}
                      />
                      {/* Label */}
                      {width > 60 && (
                        <span
                          className="absolute inset-0 flex items-center px-3 text-xs font-medium truncate pointer-events-none"
                          style={{ color: color.bar }}
                        >
                          {task.task_name}
                        </span>
                      )}
                    </div>

                    {/* Right resize handle */}
                    <div
                      onMouseDown={(e) => handleBarMouseDown(e, task, 'resize-right')}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10"
                    >
                      <div className={`absolute right-0 top-1 bottom-1 w-1 rounded-full transition-all ${
                        isHovered || isDragging ? 'bg-slate-500/60' : 'bg-transparent'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
