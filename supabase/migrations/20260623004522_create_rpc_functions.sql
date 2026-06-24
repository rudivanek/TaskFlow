
-- Get next task_id for a project (sequential)
CREATE OR REPLACE FUNCTION public.get_next_task_id_for_project(project_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(task_id), 0) + 1 INTO next_id
  FROM public.tasks_main
  WHERE project_id = project_id_param;
  RETURN next_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set multiple dependencies for a task
CREATE OR REPLACE FUNCTION public.set_multiple_dependencies(
  p_task_id UUID,
  p_depends_on_task_ids INTEGER[],
  p_project_id UUID
)
RETURNS SETOF public.tasks_main AS $$
DECLARE
  v_task RECORD;
  v_dep_task RECORD;
  v_max_end_date DATE;
  v_new_start DATE;
  v_task_task_id INTEGER;
  v_old_depends INTEGER[];
  v_dep_id INTEGER;
BEGIN
  -- Get the task's task_id
  SELECT task_id, depends_on_task_ids INTO v_task_task_id, v_old_depends
  FROM public.tasks_main WHERE id = p_task_id;

  -- Check for self-reference
  IF v_task_task_id = ANY(p_depends_on_task_ids) THEN
    RAISE EXCEPTION 'A task cannot depend on itself';
  END IF;

  -- Validate all referenced tasks exist in same project
  FOR v_dep_id IN SELECT unnest(p_depends_on_task_ids) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks_main
      WHERE task_id = v_dep_id AND project_id = p_project_id
    ) THEN
      RAISE EXCEPTION 'Task #% does not exist in this project', v_dep_id;
    END IF;
  END LOOP;

  -- Simple circular dependency check: ensure none of the deps depend on this task
  IF EXISTS (
    SELECT 1 FROM public.tasks_main
    WHERE project_id = p_project_id
      AND task_id = ANY(p_depends_on_task_ids)
      AND v_task_task_id = ANY(depends_on_task_ids)
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected';
  END IF;

  -- Remove this task from old dependencies' dependencies_task_ids
  IF v_old_depends IS NOT NULL AND array_length(v_old_depends, 1) > 0 THEN
    UPDATE public.tasks_main
    SET dependencies_task_ids = array_remove(dependencies_task_ids, v_task_task_id)
    WHERE project_id = p_project_id AND task_id = ANY(v_old_depends);
  END IF;

  -- Add this task to new dependencies' dependencies_task_ids
  IF array_length(p_depends_on_task_ids, 1) > 0 THEN
    UPDATE public.tasks_main
    SET dependencies_task_ids = array_append(
      COALESCE(dependencies_task_ids, ARRAY[]::INTEGER[]),
      v_task_task_id
    )
    WHERE project_id = p_project_id AND task_id = ANY(p_depends_on_task_ids)
      AND NOT (v_task_task_id = ANY(COALESCE(dependencies_task_ids, ARRAY[]::INTEGER[])));
  END IF;

  -- Calculate new start date from max end_date of dependencies
  IF array_length(p_depends_on_task_ids, 1) > 0 THEN
    SELECT MAX(end_date) INTO v_max_end_date
    FROM public.tasks_main
    WHERE project_id = p_project_id AND task_id = ANY(p_depends_on_task_ids);

    IF v_max_end_date IS NOT NULL THEN
      v_new_start := v_max_end_date + INTERVAL '1 day';

      UPDATE public.tasks_main
      SET depends_on_task_ids = p_depends_on_task_ids,
          depends_on_task_id = p_depends_on_task_ids[1],
          start_date = v_new_start,
          end_date = v_new_start + (days - 1) * INTERVAL '1 day'
      WHERE id = p_task_id;
    ELSE
      UPDATE public.tasks_main
      SET depends_on_task_ids = p_depends_on_task_ids,
          depends_on_task_id = p_depends_on_task_ids[1]
      WHERE id = p_task_id;
    END IF;
  ELSE
    UPDATE public.tasks_main
    SET depends_on_task_ids = NULL,
        depends_on_task_id = NULL
    WHERE id = p_task_id;
  END IF;

  RETURN QUERY SELECT * FROM public.tasks_main WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cascade dependency dates using BFS
CREATE OR REPLACE FUNCTION public.cascade_dependency_dates(p_task_id UUID)
RETURNS SETOF public.tasks_main AS $$
DECLARE
  v_task RECORD;
  v_dep_task RECORD;
  v_queue UUID[];
  v_current UUID;
  v_updated_ids UUID[] := ARRAY[]::UUID[];
  v_max_end_date DATE;
  v_new_start DATE;
  v_dep_task_ids INTEGER[];
BEGIN
  -- Get the source task
  SELECT * INTO v_task FROM public.tasks_main WHERE id = p_task_id;

  -- Find all tasks in same project that depend on this task
  v_queue := ARRAY(
    SELECT id FROM public.tasks_main
    WHERE project_id = v_task.project_id
      AND v_task.task_id = ANY(depends_on_task_ids)
  );

  WHILE array_length(v_queue, 1) > 0 LOOP
    v_current := v_queue[1];
    v_queue := v_queue[2:];

    SELECT * INTO v_dep_task FROM public.tasks_main WHERE id = v_current;

    -- Calculate new start from all of this task's dependencies
    SELECT MAX(end_date) INTO v_max_end_date
    FROM public.tasks_main
    WHERE project_id = v_dep_task.project_id
      AND task_id = ANY(v_dep_task.depends_on_task_ids);

    IF v_max_end_date IS NOT NULL THEN
      v_new_start := v_max_end_date + INTERVAL '1 day';

      IF v_new_start != v_dep_task.start_date THEN
        UPDATE public.tasks_main
        SET start_date = v_new_start,
            end_date = v_new_start + (days - 1) * INTERVAL '1 day'
        WHERE id = v_current;

        v_updated_ids := array_append(v_updated_ids, v_current);

        -- Add downstream dependents to queue
        v_queue := v_queue || ARRAY(
          SELECT t.id FROM public.tasks_main t
          WHERE t.project_id = v_dep_task.project_id
            AND v_dep_task.task_id = ANY(t.depends_on_task_ids)
            AND NOT (t.id = ANY(v_updated_ids))
        );
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT * FROM public.tasks_main WHERE id = ANY(v_updated_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Duplicate project with all tasks and subtasks
CREATE OR REPLACE FUNCTION public.duplicate_project(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_project RECORD;
  v_new_project_id UUID;
  v_task RECORD;
  v_new_task_id UUID;
  v_subtask RECORD;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;

  INSERT INTO public.projects (project, workspace_id, deleted, favorite, private)
  VALUES (v_project.project || ' (Copy)', v_project.workspace_id, false, false, v_project.private)
  RETURNING id INTO v_new_project_id;

  FOR v_task IN SELECT * FROM public.tasks_main WHERE project_id = p_project_id ORDER BY task_sort LOOP
    INSERT INTO public.tasks_main (
      task_id, task_sort, task_name, depends_on_task_id, depends_on_task_ids,
      dependencies_task_ids, phase_id, status_id, responsible_id,
      start_date, days, end_date, task_comment, project_id, user_id
    ) VALUES (
      v_task.task_id, v_task.task_sort, v_task.task_name, v_task.depends_on_task_id,
      v_task.depends_on_task_ids, v_task.dependencies_task_ids, v_task.phase_id,
      v_task.status_id, v_task.responsible_id, v_task.start_date, v_task.days,
      v_task.end_date, v_task.task_comment, v_new_project_id, v_task.user_id
    ) RETURNING id INTO v_new_task_id;

    FOR v_subtask IN SELECT * FROM public.tasks_sub WHERE task_main_id = v_task.id LOOP
      INSERT INTO public.tasks_sub (subtask_sort, task_main_id, subtask_name, not_started, doing, done, user_id)
      VALUES (v_subtask.subtask_sort, v_new_task_id, v_subtask.subtask_name, v_subtask.not_started, v_subtask.doing, v_subtask.done, v_subtask.user_id);
    END LOOP;
  END LOOP;

  RETURN v_new_project_id::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
