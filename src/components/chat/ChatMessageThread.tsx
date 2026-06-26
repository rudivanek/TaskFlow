import { useState, useRef } from 'react';
import { Trash2, ImagePlus, Send } from 'lucide-react';
import { ChatMessage } from '../../types';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

interface Thread extends ChatMessage {
  replies: ChatMessage[];
}

interface Props {
  thread: Thread;
  currentUserId: string | undefined;
  searchQuery: string;
  isReplying: boolean;
  onReply: () => void;
  onPostReply: (content: string, images: File[]) => void;
  onDelete: (id: string) => void;
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

interface BubbleProps {
  msg: ChatMessage;
  currentUserId: string | undefined;
  searchQuery: string;
  isReply?: boolean;
  onDelete: (id: string) => void;
}

function MessageBubble({ msg, currentUserId, searchQuery, isReply = false, onDelete }: BubbleProps) {
  return (
    <div className={`group w-full border border-gray-200 rounded-lg p-3 shadow-sm ${isReply ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700">{msg.author_name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatRelativeTime(msg.created_at)}</span>
          {msg.author_id === currentUserId && (
            <button
              onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-all"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {msg.content && (
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed mb-1">
          {highlightText(msg.content, searchQuery)}
        </p>
      )}
      {msg.image_urls?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {msg.image_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block flex-shrink-0">
              <img
                src={url}
                alt={`attachment-${i}`}
                className="w-24 h-24 object-cover rounded-md border border-gray-200 hover:opacity-90 cursor-zoom-in transition-opacity"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatMessageThread({
  thread, currentUserId, searchQuery,
  isReplying, onReply, onPostReply, onDelete,
}: Props) {
  const [replyContent, setReplyContent] = useState('');
  const [replyImages, setReplyImages] = useState<File[]>([]);
  const [replyPreviews, setReplyPreviews] = useState<string[]>([]);
  const replyFileRef = useRef<HTMLInputElement>(null);

  function addReplyImages(files: File[]) {
    const valid = files.filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > 5 * 1024 * 1024) { alert(`"${f.name}" exceeds 5 MB and was skipped.`); return false; }
      return true;
    });
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setReplyPreviews(p => [...p, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
    setReplyImages(p => [...p, ...valid]);
  }

  function removeReplyImage(i: number) {
    setReplyImages(p => p.filter((_, j) => j !== i));
    setReplyPreviews(p => p.filter((_, j) => j !== i));
  }

  function resetReply() {
    setReplyContent('');
    setReplyImages([]);
    setReplyPreviews([]);
  }

  return (
    <div className="w-full flex flex-col gap-1">
      <MessageBubble msg={thread} currentUserId={currentUserId} searchQuery={searchQuery} onDelete={onDelete} />

      {/* Always-visible replies */}
      {thread.replies.length > 0 && (
        <div className="ml-4 border-l-2 border-gray-100 pl-3 flex flex-col gap-1">
          {thread.replies.map(reply => (
            <MessageBubble
              key={reply.id}
              msg={reply}
              currentUserId={currentUserId}
              searchQuery={searchQuery}
              isReply
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Reply action */}
      <div className="pl-1">
        <button
          onClick={onReply}
          className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
        >
          Reply
        </button>
      </div>

      {/* Inline reply compose */}
      {isReplying && (
        <div className="ml-4 border-l-2 border-blue-200 pl-3">
          <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 flex flex-col gap-2">
            {replyPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {replyPreviews.map((src, i) => (
                  <div key={i} className="relative group w-14 h-14 flex-shrink-0">
                    <img src={src} className="w-14 h-14 object-cover rounded border border-gray-200" />
                    <button
                      onClick={() => removeReplyImage(i)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
            <textarea
              placeholder="Write a reply... (Ctrl+V to paste image)"
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.items)
                  .filter(item => item.type.startsWith('image/'))
                  .map(item => item.getAsFile())
                  .filter(Boolean) as File[];
                if (files.length > 0) addReplyImages(files);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (replyContent.trim() || replyImages.length > 0) {
                    onPostReply(replyContent, replyImages);
                    resetReply();
                  }
                }
              }}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 bg-white"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Enter to send · Shift+Enter new line</span>
                <input
                  ref={replyFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => { addReplyImages(Array.from(e.target.files ?? [])); e.target.value = ''; }}
                />
                <button
                  type="button"
                  onClick={() => replyFileRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <ImagePlus className="w-3 h-3" />Image
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { resetReply(); onReply(); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (replyContent.trim() || replyImages.length > 0) {
                      onPostReply(replyContent, replyImages);
                      resetReply();
                    }
                  }}
                  disabled={!replyContent.trim() && replyImages.length === 0}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3 h-3" />Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
