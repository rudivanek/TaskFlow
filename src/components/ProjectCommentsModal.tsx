import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Trash2, Pencil, Check } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ProjectComment } from '../types';
import * as projectServices from '../services/projectServices';

interface Props {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ProjectCommentsModal({ projectId, projectName, onClose }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await projectServices.fetchProjectComments(projectId);
      setComments(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      const comment = await projectServices.addProjectComment(projectId, user.id, text.trim());
      setComments(prev => [...prev, comment]);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await projectServices.deleteProjectComment(id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const startEdit = (c: ProjectComment) => {
    setEditingId(c.id);
    setEditText(c.content);
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await projectServices.updateProjectComment(editingId, editText.trim());
    setComments(prev => prev.map(c => c.id === editingId ? { ...c, content: editText.trim(), updated_at: new Date().toISOString() } : c));
    setEditingId(null);
    setEditText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-slate-800">Comments</h2>
            <span className="text-xs text-slate-400 truncate max-w-[180px]">{projectName}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Be the first to leave a comment</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="group flex flex-col gap-1">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-semibold text-primary-600">
                      {(user?.email?.[0] ?? '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === c.id ? (
                      <div className="flex gap-2 items-start">
                        <textarea
                          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
                          rows={2}
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          autoFocus
                        />
                        <button onClick={saveEdit} className="p-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{c.content}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                      {c.updated_at !== c.created_at && (
                        <span className="text-xs text-slate-300">(edited)</span>
                      )}
                      {c.user_id === user?.id && editingId !== c.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(c)} className="p-0.5 hover:text-primary-600 text-slate-400 transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-0.5 hover:text-red-500 text-slate-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-slate-400"
              rows={2}
              placeholder="Write a comment... (Ctrl+Enter to send)"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
