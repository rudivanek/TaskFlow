import { SupabaseClient } from '@supabase/supabase-js';

export async function getUnreadCommentCount(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: comments } = await supabase
    .from('project_comments')
    .select('id')
    .eq('project_id', projectId);
  if (!comments || comments.length === 0) return 0;

  const commentIds = comments.map((c: { id: string }) => c.id);

  const { data: reads } = await supabase
    .from('project_comment_reads')
    .select('comment_id')
    .eq('user_id', user.id)
    .in('comment_id', commentIds);

  const readSet = new Set((reads ?? []).map((r: { comment_id: string }) => r.comment_id));
  return commentIds.filter(id => !readSet.has(id)).length;
}

export async function getReadCommentIds(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<Set<string>> {
  const { data: comments } = await supabase
    .from('project_comments')
    .select('id')
    .eq('project_id', projectId);
  if (!comments || comments.length === 0) return new Set();

  const commentIds = comments.map((c: { id: string }) => c.id);

  const { data: reads } = await supabase
    .from('project_comment_reads')
    .select('comment_id')
    .eq('user_id', userId)
    .in('comment_id', commentIds);

  return new Set((reads ?? []).map((r: { comment_id: string }) => r.comment_id));
}

export async function markCommentAsRead(
  supabase: SupabaseClient,
  commentId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('project_comment_reads')
    .upsert({ user_id: userId, comment_id: commentId }, { onConflict: 'user_id,comment_id' });
}

export async function markAllCommentsAsRead(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<void> {
  const { data: comments } = await supabase
    .from('project_comments')
    .select('id')
    .eq('project_id', projectId);
  if (!comments || comments.length === 0) return;

  const rows = comments.map((c: { id: string }) => ({ user_id: userId, comment_id: c.id }));
  await supabase
    .from('project_comment_reads')
    .upsert(rows, { onConflict: 'user_id,comment_id' });
}
