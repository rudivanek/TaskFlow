import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { MessageReminder } from '../types';
import { supabase } from '../lib/supabase';
import { formatRelativeTime } from '../utils/formatRelativeTime';

export function RemindersPanel() {
  const [dueReminders, setDueReminders] = useState<MessageReminder[]>([]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function checkReminders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('message_reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .lte('remind_at', new Date().toISOString())
      .order('remind_at', { ascending: true });
    if (data && data.length > 0) setDueReminders(data as MessageReminder[]);
  }

  async function dismiss(id: string) {
    await supabase.from('message_reminders').update({ is_dismissed: true }).eq('id', id);
    setDueReminders(prev => prev.filter(r => r.id !== id));
  }

  async function dismissAll() {
    const ids = dueReminders.map(r => r.id);
    await supabase.from('message_reminders').update({ is_dismissed: true }).in('id', ids);
    setDueReminders([]);
  }

  if (dueReminders.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-80">
      {dueReminders.map(reminder => (
        <div
          key={reminder.id}
          className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex flex-col gap-1.5 animate-slide-in"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-3 h-3 text-amber-500" />
              </div>
              <p className="text-xs font-semibold text-gray-700">Reminder</p>
            </div>
            <button
              onClick={() => dismiss(reminder.id)}
              className="p-0.5 text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 pl-7.5">
            From <span className="font-medium text-gray-700">{reminder.message_author}</span>
            <span className="ml-1 text-gray-400">{formatRelativeTime(reminder.remind_at)}</span>
          </p>
          <p className="text-sm text-gray-800 leading-snug line-clamp-2 pl-7.5">
            "{reminder.message_preview}"
          </p>
          <div className="flex items-center justify-end mt-0.5">
            <button
              onClick={() => dismiss(reminder.id)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}

      {dueReminders.length > 1 && (
        <button
          onClick={dismissAll}
          className="text-xs text-center text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg py-2 shadow transition-colors"
        >
          Dismiss all ({dueReminders.length})
        </button>
      )}
    </div>
  );
}
