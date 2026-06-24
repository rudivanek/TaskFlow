import { supabase } from '../lib/supabase';
import { Project } from '../types';

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
