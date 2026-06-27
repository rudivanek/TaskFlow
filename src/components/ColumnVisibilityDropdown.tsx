import { useRef, useEffect } from 'react';
import { Columns3 } from 'lucide-react';
import { ALL_COLUMNS, ColumnKey, DEFAULT_VISIBLE_COLUMNS } from '../hooks/useColumnPreferences';

interface Props {
  visibleColumns: ColumnKey[];
  onToggle: (key: ColumnKey) => void;
  onReset: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function ColumnVisibilityDropdown({ visibleColumns, onToggle, onReset, isOpen, onToggleOpen }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggleOpen();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggleOpen]);

  const isDefault =
    DEFAULT_VISIBLE_COLUMNS.length === visibleColumns.length &&
    DEFAULT_VISIBLE_COLUMNS.every(c => visibleColumns.includes(c));

  const hiddenCount = ALL_COLUMNS.length - visibleColumns.length;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={onToggleOpen}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isOpen ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
        }`}
      >
        <Columns3 className="w-4 h-4" />
        Columns
        {hiddenCount > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {visibleColumns.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggleOpen} />
          <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
            <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
              Show / Hide Columns
            </p>

            {ALL_COLUMNS.map(col => (
              <button
                key={col.key}
                onClick={() => onToggle(col.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  visibleColumns.includes(col.key) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                }`}>
                  {visibleColumns.includes(col.key) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {col.label}
              </button>
            ))}

            {!isDefault && (
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => { onReset(); onToggleOpen(); }}
                  className="w-full px-3 py-2 text-xs text-blue-500 hover:bg-slate-50 transition-colors text-left"
                >
                  Reset to default
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
