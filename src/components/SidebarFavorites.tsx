import { Star } from 'lucide-react';

export interface FavoriteProject {
  id: string;
  project: string;
  favorite: boolean;
  deleted?: boolean;
}

interface SidebarFavoritesProps {
  projects: FavoriteProject[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  unreadByProject?: Record<string, number>;
  variant?: 'desktop' | 'mobile';
}

export function SidebarFavorites({
  projects,
  selectedProjectId,
  onSelectProject,
  unreadByProject = {},
  variant = 'desktop',
}: SidebarFavoritesProps) {
  const favoriteProjects = projects.filter(p => p.favorite && !p.deleted);
  if (favoriteProjects.length === 0) return null;

  const isMobile = variant === 'mobile';

  return (
    <div className={isMobile ? 'mb-2 px-2' : 'mb-3'}>
      <div
        className={
          isMobile
            ? 'px-2 py-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider'
            : 'px-2 py-1 text-xs font-medium text-slate-400 uppercase tracking-wider'
        }
      >
        Favorites
      </div>
      {favoriteProjects.map(p => {
        const unread = unreadByProject[p.id] ?? 0;
        const isActive = p.id === selectedProjectId;
        return (
          <button
            key={p.id}
            onClick={() => onSelectProject(p.id)}
            style={isMobile ? { minHeight: 44 } : undefined}
            className={
              isMobile
                ? `w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors min-h-[44px] ${
                    isActive ? 'bg-blue-500/20 text-white font-medium' : 'text-white/60 hover:bg-white/5'
                  }`
                : `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
                  }`
            }
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
            <span className="truncate flex-1">{p.project}</span>
            {unread > 0 && (
              <span
                className={
                  isMobile
                    ? 'flex-shrink-0 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center'
                    : 'flex-shrink-0 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none'
                }
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
