import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './components/AuthContext';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import TaskGrid from './components/TaskGrid';
import KanbanBoard from './components/KanbanBoard';
import { Phase, Status, Responsible, Task, Subtask } from './types';
import * as taskServices from './services/taskServices';
import GanttChart from './components/GanttChart';
import ProjectDiscussionPanel from './components/ProjectDiscussionPanel';
import ProjectCommentsModal from './components/ProjectCommentsModal';
import { exportTasksCsv, exportTasksWithSubtasksCsv, exportGanttToExcel } from './utils/csvExport';
import { getUnreadCommentCount } from './utils/unreadComments';
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
  MessageCircle,
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
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [sortField, setSortField] = useState<SortField>('task_sort');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const showDiscussionRef = useRef(showDiscussion);

  useEffect(() => {
    showDiscussionRef.current = showDiscussion;
  }, [showDiscussion]);

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
      getUnreadCommentCount(supabase, selectedProjectId).then(setUnreadCount);
      fetchNoteCount(selectedProjectId);
      setShowDiscussion(false);
      setShowComments(false);
    } else {
      setUnreadCount(0);
      setNoteCount(0);
    }
  }, [selectedProjectId, user]);

  // Realtime subscription — increment unread badge when a new comment arrives from another user
  useEffect(() => {
    if (!selectedProjectId || !user) return;

    const channel = supabase
      .channel(`discussion-${selectedProjectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_comments',
          filter: `project_id=eq.${selectedProjectId}`,
        },
        (payload) => {
          const newUserId = (payload.new as { user_id?: string }).user_id;
          if (newUserId !== user.id && !showDiscussionRef.current) {
            setUnreadCount(prev => prev + 1);
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  async function fetchNoteCount(projectId: string) {
    const { count } = await supabase
      .from('project_notes')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    setNoteCount(count ?? 0);
  }

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
            <div className="w-7 h-7 bg-primary-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-white" />
            </div>
<span className="inline-flex items-end gap-2 text-base font-semibold text-slate-800">
  <span>Task Flow</span>

  <span className="pb-[1px] text-[12px] font-normal tracking-wide text-slate-400">
    V 1.1
  </span>

  <span className="pb-[1px] text-[10px] font-normal tracking-wide text-slate-400">
    Sharpen.Studio
  </span>
</span>
          </div>
          {selectedProjectName && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <span className="text-[13px] font-semibold text-slate-700 truncate max-w-[220px]">{selectedProjectName}</span>
            </div>
          )}
        </div>

        {/* View toggle + actions */}
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

            {/* Comments button */}
            <button
              onClick={() => setShowComments(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Comments
              {noteCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-primary-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
                  {noteCount > 99 ? '99+' : noteCount}
                </span>
              )}
            </button>

            {/* Discussion button — red unread badge */}
            <button
              onClick={() => setShowDiscussion(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Discussion
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
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

      {selectedProjectId && (
        <ProjectDiscussionPanel
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          isOpen={showDiscussion}
          onClose={() => setShowDiscussion(false)}
          onRead={() => setUnreadCount(0)}
        />
      )}

      {selectedProjectId && showComments && (
        <ProjectCommentsModal
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          onClose={() => setShowComments(false)}
          onNoteCountChange={setNoteCount}
        />
      )}
    </div>
  );
}
