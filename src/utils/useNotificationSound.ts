import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

let _soundEnabled = true;
let _audioCtx: AudioContext | null = null;
let _preferenceLoaded = false;

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number, gain: number) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function scheduleChime(ctx: AudioContext) {
  const now = ctx.currentTime;
  playTone(ctx, 880, now, 0.3, 0.15);
  playTone(ctx, 1108.73, now + 0.15, 0.4, 0.1);
}

export function useNotificationSound() {
  useEffect(() => {
    if (_preferenceLoaded) return;
    _preferenceLoaded = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('sound_enabled')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) _soundEnabled = data.sound_enabled;
        });
    });
  }, []);

  const playChime = useCallback(() => {
    if (!_soundEnabled) return;
    try {
      if (!_audioCtx) _audioCtx = new AudioContext();
      const ctx = _audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => scheduleChime(ctx)).catch(() => {});
      } else {
        scheduleChime(ctx);
      }
    } catch (err) {
      console.warn('Could not play notification sound:', err);
    }
  }, []);

  const updateSoundEnabled = useCallback((enabled: boolean) => {
    _soundEnabled = enabled;
  }, []);

  return { playChime, updateSoundEnabled };
}
