export interface Task {
  id: string;
  task_id: number;
  task_sort: number;
  task_name: string;
  depends_on_task_id: number | null;
  depends_on_task_ids: number[] | null;
  dependencies_task_ids: number[] | null;
  phase_id: string | null;
  status_id: string | null;
  responsible_id: string | null;
  start_date: string;
  days: number;
  end_date: string;
  task_comment: string;
  project_id: string | null;
  user_id: string | null;
}

export interface Subtask {
  id: string;
  subtask_sort: number;
  task_main_id: string;
  subtask_name: string;
  not_started: boolean;
  doing: boolean;
  done: boolean;
  user_id: string | null;
}

export interface Phase {
  id: string;
  phase: string;
  sort_order: number;
}

export interface Status {
  id: string;
  status: string;
  sort_order: number;
}

export interface Responsible {
  id: string;
  responsible: string;
  sort_order: number;
}

export interface Workspace {
  id: string;
  workspace: string;
  user_id: string;
  sort_order: number;
  private: boolean;
}

export interface Project {
  id: string;
  project: string;
  workspace_id: string;
  deleted: boolean;
  favorite: boolean;
}

export interface ProjectComment {
  id: string;
  project_id: string;
  parent_id: string | null;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
  task_id: string | null;
  notify_all: boolean;
  notified_user_ids: string[];
}

export interface Profile {
  id: string;
  email: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}
