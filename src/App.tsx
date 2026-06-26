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
import { ChatPage } from './components/chat/ChatPage';
import { RemindersPanel } from './components/RemindersPanel';
import { exportTasksCsv, exportTasksWithSubtasksCsv, exportGanttToExcel } from './utils/csvExport';
import { getUnreadCountsByProjects } from './utils/unreadComments';
import { useNotificationSound } from './utils/useNotificationSound';
import { usePushNotifications } from './utils/usePushNotifications';
import { isStandalonePWA } from './utils/isPWA';
import { UnreadChatsModal } from './components/chat/UnreadChatsModal';
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
  MessagesSquare,
} from 'lucide-react';

type ViewMode = 'grid' | 'kanban' | 'gantt';
type SortField = 'task_id' | 'task_sort';
type SortDir = 'asc' | 'desc';

export default function App() {
  const { user, loading, signOut } = useAuth();
  const { updateSoundEnabled, playChime } = useNotificationSound();
  const { isSubscribed: pushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();
  const [soundEnabled, setSoundEnabled] = useState(true);
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
  const [unreadByProject, setUnreadByProject] = useState<Record<string, number>>({});
  const [totalCommentCount, setTotalCommentCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [sortField, setSortField] = useState<SortField>('task_sort');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Chat
  const [chatMode, setChatMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('page') === 'chat' || window.location.pathname === '/chat';
  });
  const [totalChatUnread, setTotalChatUnread] = useState(0);
  const [includeInChat, setIncludeInChat] = useState(false);
  const [showUnreadModal, setShowUnreadModal] = useState(false);
  const [pwaSelectedChannelId, setPwaSelectedChannelId] = useState<string | null>(null);
  const [pwaSelectedConversationId, setPwaSelectedConversationId] = useState<string | null>(null);
  const standalone = isStandalonePWA();

  const showDiscussionRef = useRef(showDiscussion);
  const selectedProjectIdRef = useRef(selectedProjectId);
  const chatModeRef = useRef(chatMode);

  const unreadCount = unreadByProject[selectedProjectId ?? ''] ?? 0;

  useEffect(() => { showDiscussionRef.current = showDiscussion; }, [showDiscussion]);
  useEffect(() => { selectedProjectIdRef.current = selectedProjectId; }, [selectedProjectId]);
  useEffect(() => { chatModeRef.current = chatMode; }, [chatMode]);

  // Handle notification click from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        setChatMode(true);
        setTotalChatUnread(0);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    if (user) {
      loadLookups();
      supabase.from('profiles').select('sound_enabled').eq('id', user.id).single().then(({ data }) => {
        if (data) { setSoundEnabled(data.sound_enabled); updateSoundEnabled(data.sound_enabled); }
      });
    }
  }, [user]);

  useEffect(() => {
    if (selectedProjectId && user) {
      supabase.from('projects').select('project, include_in_chat').eq('id', selectedProjectId).single().then(({ data }) => {
        if (data) {
          setSelectedProjectName(data.project);
          setIncludeInChat(data.include_in_chat ?? false);
        }
      });
      fetchTotalCommentCount(selectedProjectId);
      fetchNoteCount(selectedProjectId);
      setShowDiscussion(false);
      setShowComments(false);
    } else {
      setTotalCommentCount(0);
      setNoteCount(0);
    }
  }, [selectedProjectId, user]);

  const handleProjectsLoaded = useCallback((projectIds: string[]) => {
    if (!user || projectIds.length === 0) return;
    getUnreadCountsByProjects(supabase, projectIds).then(counts => {
      setUnreadByProject(counts);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('global-discussion-comments')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_comments' },
        (payload) => {
          const c = payload.new as {
            project_id: string;
            user_id?: string;
            notify_all?: boolean;
            notified_user_ids?: string[];
          };
          const isOwn = c.user_id === user.id;
          const isForMe = c.notify_all !== false || (c.notified_user_ids ?? []).includes(user.id);
          const isCurrent = c.project_id === selectedProjectIdRef.current;
          if (isCurrent) setTotalCommentCount(prev => prev + 1);
          if (!isOwn && isForMe) {
            const panelOpen = isCurrent && showDiscussionRef.current;
            if (!panelOpen) {
              setUnreadByProject(prev => ({
                ...prev,
                [c.project_id]: (prev[c.project_id] ?? 0) + 1,
              }));
            }
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Persistent chat unread listener — active on every page, not just ChatPage
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('app-global-chat-unread')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as { author_id: string };
        if (msg.author_id === user.id) return;
        if (!chatModeRef.current) {
          setTotalChatUnread(prev => prev + 1);
          playChime();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (chatMode) {
      params.set('page', 'chat');
    } else {
      if (selectedProjectId) {
        params.set('project', selectedProjectId);
        localStorage.setItem('last-project-id', selectedProjectId);
      } else {
        localStorage.removeItem('last-project-id');
      }
      params.set('view', viewMode);
    }
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [selectedProjectId, viewMode, chatMode]);

  async function fetchTotalCommentCount(projectId: string) {
    const { count } = await supabase
      .from('project_comments').select('id', { count: 'exact', head: true }).eq('project_id', projectId);
    setTotalCommentCount(count ?? 0);
  }

  async function fetchNoteCount(projectId: string) {
    const { count } = await supabase
      .from('project_notes').select('id', { count: 'exact', head: true }).eq('project_id', projectId);
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

  const handleSoundToggle = async (enabled: boolean) => {
    setSoundEnabled(enabled);
    updateSoundEnabled(enabled);
    if (user) {
      await supabase.from('profiles').update({ sound_enabled: enabled }).eq('id', user.id);
    }
  };

  const handleChatToggle = async (checked: boolean) => {
    if (!selectedProjectId) return;
    setIncludeInChat(checked);
    await supabase.from('projects').update({ include_in_chat: checked }).eq('id', selectedProjectId);
    if (checked) {
      await supabase.from('chat_channels').upsert(
        { name: selectedProjectName, type: 'project', project_id: selectedProjectId },
        { onConflict: 'project_id' }
      );
    } else {
      await supabase.from('chat_channels').delete().eq('project_id', selectedProjectId);
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
              <span className="pb-[1px] text-[12px] font-normal tracking-wide text-slate-400">V 2.2</span>
              <span className="pb-[1px] text-[10px] font-normal tracking-wide text-slate-400">Sharpen.Studio</span>
            </span>
          </div>
          {!chatMode && selectedProjectName && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <span className="text-[13px] font-semibold text-slate-700 truncate max-w-[220px]">{selectedProjectName}</span>
            </div>
          )}
        </div>

        {/* Center / project controls */}
        {!chatMode && selectedProjectId && (
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />Grid
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Kanban className="w-4 h-4" />Kanban
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'gantt' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <GanttChartSquare className="w-4 h-4" />Gantt
              </button>
            </div>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />Export<ChevronDown className="w-3.5 h-3.5" />
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                    <button onClick={handleExportTasks} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                      <Download className="w-4 h-4 text-slate-400" />Main Tasks to CSV
                    </button>
                    <button onClick={handleExportTasksWithSubtasks} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                      <Download className="w-4 h-4 text-slate-400" />Tasks with Subtasks to CSV
                    </button>
                    <button onClick={handleExportGantt} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left">
                      <Download className="w-4 h-4 text-slate-400" />Export Gantt (Excel)
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
              <MessageCircle className="w-4 h-4" />Comments
              {noteCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-primary-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
                  {noteCount > 99 ? '99+' : noteCount}
                </span>
              )}
            </button>

            {/* Discussion button */}
            <button
              onClick={() => setShowDiscussion(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />Discussion
              {unreadCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : totalCommentCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-slate-400 text-white text-[10px] font-semibold rounded-full flex items-center justify-center leading-none">
                  {totalCommentCount > 999 ? '999+' : totalCommentCount}
                </span>
              ) : null}
            </button>

            {/* Include in chat toggle */}
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none pl-2 border-l border-slate-200">
              <div
                onClick={() => handleChatToggle(!includeInChat)}
                className={`relative w-8 h-4 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                  includeInChat ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                  includeInChat ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-xs text-slate-500">Chat</span>
            </label>
          </div>
        )}

        {/* Right side: Chat button + user menu */}
        <div className="flex items-center gap-2">
          {/* Chat button — modal on mobile PWA, toggle on desktop */}
          {standalone ? (
            <>
              <button
                onClick={() => {
                  if (totalChatUnread > 0) {
                    setShowUnreadModal(true);
                  } else {
                    setChatMode(true);
                  }
                }}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100"
              >
                <MessagesSquare className="w-4 h-4" />
                {totalChatUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none">
                    {totalChatUnread > 9 ? '9+' : totalChatUnread}
                  </span>
                )}
              </button>
              {user && (
                <UnreadChatsModal
                  isOpen={showUnreadModal}
                  onClose={() => setShowUnreadModal(false)}
                  currentUserId={user.id}
                  onSelectChannel={(channelId) => {
                    setPwaSelectedChannelId(channelId);
                    setPwaSelectedConversationId(null);
                    setChatMode(true);
                    setTotalChatUnread(0);
                  }}
                  onSelectConversation={(conversationId) => {
                    setPwaSelectedConversationId(conversationId);
                    setPwaSelectedChannelId(null);
                    setChatMode(true);
                    setTotalChatUnread(0);
                  }}
                />
              )}
            </>
          ) : (
            <button
              onClick={() => { if (!chatMode) setTotalChatUnread(0); setChatMode(m => !m); }}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                chatMode
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessagesSquare className="w-4 h-4" />
              Chat
              {!chatMode && totalChatUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none">
                  {totalChatUnread > 9 ? '9+' : totalChatUnread}
                </span>
              )}
            </button>
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
                <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm text-slate-700 truncate">{user.email}</p>
                  </div>
                  {/* Notifications section */}
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Notifications</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-700">Sound</p>
                        <p className="text-[10px] text-slate-400">Chime on new messages</p>
                      </div>
                      <div
                        onClick={() => handleSoundToggle(!soundEnabled)}
                        className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${soundEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${soundEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                    </div>
                    {'PushManager' in window && (
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-xs font-medium text-slate-700">Push Notifications</p>
                          <p className="text-[10px] text-slate-400">Alerts when app is closed</p>
                        </div>
                        <div
                          onClick={() => pushSubscribed ? unsubscribePush() : subscribePush()}
                          className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${pushSubscribed ? 'bg-blue-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${pushSubscribed ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { signOut(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <LogOut className="w-4 h-4" />Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {chatMode ? (
          <ChatPage
            onTotalUnreadChange={setTotalChatUnread}
            initialChannelId={pwaSelectedChannelId}
            initialConversationId={pwaSelectedConversationId}
            onNavigated={() => {
              setPwaSelectedChannelId(null);
              setPwaSelectedConversationId(null);
            }}
          />
        ) : (
          <>
            <Sidebar
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              unreadByProject={unreadByProject}
              onProjectsLoaded={handleProjectsLoaded}
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
          </>
        )}
      </div>

      {!chatMode && selectedProjectId && (
        <ProjectDiscussionPanel
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          isOpen={showDiscussion}
          onClose={() => setShowDiscussion(false)}
          onCommentCountChange={setTotalCommentCount}
          onMarkRead={(count) => {
            if (!selectedProjectId) return;
            setUnreadByProject(prev => ({
              ...prev,
              [selectedProjectId]: Math.max(0, (prev[selectedProjectId] ?? 0) - count),
            }));
          }}
        />
      )}

      {!chatMode && selectedProjectId && showComments && (
        <ProjectCommentsModal
          projectId={selectedProjectId}
          projectName={selectedProjectName}
          onClose={() => setShowComments(false)}
          onNoteCountChange={setNoteCount}
        />
      )}

      <RemindersPanel />
    </div>
  );
}