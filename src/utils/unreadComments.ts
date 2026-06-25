import { SupabaseClient } from '@supabase/supabase-js';

export async function getUnreadCommentCount(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: readRecord } = await supabase
    .from('project_comments_read')
    .select('last_read_at')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .maybeSingle();

  const lastReadAt = readRecord?.last_read_at ?? '1970-01-01T00:00:00Z';

  const { count } = await supabase
    .from('project_comments')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gt('created_at', lastReadAt);

  return count ?? 0;
}

export async function markDiscussionAsRead(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('project_comments_read')
    .upsert(
      { user_id: userId, project_id: projectId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,project_id' },
    );
}
