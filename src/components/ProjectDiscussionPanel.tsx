import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare, X, Send, Trash2, Link2, CheckCheck, Check,
  Users, User, Search, ChevronDown, ChevronUp, CornerDownRight, ImagePlus,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { ProjectComment, Task, Profile, ChatMessage } from '../types';
import * as projectServices from '../services/projectServices';
import * as taskServices from '../services/taskServices';
import { supabase } from '../lib/supabase';
import {
  getReadCommentIds,
  markCommentAsRead,
  markAllRelevantCommentsAsRead,
} from '../utils/unreadComments';
import { uploadDiscussionImage } from '../utils/uploadDiscussionImage';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { useNotificationSound } from '../utils/useNotificationSound';
import { ReminderButton } from './ReminderButton';

type UnifiedComment = ProjectComment & { _source: 'discussion' | 'chat' };
type CommentThread = UnifiedComment & { replies: UnifiedComment[] };

function chatMsgToComment(m: ChatMessage, projectId: string): UnifiedComment {
  return {
    id: m.id,
    project_id: projectId,
    parent_id: m.parent_id,
    user_id: m.author_id,
    author_name: m.author_name,
    content: m.content,
    image_urls: m.image_urls ?? [],
    created_at: m.created_at,
    updated_at: m.created_at,
    task_id: null,
    notify_all: false,
    notified_user_ids: [],
    _source: 'chat',
  };
}

interface Props {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
  onMarkRead?: (count: number) => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getInitial(name: string): string {
  return (name?.[0] ?? '?').toUpperCase();
}

function detectMention(value: string, cursor: number): { query: string; start: number } | null {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/@(\S*)$/);
  if (!match) return null;
  return { query: match[1], start: cursor - match[0].length };
}

function parseMentionsFromText(
  text: string,
  profiles: Profile[],
): { notifyAll: boolean; notifiedUserIds: string[] } {
  const regex = /@(\S+)/g;
  const matches = [...text.matchAll(regex)].map(m => m[1].replace(/[.,!?:;]+$/, ''));
  if (matches.length === 0) return { notifyAll: true, notifiedUserIds: [] };
  const ids: string[] = [];
  for (const email of matches) {
    const profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (profile && !ids.includes(profile.id)) ids.push(profile.id);
  }
  if (ids.length === 0) return { notifyAll: true, notifiedUserIds: [] };
  return { notifyAll: false, notifiedUserIds: ids };
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return <span>{text}</span>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function filterImageFiles(files: File[]): File[] {
  return files.filter(f => {
    if (!f.type.startsWith('image/')) return false;
    if (f.size > MAX_FILE_SIZE) {
      alert(`"${f.name}" exceeds the 5 MB limit and was skipped.`);
      return false;
    }
    return true;
  });
}

function buildPreviews(files: File[], onPreviews: (previews: string[]) => void) {
  const results: string[] = new Array(files.length).fill('');
  let done = 0;
  files.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      results[i] = e.target?.result as string;
      done++;
      if (done === files.length) onPreviews(results);
    };
    reader.readAsDataURL(file);
  });
}

// ─── image attachment strip (reused for both compose areas) ──────────────────

interface ImageStripProps {
  previews: string[];
  onRemove: (i: number) => void;
}

function ImageStrip({ previews, onRemove }: ImageStripProps) {
  if (previews.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {previews.map((src, i) => (
        <div key={i} className="relative group w-20 h-20 flex-shrink-0">
          <img
            src={src}
            alt={`attachment-${i}`}
            className="w-20 h-20 object-cover rounded-md border border-slate-200"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── posted thumbnails ───────────────────────────────────────────────────────

function CommentImages({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block flex-shrink-0">
          <img
            src={url}
            alt={`attachment-${i}`}
            className="w-24 h-24 object-cover rounded-md border border-slate-200 hover:opacity-90 transition-opacity cursor-zoom-in"
          />
        </a>
      ))}
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ProjectDiscussionPanel({
  projectId,
  projectName,
  isOpen,
  onClose,
  onCommentCountChange,
  onMarkRead,
}: Props) {
  const { user } = useAuth();
  const { playChime } = useNotificationSound();
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Thread expand/collapse
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set());

  // Which thread is showing the reply compose
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // Top-level compose
  const [text, setText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionIndex, setMentionIndex] = useState(0);

  // Top-level image state
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reply compose
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyMentionQuery, setReplyMentionQuery] = useState<string | null>(null);
  const [replyMentionStart, setReplyMentionStart] = useState(0);
  const [replyMentionIndex, setReplyMentionIndex] = useState(0);

  // Reply image state
  const [pendingReplyImages, setPendingReplyImages] = useState<File[]>([]);
  const [pendingReplyPreviews, setPendingReplyPreviews] = useState<string[]>([]);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const [markingAll, setMarkingAll] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // ── derived ──────────────────────────────────────────────────────────────

  const mentionResults = mentionQuery !== null
    ? profiles.filter(p => p.email.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : [];

  const replyMentionResults = replyMentionQuery !== null
    ? profiles.filter(p => p.email.toLowerCase().includes(replyMentionQuery.toLowerCase())).slice(0, 6)
    : [];

  const allComments = useMemo<ProjectComment[]>(() => [
    ...threads,
    ...threads.flatMap(t => t.replies),
  ], [threads]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return threads;
    return threads.filter(t =>
      t.content.toLowerCase().includes(q) ||
      t.replies.some(r => r.content.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  function isRelevantToMe(comment: ProjectComment): boolean {
    if (!user || comment.user_id === user.id) return false;
    return comment.notify_all || comment.notified_user_ids.includes(user.id);
  }

  function threadHasUnread(thread: CommentThread): boolean {
    return (
      (isRelevantToMe(thread) && !readIds.has(thread.id)) ||
      thread.replies.some(r => isRelevantToMe(r) && !readIds.has(r.id))
    );
  }

  const unreadCount = allComments.filter(c => isRelevantToMe(c) && !readIds.has(c.id)).length;

  // ── effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && projectId) loadData();
  }, [isOpen, projectId]);

  useEffect(() => {
    if (user) {
      projectServices.fetchProfiles(user.id).then(setProfiles).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [threads.length, isOpen]);

  useEffect(() => {
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    const toExpand = new Set<string>();
    threads.forEach(t => {
      if (t.replies.some(r => r.content.toLowerCase().includes(q))) {
        toExpand.add(t.id);
      }
    });
    if (toExpand.size > 0) {
      setExpandedThreadIds(prev => new Set([...prev, ...toExpand]));
    }
  }, [searchQuery, threads]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    const channel = supabase
      .channel(`panel-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'project_comments',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        const c = payload.new as ProjectComment;
        if (c.user_id !== user?.id) {
          const isForMe = c.notify_all || (c.notified_user_ids ?? []).includes(user?.id ?? '');
          if (isForMe) playChime();
        }
        const unified: UnifiedComment = { ...c, _source: 'discussion' };
        if (c.parent_id === null) {
          setThreads(prev => prev.find(t => t.id === unified.id) ? prev : [...prev, { ...unified, replies: [] }]);
        } else {
          setThreads(prev => prev.map(t =>
            t.id === c.parent_id
              ? { ...t, replies: t.replies.find(r => r.id === unified.id) ? t.replies : [...t.replies, unified] }
              : t
          ));
          setExpandedThreadIds(prev => new Set([...prev, c.parent_id!]));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOpen, projectId]);

  // Realtime: chat_messages for the linked channel
  useEffect(() => {
    if (!isOpen || !channelId) return;
    const sub = supabase
      .channel(`panel-chat-${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        const m = payload.new as ChatMessage;
        if (m.author_id !== user?.id) playChime();
        const unified = chatMsgToComment(m, projectId);
        if (m.parent_id === null) {
          setThreads(prev => prev.find(t => t.id === unified.id) ? prev : [...prev, { ...unified, replies: [] }]);
        } else {
          setThreads(prev => {
            const parentExists = prev.find(t => t.id === m.parent_id);
            if (parentExists) {
              return prev.map(t =>
                t.id === m.parent_id
                  ? { ...t, replies: t.replies.find(r => r.id === unified.id) ? t.replies : [...t.replies, unified] }
                  : t
              );
            }
            // Parent not yet in threads (race condition) — add as top-level
            return prev.find(t => t.id === unified.id) ? prev : [...prev, { ...unified, replies: [] }];
          });
          setExpandedThreadIds(prev => new Set([...prev, m.parent_id!]));
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        const deletedId = (payload.old as ChatMessage).id;
        setThreads(prev => prev
          .filter(t => t.id !== deletedId)
          .map(t => ({ ...t, replies: t.replies.filter(r => r.id !== deletedId) }))
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [isOpen, channelId]);

  // ── data loading ─────────────────────────────────────────────────────────

  async function loadData() {
    setLoading(true);
    try {
      const [commentsData, tasksData] = await Promise.all([
        projectServices.fetchProjectComments(projectId),
        taskServices.fetchTasks(projectId),
      ]);
      setTasks(tasksData);

      // Also load chat messages from the linked channel
      const { data: channelData } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('project_id', projectId)
        .single();
      const linkedChannelId = channelData?.id ?? null;
      setChannelId(linkedChannelId);

      const discussionComments: UnifiedComment[] = commentsData.map(c => ({ ...c, _source: 'discussion' as const }));

      let chatComments: UnifiedComment[] = [];
      if (linkedChannelId) {
        const { data: chatMsgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_id', linkedChannelId)
          .order('created_at', { ascending: true });
        if (chatMsgs) chatComments = (chatMsgs as ChatMessage[]).map(m => chatMsgToComment(m, projectId));
      }

      const allComments = [...discussionComments, ...chatComments].sort(
        (a, b) => a.created_at.localeCompare(b.created_at)
      );
      const topLevel = allComments.filter(c => c.parent_id === null);
      const replies = allComments.filter(c => c.parent_id !== null);
      const built: CommentThread[] = topLevel.map(c => ({
        ...c,
        replies: replies.filter(r => r.parent_id === c.id),
      }));
      setThreads(built);
      onCommentCountChange?.(allComments.length);
      if (user) {
        const ids = await getReadCommentIds(supabase, projectId, user.id);
        setReadIds(ids);
      }
    } catch (err) {
      console.error('Failed to load discussion data:', err);
    } finally {
      setLoading(false);
    }
  }

  // ── read tracking ────────────────────────────────────────────────────────

  async function handleMarkOne(commentId: string) {
    if (!user || readIds.has(commentId)) return;
    await markCommentAsRead(supabase, commentId, user.id);
    setReadIds(prev => new Set([...prev, commentId]));
    onMarkRead?.(1);
  }

  async function handleMarkAll() {
    if (!user) return;
    setMarkingAll(true);
    try {
      const unreadRelevant = allComments.filter(c => isRelevantToMe(c) && !readIds.has(c.id));
      if (unreadRelevant.length === 0) return;
      await markAllRelevantCommentsAsRead(supabase, projectId, user.id);
      setReadIds(prev => new Set([...prev, ...unreadRelevant.map(c => c.id)]));
      onMarkRead?.(unreadRelevant.length);
    } finally {
      setMarkingAll(false);
    }
  }

  // ── image helpers ─────────────────────────────────────────────────────────

  function addTopImages(files: File[]) {
    const valid = filterImageFiles(files);
    if (valid.length === 0) return;
    buildPreviews(valid, (previews) => {
      setPendingPreviews(prev => [...prev, ...previews]);
    });
    setPendingImages(prev => [...prev, ...valid]);
  }

  function removeTopImage(index: number) {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function addReplyImages(files: File[]) {
    const valid = filterImageFiles(files);
    if (valid.length === 0) return;
    buildPreviews(valid, (previews) => {
      setPendingReplyPreviews(prev => [...prev, ...previews]);
    });
    setPendingReplyImages(prev => [...prev, ...valid]);
  }

  function removeReplyImage(index: number) {
    setPendingReplyImages(prev => prev.filter((_, i) => i !== index));
    setPendingReplyPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function handleTopPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean) as File[];
    if (imageFiles.length > 0) addTopImages(imageFiles);
  }

  function handleReplyPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean) as File[];
    if (imageFiles.length > 0) addReplyImages(imageFiles);
  }

  // ── @mention: top-level ──────────────────────────────────────────────────

  const applyMention = useCallback((profile: Profile) => {
    const before = text.slice(0, mentionStart);
    const after = text.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const newText = `${before}@${profile.email} ${after.trimStart()}`;
    setText(newText);
    setMentionQuery(null);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        const pos = before.length + profile.email.length + 2;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [text, mentionStart, mentionQuery]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = e.target;
    setText(value);
    const m = detectMention(value, selectionStart ?? value.length);
    if (m) { setMentionQuery(m.query); setMentionStart(m.start); setMentionIndex(0); }
    else setMentionQuery(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % mentionResults.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + mentionResults.length) % mentionResults.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(mentionResults[mentionIndex]); return; }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost();
  };

  // ── @mention: reply ───────────────────────────────────────────────────────

  const applyReplyMention = useCallback((profile: Profile) => {
    const before = replyText.slice(0, replyMentionStart);
    const after = replyText.slice(replyMentionStart + 1 + (replyMentionQuery?.length ?? 0));
    const newText = `${before}@${profile.email} ${after.trimStart()}`;
    setReplyText(newText);
    setReplyMentionQuery(null);
    setTimeout(() => {
      const ta = replyTextareaRef.current;
      if (ta) {
        const pos = before.length + profile.email.length + 2;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [replyText, replyMentionStart, replyMentionQuery]);

  const handleReplyTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value, selectionStart } = e.target;
    setReplyText(value);
    const m = detectMention(value, selectionStart ?? value.length);
    if (m) { setReplyMentionQuery(m.query); setReplyMentionStart(m.start); setReplyMentionIndex(0); }
    else setReplyMentionQuery(null);
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (replyMentionQuery !== null && replyMentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setReplyMentionIndex(i => (i + 1) % replyMentionResults.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setReplyMentionIndex(i => (i - 1 + replyMentionResults.length) % replyMentionResults.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyReplyMention(replyMentionResults[replyMentionIndex]); return; }
      if (e.key === 'Escape') { setReplyMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (replyingToId) handlePostReply(replyingToId);
    }
  };

  // ── post handlers ────────────────────────────────────────────────────────

  async function handlePost() {
    const hasContent = text.trim().length > 0 || pendingImages.length > 0;
    if (!hasContent || !user) return;
    setSubmitting(true);
    try {
      const authorName = (user.user_metadata?.full_name as string | undefined) || user.email || '';
      const { notifyAll, notifiedUserIds } = parseMentionsFromText(text.trim(), profiles);

      const uploadedUrls = await Promise.all(
        pendingImages.map(file => uploadDiscussionImage(supabase, file, user.id))
      );
      const imageUrls = uploadedUrls.filter(Boolean) as string[];

      const comment = await projectServices.addProjectDiscussionComment(
        projectId, user.id, authorName, text.trim(),
        selectedTaskId || null, notifyAll, notifiedUserIds, null, imageUrls,
      );
      await markCommentAsRead(supabase, comment.id, user.id);
      setThreads(prev => {
        const updated: CommentThread[] = [...prev, { ...comment, _source: 'discussion' as const, replies: [] }];
        onCommentCountChange?.(updated.length + updated.reduce((s, t) => s + t.replies.length, 0));
        return updated;
      });
      setReadIds(prev => new Set([...prev, comment.id]));
      setText('');
      setSelectedTaskId('');
      setMentionQuery(null);
      setPendingImages([]);
      setPendingPreviews([]);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePostReply(parentId: string) {
    const hasContent = replyText.trim().length > 0 || pendingReplyImages.length > 0;
    if (!hasContent || !user) return;
    setReplySubmitting(true);
    try {
      const authorName = (user.user_metadata?.full_name as string | undefined) || user.email || '';
      const uploadedUrls = await Promise.all(
        pendingReplyImages.map(file => uploadDiscussionImage(supabase, file, user.id))
      );
      const imageUrls = uploadedUrls.filter(Boolean) as string[];

      const parentThread = threads.find(t => t.id === parentId);
      const parentSource = parentThread?._source;

      let replyUnified: UnifiedComment;

      if (parentSource === 'chat' && channelId) {
        // Parent is a chat message — reply must go to chat_messages (FK constraint)
        const { data: inserted } = await supabase
          .from('chat_messages')
          .insert({
            channel_id: channelId,
            conversation_id: null,
            parent_id: parentId,
            author_id: user.id,
            author_name: authorName,
            content: replyText.trim(),
            image_urls: imageUrls,
          })
          .select()
          .single();
        if (!inserted) throw new Error('Insert failed');
        replyUnified = chatMsgToComment(inserted as ChatMessage, projectId);
      } else {
        const { notifyAll, notifiedUserIds } = parseMentionsFromText(replyText.trim(), profiles);
        const reply = await projectServices.addProjectDiscussionComment(
          projectId, user.id, authorName, replyText.trim(),
          null, notifyAll, notifiedUserIds, parentId, imageUrls,
        );
        await markCommentAsRead(supabase, reply.id, user.id);
        setReadIds(prev => new Set([...prev, reply.id]));
        replyUnified = { ...reply, _source: 'discussion' };
      }

      setThreads(prev => prev.map(t =>
        t.id === parentId
          ? { ...t, replies: t.replies.find(r => r.id === replyUnified.id) ? t.replies : [...t.replies, replyUnified] }
          : t
      ));
      setExpandedThreadIds(prev => new Set([...prev, parentId]));
      setReplyText('');
      setReplyingToId(null);
      setReplyMentionQuery(null);
      setPendingReplyImages([]);
      setPendingReplyPreviews([]);
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setReplySubmitting(false);
    }
  }

  async function handleDelete(id: string, parentId?: string, source?: 'discussion' | 'chat') {
    try {
      if (source === 'chat') {
        await supabase.from('chat_messages').delete().eq('id', id);
      } else {
        await projectServices.deleteProjectComment(id);
      }
      if (parentId) {
        setThreads(prev => prev.map(t =>
          t.id === parentId ? { ...t, replies: t.replies.filter(r => r.id !== id) } : t
        ));
      } else {
        setThreads(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  }

  // ── display helpers ───────────────────────────────────────────────────────

  function getTaskName(taskId: string | null): string | null {
    if (!taskId) return null;
    return tasks.find(t => t.id === taskId)?.task_name ?? null;
  }

  function getRecipientLabel(comment: ProjectComment): string {
    if (comment.notify_all || comment.notified_user_ids.length === 0) return 'All';
    const names = comment.notified_user_ids.map(id => {
      const found = profiles.find(p => p.id === id);
      return found?.email ?? id.slice(0, 8);
    });
    return names.join(', ');
  }

  function toggleThread(id: string) {
    setExpandedThreadIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out"
        style={{ width: '460px', transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-800">Discussion</span>
            {projectName && (
              <span className="text-xs text-slate-400 truncate max-w-[120px]">— {projectName}</span>
            )}
            {unreadCount > 0 && (
              <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Thread feed */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <MessageSquare className="w-10 h-10 mb-3 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">
                {searchQuery ? 'No results found' : 'No discussions yet'}
              </p>
              <p className="text-xs mt-1 text-slate-300">
                {searchQuery ? 'Try a different search term' : 'Start the discussion below'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredThreads.map(thread => {
                const isOwn = thread.user_id === user?.id;
                const relevant = isRelevantToMe(thread);
                const unread = relevant && !readIds.has(thread.id);
                const hasUnread = threadHasUnread(thread);
                const isExpanded = expandedThreadIds.has(thread.id);
                const taskName = getTaskName(thread.task_id);
                const displayName = thread.author_name || thread.user_id.slice(0, 8);
                const isChat = thread._source === 'chat';

                return (
                  <div key={thread.id} className="flex flex-col">
                    {/* Top-level comment */}
                    <div className={`group rounded-xl border px-4 py-3 transition-colors ${
                      unread
                        ? 'bg-blue-50/60 border-blue-200/60 hover:border-blue-300/60'
                        : isChat
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}>
                      {/* Author row */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="w-5 h-5 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-primary-600">{getInitial(displayName)}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 truncate">{displayName}</span>
                          {isChat ? (
                            <span className="flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 font-medium flex-shrink-0">
                              Chat
                            </span>
                          ) : (
                            <>
                              <span className="text-[11px] text-slate-400 flex-shrink-0">→</span>
                              <span className="flex items-center gap-1 flex-shrink-0">
                                {thread.notify_all || thread.notified_user_ids.length === 0
                                  ? <Users className="w-3 h-3 text-slate-400" />
                                  : <User className="w-3 h-3 text-slate-400" />
                                }
                                <span className="text-[11px] text-slate-500 truncate max-w-[130px]">{getRecipientLabel(thread)}</span>
                              </span>
                            </>
                          )}
                          {unread && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" />}
                          {!unread && hasUnread && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-300" title="Unread replies" />}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[11px] text-slate-400">{formatRelativeTime(thread.created_at)}</span>
                          {unread && (
                            <button onClick={() => handleMarkOne(thread.id)} title="Mark as read" className="p-0.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <ReminderButton
                              commentId={thread.id}
                              messagePreview={thread.content}
                              authorName={thread.author_name || thread.user_id.slice(0, 8)}
                            />
                            {isOwn && (
                              <button onClick={() => handleDelete(thread.id, undefined, thread._source)} className="p-0.5 hover:text-red-500 text-slate-300 transition-all" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {taskName && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] rounded-full border border-slate-200">
                            <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate max-w-[240px]">{taskName}</span>
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed mb-2">
                        {highlightText(thread.content, searchQuery)}
                      </p>

                      <CommentImages urls={thread.image_urls} />

                      {/* Action row */}
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => {
                            setReplyingToId(replyingToId === thread.id ? null : thread.id);
                            setReplyText('');
                            setReplyMentionQuery(null);
                            setPendingReplyImages([]);
                            setPendingReplyPreviews([]);
                          }}
                          className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          Reply
                        </button>
                        {thread.replies.length > 0 && (
                          <button
                            onClick={() => toggleThread(thread.id)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            {isExpanded
                              ? <><ChevronUp className="w-3 h-3" />Hide {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}</>
                              : <><ChevronDown className="w-3 h-3" />{thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}</>
                            }
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Replies */}
                    {isExpanded && thread.replies.length > 0 && (
                      <div className="ml-5 mt-1 flex flex-col gap-1 border-l-2 border-slate-100 pl-3">
                        {thread.replies.map(reply => {
                          const replyOwn = reply.user_id === user?.id;
                          const replyRelevant = isRelevantToMe(reply);
                          const replyUnread = replyRelevant && !readIds.has(reply.id);
                          const replyDisplayName = reply.author_name || reply.user_id.slice(0, 8);
                          const replyIsChat = reply._source === 'chat';
                          return (
                            <div key={reply.id} className={`group rounded-lg border px-3 py-2.5 transition-colors ${
                              replyUnread
                                ? 'bg-blue-50/60 border-blue-200/60'
                                : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                            }`}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <div className="w-4 h-4 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center">
                                    <span className="text-[8px] font-bold text-primary-600">{getInitial(replyDisplayName)}</span>
                                  </div>
                                  <span className="text-xs font-semibold text-slate-700 truncate">{replyDisplayName}</span>
                                  {replyIsChat ? (
                                    <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 font-medium flex-shrink-0">Chat</span>
                                  ) : (
                                    <>
                                      <span className="text-[11px] text-slate-400">→</span>
                                      <span className="flex items-center gap-0.5 flex-shrink-0">
                                        {reply.notify_all || reply.notified_user_ids.length === 0
                                          ? <Users className="w-2.5 h-2.5 text-slate-400" />
                                          : <User className="w-2.5 h-2.5 text-slate-400" />
                                        }
                                        <span className="text-[11px] text-slate-500 truncate max-w-[110px]">{getRecipientLabel(reply)}</span>
                                      </span>
                                    </>
                                  )}
                                  {replyUnread && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-[11px] text-slate-400">{formatRelativeTime(reply.created_at)}</span>
                                  {replyUnread && (
                                    <button onClick={() => handleMarkOne(reply.id)} title="Mark as read" className="p-0.5 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors">
                                      <Check className="w-3 h-3" />
                                    </button>
                                  )}
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                    <ReminderButton
                                      commentId={reply.id}
                                      messagePreview={reply.content}
                                      authorName={reply.author_name || reply.user_id.slice(0, 8)}
                                    />
                                    {replyOwn && (
                                      <button onClick={() => handleDelete(reply.id, thread.id, reply._source)} className="p-0.5 hover:text-red-500 text-slate-300 transition-all" title="Delete">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                                {highlightText(reply.content, searchQuery)}
                              </p>
                              <CommentImages urls={reply.image_urls} />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline reply compose */}
                    {replyingToId === thread.id && (
                      <div className="ml-5 mt-1 border-l-2 border-primary-200 pl-3">
                        <div className="bg-primary-50/40 border border-primary-100 rounded-lg p-3 flex flex-col gap-2">
                          <div className="relative">
                            {replyMentionQuery !== null && replyMentionResults.length > 0 && (
                              <div className="absolute bottom-full mb-1 left-0 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                                {replyMentionResults.map((p, i) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); applyReplyMention(p); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                      i === replyMentionIndex ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="w-5 h-5 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center">
                                      <span className="text-[9px] font-bold text-primary-600">{getInitial(p.email)}</span>
                                    </div>
                                    <span className="truncate">{p.email}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {replyMentionQuery !== null && replyMentionQuery.length > 0 && replyMentionResults.length === 0 && (
                              <div className="absolute bottom-full mb-1 left-0 z-10 bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2">
                                <span className="text-xs text-slate-400">No users match "@{replyMentionQuery}"</span>
                              </div>
                            )}
                            <textarea
                              ref={replyTextareaRef}
                              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300 bg-white"
                              style={{ minHeight: '60px' }}
                              placeholder="Write a reply... @ to mention, paste images with Ctrl+V"
                              value={replyText}
                              onChange={handleReplyTextChange}
                              onKeyDown={handleReplyKeyDown}
                              onPaste={handleReplyPaste}
                              disabled={replySubmitting}
                              autoFocus
                            />
                          </div>

                          <ImageStrip previews={pendingReplyPreviews} onRemove={removeReplyImage} />

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-slate-400">@ mention · Ctrl+Enter</p>
                              <input
                                ref={replyFileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={e => { addReplyImages(Array.from(e.target.files ?? [])); e.target.value = ''; }}
                              />
                              <button
                                type="button"
                                onClick={() => replyFileInputRef.current?.click()}
                                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                              >
                                <ImagePlus className="w-3 h-3" />
                                Image
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setReplyingToId(null);
                                  setReplyText('');
                                  setReplyMentionQuery(null);
                                  setPendingReplyImages([]);
                                  setPendingReplyPreviews([]);
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handlePostReply(thread.id)}
                                disabled={(!replyText.trim() && pendingReplyImages.length === 0) || replySubmitting}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                {replySubmitting
                                  ? <><span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" /> Uploading...</>
                                  : <><Send className="w-3 h-3" />Reply</>
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Top-level compose */}
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 space-y-2 bg-white">
          <select
            value={selectedTaskId}
            onChange={e => setSelectedTaskId(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-600"
          >
            <option value="">Link to task (optional)</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>#{t.task_id} {t.task_name}</option>
            ))}
          </select>

          <div className="relative">
            {mentionQuery !== null && mentionResults.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                {mentionResults.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); applyMention(p); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      i === mentionIndex ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-5 h-5 bg-primary-100 rounded-full flex-shrink-0 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-primary-600">{getInitial(p.email)}</span>
                    </div>
                    <span className="truncate">{p.email}</span>
                  </button>
                ))}
              </div>
            )}
            {mentionQuery !== null && mentionQuery.length > 0 && mentionResults.length === 0 && (
              <div className="absolute bottom-full mb-1 left-0 z-10 bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2">
                <span className="text-xs text-slate-400">No users match "@{mentionQuery}"</span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
              style={{ minHeight: '72px' }}
              placeholder="Write a comment... @ to mention, paste images with Ctrl+V"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handleTopPaste}
              disabled={submitting}
            />
          </div>

          <ImageStrip previews={pendingPreviews} onRemove={removeTopImage} />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-400">@ to mention · Ctrl+Enter to post</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => { addTopImages(Array.from(e.target.files ?? [])); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <ImagePlus className="w-3 h-3" />
                Image
              </button>
            </div>
            <button
              onClick={handlePost}
              disabled={(!text.trim() && pendingImages.length === 0) || submitting}
              className="flex items-center gap-1.5 p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting
                ? <span className="animate-spin inline-block w-4 h-4 border border-white border-t-transparent rounded-full" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
