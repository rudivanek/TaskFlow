import { useState, useEffect, useRef } from 'react';
import { Search, X, Send, ImagePlus } from 'lucide-react';
import { ChatChannel, ChatDirectConversation, ChatMessage, Profile } from '../../types';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { uploadDiscussionImage } from '../../utils/uploadDiscussionImage';
import { ChatMessageThread } from './ChatMessageThread';

interface Thread extends ChatMessage {
  replies: ChatMessage[];
}

interface Props {
  channelId: string | null;
  conversationId: string | null;
  channels: ChatChannel[];
  conversations: ChatDirectConversation[];
  allUsers: Profile[];
  currentUser: User | null;
  onMarkRead: (channelId: string | null, convId: string | null) => void;
}

export function ChatMain({
  channelId, conversationId, channels, conversations, allUsers, currentUser, onMarkRead,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeId = channelId ?? conversationId;

  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    setSearchQuery('');
    setReplyingToId(null);
    loadMessages();
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`chat-msgs-${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: channelId ? `channel_id=eq.${channelId}` : `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: channelId ? `channel_id=eq.${channelId}` : `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as ChatMessage).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  async function loadMessages() {
    if (!activeId) return;
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
    if (channelId) query = query.eq('channel_id', channelId);
    else if (conversationId) query = query.eq('conversation_id', conversationId);
    const { data } = await query;
    if (data) setMessages(data);
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

  function addImages(files: File[]) {
    const valid = files.filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > 5 * 1024 * 1024) { alert(`"${f.name}" exceeds 5 MB and was skipped.`); return false; }
      return true;
    });
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPendingPreviews(p => [...p, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
    setPendingImages(p => [...p, ...valid]);
  }

  async function handlePost() {
    if ((!content.trim() && pendingImages.length === 0) || !currentUser) return;
    setIsUploading(true);
    const uploaded = await Promise.all(pendingImages.map(f => uploadDiscussionImage(supabase, f, currentUser.id)));
    const imageUrls = uploaded.filter(Boolean) as string[];
    setIsUploading(false);
    await supabase.from('chat_messages').insert({
      channel_id: channelId ?? null,
      conversation_id: conversationId ?? null,
      parent_id: null,
      author_id: currentUser.id,
      author_name: currentUser.user_metadata?.full_name as string || currentUser.email || '',
      content: content.trim(),
      image_urls: imageUrls,
    });
    setContent('');
    setPendingImages([]);
    setPendingPreviews([]);
    await markRead();
  }

  async function handlePostReply(parentId: string, replyContent: string, replyImages: File[]) {
    if (!currentUser) return;
    const uploaded = await Promise.all(replyImages.map(f => uploadDiscussionImage(supabase, f, currentUser.id)));
    const imageUrls = uploaded.filter(Boolean) as string[];
    await supabase.from('chat_messages').insert({
      channel_id: channelId ?? null,
      conversation_id: conversationId ?? null,
      parent_id: parentId,
      author_id: currentUser.id,
      author_name: currentUser.user_metadata?.full_name as string || currentUser.email || '',
      content: replyContent.trim(),
      image_urls: imageUrls,
    });
    setExpandedIds(prev => new Set([...prev, parentId]));
    setReplyingToId(null);
    await markRead();
  }

  async function handleDelete(id: string) {
    await supabase.from('chat_messages').delete().eq('id', id);
  }

  const topLevel = messages.filter(m => m.parent_id === null);
  const replies = messages.filter(m => m.parent_id !== null);
  const threads: Thread[] = topLevel.map(m => ({ ...m, replies: replies.filter(r => r.parent_id === m.id) }));
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-gray-800 text-sm">
          {isChannel ? `# ${title}` : title}
        </h2>
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
          <div className="space-y-4">
            {filteredThreads.map(thread => (
              <ChatMessageThread
                key={thread.id}
                thread={thread}
                currentUserId={currentUser?.id}
                searchQuery={searchQuery}
                isExpanded={expandedIds.has(thread.id)}
                isReplying={replyingToId === thread.id}
                onToggleExpand={() => setExpandedIds(prev => {
                  const next = new Set(prev);
                  next.has(thread.id) ? next.delete(thread.id) : next.add(thread.id);
                  return next;
                })}
                onReply={() => setReplyingToId(replyingToId === thread.id ? null : thread.id)}
                onPostReply={(c, imgs) => handlePostReply(thread.id, c, imgs)}
                onDelete={handleDelete}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Compose */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
        {pendingPreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingPreviews.map((src, i) => (
              <div key={i} className="relative group w-16 h-16 flex-shrink-0">
                <img src={src} className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                <button
                  onClick={() => { setPendingImages(p => p.filter((_, j) => j !== i)); setPendingPreviews(p => p.filter((_, j) => j !== i)); }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                >✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            placeholder={`Message ${isChannel ? '#' : ''} ${title}... (Ctrl+V to paste image)`}
            value={content}
            onChange={e => setContent(e.target.value)}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.items)
                .filter(item => item.type.startsWith('image/'))
                .map(item => item.getAsFile())
                .filter(Boolean) as File[];
              if (files.length > 0) addImages(files);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePost();
              }
            }}
            rows={2}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
          />
          <div className="flex flex-col gap-1 flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { addImages(Array.from(e.target.files ?? [])); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Add image"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <button
              onClick={handlePost}
              disabled={isUploading || (!content.trim() && pendingImages.length === 0)}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading
                ? <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin block" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
