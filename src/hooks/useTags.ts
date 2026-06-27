import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Tag {
  id: string;
  name: string;
  color: string;
  project_id: string | null;
  created_by: string | null;
}

// ─── project-level tags list ─────────────────────────────────────────────────

export function useTags(projectId: string | undefined) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    supabase
      .from('tags')
      .select('*')
      .or(`project_id.is.null,project_id.eq.${projectId}`)
      .order('name')
      .then(({ data }) => {
        if (data) setTags(data as Tag[]);
        setLoading(false);
      });
  }, [projectId]);

  const createTag = useCallback(async (
    name: string,
    color: string,
    isGlobal: boolean,
  ): Promise<Tag | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: name.trim(), color, project_id: isGlobal ? null : projectId, created_by: user.id })
      .select()
      .single();

    if (error || !data) { console.error('Failed to create tag:', error); return null; }

    const tag = data as Tag;
    setTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    return tag;
  }, [projectId]);

  return { tags, loading, createTag };
}

// ─── batch fetch for all task tags in a project ──────────────────────────────

export async function fetchTaskTagsForTasks(taskIds: string[]): Promise<Record<string, Tag[]>> {
  if (!taskIds.length) return {};
  const { data } = await supabase
    .from('task_tags')
    .select('task_id, tags(*)')
    .in('task_id', taskIds);

  const grouped: Record<string, Tag[]> = {};
  if (data) {
    (data as unknown as { task_id: string; tags: Tag | null }[]).forEach(r => {
      if (!grouped[r.task_id]) grouped[r.task_id] = [];
      if (r.tags) grouped[r.task_id].push(r.tags);
    });
  }
  return grouped;
}

// ─── per-task tag assignment ──────────────────────────────────────────────────

export function useTaskTags(taskId: string, initialTags: Tag[]) {
  const [taskTags, setTaskTags] = useState<Tag[]>(initialTags);

  useEffect(() => {
    setTaskTags(initialTags);
  }, [taskId]); // reset when task changes; initialTags are loaded before render

  const addTag = useCallback(async (tagId: string, tag: Tag) => {
    const { error } = await supabase.from('task_tags').insert({ task_id: taskId, tag_id: tagId });
    if (!error) setTaskTags(prev => [...prev, tag]);
  }, [taskId]);

  const removeTag = useCallback(async (tagId: string) => {
    await supabase.from('task_tags').delete().eq('task_id', taskId).eq('tag_id', tagId);
    setTaskTags(prev => prev.filter(t => t.id !== tagId));
  }, [taskId]);

  return { taskTags, addTag, removeTag };
}
