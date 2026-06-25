import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadDiscussionImage(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'png';
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('discussion-images')
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('Image upload failed:', error);
    return null;
  }

  const { data } = supabase.storage
    .from('discussion-images')
    .getPublicUrl(filename);

  return data.publicUrl;
}
