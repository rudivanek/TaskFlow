import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns count of comments relevant to the current user that have not been
 * individually marked as read. A comment is "relevant" when notify_all = true
 * OR the user's id appears in notified_user_ids. Own messages are never counted.
 */
export async function getUnreadCommentCount(
  supabase: SupabaseClient,
  projectId: string,
): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // Fetch relevant comments (not own, addressed to me or everyone)
  const { data: relevant } = await supabase
    .from('project_comments')
    .select('id')
    .eq('project_id', projectId)
    .neq('user_id', user.id)
    .or(`notify_all.eq.true,notified_user_ids.cs.{${user.id}}`);

  if (!relevant || relevant.length === 0) return 0;

  const relevantIds = relevant.map((c: { id: string }) => c.id);

  const { data: reads } = await supabase
    .from('project_comment_reads')
    .select('comment_id')
    .eq('user_id', user.id)
    .in('comment_id', relevantIds);

  const readSet = new Set((reads ?? []).map((r: { comment_id: string }) => r.comment_id));
  return relevantIds.filter(id => !readSet.has(id)).length;
}

/**
 * Returns the set of comment IDs the current user has already marked as read
 * for any comments within a project (used for UI display).
 */
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

/**
 * Marks only comments relevant to userId as read (notify_all or specifically targeted).
 * Own messages are skipped — they are auto-marked on post.
 */
export async function markAllRelevantCommentsAsRead(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<void> {
  const { data: relevant } = await supabase
    .from('project_comments')
    .select('id')
    .eq('project_id', projectId)
    .neq('user_id', userId)
    .or(`notify_all.eq.true,notified_user_ids.cs.{${userId}}`);

  if (!relevant || relevant.length === 0) return;

  const rows = relevant.map((c: { id: string }) => ({ user_id: userId, comment_id: c.id }));
  await supabase
    .from('project_comment_reads')
    .upsert(rows, { onConflict: 'user_id,comment_id' });
}
