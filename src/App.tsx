import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './components/AuthContext';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import TaskGrid from './components/TaskGrid';
import KanbanBoard from './components/KanbanBoard';
import { Phase, Status, Responsible, Task, Subtask } from './types';
import * as taskServices from './services/taskServices';
import GanttChart from './components/GanttChart';
import ProjectCommentsModal from './components/ProjectCommentsModal';
import { exportTasksCsv, exportTasksWithSubtasksCsv, exportGanttToExcel } from './utils/csvExport';
import { supabase } from './lib/supabase';
import {
  CheckSquare,
  LayoutGrid,
  Kanban,
  GanttChartSquare,
  LogOut,
  User,
  Loader2,
  ChevronDown,
  Download,
  MessageSquare,
} from 'lucide-react';

type ViewMode = 'grid' | 'kanban' | 'gantt';
type SortField = 'task_id' | 'task_sort';
type SortDir = 'asc' | 'desc';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('project') || localStorage.getItem('last-project-id');
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('view') as ViewMode) || 'grid';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [sortField, setSortField] = useState<SortField>('task_sort');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    if (user) loadLookups();
  }, [user]);

  useEffect(() => {
    if (selectedProjectId && user) {
      supabase.from('projects').select('project').eq('id', selectedProjectId).single().then(({ data }) => {
        if (data) setSelectedProjectName(data.project);
      });
    }
  }, [selectedProjectId, user]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedProjectId) {
      params.set('project', selectedProjectId);
      localStorage.setItem('last-project-id', selectedProjectId);
    } else {
      localStorage.removeItem('last-project-id');
    }
    params.set('view', viewMode);
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [selectedProjectId, viewMode]);

  const loadLookups = async () => {
    try {
      const [p, s, r] = await Promise.all([
        taskServices.fetchPhases(),
        taskServices.fetchStatuses(),
        taskServices.fetchResponsibles(),
      ]);
      setPhases(p);
      setStatuses(s);
      setResponsibles(r);
    } catch (err) {
      console.error('Failed to load lookups:', err);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleExportTasks = useCallback(async () => {
    if (!selectedProjectId) return;
    setShowExportMenu(false);
    const tasks = await taskServices.fetchTasks(selectedProjectId);
    exportTasksCsv(tasks, phases, statuses, responsibles, selectedProjectName || 'project');
  }, [selectedProjectId, phases, statuses, responsibles, selectedProjectName]);

  const handleExportTasksWithSubtasks = useCallback(async () => {
    if (!selectedProjectId) return;
    setShowExportMenu(false);
    const tasks = await taskServices.fetchTasks(selectedProjectId);
    const subtasksMap = new Map<string, Subtask[]>();
    await Promise.all(
      tasks.map(async (task: Task) => {
        const subs = await taskServices.fetchSubtasks(task.id);
        if (subs.length > 0) subtasksMap.set(task.id, subs);
      })
    );
    exportTasksWithSubtasksCsv(tasks, subtasksMap, phases, statuses, responsibles, selectedProjectName || 'project');
  }, [selectedProjectId, phases, statuses, responsibles, selectedProjectName]);

  const handleExportGantt = useCallback(async () => {
    if (!selectedProjectId) return;
    setShowExportMenu(false);
    const tasks = await taskServices.fetchTasks(selectedProjectId);
    exportGanttToExcel(tasks, phases, statuses, responsibles, selectedProjectName || 'project');
  }, [selectedProjectId, phases, statuses, responsibles, selectedProjectName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
<span className="text-base font-semibold text-slate-800">
  Task Flow

      <span className="text-[12px] tracking-wide align-super">
         V 1.1
    </span>
  <span className="ml-2 text-xs font-normal text-slate-400">
    Powered by{" "}
    <span className="text-[17px] tracking-wide align-super">
      Sharpen.Studio
    </span>

  </span>
</span>
          </div>
        </div>

        {/* View toggle */}
        {selectedProjectId && (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Kanban className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'gantt'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <GanttChartSquare className="w-4 h-4" />
                Gantt
              </button>
            </div>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                    <button
                      onClick={handleExportTasks}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      Main Tasks to CSV
                    </button>
                    <button
                      onClick={handleExportTasksWithSubtasks}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      Tasks with Subtasks to CSV
                    </button>
                    <button
                      onClick={handleExportGantt}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      Export Gantt (Excel)
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Comments */}
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Comments
            </button>
          </div>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <span className="text-sm text-slate-600 hidden sm:inline">{user.email}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm text-slate-700 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => { signOut(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 overflow-hidden bg-white">
          {!selectedProjectId ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <LayoutGrid className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">Select a project</p>
              <p className="text-sm mt-1">Choose a project from the sidebar to get started</p>
            </div>
          ) : lookupLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : viewMode === 'grid' ? (
            <TaskGrid
              key={selectedProjectId}
              projectId={selectedProjectId}
              phases={phases}
              statuses={statuses}
              responsibles={responsibles}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              key={selectedProjectId}
              projectId={selectedProjectId}
              phases={phases}
              statuses={statuses}
              responsibles={responsibles}
            />
          ) : (
            <GanttChart
              key={selectedProjectId}
              projectId={selectedProjectId}
              phases={phases}
              statuses={statuses}
              responsibles={responsibles}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
        </main>
      </div>

      {showComments && selectedProjectId && (
        <ProjectCommentsModal
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
