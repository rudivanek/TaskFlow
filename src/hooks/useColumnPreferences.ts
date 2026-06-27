import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const ALL_COLUMNS = [
  { key: 'phase', label: 'Phase' },
  { key: 'status', label: 'Status' },
  { key: 'responsible', label: 'Responsible' },
  { key: 'start', label: 'Start Date' },
  { key: 'days', label: 'Days' },
  { key: 'end', label: 'End Date' },
  { key: 'depends_on', label: 'Depends On' },
  { key: 'comments', label: 'Comments' },
] as const;

export type ColumnKey = typeof ALL_COLUMNS[number]['key'];

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'phase', 'status', 'responsible', 'start', 'days', 'end', 'depends_on', 'comments',
];

// Keys that correspond to actual table columns (not just button visibility)
export const DATA_COLUMN_KEYS: ColumnKey[] = [
  'phase', 'status', 'responsible', 'start', 'days', 'end', 'depends_on',
];

export function useColumnPreferences(
  userId: string | undefined,
  projectId: string | undefined,
) {
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !projectId) {
      setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('user_project_column_preferences')
      .select('visible_columns')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        setVisibleColumns(
          data?.visible_columns?.length ? (data.visible_columns as ColumnKey[]) : DEFAULT_VISIBLE_COLUMNS,
        );
        setLoading(false);
      });
  }, [userId, projectId]);

  const toggleColumn = useCallback(async (key: ColumnKey) => {
    if (!userId || !projectId) return;

    const next = visibleColumns.includes(key)
      ? visibleColumns.filter(c => c !== key)
      : [...visibleColumns, key];

    if (next.length === 0) return;

    setVisibleColumns(next);

    await supabase
      .from('user_project_column_preferences')
      .upsert(
        { user_id: userId, project_id: projectId, visible_columns: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,project_id' },
      );
  }, [userId, projectId, visibleColumns]);

  const resetToDefault = useCallback(async () => {
    if (!userId || !projectId) return;
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    await supabase
      .from('user_project_column_preferences')
      .upsert(
        { user_id: userId, project_id: projectId, visible_columns: DEFAULT_VISIBLE_COLUMNS, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,project_id' },
      );
  }, [userId, projectId]);

  const isVisible = useCallback((key: ColumnKey) => visibleColumns.includes(key), [visibleColumns]);

  return { visibleColumns, loading, toggleColumn, resetToDefault, isVisible };
}
