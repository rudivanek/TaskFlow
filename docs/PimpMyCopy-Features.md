# PimpMyCopy Features Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-06-24T10:00:00Z

---

## 1. TaskFlow - Simplified Task Management Tool

### 1.1 Overview
A streamlined project management application built with React + Vite + Tailwind CSS + Supabase. It focuses on core task management with workspace/project/task/subtask hierarchy.

### 1.2 Authentication
- Email/password sign-in and sign-up via Supabase Auth
- Password reset via email
- Session persistence with auto-refresh tokens
- Auth guard redirecting unauthenticated users to sign-in page
- User profile auto-created on signup via database trigger

### 1.3 Sidebar Navigation
- Resizable sidebar (200px - 50% viewport, persists width in localStorage)
- Collapsible with toggle button
- Workspaces section with expand/collapse chevrons
- Projects listed alphabetically within each workspace
- **Drag & Drop project between workspaces**: drag a project row and drop it onto any workspace header to move it; the dragged item becomes semi-transparent, the target workspace header highlights in blue, and the target workspace auto-expands after the move
- Favorites section at top showing starred projects
- Trash/Recycle bin section for soft-deleted projects with restore/permanent delete
- Context menus on right-click:
  - Workspaces: Rename, Delete (blocks if has projects)
  - Projects: Rename, Duplicate, Add to Favorites, Move to Trash
- Inline renaming on double-click
- Create workspace/project via inline input fields

### 1.4 Task Grid View
- Spreadsheet-like table with 12 columns: Expand, ID, Sort ID, Task Name, Phase, Status, Responsible, Start Date, Days, End Date, Depends On, Actions
- Sortable columns: click **ID** or **Sort ID** headers to sort ascending/descending; active sort direction shown with chevron icon
- Inline editing for all fields
- Date auto-calculation: end_date = start_date + (days - 1)
- Dependency field accepts comma-separated task IDs
- Search by task name and filter by status
- Expandable subtasks below each task row
- Add Task button and Alt+N keyboard shortcut
- Delete validation (blocks if other tasks depend on this one)
- Task comment toggle per row

### 1.5 Subtasks
- Expandable list below parent task
- Status cycle on click: Not Started -> Doing -> Done -> Not Started
- Strikethrough styling when done
- Add/delete subtasks inline
- Color-coded status badges

### 1.6 Kanban Board View
- One column per status (from statuses table, ordered by sort_order)
- Column headers with status name and task count badge
- Task cards showing: ID badge, task name (2-line clamp), phase badge, responsible, date range, comment indicator
- Color coding: red (overdue), amber (due today), blue (due within 3 days)
- Drag-and-drop between columns to change status
- Click card to open full detail modal
- Search filter toolbar

### 1.7 Kanban Task Detail Modal
- Full task editing form (all fields)
- Subtask management within modal
- Save/Cancel/Delete buttons
- Escape key to close

### 1.8 Gantt Chart View (Interactive)
- Minimal, clean timeline visualization of all tasks in a project
- Fixed task label column on the left with task ID and name
- Scrollable timeline area with day/month headers
- Task bars color-coded by status (green=done, blue=in progress, purple=in review, red=blocked, gray=not started)
- Dependency arrows drawn as SVG paths between connected tasks with arrowhead markers
- Hover highlighting: hovering a task highlights its bar and all connected dependency lines in blue
- Today marker shown as a dashed blue vertical line
- Week-start grid lines for orientation
- Zoom controls (4 levels) to adjust the day column width
- Task bars show the task name when wide enough
- Tooltip on hover showing task ID, name, date range, and duration
- Interactive drag-to-resize: drag left edge to change start date, drag right edge to change end date
- Interactive drag-to-move: drag the bar center to shift both start and end dates while keeping duration
- Visual resize handles appear on hover (vertical pill indicators on bar edges)
- Live preview tooltip showing new dates/duration during drag
- On drop, persists changes to Supabase and automatically cascades dependency dates to downstream tasks
- Changes are reflected in the Task Grid view (shared data model)
- Ring highlight and elevated shadow on the active dragged bar
- Dependency arrows update positions in real-time during drag

### 1.9 Task Dependencies
- Comma-separated task IDs input
- Validates: no self-reference, tasks must exist in same project, no circular dependencies
- Calls `set_multiple_dependencies` RPC for atomic dependency setting
- Automatic date cascading: when a task's end_date changes, all dependent tasks update via `cascade_dependency_dates` RPC

### 1.10 CSV Data Import
- Bulk project creation from CSV files containing tasks, subtasks, dependencies, phases, statuses, and responsibles
- CSV format supports: Project Name, ID, Sort ID, Type (Task/Subtask), Task Name, Phase, Status, Responsible, Start Date, Days, End Date, Depends On, Dependencies, Comments
- Automatic mapping of lookup values (phases, statuses, responsibles) to existing database entries
- New lookup values (phases, responsibles) are created automatically if they don't exist
- Dependencies stored as integer arrays (depends_on_task_ids, dependencies_task_ids) for bidirectional relationship tracking
- Subtask status mapped from CSV ("Not Started" / "Done") to boolean columns (not_started, doing, done)
- Sort order preserved from CSV Sort ID column

### 1.11 CSV Export
- Export dropdown in the project header menu bar (visible when a project is selected)
- Two export options:
  - **Main Tasks to CSV**: Exports only tasks (no subtasks) with columns: ID, Sort ID, Type, Task, Phase, Status, Responsible, Start Date, Days, End Date, Depends On, Dependencies, Comments
  - **Tasks with Subtasks to CSV**: Exports tasks interleaved with their subtasks; subtask rows have Type="Subtask", ID formatted as `parentId.sortOrder`, and a Status column
- Dates formatted as DD/MM/YYYY in export
- Dependencies exported as semicolon-separated task IDs
- CSV includes BOM for proper Excel/Sheets encoding
- File names include project name and timestamp: `<ProjectName>_tasks_<YYYY-MM-DD_HH-mm-ss>.csv` or `<ProjectName>_tasks_with_subtasks_<YYYY-MM-DD_HH-mm-ss>.csv`
- CSV fields with commas, quotes, or newlines are properly escaped

### 1.12 Gantt Excel Export
- **Export Gantt (Excel)** option in the same Export dropdown
- Produces an .xlsx file structured as a real Gantt chart in Excel using xlsx-js-style (SheetJS with styling support)
- Columns: Project Name, ID, Sort ID, Task, Phase, Status, Responsible, Start Date, End Date, Dependencies, then one column per unique date across all tasks
- Date columns are dynamically generated from the union of all task date ranges, sorted chronologically, headers formatted DD/MM/YYYY
- Each task row has its task ID number in each date column that falls within its start-end range (inclusive), blank otherwise
- Cell styling for date cells with task IDs: background fill #DEDEDE (light gray), font color #DEDEDE (invisible number but still present in cell data)
- Empty date cells (outside task range) remain completely unstyled
- Frozen panes: first row (header) and first 10 columns (task info) are locked; date columns scroll horizontally
- Column widths: Task=40ch, dates=12ch, appropriate widths for other fields
- File downloaded as `<ProjectName>_gantt_<YYYY-MM-DD_HH-mm-ss>.xlsx`

### 1.12 Database Schema
Tables: users, workspaces, projects, tasks_main, tasks_sub, phases, statuses, responsibles
RPC Functions: get_next_task_id_for_project, set_multiple_dependencies, cascade_dependency_dates, duplicate_project
All tables have Row Level Security enabled with per-user access policies.

### 1.11 Design System
- Color palette: Slate/Blue tones (no purple)
- 8px spacing system
- System font stack (Inter preferred)
- Consistent border-radius: 6px for cards, 4px for inputs
- Smooth transitions (150-200ms)
- Hover states and focus rings
- Loading spinners during async operations
- Error toasts for feedback
