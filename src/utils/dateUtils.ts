import { addDays, differenceInCalendarDays, parseISO, format } from 'date-fns';

export function calculateEndDate(startDate: string, days: number): string {
  const start = parseISO(startDate);
  const end = addDays(start, days - 1);
  return format(end, 'yyyy-MM-dd');
}

export function calculateDays(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const diff = differenceInCalendarDays(end, start) + 1;
  return Math.max(0, diff);
}

export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y.slice(2)}`;
}

export function isOverdue(endDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseISO(endDate) < today;
}

export function isDueToday(endDate: string): boolean {
  const today = format(new Date(), 'yyyy-MM-dd');
  return endDate === today;
}

export function isDueSoon(endDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISO(endDate);
  const diff = differenceInCalendarDays(end, today);
  return diff > 0 && diff <= 3;
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
