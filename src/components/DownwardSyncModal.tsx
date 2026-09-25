import { X } from 'lucide-react';
import { useIsMobile } from '../utils/isMobile';

export interface DownwardSubtaskInfo {
  id: string;
  subtask_name: string;
  currentStatusName: string;
}

interface DownwardSyncModalProps {
  newStatusName: string;
  subtasksToChange: DownwardSubtaskInfo[];
  totalSubtasks: number;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function DownwardSyncModal({
  newStatusName,
  subtasksToChange,
  totalSubtasks,
  onConfirm,
  onDismiss,
}: DownwardSyncModalProps) {
  const mobile = useIsMobile();
  const n = subtasksToChange.length;

  if (mobile) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onDismiss} />
        <div className="relative bg-white rounded-t-2xl shadow-xl w-full max-w-md mx-4 p-6 pb-8 max-h-[80vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Update subtasks too?</h3>
            <button onClick={onDismiss} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <p className="text-[13px] text-slate-500 mb-4">
            Set <span className="font-semibold text-slate-700">{n}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalSubtasks}</span> subtasks to{' '}
            <span className="font-semibold text-slate-700">{newStatusName}</span>?
          </p>
          <div className="max-h-40 overflow-y-auto mb-5 space-y-1">
            {subtasksToChange.map(s => (
              <div key={s.id} className="flex items-center justify-between text-[12px] py-1 px-2 rounded bg-slate-50">
                <span className="truncate flex-1 text-slate-600">{s.subtask_name}</span>
                <span className="text-slate-400 ml-2 flex-shrink-0">
                  {s.currentStatusName} <span className="text-slate-300">→</span>{' '}
                  <span className="text-slate-600 font-medium">{newStatusName}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onConfirm}
              className="min-h-[44px] px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Yes, update subtasks
            </button>
            <button
              onClick={onDismiss}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              No, only main task
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-slate-800">Update subtasks too?</h3>
          <button onClick={onDismiss} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <p className="text-[13px] text-slate-500 mb-4">
          Set <span className="font-semibold text-slate-700">{n}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalSubtasks}</span> subtasks to{' '}
          <span className="font-semibold text-slate-700">{newStatusName}</span>?
        </p>
        <div className="max-h-40 overflow-y-auto mb-5 space-y-1">
          {subtasksToChange.map(s => (
            <div key={s.id} className="flex items-center justify-between text-[12px] py-1 px-2 rounded bg-slate-50">
              <span className="truncate flex-1 text-slate-600">{s.subtask_name}</span>
              <span className="text-slate-400 ml-2 flex-shrink-0">
                {s.currentStatusName} <span className="text-slate-300">→</span>{' '}
                <span className="text-slate-600 font-medium">{newStatusName}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            No, only main task
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-[13px] font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Yes, update subtasks
          </button>
        </div>
      </div>
    </div>
  );
}
