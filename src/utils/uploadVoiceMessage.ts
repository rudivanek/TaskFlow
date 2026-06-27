import { SupabaseClient } from '@supabase/supabase-js';

export async function uploadVoiceMessage(
  supabase: SupabaseClient,
  blob: Blob,
  userId: string,
  duration: number,
): Promise<{ url: string; duration: number; size: number } | null> {
  const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
  const filename = `${userId}/${Date.now()}-voice.${ext}`;

  const { error } = await supabase.storage
    .from('voice-messages')
    .upload(filename, blob, { contentType: blob.type, upsert: false });

  if (error) {
    console.error('Voice upload failed:', error);
    return null;
  }

  const { data } = supabase.storage.from('voice-messages').getPublicUrl(filename);
  return { url: data.publicUrl, duration, size: blob.size };
}
