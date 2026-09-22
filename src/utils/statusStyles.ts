import type { CSSProperties } from 'react';

export interface StatusRowStyle {
  className: string;
  style: CSSProperties;
  accentBorder: CSSProperties;
}

const DOING_BORDER = { borderLeft: '3px solid #7C3AED' } as CSSProperties;

export function getStatusRowStyles(statusName: string | undefined | null): StatusRowStyle {
  if (!statusName) return { className: '', style: {}, accentBorder: {} };
  const lower = statusName.toLowerCase();
  switch (lower) {
    case 'doing':
    case 'in progress':
      return { className: 'status-doing-row', style: {}, accentBorder: DOING_BORDER };
    case 'done':
      return { className: '', style: { backgroundColor: 'rgba(220, 252, 231, 0.6)' }, accentBorder: {} };
    case 'in review':
      return { className: '', style: { backgroundColor: 'rgba(254, 243, 199, 0.6)' }, accentBorder: {} };
    case 'blocked':
      return { className: '', style: { backgroundColor: 'rgba(254, 226, 226, 0.6)' }, accentBorder: {} };
    default:
      return { className: '', style: {}, accentBorder: {} };
  }
}
