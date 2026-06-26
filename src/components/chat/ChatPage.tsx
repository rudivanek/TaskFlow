import { useState, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { ChatChannel, ChatDirectConversation, Profile } from '../../types';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { usePushNotifications } from '../../utils/usePushNotifications';

const LAST_CHANNEL_KEY = 'taskflow_last_channel_id';
const LAST_CONV_KEY = 'taskflow_last_conv_id';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { permission, isSubscribed, subscribe } = usePushNotifications();

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const showPushBanner = 'PushManager' in window && permission !== 'granted' && !isSubscribed;

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

    await fetchUnreadCounts(user.id, loadedChannels, loadedConvs);

    const savedConvId = localStorage.getItem(LAST_CONV_KEY);
    const savedChannelId = localStorage.getItem(LAST_CHANNEL_KEY);
    if (savedConvId && loadedConvs.find(c => c.id === savedConvId)) {
      setSelectedConvId(savedConvId);
    } else if (savedChannelId && loadedChannels.find(c => c.id === savedChannelId)) {
      setSelectedChannelId(savedChannelId);
    } else {
      const general = loadedChannels.find(c => c.type === 'general');
      if (general) setSelectedChannelId(general.id);
    }
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
      localStorage.setItem(LAST_CONV_KEY, data.id);
      localStorage.removeItem(LAST_CHANNEL_KEY);
      setSidebarOpen(false);
    }
  }

  function getActiveTitle(): string {
    if (selectedChannelId) {
      const ch = channels.find(c => c.id === selectedChannelId);
      return ch?.type === 'general' ? '# general' : `# ${ch?.name ?? ''}`;
    }
    if (selectedConvId) {
      const conv = conversations.find(c => c.id === selectedConvId);
      if (!conv) return 'Direct Message';
      const partnerId = conv.user_a_id === currentUser?.id ? conv.user_b_id : conv.user_a_id;
      return allUsers.find(u => u.id === partnerId)?.email ?? 'Direct Message';
    }
    return 'Chat';
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <PWAInstallPrompt />

      {showPushBanner && (
        <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <p className="text-xs font-medium">
            {isIOS && !isStandalone
              ? 'To get notifications on iPhone, install via Share \u2191 \u2192 Add to Home Screen'
              : 'Enable notifications to get alerted when new messages arrive'}
          </p>
          {!(isIOS && !isStandalone) && (
            <button
              onClick={subscribe}
              className="text-xs bg-white text-blue-600 font-semibold px-3 py-1.5 rounded-md hover:bg-blue-50 flex-shrink-0 ml-3"
            >
              Enable
            </button>
          )}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — drawer on mobile, always visible on md+ */}
        <div className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0 md:flex
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <ChatSidebar
            channels={channels}
            conversations={conversations}
            allUsers={allUsers}
            currentUser={currentUser}
            selectedChannelId={selectedChannelId}
            selectedConversationId={selectedConvId}
            unreadByChannel={unreadByChannel}
            unreadByConv={unreadByConv}
            onSelectChannel={(id) => {
              setSelectedChannelId(id);
              setSelectedConvId(null);
              localStorage.setItem(LAST_CHANNEL_KEY, id);
              localStorage.removeItem(LAST_CONV_KEY);
              setSidebarOpen(false);
            }}
            onSelectConversation={(id) => {
              setSelectedConvId(id);
              setSelectedChannelId(null);
              localStorage.setItem(LAST_CONV_KEY, id);
              localStorage.removeItem(LAST_CHANNEL_KEY);
              setSidebarOpen(false);
            }}
            onStartDM={handleStartDM}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile-only top bar with hamburger */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-gray-800 text-sm truncate">{getActiveTitle()}</span>
          </div>

          <ChatMain
            channelId={selectedChannelId}
            conversationId={selectedConvId}
            channels={channels}
            conversations={conversations}
            allUsers={allUsers}
            currentUser={currentUser}
            onMarkRead={handleMarkRead}
            hideMobileHeader
          />
        </div>
      </div>
    </div>
  );
}
