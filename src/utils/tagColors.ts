export const TAG_COLORS = [
  { name: 'Red',    value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber',  value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green',  value: '#22c55e' },
  { name: 'Teal',   value: '#14b8a6' },
  { name: 'Cyan',   value: '#06b6d4' },
  { name: 'Blue',   value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink',   value: '#ec4899' },
  { name: 'Rose',   value: '#f43f5e' },
  { name: 'Gray',   value: '#6b7280' },
  { name: 'Dark',   value: '#1e293b' },
];

export function getTagTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
}
