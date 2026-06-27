import { useState, useEffect } from 'react';
import { X, Plus, Lock, MessageSquare, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onGoToChat: () => void;
  totalChatUnread: number;
  unreadByProject: Record<string, number>;
  user: { id: string; email?: string } | null;
  onSignOut: () => void;
  chatMode: boolean;
}

interface WsRow { id: string; workspace: string; private: boolean; deleted: boolean }
interface ProjRow { id: string; project: string; workspace_id: string }

export function MobileDrawer({
  isOpen, onClose, selectedProjectId, onSelectProject,
  onGoToChat, totalChatUnread, unreadByProject, user, onSignOut, chatMode,
}: Props) {
  const [workspaces, setWorkspaces] = useState<WsRow[]>([]);
  const [projects, setProjects] = useState<ProjRow[]>([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      supabase.from('workspaces').select('id, workspace, private, deleted').eq('deleted', false).order('workspace'),
      supabase.from('projects').select('id, project, workspace_id').eq('deleted', false).order('project'),
    ]).then(([wsRes, projRes]) => {
      const ws = (wsRes.data ?? []) as WsRow[];
      setWorkspaces(ws);
      setExpandedWorkspaces(new Set(ws.map(w => w.id)));
      setProjects((projRes.data ?? []) as ProjRow[]);
    });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleWorkspace = (id: string) =>
    setExpandedWorkspaces(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div className="fixed top-0 left-0 h-full w-[280px] z-50 bg-slate-900 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">TF</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Task Flow</p>
              <p className="text-[10px] text-white/30">V 2.8 · Sharpen.Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat nav */}
        <div className="flex flex-col gap-0.5 px-2 py-3 border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => { onGoToChat(); onClose(); }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              chatMode ? 'bg-blue-500/20 text-blue-400' : 'text-white/50 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
            {totalChatUnread > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalChatUnread > 9 ? '9+' : totalChatUnread}
              </span>
            )}
          </button>
        </div>

        {/* Workspace + project list */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">
            Workspaces
          </p>

          {workspaces.map(ws => {
            const wsProjects = projects.filter(p => p.workspace_id === ws.id);
            const isExpanded = expandedWorkspaces.has(ws.id);
            return (
              <div key={ws.id} className="mb-1">
                <button
                  onClick={() => toggleWorkspace(ws.id)}
                  className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-white/5"
                >
                  <div className="flex items-center gap-1.5">
                    {isExpanded
                      ? <ChevronDown className="w-3 h-3 text-white/30" />
                      : <ChevronRight className="w-3 h-3 text-white/30" />
                    }
                    <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                      {ws.workspace}
                    </span>
                    {ws.private && <Lock className="w-2.5 h-2.5 text-white/25" />}
                  </div>
                  <Plus className="w-3 h-3 text-white/20" />
                </button>

                {isExpanded && wsProjects.map(proj => {
                  const unread = unreadByProject[proj.id] ?? 0;
                  const isActive = proj.id === selectedProjectId;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => { onSelectProject(proj.id); onClose(); }}
                      className={`w-full flex items-center justify-between pl-8 pr-4 py-2 transition-colors ${
                        isActive ? 'bg-blue-500/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-blue-400' : 'bg-white/20'}`} />
                        <span className={`text-sm truncate max-w-[160px] ${isActive ? 'text-white font-medium' : 'text-white/60'}`}>
                          {proj.project}
                        </span>
                      </div>
                      {unread > 0 && (
                        <span className="min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div className="mt-2 px-2 border-t border-white/10 pt-2">
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/25 hover:text-white/40 hover:bg-white/5 text-sm">
              <Trash2 className="w-4 h-4" />
              Trash
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-white/70 truncate max-w-[140px]">{user?.email}</p>
                <button
                  onClick={() => { onSignOut(); onClose(); }}
                  className="text-[10px] text-white/30 hover:text-white/50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
