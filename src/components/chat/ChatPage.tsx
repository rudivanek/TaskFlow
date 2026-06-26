import { useState, useEffect, useCallback } from 'react';
import { ChatChannel, ChatDirectConversation, Profile } from '../../types';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';

interface Props {
  onTotalUnreadChange: (n: number) => void;
}

export function ChatPage({ onTotalUnreadChange }: Props) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [conversations, setConversations] = useState<ChatDirectConversation[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({});

  useEffect(() => {
    init();
  }, []);

  // Global chat realtime — update unread badge when new messages arrive
  useEffect(() => {
    if (!currentUser) return;
    const ch = supabase
      .channel('chat-global-unread')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as { author_id: string; channel_id: string | null; conversation_id: string | null };
        if (msg.author_id === currentUser.id) return;
        if (msg.channel_id && msg.channel_id !== selectedChannelId) {
          setUnreadByChannel(prev => ({ ...prev, [msg.channel_id!]: (prev[msg.channel_id!] ?? 0) + 1 }));
        }
        if (msg.conversation_id && msg.conversation_id !== selectedConvId) {
          setUnreadByConv(prev => ({ ...prev, [msg.conversation_id!]: (prev[msg.conversation_id!] ?? 0) + 1 }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentUser, selectedChannelId, selectedConvId]);

  useEffect(() => {
    const total = Object.values(unreadByChannel).reduce((s, n) => s + n, 0)
      + Object.values(unreadByConv).reduce((s, n) => s + n, 0);
    onTotalUnreadChange(total);
  }, [unreadByChannel, unreadByConv, onTotalUnreadChange]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    const [channelRes, profileRes, convRes] = await Promise.all([
      supabase.from('chat_channels').select('*').order('type', { ascending: false }).order('name'),
      supabase.from('profiles').select('id, email').neq('id', user.id).order('email'),
      supabase.from('chat_direct_conversations').select('*')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
    ]);

    const loadedChannels: ChatChannel[] = channelRes.data ?? [];
    const loadedUsers: Profile[] = profileRes.data ?? [];
    const loadedConvs: ChatDirectConversation[] = convRes.data ?? [];

    setChannels(loadedChannels);
    setAllUsers(loadedUsers);
    setConversations(loadedConvs);

    // Fetch unread counts
    await fetchUnreadCounts(user.id, loadedChannels, loadedConvs);

    // Auto-select General
    const general = loadedChannels.find(c => c.type === 'general');
    if (general) setSelectedChannelId(general.id);
  }

  async function fetchUnreadCounts(userId: string, chans: ChatChannel[], convs: ChatDirectConversation[]) {
    const { data: receipts } = await supabase
      .from('chat_read_receipts').select('*').eq('user_id', userId);

    const channelCounts: Record<string, number> = {};
    const convCounts: Record<string, number> = {};

    await Promise.all([
      ...chans.map(async ch => {
        const receipt = receipts?.find(r => r.channel_id === ch.id);
        const lastRead = receipt?.last_read_at ?? '1970-01-01T00:00:00Z';
        const { count } = await supabase
          .from('chat_messages').select('id', { count: 'exact', head: true })
          .eq('channel_id', ch.id).neq('author_id', userId).gt('created_at', lastRead);
        channelCounts[ch.id] = count ?? 0;
      }),
      ...convs.map(async conv => {
        const receipt = receipts?.find(r => r.conversation_id === conv.id);
        const lastRead = receipt?.last_read_at ?? '1970-01-01T00:00:00Z';
        const { count } = await supabase
          .from('chat_messages').select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id).neq('author_id', userId).gt('created_at', lastRead);
        convCounts[conv.id] = count ?? 0;
      }),
    ]);

    setUnreadByChannel(channelCounts);
    setUnreadByConv(convCounts);
  }

  const handleMarkRead = useCallback((channelId: string | null, convId: string | null) => {
    if (channelId) setUnreadByChannel(prev => ({ ...prev, [channelId]: 0 }));
    if (convId) setUnreadByConv(prev => ({ ...prev, [convId]: 0 }));
  }, []);

  async function handleStartDM(otherUserId: string) {
    if (!currentUser) return;
    const [a, b] = [currentUser.id, otherUserId].sort();
    const { data } = await supabase
      .from('chat_direct_conversations')
      .upsert({ user_a_id: a, user_b_id: b }, { onConflict: 'user_a_id,user_b_id' })
      .select().single();
    if (data) {
      setConversations(prev => prev.find(c => c.id === data.id) ? prev : [...prev, data]);
      setSelectedConvId(data.id);
      setSelectedChannelId(null);
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ChatSidebar
        channels={channels}
        conversations={conversations}
        allUsers={allUsers}
        currentUser={currentUser}
        selectedChannelId={selectedChannelId}
        selectedConversationId={selectedConvId}
        unreadByChannel={unreadByChannel}
        unreadByConv={unreadByConv}
        onSelectChannel={(id) => { setSelectedChannelId(id); setSelectedConvId(null); }}
        onSelectConversation={(id) => { setSelectedConvId(id); setSelectedChannelId(null); }}
        onStartDM={handleStartDM}
      />
      <ChatMain
        channelId={selectedChannelId}
        conversationId={selectedConvId}
        channels={channels}
        conversations={conversations}
        allUsers={allUsers}
        currentUser={currentUser}
        onMarkRead={handleMarkRead}
      />
    </div>
  );
}
