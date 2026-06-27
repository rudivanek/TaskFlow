import { useCallback } from 'react';
import { Mic, X } from 'lucide-react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

interface Props {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  disabled?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceRecordButton({ onRecordingComplete, disabled }: Props) {
  const { isRecording, duration, error, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  const handleStart = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (disabled) return;
    await startRecording();
  }, [disabled, startRecording]);

  const handleStop = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isRecording) return;
    const recording = await stopRecording();
    if (recording && recording.duration >= 1) {
      onRecordingComplete(recording.blob, recording.duration);
    }
  }, [isRecording, stopRecording, onRecordingComplete]);

  const handleCancel = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cancelRecording();
  }, [cancelRecording]);

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <button
          onMouseDown={handleCancel}
          onTouchStart={handleCancel}
          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-full flex items-center justify-center transition-colors"
          title="Cancel recording"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-red-600 tabular-nums">{formatDuration(duration)}</span>
        </div>
        <button
          onMouseUp={handleStop}
          onTouchEnd={handleStop}
          className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors animate-pulse"
          title="Release to send"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        onMouseUp={handleStop}
        onTouchEnd={handleStop}
        disabled={disabled}
        className="w-8 h-8 border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 rounded-full flex items-center justify-center transition-colors select-none disabled:opacity-40"
        title="Hold to record voice message"
      >
        <Mic className="w-3.5 h-3.5" />
      </button>
      {error && (
        <p className="text-[10px] text-red-500 mt-1 text-center max-w-[80px]">{error}</p>
      )}
    </div>
  );
}
