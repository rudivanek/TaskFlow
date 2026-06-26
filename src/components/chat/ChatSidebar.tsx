import { useState } from 'react';
import { Hash, MessageSquare } from 'lucide-react';
import { ChatChannel, ChatDirectConversation, Profile } from '../../types';
import type { User } from '@supabase/supabase-js';

interface Props {
  channels: ChatChannel[];
  conversations: ChatDirectConversation[];
  allUsers: Profile[];
  currentUser: User | null;
  selectedChannelId: string | null;
  selectedConversationId: string | null;
  unreadByChannel: Record<string, number>;
  unreadByConv: Record<string, number>;
  onSelectChannel: (id: string) => void;
  onSelectConversation: (id: string) => void;
  onStartDM: (otherUserId: string) => void;
}

export function ChatSidebar({
  channels, conversations, allUsers, currentUser,
  selectedChannelId, selectedConversationId,
  unreadByChannel, unreadByConv,
  onSelectChannel, onSelectConversation, onStartDM,
}: Props) {
  const [showAllUsers, setShowAllUsers] = useState(false);

  const generalChannel = channels.find(c => c.type === 'general');
  const projectChannels = channels.filter(c => c.type === 'project').sort((a, b) => a.name.localeCompare(b.name));

  function getDMPartner(conv: ChatDirectConversation): Profile | undefined {
    const partnerId = conv.user_a_id === currentUser?.id ? conv.user_b_id : conv.user_a_id;
    return allUsers.find(u => u.id === partnerId);
  }

  return (
    <div className="w-60 bg-gray-900 text-gray-100 flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-white text-sm">TaskFlow Chat</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-5 min-h-0">
        {/* Channels section */}
        <div>
          <p className="px-4 mb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Channels</p>

          {generalChannel && (
            <ChannelButton
              label="# general"
              isSelected={selectedChannelId === generalChannel.id}
              unread={unreadByChannel[generalChannel.id] ?? 0}
              onClick={() => onSelectChannel(generalChannel.id)}
            />
          )}

          {projectChannels.map(ch => (
            <ChannelButton
              key={ch.id}
              label={`# ${ch.name.toLowerCase().replace(/\s+/g, '-')}`}
              isSelected={selectedChannelId === ch.id}
              unread={unreadByChannel[ch.id] ?? 0}
              onClick={() => onSelectChannel(ch.id)}
            />
          ))}
        </div>

        {/* DMs section */}
        <div>
          <div className="px-4 flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Direct Messages</p>
            <button
              onClick={() => setShowAllUsers(v => !v)}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-base leading-none"
              title="New message"
            >
              +
            </button>
          </div>

          {conversations.map(conv => {
            const partner = getDMPartner(conv);
            if (!partner) return null;
            const unread = unreadByConv[conv.id] ?? 0;
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-2 transition-colors rounded-md mx-1 ${
                  selectedConversationId === conv.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className="truncate flex-1">{partner.email}</span>
                {unread > 0 && (
                  <span className="flex-shrink-0 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            );
          })}

          {showAllUsers && (
            <div className="mx-2 mt-1 bg-gray-800 rounded-md p-2 flex flex-col gap-0.5">
              <p className="text-xs text-gray-400 mb-1 px-1">Start a conversation:</p>
              {allUsers.length === 0 && (
                <p className="text-xs text-gray-500 px-1">No other users found</p>
              )}
              {allUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { onStartDM(u.id); setShowAllUsers(false); }}
                  className="text-left text-xs text-gray-300 hover:text-white px-2 py-1 hover:bg-gray-700 rounded transition-colors truncate"
                >
                  {u.email}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700">
        <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
      </div>
    </div>
  );
}

function ChannelButton({ label, isSelected, unread, onClick }: {
  label: string;
  isSelected: boolean;
  unread: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-1.5 transition-colors rounded-md mx-1 ${
        isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
      }`}
    >
      <Hash className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      <span className="truncate flex-1">{label.slice(2)}</span>
      {unread > 0 && (
        <span className="flex-shrink-0 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
