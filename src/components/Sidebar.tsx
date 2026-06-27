import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Workspace, Project } from '../types';
import * as workspaceServices from '../services/workspaceServices';
import * as projectServices from '../services/projectServices';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Star,
  Trash2,
  MoreHorizontal,
  FolderOpen,
  Archive,
  RotateCcw,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadByProject?: Record<string, number>;
  onProjectsLoaded?: (projectIds: string[]) => void;
}

export default function Sidebar({ selectedProjectId, onSelectProject, collapsed, onToggleCollapse, unreadByProject = {}, onProjectsLoaded }: SidebarProps) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [deletedWorkspaces, setDeletedWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [showTrash, setShowTrash] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newProjectWorkspaceId, setNewProjectWorkspaceId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'workspace' | 'project'; id: string } | null>(null);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dropTargetWorkspaceId, setDropTargetWorkspaceId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved) : 280;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(Math.max(200, e.clientX), window.innerWidth * 0.5);
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebar-width', String(newWidth));
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const loadData = async () => {
    if (!user) return;
    try {
      const ws = await workspaceServices.fetchWorkspaces(user.id);
      setWorkspaces(ws);
      const deletedWs = await workspaceServices.fetchDeletedWorkspaces();
      setDeletedWorkspaces(deletedWs);
      if (ws.length > 0) {
        setExpandedWorkspaces(new Set(ws.map(w => w.id)));
        const prjs = await projectServices.fetchProjects(ws.map(w => w.id), true);
        setProjects(prjs);
        // Report all active project IDs so App.tsx can load unread counts
        const activeIds = prjs.filter(p => !p.deleted).map(p => p.id);
        if (activeIds.length > 0) onProjectsLoaded?.(activeIds);
      }
    } catch (err) {
      console.error('Failed to load sidebar data:', err);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!user || !newWorkspaceName.trim()) return;
    try {
      await workspaceServices.createWorkspace(newWorkspaceName.trim(), user.id);
      setNewWorkspaceName('');
      setShowNewWorkspace(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (workspaceId: string) => {
    if (!newProjectName.trim()) return;
    try {
      const p = await projectServices.createProject(workspaceId, newProjectName.trim());
      setNewProjectName('');
      setNewProjectWorkspaceId(null);
      await loadData();
      onSelectProject(p.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    try {
      await workspaceServices.deleteWorkspace(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete workspace');
    }
  };

  const handleRestoreWorkspace = async (id: string) => {
    try {
      await workspaceServices.restoreWorkspace(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDeleteWorkspace = async (id: string) => {
    if (!confirm('Permanently delete this workspace and all its projects? This cannot be undone.')) return;
    try {
      await workspaceServices.permanentlyDeleteWorkspace(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameWorkspace = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await workspaceServices.updateWorkspace(id, editName.trim());
      setEditingWorkspaceId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameProject = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await projectServices.updateProject(id, { project: editName.trim() } as any);
      setEditingProjectId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await projectServices.deleteProject(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreProject = async (id: string) => {
    try {
      await projectServices.restoreProject(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Permanently delete this project? This cannot be undone.')) return;
    try {
      await projectServices.permanentlyDeleteProject(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateProject = async (id: string) => {
    try {
      await projectServices.duplicateProject(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    try {
      await projectServices.toggleFavorite(id, current);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveProject = async (projectId: string, targetWorkspaceId: string) => {
    try {
      await projectServices.moveProjectToWorkspace(projectId, targetWorkspaceId);
      setExpandedWorkspaces(prev => new Set([...prev, targetWorkspaceId]));
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePrivate = async (workspaceId: string, currentIsPrivate: boolean) => {
    const newIsPrivate = !currentIsPrivate;
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, private: newIsPrivate } : w));
    try {
      await workspaceServices.toggleWorkspacePrivate(workspaceId, newIsPrivate);
    } catch (err) {
      console.error(err);
      setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, private: currentIsPrivate } : w));
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'workspace' | 'project', id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const favoriteProjects = projects.filter(p => p.favorite && !p.deleted);
  const trashedProjects = projects.filter(p => p.deleted);
  const totalTrashed = trashedProjects.length + deletedWorkspaces.length;

  if (collapsed) {
    return (
      <div className="h-full w-12 bg-white border-r border-slate-200 flex flex-col items-center py-4">
        <button onClick={onToggleCollapse} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <PanelLeftOpen className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex" style={{ width: sidebarWidth }}>
      <div className="flex-1 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">Workspaces</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewWorkspace(true)}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              title="New workspace"
            >
              <Plus className="w-4 h-4 text-slate-500" />
            </button>
            <button onClick={onToggleCollapse} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors">
              <PanelLeftClose className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Favorites */}
          {favoriteProjects.length > 0 && (
            <div className="mb-3">
              <div className="px-2 py-1 text-xs font-medium text-slate-400 uppercase tracking-wider">Favorites</div>
              {favoriteProjects.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                    selectedProjectId === p.id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                  <span className="truncate flex-1">{p.project}</span>
                  {(unreadByProject[p.id] ?? 0) > 0 && (
                    <span className="flex-shrink-0 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {(unreadByProject[p.id] ?? 0) > 9 ? '9+' : unreadByProject[p.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* New workspace input */}
          {showNewWorkspace && (
            <div className="px-2 py-1 flex items-center gap-1">
              <input
                autoFocus
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWorkspace();
                  if (e.key === 'Escape') { setShowNewWorkspace(false); setNewWorkspaceName(''); }
                }}
                placeholder="Workspace name"
                className="flex-1 text-sm px-2 py-1 border border-slate-200 rounded"
              />
              <button onClick={handleCreateWorkspace} className="p-1 text-primary-600 hover:bg-primary-50 rounded">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Workspaces list */}
          {workspaces.map(ws => {
            const wsProjects = projects.filter(p => p.workspace_id === ws.id && !p.deleted);
            const isExpanded = expandedWorkspaces.has(ws.id);

            return (
              <div key={ws.id}>
                <div
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-slate-50 group cursor-pointer transition-colors ${
                    dropTargetWorkspaceId === ws.id ? 'bg-primary-50 ring-1 ring-primary-300' : ''
                  }`}
                  onContextMenu={(e) => handleContextMenu(e, 'workspace', ws.id)}
                  onDragOver={(e) => {
                    if (!draggingProjectId) return;
                    e.preventDefault();
                    const draggingProject = projects.find(p => p.id === draggingProjectId);
                    if (draggingProject?.workspace_id !== ws.id) {
                      setDropTargetWorkspaceId(ws.id);
                    }
                  }}
                  onDragLeave={() => setDropTargetWorkspaceId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!draggingProjectId) return;
                    const draggingProject = projects.find(p => p.id === draggingProjectId);
                    if (draggingProject && draggingProject.workspace_id !== ws.id) {
                      handleMoveProject(draggingProjectId, ws.id);
                    }
                    setDraggingProjectId(null);
                    setDropTargetWorkspaceId(null);
                  }}
                >
                  <button onClick={() => toggleWorkspace(ws.id)} className="p-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {editingWorkspaceId === ws.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameWorkspace(ws.id);
                        if (e.key === 'Escape') setEditingWorkspaceId(null);
                      }}
                      onBlur={() => handleRenameWorkspace(ws.id)}
                      className="flex-1 text-sm px-1 py-0 border border-primary-300 rounded"
                    />
                  ) : (
                    <span
                      className="flex-1 text-sm font-medium text-slate-700 truncate flex items-center gap-1"
                      onDoubleClick={() => { setEditingWorkspaceId(ws.id); setEditName(ws.workspace); }}
                    >
                      {ws.workspace}
                      {ws.private && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                    </span>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); setNewProjectWorkspaceId(ws.id); }}
                    className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-opacity"
                    title="Add project"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    onClick={(e) => handleContextMenu(e, 'workspace', ws.id)}
                    className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-opacity"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-4 space-y-0.5">
                    {newProjectWorkspaceId === ws.id && (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <input
                          autoFocus
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateProject(ws.id);
                            if (e.key === 'Escape') { setNewProjectWorkspaceId(null); setNewProjectName(''); }
                          }}
                          placeholder="Project name"
                          className="flex-1 text-sm px-2 py-1 border border-slate-200 rounded"
                        />
                      </div>
                    )}

                    {wsProjects.map(p => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingProjectId(p.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggingProjectId(null);
                          setDropTargetWorkspaceId(null);
                        }}
                        onClick={() => onSelectProject(p.id)}
                        onContextMenu={(e) => handleContextMenu(e, 'project', p.id)}
                        onDoubleClick={() => { setEditingProjectId(p.id); setEditName(p.project); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors cursor-pointer select-none ${
                          draggingProjectId === p.id
                            ? 'opacity-40'
                            : selectedProjectId === p.id
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                        {editingProjectId === p.id ? (
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameProject(p.id);
                              if (e.key === 'Escape') setEditingProjectId(null);
                            }}
                            onBlur={() => handleRenameProject(p.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-sm px-1 py-0 border border-primary-300 rounded"
                          />
                        ) : (
                          <span className="truncate flex-1">{p.project}</span>
                        )}
                        {p.favorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        {(unreadByProject[p.id] ?? 0) > 0 && (
                          <span className="flex-shrink-0 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                            {(unreadByProject[p.id] ?? 0) > 9 ? '9+' : unreadByProject[p.id]}
                          </span>
                        )}
                      </div>
                    ))}

                    {wsProjects.length === 0 && !newProjectWorkspaceId && (
                      <div className="px-2 py-1 text-xs text-slate-400 italic">No projects</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {workspaces.length === 0 && !showNewWorkspace && (
            <div className="px-2 py-8 text-center text-sm text-slate-400">
              <p>No workspaces yet</p>
              <button
                onClick={() => setShowNewWorkspace(true)}
                className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                Create your first workspace
              </button>
            </div>
          )}
        </div>

        {/* Trash toggle */}
        <div className="border-t border-slate-100 p-2">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              showTrash ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Trash</span>
            {totalTrashed > 0 && (
              <span className="ml-auto text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                {totalTrashed}
              </span>
            )}
          </button>

          {showTrash && (deletedWorkspaces.length > 0 || trashedProjects.length > 0) && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {deletedWorkspaces.map(ws => (
                <div key={ws.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500">
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block font-medium">{ws.workspace}</span>
                    <span className="text-xs text-slate-400">Workspace</span>
                  </div>
                  <button
                    onClick={() => handleRestoreWorkspace(ws.id)}
                    className="p-1 hover:bg-green-50 hover:text-green-600 rounded"
                    title="Restore workspace"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handlePermanentDeleteWorkspace(ws.id)}
                    className="p-1 hover:bg-red-50 hover:text-red-600 rounded"
                    title="Delete permanently"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {trashedProjects.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500">
                  <span className="truncate flex-1">{p.project}</span>
                  <button
                    onClick={() => handleRestoreProject(p.id)}
                    className="p-1 hover:bg-green-50 hover:text-green-600 rounded"
                    title="Restore"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(p.id)}
                    className="p-1 hover:bg-red-50 hover:text-red-600 rounded"
                    title="Delete permanently"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={() => setIsResizing(true)}
        className="w-1 cursor-col-resize hover:bg-primary-300 transition-colors"
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'workspace' && (
            <>
              <button
                onClick={() => {
                  const ws = workspaces.find(w => w.id === contextMenu.id);
                  if (ws) { setEditingWorkspaceId(ws.id); setEditName(ws.workspace); }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 text-slate-700"
              >
                Rename
              </button>
              {(() => {
                const ws = workspaces.find(w => w.id === contextMenu.id);
                const isOwner = !ws || ws.user_id === user?.id;
                return isOwner && ws ? (
                  <button
                    onClick={() => { handleTogglePrivate(ws.id, ws.private); setContextMenu(null); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    {ws.private ? 'Make Public' : 'Make Private'}
                  </button>
                ) : null;
              })()}
              <button
                onClick={() => { handleDeleteWorkspace(contextMenu.id); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600"
              >
                Delete
              </button>
            </>
          )}
          {contextMenu.type === 'project' && (
            <>
              <button
                onClick={() => {
                  const p = projects.find(pr => pr.id === contextMenu.id);
                  if (p) { setEditingProjectId(p.id); setEditName(p.project); }
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 text-slate-700"
              >
                Rename
              </button>
              <button
                onClick={() => { handleDuplicateProject(contextMenu.id); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 text-slate-700"
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  const p = projects.find(pr => pr.id === contextMenu.id);
                  if (p) handleToggleFavorite(p.id, p.favorite);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 text-slate-700"
              >
                {projects.find(p => p.id === contextMenu.id)?.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </button>
              <hr className="my-1 border-slate-100" />
              <button
                onClick={() => { handleDeleteProject(contextMenu.id); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600"
              >
                Move to Trash
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
