import { useState } from 'react';
import { AudioLines, MicOff } from 'lucide-react';
import { useSpeechDictation } from '../../hooks/useSpeechDictation';

interface Props {
  onTranscript: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  disabled?: boolean;
}

export function DictationButton({ onTranscript, onListeningChange, disabled }: Props) {
  const [error, setError] = useState<string | null>(null);

  const { isListening, isSupported, interimTranscript, toggleListening } = useSpeechDictation({
    onTranscript,
    onListeningChange,
    onError: (err) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    },
  });

  if (!isSupported) return null;

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? 'Stop dictation' : 'Start dictation (speech to text)'}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all select-none ${
          isListening
            ? 'bg-blue-500 text-white shadow-md shadow-blue-200 scale-110'
            : 'border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-500'
        } disabled:opacity-40`}
      >
        {isListening ? <MicOff className="w-3.5 h-3.5" /> : <AudioLines className="w-3.5 h-3.5" />}
      </button>

      {isListening && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}

      {isListening && interimTranscript && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap max-w-[200px] truncate z-50 shadow-lg">
          <span className="opacity-70 italic">{interimTranscript}</span>
        </div>
      )}

      {error && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap max-w-[220px] z-50 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
