import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Trash2, Link2, CheckCheck } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ProjectComment, Task } from '../types';
import * as projectServices from '../services/projectServices';
import * as taskServices from '../services/taskServices';
import { supabase } from '../lib/supabase';
import { markDiscussionAsRead } from '../utils/unreadComments';

interface Props {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
  onRead?: () => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

export default function ProjectDiscussionPanel({
  projectId,
  projectName,
  isOpen,
  onClose,
  onCommentCountChange,
  onRead,
}: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [marking, setMarking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      loadData();
    }
  }, [isOpen, projectId]);

  async function handleMarkAsRead() {
    if (!user) return;
    setMarking(true);
    try {
      await markDiscussionAsRead(supabase, projectId, user.id);
      onRead?.();
    } finally {
      setMarking(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [comments.length, isOpen]);

  async function loadData() {
    setLoading(true);
    try {
      const [commentsData, tasksData] = await Promise.all([
        projectServices.fetchProjectComments(projectId),
        taskServices.fetchTasks(projectId),
      ]);
      setComments(commentsData);
      setTasks(tasksData);
      onCommentCountChange?.(commentsData.length);
    } catch (err) {
      console.error('Failed to load discussion data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      const authorName =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        '';
      const comment = await projectServices.addProjectDiscussionComment(
        projectId,
        user.id,
        authorName,
        text.trim(),
        selectedTaskId || null,
      );
      const updated = [...comments, comment];
      setComments(updated);
      onCommentCountChange?.(updated.length);
      setText('');
      setSelectedTaskId('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await projectServices.deleteProjectComment(id);
      const updated = comments.filter(c => c.id !== id);
      setComments(updated);
      onCommentCountChange?.(updated.length);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  }

  function getTaskName(taskId: string | null): string | null {
    if (!taskId) return null;
    return tasks.find(t => t.id === taskId)?.task_name ?? null;
  }

  function getInitial(name: string): string {
    return (name?.[0] ?? '?').toUpperCase();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out`}
        style={{ width: '420px', transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-800">Discussion</span>
            {projectName && (
              <span className="text-xs text-slate-400 truncate max-w-[140px]">— {projectName}</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleMarkAsRead}
              disabled={marking}
              title="Mark all as read"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark as read
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Comment feed */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <MessageSquare className="w-10 h-10 mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">No comments yet</p>
              <p className="text-xs mt-1 text-slate-300">Start the discussion below</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(c => {
                const taskName = getTaskName(c.task_id);
                const isOwn = c.user_id === user?.id;
                const displayName = c.author_name || c.user_id.slice(0, 8);
                return (
                  <div
                    key={c.id}
                    className="group bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 transition-colors hover:border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-6 h-6 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary-600">
                            {getInitial(displayName)}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 truncate">{displayName}</span>
                        <span className="text-[11px] text-slate-400 flex-shrink-0">
                          {formatRelativeTime(c.created_at)}
                        </span>
                      </div>
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-slate-300 transition-all flex-shrink-0"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {taskName && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] rounded-full border border-slate-200">
                          <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
                          <span className="truncate max-w-[260px]">{taskName}</span>
                        </span>
                      </div>
                    )}

                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Compose area */}
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 space-y-2 bg-white">
          <select
            value={selectedTaskId}
            onChange={e => setSelectedTaskId(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600"
          >
            <option value="">Link to task (optional)</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                #{t.task_id} {t.task_name}
              </option>
            ))}
          </select>

          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none placeholder:text-slate-400"
              style={{ minHeight: '72px' }}
              placeholder="Write a comment..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost();
              }}
              disabled={submitting}
            />
            <button
              onClick={handlePost}
              disabled={!text.trim() || submitting}
              className="p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 self-end"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400">Ctrl+Enter to post</p>
        </div>
      </div>
    </>
  );
}
