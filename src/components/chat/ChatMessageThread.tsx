import { useState, useRef } from 'react';
import { Trash2, Paperclip, Send, ChevronUp, MessageSquare, X } from 'lucide-react';
import { UnifiedMessage } from '../../types';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { ReminderButton } from '../ReminderButton';
import { FileAttachmentList } from './FileAttachmentList';
import { FileAttachmentPreview, PendingFile } from './FileAttachmentPreview';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { VoiceRecordButton } from './VoiceRecordButton';
import { DictationButton } from './DictationButton';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, isImageFile } from '../../utils/uploadChatFile';

interface Thread extends UnifiedMessage {
  replies: UnifiedMessage[];
}

interface Props {
  thread: Thread;
  currentUserId: string | undefined;
  searchQuery: string;
  isCollapsed: boolean;
  isReplying: boolean;
  onToggleCollapse: () => void;
  onReply: () => void;
  onPostReply: (content: string, files: File[], voiceBlob?: Blob, voiceDuration?: number) => void;
  onDelete: (id: string, source: 'chat' | 'discussion') => void;
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
  msg: UnifiedMessage;
  currentUserId: string | undefined;
  searchQuery: string;
  isReply?: boolean;
  onDelete: (id: string, source: 'chat' | 'discussion') => void;
}

function MessageBubble({ msg, currentUserId, searchQuery, isReply = false, onDelete }: BubbleProps) {
  const allAttachments = [
    ...(msg.image_urls ?? []).map(url => ({ url, name: 'Image', type: 'image/jpeg', size: 0 })),
    ...(msg.file_attachments ?? []),
  ];

  return (
    <div className={`group w-full border rounded-lg p-3 shadow-sm ${isReply ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{msg.author_name}</span>
          {msg.source === 'discussion' && (
            <span className="flex items-center gap-0.5 text-[10px] text-teal-600 bg-teal-50 border border-teal-200 rounded px-1 py-0.5 font-medium">
              <MessageSquare className="w-2.5 h-2.5" />Diskussion
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formatRelativeTime(msg.created_at)}</span>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <ReminderButton
              messageId={msg.source === 'chat' ? msg.id : undefined}
              commentId={msg.source === 'discussion' ? msg.id : undefined}
              messagePreview={msg.content}
              authorName={msg.author_name}
            />
            {msg.author_id === currentUserId && (
              <button
                onClick={() => onDelete(msg.id, msg.source)}
                className="p-0.5 text-gray-300 hover:text-red-500 transition-all"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      {msg.content && (
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed mb-1">
          {highlightText(msg.content, searchQuery)}
        </p>
      )}
      {msg.voice_message && (
        <div className="mt-1 mb-1">
          <VoiceMessagePlayer url={msg.voice_message.url} duration={msg.voice_message.duration} />
        </div>
      )}
      <FileAttachmentList attachments={allAttachments} />
    </div>
  );
}

export function ChatMessageThread({
  thread, currentUserId, searchQuery,
  isCollapsed, isReplying, onToggleCollapse, onReply, onPostReply, onDelete,
}: Props) {
  const [replyContent, setReplyContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [pendingVoice, setPendingVoice] = useState<{ blob: Blob; duration: number; previewUrl: string } | null>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  function addFiles(files: File[]) {
    const valid = files.filter(f => {
      if (!ALLOWED_FILE_TYPES.includes(f.type)) { alert(`"${f.name}" is not a supported file type.`); return false; }
      if (f.size > MAX_FILE_SIZE) { alert(`"${f.name}" exceeds 10MB.`); return false; }
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

  function resetReply() {
    setReplyContent('');
    setPendingFiles([]);
    if (pendingVoice) { URL.revokeObjectURL(pendingVoice.previewUrl); setPendingVoice(null); }
  }

  function submitReply() {
    if (!replyContent.trim() && pendingFiles.length === 0 && !pendingVoice) return;
    onPostReply(
      replyContent,
      pendingFiles.map(pf => pf.file),
      pendingVoice?.blob,
      pendingVoice?.duration,
    );
    resetReply();
  }

  return (
    <div className="w-full flex flex-col gap-1">
      <MessageBubble msg={thread} currentUserId={currentUserId} searchQuery={searchQuery} onDelete={onDelete} />

      {thread.replies.length > 0 && !isCollapsed && (
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

      {/* Actions row */}
      <div className="flex items-center gap-3 pl-1">
        <button onClick={onReply} className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
          Reply
        </button>
        {thread.replies.length > 0 && (
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isCollapsed
              ? <span>{thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}</span>
              : <><ChevronUp className="w-3 h-3" /><span>Hide replies</span></>
            }
          </button>
        )}
      </div>

      {/* Inline reply compose */}
      {isReplying && (
        <div className="ml-4 border-l-2 border-blue-200 pl-3">
          <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 flex flex-col gap-2">
            <FileAttachmentPreview
              pendingFiles={pendingFiles}
              onRemove={i => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
            />
            {pendingVoice && (
              <div className="flex items-center gap-2 bg-white border border-blue-100 rounded-lg px-2 py-1.5">
                <VoiceMessagePlayer url={pendingVoice.previewUrl} duration={pendingVoice.duration} />
                <button
                  onClick={() => { URL.revokeObjectURL(pendingVoice.previewUrl); setPendingVoice(null); }}
                  className="text-gray-400 hover:text-red-500 transition-colors ml-auto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <textarea
              placeholder="Write a reply... (Ctrl+V or drag & drop files)"
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.items)
                  .filter(item => item.kind === 'file')
                  .map(item => item.getAsFile())
                  .filter(Boolean) as File[];
                if (files.length > 0) addFiles(files);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); }
              }}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 bg-white"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <input
                  ref={replyFileRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*"
                  className="hidden"
                  onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
                />
                <button
                  type="button"
                  onClick={() => replyFileRef.current?.click()}
                  title="Attach file"
                  className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <DictationButton
                  onTranscript={(text) => {
                    setReplyContent(prev => {
                      const separator = prev.trim() ? ' ' : '';
                      return prev + separator + text;
                    });
                  }}
                  disabled={!!pendingVoice}
                />
                <VoiceRecordButton
                  onRecordingComplete={(blob, dur) => {
                    const previewUrl = URL.createObjectURL(blob);
                    setPendingVoice({ blob, duration: dur, previewUrl });
                  }}
                  disabled={!!pendingVoice}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { resetReply(); onReply(); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReply}
                  disabled={!replyContent.trim() && pendingFiles.length === 0 && !pendingVoice}
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
