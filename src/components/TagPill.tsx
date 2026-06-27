import { X } from 'lucide-react';
import { getTagTextColor } from '../utils/tagColors';
import { Tag } from '../hooks/useTags';

interface Props {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'xs';
}

export function TagPill({ tag, onRemove, size = 'sm' }: Props) {
  const textColor = getTagTextColor(tag.color);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${
        size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      }`}
      style={{ backgroundColor: tag.color, color: textColor }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-70 transition-opacity"
          style={{ color: textColor }}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
