import { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2, MessageCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ProjectComment } from '../types';
import * as projectServices from '../services/projectServices';

interface Props {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProjectCommentsModal({
  projectId,
  projectName,
  onClose,
  onCommentCountChange,
}: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  async function load() {
    setLoading(true);
    try {
      const data = await projectServices.fetchProjectComments(projectId);
      setComments(data);
      onCommentCountChange?.(data.length);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      const authorName =
        (user.user_metadata?.full_name as string | undefined) || user.email || '';
      const comment = await projectServices.addProjectDiscussionComment(
        projectId,
        user.id,
        authorName,
        text.trim(),
        null,
      );
      const updated = [...comments, comment];
      setComments(updated);
      onCommentCountChange?.(updated.length);
      setText('');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-800">Comments</span>
            {projectName && (
              <span className="text-xs text-slate-400 truncate max-w-[220px]">— {projectName}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <MessageCircle className="w-10 h-10 mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">No comments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(c => {
                const isOwn = c.user_id === user?.id;
                const displayName = c.author_name || c.user_id.slice(0, 8);
                return (
                  <div
                    key={c.id}
                    className="group bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary-600">
                            {(displayName[0] ?? '?').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 truncate">{displayName}</span>
                        <span className="text-[11px] text-slate-400 flex-shrink-0">{formatDate(c.created_at)}</span>
                      </div>
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-slate-300 transition-all flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Compose */}
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
              style={{ minHeight: '64px' }}
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
          <p className="text-[10px] text-slate-400 mt-1.5">Ctrl+Enter to post</p>
        </div>
      </div>
    </div>
  );
}
