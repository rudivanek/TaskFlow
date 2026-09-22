/*
# Add assigned_user_id column to tasks_main

1. Changes
- Adds a nullable `assigned_user_id` UUID column to `public.tasks_main`.
- The column references `public.users(id)` with `ON DELETE SET NULL`, so if a
  user is deleted their task assignments are cleared (not cascaded).
- Adds an index on `assigned_user_id` for efficient lookups.

2. Coexistence with responsible_id
- The existing `responsible_id` column (referencing `responsibles`) is NOT
  touched. `assigned_user_id` is a separate field that links a task to a
  real user account from `public.users`, while `responsible_id` continues
  to reference the `responsibles` lookup table. Both fields coexist.

3. Security
- No RLS changes needed. The `public.users` table already has a
  `select_all_users` policy (SELECT TO authenticated USING (true)),
  so authenticated users can read the names needed to populate the
  Assigned User dropdown.

4. Existing data
- All existing tasks get `assigned_user_id = NULL` by default, which
  renders as "None" in the UI.
*/

ALTER TABLE public.tasks_main
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_main_assigned_user_id
  ON public.tasks_main(assigned_user_id);
