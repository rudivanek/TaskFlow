import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  messageId?: string;
  commentId?: string;
  messagePreview: string;
  authorName: string;
}

const OPTIONS = [
  { key: '20min', label: 'In 20 minutes' },
  { key: '1hour', label: 'In 1 hour' },
  { key: '3hours', label: 'In 3 hours' },
  { key: 'tomorrow', label: 'Tomorrow at 9am' },
] as const;

function getRemindAt(option: string): Date {
  const now = new Date();
  switch (option) {
    case '20min': return new Date(now.getTime() + 20 * 60 * 1000);
    case '1hour': return new Date(now.getTime() + 60 * 60 * 1000);
    case '3hours': return new Date(now.getTime() + 3 * 60 * 60 * 1000);
    case 'tomorrow': {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      t.setHours(9, 0, 0, 0);
      return t;
    }
    default: return now;
  }
}

export function ReminderButton({ messageId, commentId, messagePreview, authorName }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleRemind(option: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('message_reminders').insert({
      user_id: user.id,
      message_id: messageId ?? null,
      comment_id: commentId ?? null,
      message_preview: messagePreview.slice(0, 100),
      message_author: authorName,
      remind_at: getRemindAt(option).toISOString(),
      is_dismissed: false,
    });
    setShowMenu(false);
    setScheduled(true);
    setTimeout(() => setScheduled(false), 2000);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(v => !v)}
        title="Remind me later"
        className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
          scheduled
            ? 'text-green-500'
            : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
        }`}
      >
        {scheduled
          ? <span className="text-[10px] font-bold">✓</span>
          : <Bell className="w-3 h-3" />
        }
      </button>

      {showMenu && (
        <div className="absolute right-0 top-6 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
            Remind me...
          </p>
          {OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => handleRemind(opt.key)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
