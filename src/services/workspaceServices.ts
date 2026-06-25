import { supabase } from '../lib/supabase';
import { Workspace } from '../types';

export async function fetchWorkspaces(_userId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createWorkspace(name: string, userId: string): Promise<Workspace> {
  const { data: existing } = await supabase
    .from('workspaces')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('workspaces')
    .insert({ workspace: name, user_id: userId, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkspace(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .update({ workspace: name })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('workspace_id', id)
    .limit(1);
  if (projects && projects.length > 0) {
    throw new Error('Cannot delete workspace that contains projects');
  }
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  if (error) throw error;
}

export async function updateWorkspacesOrder(workspaces: { id: string; sort_order: number }[]): Promise<void> {
  for (const ws of workspaces) {
    await supabase.from('workspaces').update({ sort_order: ws.sort_order }).eq('id', ws.id);
  }
}
