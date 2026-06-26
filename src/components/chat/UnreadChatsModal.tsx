import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Hash, MessageCircle } from 'lucide-react';

interface UnreadChannel {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  unreadCount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onSelectChannel: (channelId: string) => void;
  onSelectConversation: (conversationId: string) => void;
}

export function UnreadChatsModal({
  isOpen,
  onClose,
  currentUserId,
  onSelectChannel,
  onSelectConversation,
}: Props) {
  const [unreadItems, setUnreadItems] = useState<UnreadChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    fetchUnreadItems();
  }, [isOpen]);

  async function fetchUnreadItems() {
    setLoading(true);

    const { data: receipts } = await supabase
      .from('chat_read_receipts')
      .select('*')
      .eq('user_id', currentUserId);

    const items: UnreadChannel[] = [];

    const { data: channels } = await supabase
      .from('chat_channels')
      .select('id, name, type')
      .order('type', { ascending: false })
      .order('name');

    await Promise.all(
      (channels ?? []).map(async (ch) => {
        const receipt = receipts?.find((r) => r.channel_id === ch.id);
        const lastRead = receipt?.last_read_at ?? '1970-01-01T00:00:00Z';
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .neq('author_id', currentUserId)
          .gt('created_at', lastRead);
        if ((count ?? 0) > 0) {
          items.push({ id: ch.id, name: ch.name, type: 'channel', unreadCount: count ?? 0 });
        }
      }),
    );

    const { data: convs } = await supabase
      .from('chat_direct_conversations')
      .select('id, user_a_id, user_b_id')
      .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`);

    await Promise.all(
      (convs ?? []).map(async (conv) => {
        const receipt = receipts?.find((r) => r.conversation_id === conv.id);
        const lastRead = receipt?.last_read_at ?? '1970-01-01T00:00:00Z';
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('author_id', currentUserId)
          .gt('created_at', lastRead);
        if ((count ?? 0) > 0) {
          const partnerId = conv.user_a_id === currentUserId ? conv.user_b_id : conv.user_a_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', partnerId)
            .single();
          items.push({
            id: conv.id,
            name: profile?.email ?? 'Direct Message',
            type: 'dm',
            unreadCount: count ?? 0,
          });
        }
      }),
    );

    items.sort((a, b) => b.unreadCount - a.unreadCount);
    setUnreadItems(items);
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed top-16 right-4 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-dropdown-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Unread Messages</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : unreadItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No unread messages</p>
            </div>
          ) : (
            <div className="py-1">
              {unreadItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'channel') onSelectChannel(item.id);
                    else onSelectConversation(item.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {item.type === 'channel' ? (
                      <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 truncate max-w-[160px]">
                      {item.type === 'channel'
                        ? item.name.toLowerCase().replace(/\s+/g, '-')
                        : item.name}
                    </span>
                  </div>
                  <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shrink-0">
                    {item.unreadCount > 9 ? '9+' : item.unreadCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
