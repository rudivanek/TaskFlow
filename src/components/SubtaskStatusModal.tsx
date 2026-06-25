import { X } from 'lucide-react';

interface SubtaskStatusModalProps {
  suggestedStatusName: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function SubtaskStatusModal({ suggestedStatusName, onConfirm, onDismiss }: SubtaskStatusModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-slate-800">Update task status?</h3>
          <button onClick={onDismiss} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <p className="text-[13px] text-slate-500 mb-5">
          All subtasks are{' '}
          <span className="font-semibold text-slate-700">{suggestedStatusName}</span>.
          Would you like to change the task status to{' '}
          <span className="font-semibold text-slate-700">{suggestedStatusName}</span>?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Don't Change
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-[13px] font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Change Status
          </button>
        </div>
      </div>
    </div>
  );
}
