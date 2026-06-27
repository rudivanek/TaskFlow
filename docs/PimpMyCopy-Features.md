# PimpMyCopy Features Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-06-27T20:00:00Z

---

## 1. TaskFlow - Simplified Task Management Tool

### 1.1 Overview
A streamlined project management application built with React + Vite + Tailwind CSS + Supabase. It focuses on core task management with workspace/project/task/subtask hierarchy.

**Locale:** Mexico (es-MX). All dates displayed throughout the app use `dd/mm/yy` format. HTML date inputs use the `es-MX` browser locale (set via `lang="es-MX"` on the `<html>` tag) so pickers render in day/month/year order.

### 1.2 Authentication
- Email/password sign-in and sign-up via Supabase Auth
- Password reset via email
- Session persistence with auto-refresh tokens
- Auth guard redirecting unauthenticated users to sign-in page
- User profile auto-created on signup via database trigger

### 1.2a Shared Data Access Model
- All authenticated users share full read and write access to all workspaces, projects, tasks, subtasks, and comments — regardless of which user created them.
- RLS policies on all tables use `USING (true)` / `WITH CHECK (true)` scoped to `TO authenticated`, so any valid session grants complete access.
- This is intentional: the app operates as a single shared workspace where all collaborators see the same data.

### 1.2b Main Header Bar
- Logo icon (no rounded borders) with app name "TaskFlow" and version badge
- **Active project name** displayed in the header, immediately after the Sharpen.Studio branding, separated by a vertical divider. Updates whenever the selected project changes. Truncated at 220px if the name is long.
- Center: view toggle (Grid / Kanban / Gantt) — visible only when a project is selected
- Right: Export dropdown and user menu

### 1.3 Sidebar Navigation
- Resizable sidebar (200px - 50% viewport, persists width in localStorage)
- Collapsible with toggle button
- Workspaces section with expand/collapse chevrons
- Projects listed alphabetically within each workspace
- **Drag & Drop project between workspaces**: drag a project row and drop it onto any workspace header to move it; the dragged item becomes semi-transparent, the target workspace header highlights in blue, and the target workspace auto-expands after the move
- Favorites section at top showing starred projects
- Trash/Recycle bin section for soft-deleted projects AND soft-deleted workspaces, with restore/permanent delete for each
- Context menus on right-click:
  - Workspaces: Rename, **Make Private / Make Public**, Delete (soft-deletes workspace + all its projects to Trash)
  - Projects: Rename, Duplicate, Add to Favorites, Move to Trash
- **Private Workspaces**: any workspace owner can toggle their workspace between public and private via the right-click context menu. When private, the workspace and all its projects are hidden from other users at the database level (RLS policy: `private = false OR user_id = auth.uid()`). A small lock icon appears inline with the workspace name when it is private. The "Make Private / Make Public" option is only shown in the menu when the current user is the workspace owner (`user_id = auth.uid()`); other users see no toggle option for workspaces they do not own. Toggling is optimistic — the UI updates immediately and reverts on error.
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
- Status row tinting: each row receives a subtle background tint matching its task status (green=Done, blue=In Progress, amber=In Review, red=Blocked; no tint for unset/other statuses)
- **Row keyboard navigation**: while focused on any editable cell (task name, phase, status, responsible, start date, days, end date, or dependencies), pressing ArrowDown moves focus to the same column in the next row; ArrowUp moves to the same column in the previous row. Works across all input types (text, select, date, number). Focus is constrained to the visible rows — navigation stops at the first and last row.

### 1.5 Subtasks
- Expandable list below parent task
- Checkbox to toggle done/not-started; checked = Done, unchecked = Not Started
- Strikethrough styling on task name when done
- Add/delete subtasks inline
- **Suggested parent status flow**: after toggling a subtask, the app evaluates the collective state:
  - All Done → suggests "Done" for the parent task
  - All Not Started → suggests "Not Started" for the parent task
  - Mixed → suggests "Doing" for the parent task
  - If the parent task's current status already matches the suggestion, nothing happens
  - Otherwise a confirmation modal appears: "Would you like to change the task status to X?"
  - User can confirm ("Change Status") or dismiss ("Don't Change"); parent status is never changed automatically
- Works in both Task Grid view and Kanban (via the task detail modal)

### 1.6 Kanban Board View
- One column per status (from statuses table, ordered by sort_order)
- Column headers with status name and task count badge
- Task cards showing: ID badge, task name (2-line clamp), phase badge, responsible, date range, comment indicator
- Color coding: red (overdue), amber (due today), blue (due within 3 days)
- Drag-and-drop between columns to change status
- Click card to open full detail modal
- Search filter toolbar
- Sort toggle: "ID" (by task_id) or "Sort" (by task_sort), each with ascending/descending toggle; matches Task Grid sort behavior

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
- Sort toggle: "ID" (by task_id) or "Sort" (by task_sort), each with ascending/descending toggle; sort state is shared with Task Grid — changing sort in either view updates both
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
Tables: users, workspaces, projects, tasks_main, tasks_sub, phases, statuses, responsibles, project_comments
RPC Functions: get_next_task_id_for_project, set_multiple_dependencies, cascade_dependency_dates, duplicate_project
All tables have Row Level Security enabled. All authenticated users share full access to all data (shared workspace model).

### 1.13 Project Discussion Panel
- Slide-in panel from the right side of the screen (420px wide, full height, z-50)
- Triggered by the "Discussion" button in the project header, next to the Export dropdown
- A semi-transparent backdrop overlay closes the panel on click; panel also has an X close button
- Panel header shows the Discussion icon, the label "Discussion", and the current project name

**Comment feed:**
- Scrollable list of comments ordered by creation time (oldest first)
- Each comment card shows: author initial avatar, author name (bold), relative timestamp (e.g. "2h ago"), comment text
- If the comment is linked to a task, a pill badge shows the task name prefixed with a link icon
- Delete button (trash icon) appears on hover, visible only to the comment's author
- Empty state when no comments exist
- File attachments (images + documents) displayed below comment text using `FileAttachmentList`

**Compose area (pinned at bottom):**
- Optional "Link to task" dropdown populated with all tasks for the current project (task ID + name); first option is blank/none
- Plain textarea for the comment body (Ctrl+Enter submits); paste or drag & drop files directly onto the compose area
- Paperclip (📎) button opens a file picker accepting PDF, Word, Excel, TXT, CSV, and all image types (max 10MB each)
- Pending files shown as thumbnail previews (images) or filename+size cards (documents) above the textarea, with individual remove buttons
- Compose area highlights blue when files are dragged over it
- Post button (send icon); disabled while submitting or when text + files are both empty
- After posting, new comment (with any attachments) is appended to the feed and the form is cleared

**Comment count badge:**
- The "Discussion" header button shows a blue circular badge with the total comment count
- Count is fetched when a project is selected and updated live after each post or delete
- Badge is hidden when count is 0

**Database:**
- Table: `project_comments` with columns: id, project_id, user_id, author_name, content, created_at, updated_at, task_id (FK → tasks_main), image_urls (text[]), file_attachments (jsonb, default `[]`)
- `file_attachments` stores an array of `{ name, url, type, size }` objects for non-image files; images continue to use `image_urls`
- Storage: images go to the `discussion-images` bucket; non-image files go to the `chat-attachments` bucket (public, path: `{userId}/{timestamp}-{random}.{ext}`)
- author_name is stored at post time from user metadata or email
- task_id is nullable; links a comment to a specific task
- RLS: all authenticated users can read, insert, and delete any comment (shared workspace model)

### 1.13a File Attachments in Chat & Discussion

Both the Chat compose area (ChatMain) and the Discussion Panel compose area (ProjectDiscussionPanel) support unified file attachment handling. The same logic applies to inline reply composers in both views.

**Supported file types:**
- Images: PNG, JPEG, GIF, WebP (stored in `discussion-images` bucket, rendered as thumbnails)
- Documents: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), plain text (.txt), CSV (stored in `chat-attachments` bucket, rendered as download cards)

**Upload utility (`src/utils/uploadChatFile.ts`):**
- `uploadChatFile(supabase, file, userId)` — validates type + size, uploads to the correct bucket, returns `{ url, name, type, size }` or `null`
- `ALLOWED_FILE_TYPES` — array of accepted MIME types
- `MAX_FILE_SIZE` — 10MB limit
- `isImageFile(type)` — true if MIME starts with `image/`
- `getFileIcon(type)` — returns emoji icon based on MIME (📄 PDF, 📝 Word, 📊 Excel/CSV, 📃 TXT, 🖼 image, 📎 other)
- `formatFileSize(bytes)` — human-readable size string

**Components:**
- `FileAttachmentPreview` (`src/components/chat/FileAttachmentPreview.tsx`) — shows pending files before posting; images show as 64×64 thumbnails, documents show as filename+size card; each has a hover-reveal red X remove button
- `FileAttachmentList` (`src/components/chat/FileAttachmentList.tsx`) — renders posted attachments; images as 96×96 thumbnails linking to full URL; documents as download cards with icon, filename, size, and download arrow icon

**Interaction patterns:**
- Click paperclip button to open file picker (multi-select, all supported types)
- Paste from clipboard (`Ctrl+V`) to attach pasted files or images
- Drag & drop files onto the compose area (highlighted blue with `bg-blue-50 border-blue-300` while dragging)
- Multiple files per message supported
- Files over 10MB or unsupported types show an alert and are skipped

**Database columns added:**
- `chat_messages.file_attachments` — JSONB, default `[]`
- `project_comments.file_attachments` — JSONB, default `[]`

**Storage bucket:**
- `chat-attachments` (public) — for non-image file types; path: `{userId}/{timestamp}-{random}.{ext}`
- RLS policies: authenticated users can upload and view; owners can delete their own files

### 1.13b Voice Messages in Chat & Discussion

Both the Chat compose area (ChatMain) and the Discussion Panel compose area (ProjectDiscussionPanel) support hold-to-record voice messages. The same logic applies to inline reply composers in both views.

**Recording behavior:**
- Hold the microphone button to start recording (`onMouseDown` / `onTouchStart`); release to stop and attach (`onMouseUp` / `onTouchEnd`)
- While recording: shows a cancel X button, a red pulsing timer badge, and a pulsing red mic button to release
- Recordings under 1 second are discarded silently
- Maximum recording length: 5 minutes (auto-stops at 300 seconds)
- Prefers `audio/webm;codecs=opus`, falls back to `audio/webm`, then `audio/mp4`
- Mic access denied shows a small error message below the button

**Pending voice preview:**
- After recording, a `VoiceMessagePlayer` preview appears above the compose textarea
- An X button revokes the object URL and clears the pending voice state
- Only one pending voice message allowed at a time (microphone button is disabled while one is pending)

**Playback:**
- `VoiceMessagePlayer` (`src/components/chat/VoiceMessagePlayer.tsx`) — blue play/pause circle button + horizontal progress bar + elapsed/total time display
- Shows microphone emoji when paused at start; shows elapsed time while playing
- Plays back using `new Audio(url)` with `ontimeupdate` / `onended` event listeners
- Resets to 0 when playback ends

**Upload utility (`src/utils/uploadVoiceMessage.ts`):**
- `uploadVoiceMessage(supabase, blob, userId, duration)` — uploads to `voice-messages` bucket at path `{userId}/{timestamp}-voice.{ext}`, returns `{ url, duration, size }` or `null`
- File extension: `.m4a` for `audio/mp4`, `.webm` for everything else

**Hook (`src/hooks/useVoiceRecorder.ts`):**
- Exports `useVoiceRecorder()` with state `isRecording`, `duration`, `error` and methods `startRecording()`, `stopRecording()`, `cancelRecording()`
- Uses `resolveRef` pattern to bridge the async `MediaRecorder.onstop` callback with a returned Promise from `stopRecording()`
- Automatically cleans up MediaStream tracks on stop and cancel

**Components:**
- `VoiceRecordButton` (`src/components/chat/VoiceRecordButton.tsx`) — hold-to-record button; uses `useVoiceRecorder` hook; shows recording UI while active
- `VoiceMessagePlayer` (`src/components/chat/VoiceMessagePlayer.tsx`) — play/pause player with progress bar for recorded or received voice messages

**Database columns added:**
- `chat_messages.voice_message` — JSONB nullable, stores `{ url, duration, size }`
- `project_comments.voice_message` — JSONB nullable, stores `{ url, duration, size }`

**Storage bucket:**
- `voice-messages` (public) — path: `{userId}/{timestamp}-voice.{ext}`
- RLS policies: authenticated users can upload and view; owners can delete their own files

### 1.13c Speech-to-Text Dictation in Chat & Discussion

Both the Chat compose area (ChatMain) and the Discussion Panel compose area (ProjectDiscussionPanel) have a microphone dictation button. Clicking it starts speech recognition using the browser's built-in Web Speech API — no external service or API key required. Transcribed text is appended to the compose box for review and editing before sending. Same button applies to inline reply composers in both views.

**Behavior:**
- Click the dictation mic button to start; click again to stop (toggle)
- While listening: button turns blue, a pulsing red dot appears in the top-right corner, and a "Listening... speak now" indicator appears below the textarea
- Interim transcript (words being recognized in real-time) shown in a dark tooltip above the button — disappears when finalized
- Final transcript is appended to the compose box with a space separator; existing content is preserved
- Dictation and voice message recording are mutually exclusive — each disables the other while active
- Dictation auto-stops when the browser's speech engine detects silence or the user clicks stop
- Language is auto-detected from `navigator.language` — supports Spanish, English, French, Portuguese, etc.

**Browser compatibility:**
- Supported: Chrome (desktop + Android), Edge, Safari (iOS 14.5+, macOS)
- Not supported: Firefox — button is hidden (`null` rendered), no broken UI or error shown

**Files:**
- `src/hooks/useSpeechDictation.ts` — hook wrapping the Web Speech API; exposes `isListening`, `isSupported`, `interimTranscript`, `toggleListening`, `stopListening`; calls `onListeningChange`, `onTranscript`, `onError` callbacks; cleans up via `recognition.abort()` on unmount
- `src/components/chat/DictationButton.tsx` — UI button component; renders `null` on unsupported browsers; shows blue active state, red pulse indicator, interim transcript tooltip, and error tooltip

### 1.13d Compose Area Layout — Horizontal Toolbar

All compose areas across Chat, Discussion panel, and reply composers use a consistent horizontal toolbar layout below the textarea.

**Structure (top to bottom):**
1. File attachment previews (if any pending files)
2. Voice preview player + X remove (if a voice message is pending)
3. Textarea (full width, 2–3 rows)
4. Horizontal toolbar row:
   - **Left:** icon-only action buttons — 📎 Attach, 🎤 Dictation, 🎙 Voice Record — each `w-8 h-8` with hover background
   - **Right:** Listening indicator (when dictating) or keyboard hint (hidden on mobile) + Send/Post/Reply button

**Components updated:**
- `ChatMain.tsx` — top-level compose
- `ChatMessageThread.tsx` — inline reply compose
- `ProjectDiscussionPanel.tsx` — top-level compose and inline reply compose

**Send button:** uses `<Send />` Lucide icon with a short label ("Post" in Discussion, icon-only in Chat). Disabled when nothing to send.
**Listening indicator:** "Listening..." with pulsing dot replaces keyboard hint in the same right-side position when dictation is active — no layout shift.
**Mobile:** keyboard hint hidden on small screens (`hidden sm:inline`) to save horizontal space.

### 1.13e Dictation Language Setting

Users can select a preferred language for speech dictation from the user menu (top-right). The setting is persisted to their profile in Supabase and applied globally to all `DictationButton` instances across Chat and Discussion panel.

**Available languages:**
- English (US) — `en-US` — default
- English (UK) — `en-GB`
- Spanish (Spain) — `es-ES`
- Spanish (Mexico) — `es-MX`

**Where it appears:** User menu dropdown under a "Dictation" section, displayed as a compact `<select>` with flag emojis. Change is saved immediately on selection — no save button needed.

**Data flow:**
- `profiles.dictation_language` column (text, NOT NULL, default `'en-US'`) — added via migration
- `src/hooks/useDictationLanguage.ts` — fetches on mount, exposes `updateLanguage(code)` which optimistically updates state and persists to Supabase
- `App.tsx` calls `useDictationLanguage(user?.id)` and passes `dictationLanguage` as a prop down to `ChatPage` → `ChatMain` and directly to `ProjectDiscussionPanel`
- `DictationButton` receives `language` prop and passes it to `useSpeechDictation`
- `useSpeechDictation` sets `recognition.lang = language` (replaces the old `navigator.language` auto-detect)

### 1.14 Push Notifications — Android PWA Standalone Fix

Android Chrome blocks `Notification.requestPermission()` inside a standalone PWA (installed to home screen). Fixed by detecting standalone mode and routing the permission flow through a regular browser tab.

**How it works:**
1. User taps Enable in the PWA (banner in Chat or toggle in user menu)
2. App detects `window.matchMedia('(display-mode: standalone)').matches`
3. Opens `/enable-notifications.html` in a new Chrome tab via `window.open`
4. The page requests permission, registers the service worker, subscribes to push, saves the subscription to `push_subscriptions` via the Supabase REST API using the stored auth token
5. Tab auto-closes after 2 seconds and the user returns to the PWA
6. Next push message is delivered normally

**Files changed:**
- `public/enable-notifications.html` — self-contained page that handles permission + subscription + save, no React required
- `src/utils/usePushNotifications.ts` — detects standalone mode at module level; `subscribe()` opens the HTML page instead of calling `requestPermission()` inline; exports `isStandalone`
- `src/components/chat/ChatPage.tsx` — banner text updated: standalone shows "Tap Enable — a browser tab will open to set up notifications"
- `src/App.tsx` — destructures `isStandalone` from hook; push toggle `onClick` opens the HTML page when in standalone mode instead of calling `subscribePush()`

### 1.15 Column Visibility (Task Grid)

Users can show or hide individual columns in the task grid via a "Columns" button in the project header. Preferences are saved per user per project in Supabase and persist across sessions and devices.

**Columns button:** Appears in the header next to Export when a project is open. Shows a blue badge with the count of currently visible columns when any are hidden (e.g. "Columns 5"), making it obvious the layout has been customised.

**Toggleable columns:** Phase, Status, Responsible, Start Date, Days, End Date, Depends On, Comments (comment icon in the actions cell). The expand, ID, sort, task name, and delete columns are always visible.

**UX rules:**
- Dropdown has a checklist with blue filled checkboxes for visible columns and empty borders for hidden ones.
- Minimum 1 column must be visible — toggling the last visible column does nothing.
- "Reset to default" link appears at the bottom only when the layout differs from defaults.
- Dropdown closes when clicking outside or pressing Reset.

**Data model:**
- `user_project_column_preferences` table: `user_id`, `project_id`, `visible_columns` (text[]), `updated_at`.
- Unique constraint on `(user_id, project_id)` enables upsert. RLS: 4 separate policies (SELECT/INSERT/UPDATE/DELETE) scoped to `authenticated` with `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()` so inserts without explicit user_id satisfy the INSERT policy.

**Files changed:**
- `supabase/migrations/..._add_user_project_column_preferences.sql`
- `src/hooks/useColumnPreferences.ts` — fetches prefs on mount (per user+project), `toggleColumn()`, `resetToDefault()`, `isVisible(key)`. Uses `maybeSingle()`.
- `src/components/ColumnVisibilityDropdown.tsx` — checklist dropdown component.
- `src/App.tsx` — hooks, state, dropdown in header, passes `isColumnVisible` to TaskGrid.
- `src/components/TaskGrid.tsx` — `isColumnVisible` prop, conditional `<colgroup>` cols, conditional `<thead>` RTh headers, `totalTableWidth` respects hidden columns.
- `src/components/TaskRow.tsx` — each toggleable `<td>` wrapped in `isColumnVisible()` guard; `colSpan` on comment/subtask rows computed dynamically as `5 + count(visible data columns)`.

### 1.11 Design System
- Color palette: Slate/Blue tones (no purple)
- 8px spacing system
- System font stack (Inter preferred)
- Consistent border-radius: 6px for cards, 4px for inputs
- Smooth transitions (150-200ms)
- Hover states and focus rings
- Loading spinners during async operations
- Error toasts for feedback
