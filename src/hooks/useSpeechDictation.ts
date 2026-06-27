import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechDictationOptions {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  language?: string;
}

export function useSpeechDictation({ onTranscript, onError, onListeningChange, language = 'en-US' }: UseSpeechDictationOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
      onListeningChange?.(true);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        onTranscript(final.trim());
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access denied. Please allow microphone permission.',
        'network': 'Network error during speech recognition.',
        'audio-capture': 'No microphone found.',
        'service-not-allowed': 'Speech recognition service not allowed.',
      };
      onError?.(errorMessages[event.error] ?? `Speech error: ${event.error}`);
      setIsListening(false);
      setInterimTranscript('');
      onListeningChange?.(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      onListeningChange?.(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start error:', err);
      setIsListening(false);
    }
  }, [onTranscript, onError, onListeningChange, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
    onListeningChange?.(false);
  }, [onListeningChange]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return { isListening, isSupported, interimTranscript, toggleListening, stopListening };
}
