import { differenceInSeconds } from 'date-fns';

export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function formatCountdown(endsAt: string): string {
  const sec = differenceInSeconds(new Date(endsAt), new Date());
  if (sec <= 0) return 'Terminé';

  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (d > 0) return `${d}j ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function isAuctionLive(status: string, endsAt: string): boolean {
  return status === 'live' && new Date(endsAt) > new Date();
}

export const IMAGE_COLORS = [
  'from-violet-300 via-purple-200 to-fuchsia-200',
  'from-indigo-300 via-violet-200 to-purple-100',
  'from-teal-200 via-cyan-100 to-emerald-100',
  'from-pink-200 via-rose-100 to-violet-100',
  'from-slate-300 via-purple-100 to-indigo-100',
  'from-amber-100 via-orange-100 to-pink-100',
] as const;

export function durationDaysToEndsAt(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function durationHoursToEndsAt(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}