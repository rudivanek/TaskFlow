import { supabase } from '../lib/supabase';
import { Project, ProjectComment } from '../types';

export async function fetchProjects(workspaceIds: string[], showDeleted = false): Promise<Project[]> {
  if (workspaceIds.length === 0) return [];
  let query = supabase
    .from('projects')
    .select('*')
    .in('workspace_id', workspaceIds);
  if (!showDeleted) {
    query = query.eq('deleted', false);
  }
  const { data, error } = await query.order('project', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createProject(workspaceId: string, name: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ project: name, workspace_id: workspaceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  const { error } = await supabase.from('projects').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ deleted: true }).eq('id', id);
  if (error) throw error;
}

export async function restoreProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ deleted: false }).eq('id', id);
  if (error) throw error;
}

export async function permanentlyDeleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateProject(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('duplicate_project', { p_project_id: id });
  if (error) throw error;
  return data;
}

export async function toggleFavorite(id: string, currentValue: boolean): Promise<void> {
  const { error } = await supabase.from('projects').update({ favorite: !currentValue }).eq('id', id);
  if (error) throw error;
}

export async function moveProjectToWorkspace(projectId: string, targetWorkspaceId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ workspace_id: targetWorkspaceId })
    .eq('id', projectId);
  if (error) throw error;
}

export async function fetchProjectComments(projectId: string): Promise<ProjectComment[]> {
  const { data, error } = await supabase
    .from('project_comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addProjectComment(projectId: string, userId: string, content: string): Promise<ProjectComment> {
  const { data, error } = await supabase
    .from('project_comments')
    .insert({ project_id: projectId, user_id: userId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addProjectDiscussionComment(
  projectId: string,
  userId: string,
  authorName: string,
  content: string,
  taskId: string | null,
): Promise<ProjectComment> {
  const { data, error } = await supabase
    .from('project_comments')
    .insert({ project_id: projectId, user_id: userId, author_name: authorName, content, task_id: taskId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProjectComment(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('project_comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProjectComment(id: string): Promise<void> {
  const { error } = await supabase.from('project_comments').delete().eq('id', id);
  if (error) throw error;
}
