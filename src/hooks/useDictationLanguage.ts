import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const DICTATION_LANGUAGES = [
  { code: 'en-US', label: '🇺🇸 English (US)' },
  { code: 'en-GB', label: '🇬🇧 English (UK)' },
  { code: 'es-ES', label: '🇪🇸 Spanish (Spain)' },
  { code: 'es-MX', label: '🇲🇽 Spanish (Mexico)' },
];

export function useDictationLanguage(userId: string | undefined) {
  const [language, setLanguage] = useState('en-US');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('profiles')
      .select('dictation_language')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.dictation_language) setLanguage(data.dictation_language);
        setLoading(false);
      });
  }, [userId]);

  const updateLanguage = async (code: string) => {
    setLanguage(code);
    if (!userId) return;
    await supabase.from('profiles').update({ dictation_language: code }).eq('id', userId);
  };

  return { language, loading, updateLanguage };
}
