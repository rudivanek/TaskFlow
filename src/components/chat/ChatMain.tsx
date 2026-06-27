import { useState, useEffect, useRef } from 'react';
import { Search, X, Send, Paperclip } from 'lucide-react';
import { ChatChannel, ChatDirectConversation, ChatMessage, ProjectComment, Profile, UnifiedMessage, FileAttachment, VoiceMessage } from '../../types';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { ChatMessageThread } from './ChatMessageThread';
import { FileAttachmentPreview, PendingFile } from './FileAttachmentPreview';
import { VoiceRecordButton } from './VoiceRecordButton';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { uploadChatFile, isImageFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '../../utils/uploadChatFile';
import { uploadVoiceMessage } from '../../utils/uploadVoiceMessage';
import { useNotificationSound } from '../../utils/useNotificationSound';

interface Thread extends UnifiedMessage {
  replies: UnifiedMessage[];
}

interface Props {
  channelId: string | null;
  conversationId: string | null;
  channels: ChatChannel[];
  conversations: ChatDirectConversation[];
  allUsers: Profile[];
  currentUser: User | null;
  onMarkRead: (channelId: string | null, convId: string | null) => void;
  hideMobileHeader?: boolean;
}

function fromChatMessage(m: ChatMessage): UnifiedMessage {
  return {
    id: m.id,
    source: 'chat',
    parent_id: m.parent_id,
    author_id: m.author_id,
    author_name: m.author_name,
    content: m.content,
    image_urls: m.image_urls ?? [],
    file_attachments: (m.file_attachments as FileAttachment[]) ?? [],
    voice_message: (m.voice_message as VoiceMessage) ?? null,
    created_at: m.created_at,
  };
}

function fromProjectComment(c: ProjectComment): UnifiedMessage {
  return {
    id: c.id,
    source: 'discussion',
    parent_id: c.parent_id,
    author_id: c.user_id,
    author_name: c.author_name,
    content: c.content,
    image_urls: c.image_urls ?? [],
    file_attachments: (c.file_attachments as FileAttachment[]) ?? [],
    voice_message: (c.voice_message as VoiceMessage) ?? null,
    created_at: c.created_at,
  };
}

export function ChatMain({
  channelId, conversationId, channels, conversations, allUsers, currentUser, onMarkRead, hideMobileHeader = false,
}: Props) {
  const { playChime } = useNotificationSound();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [pendingVoice, setPendingVoice] = useState<{ blob: Blob; duration: number; previewUrl: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeId = channelId ?? conversationId;

  const channel = channels.find(c => c.id === channelId) ?? null;
  const projectId = channel?.project_id ?? null;

  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    setSearchQuery('');
    setReplyingToId(null);
    setCollapsedIds(new Set());
    loadMessages();
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Realtime: chat_messages
  useEffect(() => {
    if (!activeId) return;
    const filter = channelId
      ? `channel_id=eq.${channelId}`
      : `conversation_id=eq.${conversationId}`;
    const ch = supabase
      .channel(`chat-msgs-${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages', filter,
      }, (payload) => {
        const msg = fromChatMessage(payload.new as ChatMessage);
        if (msg.author_id !== currentUser?.id) playChime();
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'chat_messages', filter,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as ChatMessage).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  // Realtime: project_comments (only for project channels)
  useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel(`proj-comments-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'project_comments',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        const msg = fromProjectComment(payload.new as ProjectComment);
        if (msg.author_id !== currentUser?.id) playChime();
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'project_comments',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as ProjectComment).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId]);

  async function loadMessages() {
    if (!activeId) return;
    const results: UnifiedMessage[] = [];

    let chatQuery = supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
    if (channelId) chatQuery = chatQuery.eq('channel_id', channelId);
    else if (conversationId) chatQuery = chatQuery.eq('conversation_id', conversationId);
    const { data: chatData } = await chatQuery;
    if (chatData) results.push(...chatData.map(fromChatMessage));

    if (projectId) {
      const { data: commentData } = await supabase
        .from('project_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (commentData) results.push(...commentData.map(fromProjectComment));
    }

    results.sort((a, b) => a.created_at.localeCompare(b.created_at));
    setMessages(prev => {
      const loadedIds = new Set(results.map(m => m.id));
      const realtimeNew = prev.filter(m => !loadedIds.has(m.id));
      return [...results, ...realtimeNew].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
    await markRead();
  }

  async function markRead() {
    if (!currentUser || !activeId) return;
    if (channelId) {
      await supabase.from('chat_read_receipts').delete().eq('user_id', currentUser.id).eq('channel_id', channelId);
      await supabase.from('chat_read_receipts').insert({ user_id: currentUser.id, channel_id: channelId, last_read_at: new Date().toISOString() });
    } else if (conversationId) {
      await supabase.from('chat_read_receipts').delete().eq('user_id', currentUser.id).eq('conversation_id', conversationId);
      await supabase.from('chat_read_receipts').insert({ user_id: currentUser.id, conversation_id: conversationId, last_read_at: new Date().toISOString() });
    }
    onMarkRead(channelId, conversationId);
  }

  function getTitle(): string {
    if (channelId) {
      const ch = channels.find(c => c.id === channelId);
      return ch?.type === 'general' ? 'general' : (ch?.name ?? '');
    }
    if (conversationId) {
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) return 'Direct Message';
      const partnerId = conv.user_a_id === currentUser?.id ? conv.user_b_id : conv.user_a_id;
      return allUsers.find(u => u.id === partnerId)?.email ?? 'Direct Message';
    }
    return '';
  }

  function addFiles(files: File[]) {
    const valid = files.filter(f => {
      if (!ALLOWED_FILE_TYPES.includes(f.type)) {
        alert(`"${f.name}" is not a supported file type.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        alert(`"${f.name}" exceeds the 10MB limit.`);
        return false;
      }
      return true;
    });
    valid.forEach(file => {
      if (isImageFile(file.type)) {
        const reader = new FileReader();
        reader.onload = e => setPendingFiles(prev => [...prev, { file, preview: e.target?.result as string }]);
        reader.readAsDataURL(file);
      } else {
        setPendingFiles(prev => [...prev, { file }]);
      }
    });
  }

  async function handlePost() {
    if ((!content.trim() && pendingFiles.length === 0 && !pendingVoice) || !currentUser) return;
    setIsUploading(true);

    const uploaded = await Promise.all(pendingFiles.map(pf => uploadChatFile(supabase, pf.file, currentUser.id)));
    const valid = uploaded.filter(Boolean) as { url: string; name: string; type: string; size: number }[];
    const imageUrls = valid.filter(a => isImageFile(a.type)).map(a => a.url);
    const fileAttachments = valid.filter(a => !isImageFile(a.type));

    let voiceMessage = null;
    if (pendingVoice) {
      voiceMessage = await uploadVoiceMessage(supabase, pendingVoice.blob, currentUser.id, pendingVoice.duration);
      URL.revokeObjectURL(pendingVoice.previewUrl);
    }

    setIsUploading(false);

    const row = {
      channel_id: channelId ?? null,
      conversation_id: conversationId ?? null,
      parent_id: null as string | null,
      author_id: currentUser.id,
      author_name: (currentUser.user_metadata?.full_name as string) || currentUser.email || '',
      content: content.trim(),
      image_urls: imageUrls,
      file_attachments: fileAttachments,
      voice_message: voiceMessage,
    };

    setContent('');
    setPendingFiles([]);
    setPendingVoice(null);

    const { data: inserted } = await supabase.from('chat_messages').insert(row).select().single();
    if (inserted) {
      const unified = fromChatMessage(inserted as ChatMessage);
      setMessages(prev => prev.find(m => m.id === unified.id) ? prev : [...prev, unified]);
    }
    await markRead();
  }

  async function handlePostReply(parentId: string, replyContent: string, replyFiles: File[], voiceBlob?: Blob, voiceDuration?: number) {
    if (!currentUser) return;
    const uploaded = await Promise.all(replyFiles.map(f => uploadChatFile(supabase, f, currentUser.id)));
    const valid = uploaded.filter(Boolean) as { url: string; name: string; type: string; size: number }[];
    const imageUrls = valid.filter(a => isImageFile(a.type)).map(a => a.url);
    const fileAttachments = valid.filter(a => !isImageFile(a.type));

    let voiceMessage = null;
    if (voiceBlob && voiceDuration) {
      voiceMessage = await uploadVoiceMessage(supabase, voiceBlob, currentUser.id, voiceDuration);
    }

    const parentMsg = messages.find(m => m.id === parentId);
    const authorName = (currentUser.user_metadata?.full_name as string) || currentUser.email || '';

    setReplyingToId(null);

    if (parentMsg?.source === 'discussion' && projectId) {
      const row = {
        project_id: projectId,
        parent_id: parentId,
        user_id: currentUser.id,
        author_name: authorName,
        content: replyContent.trim(),
        image_urls: imageUrls,
        file_attachments: fileAttachments,
        voice_message: voiceMessage,
        task_id: null as string | null,
        notify_all: false,
        notified_user_ids: [] as string[],
      };
      const { data: inserted } = await supabase.from('project_comments').insert(row).select().single();
      if (inserted) {
        const unified = fromProjectComment(inserted as ProjectComment);
        setMessages(prev => prev.find(m => m.id === unified.id) ? prev : [...prev, unified]);
      }
    } else {
      const row = {
        channel_id: channelId ?? null,
        conversation_id: conversationId ?? null,
        parent_id: parentId,
        author_id: currentUser.id,
        author_name: authorName,
        content: replyContent.trim(),
        image_urls: imageUrls,
        file_attachments: fileAttachments,
        voice_message: voiceMessage,
      };
      const { data: inserted } = await supabase.from('chat_messages').insert(row).select().single();
      if (inserted) {
        const unified = fromChatMessage(inserted as ChatMessage);
        setMessages(prev => prev.find(m => m.id === unified.id) ? prev : [...prev, unified]);
      }
    }
    await markRead();
  }

  async function handleDelete(id: string, source: 'chat' | 'discussion') {
    if (source === 'discussion') {
      await supabase.from('project_comments').delete().eq('id', id);
    } else {
      await supabase.from('chat_messages').delete().eq('id', id);
    }
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  const topLevel = messages.filter(m => m.parent_id === null);
  const replyMessages = messages.filter(m => m.parent_id !== null);
  const threads: Thread[] = topLevel.map(m => ({
    ...m,
    replies: replyMessages
      .filter(r => r.parent_id === m.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
  const filteredThreads = threads.filter(t => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return t.content.toLowerCase().includes(q) || t.replies.some(r => r.content.toLowerCase().includes(q));
  });

  if (!activeId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <Send className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">Select a channel or conversation</p>
        </div>
      </div>
    );
  }

  const title = getTitle();
  const isChannel = !!channelId;

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className={`px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0 ${hideMobileHeader ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-800 text-sm">
            {isChannel ? `# ${title}` : title}
          </h2>
          {projectId && (
            <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5 font-medium">
              Chat + Diskussion
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 w-48"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Message feed */}
      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center gap-2">
            <p className="text-2xl">💬</p>
            <p className="text-sm font-medium text-gray-500">
              {searchQuery ? 'No results found' : 'No messages yet'}
            </p>
            <p className="text-xs text-gray-400">
              {searchQuery ? 'Try a different search term' : 'Be the first to say something!'}
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {filteredThreads.map(thread => (
              <ChatMessageThread
                key={thread.id}
                thread={thread}
                currentUserId={currentUser?.id}
                searchQuery={searchQuery}
                isCollapsed={collapsedIds.has(thread.id)}
                isReplying={replyingToId === thread.id}
                onToggleCollapse={() => setCollapsedIds(prev => {
                  const next = new Set(prev);
                  next.has(thread.id) ? next.delete(thread.id) : next.add(thread.id);
                  return next;
                })}
                onReply={() => setReplyingToId(replyingToId === thread.id ? null : thread.id)}
                onPostReply={(c, files) => handlePostReply(thread.id, c, files)}
                onDelete={handleDelete}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Compose */}
      <div
        className={`px-4 md:px-6 py-3 md:py-4 border-t bg-white flex-shrink-0 safe-area-bottom transition-colors ${
          isDragging ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}
      >
        <FileAttachmentPreview
          pendingFiles={pendingFiles}
          onRemove={i => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
        />
        {pendingVoice && (
          <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <VoiceMessagePlayer url={pendingVoice.previewUrl} duration={pendingVoice.duration} />
            <button
              onClick={() => { URL.revokeObjectURL(pendingVoice.previewUrl); setPendingVoice(null); }}
              className="text-gray-400 hover:text-red-500 ml-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            placeholder={`Message ${isChannel ? '#' : ''}${title}... (Ctrl+V or drag & drop files)`}
            value={content}
            onChange={e => setContent(e.target.value)}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.items)
                .filter(item => item.kind === 'file')
                .map(item => item.getAsFile())
                .filter(Boolean) as File[];
              if (files.length > 0) addFiles(files);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); }
            }}
            rows={2}
            className="flex-1 text-base md:text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
          />
          <div className="flex flex-col gap-1 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*"
              className="hidden"
              onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Attach file or image"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <VoiceRecordButton
              onRecordingComplete={(blob, dur) => {
                const previewUrl = URL.createObjectURL(blob);
                setPendingVoice({ blob, duration: dur, previewUrl });
              }}
              disabled={isUploading || !!pendingVoice}
            />
            <button
              onClick={handlePost}
              disabled={isUploading || (!content.trim() && pendingFiles.length === 0 && !pendingVoice)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading
                ? <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin block" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Enter to send · Shift+Enter for new line · Drag & drop or paste files</p>
      </div>
    </div>
  );
}
