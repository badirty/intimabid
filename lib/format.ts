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
  'from-rose-400 via-pink-300 to-red-400',
  'from-zinc-700 via-zinc-800 to-black',
  'from-slate-600 to-slate-800',
  'from-fuchsia-900 to-purple-950',
  'from-amber-600 to-orange-800',
  'from-emerald-600 to-teal-800',
] as const;

export function durationDaysToEndsAt(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}