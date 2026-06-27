import { supabase } from '../lib/supabase';
import { Workspace } from '../types';

export async function fetchWorkspaces(_userId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('deleted', false)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchDeletedWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('deleted', true)
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
  // Soft-delete all projects in the workspace first
  await supabase.from('projects').update({ deleted: true }).eq('workspace_id', id);
  // Then soft-delete the workspace itself
  const { error } = await supabase.from('workspaces').update({ deleted: true }).eq('id', id);
  if (error) throw error;
}

export async function restoreWorkspace(id: string): Promise<void> {
  // Restore all projects that belong to this workspace
  await supabase.from('projects').update({ deleted: false }).eq('workspace_id', id);
  // Restore the workspace
  const { error } = await supabase.from('workspaces').update({ deleted: false }).eq('id', id);
  if (error) throw error;
}

export async function permanentlyDeleteWorkspace(id: string): Promise<void> {
  // Hard-delete all projects first (cascade will handle tasks)
  const { data: projectIds } = await supabase
    .from('projects')
    .select('id')
    .eq('workspace_id', id);
  if (projectIds && projectIds.length > 0) {
    await supabase.from('projects').delete().eq('workspace_id', id);
  }
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  if (error) throw error;
}

export async function updateWorkspacesOrder(workspaces: { id: string; sort_order: number }[]): Promise<void> {
  for (const ws of workspaces) {
    await supabase.from('workspaces').update({ sort_order: ws.sort_order }).eq('id', ws.id);
  }
}

export async function toggleWorkspacePrivate(id: string, isPrivate: boolean): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .update({ private: isPrivate })
    .eq('id', id);
  if (error) throw error;
}
