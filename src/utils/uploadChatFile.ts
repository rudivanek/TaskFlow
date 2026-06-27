import { SupabaseClient } from '@supabase/supabase-js';

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function getFileIcon(type: string): string {
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('msword')) return '📝';
  if (type.includes('excel') || type.includes('spreadsheet') || type === 'text/csv') return '📊';
  if (type === 'text/plain') return '📃';
  if (type.startsWith('image/')) return '🖼';
  return '📎';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(type: string): boolean {
  return type.startsWith('image/');
}

export async function uploadChatFile(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<{ url: string; name: string; type: string; size: number } | null> {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    alert(`"${file.name}" is not a supported file type.`);
    return null;
  }
  if (file.size > MAX_FILE_SIZE) {
    alert(`"${file.name}" exceeds the 10MB limit and was skipped.`);
    return null;
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const bucket = isImageFile(file.type) ? 'discussion-images' : 'chat-attachments';
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error('File upload failed:', error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return { url: data.publicUrl, name: file.name, type: file.type, size: file.size };
}
