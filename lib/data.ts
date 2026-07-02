import type { LiveAuction, ActiveSale } from './types';

export const FEATURED_AUCTION: LiveAuction = {
  id: 1,
  title: 'Culotte dentelle rouge portée 3 jours',
  price: 58,
  timeLeft: '06:04:12',
  imageColor: 'from-rose-400 via-pink-300 to-red-400',
  live: true,
  seller: 'Luna ✨',
};

export const LIVE_AUCTIONS: LiveAuction[] = [
  FEATURED_AUCTION,
  {
    id: 2,
    title: 'Ensemble lingerie noire',
    price: 165,
    timeLeft: '1j 04:22:08',
    imageColor: 'from-zinc-700 via-zinc-800 to-black',
    live: true,
    seller: 'Eva 💎',
  },
  {
    id: 3,
    title: 'Chaussettes sport 5 jours',
    price: 38,
    timeLeft: '03:12:45',
    imageColor: 'from-slate-600 to-slate-800',
    live: false,
    seller: 'Mia 🔥',
  },
];

export const FAVORITE_AUCTIONS: LiveAuction[] = [
  {
    id: 4,
    title: 'Collants résille 2 jours',
    price: 55,
    timeLeft: '02:08:30',
    imageColor: 'from-fuchsia-900 to-purple-950',
    live: false,
    seller: 'Zoé 🖤',
  },
];

export const ACTIVE_SALES: ActiveSale[] = [
  { id: 1, title: 'Culotte dentelle rouge', offers: 12, action: 'Suivre' },
  { id: 2, title: 'Ensemble lingerie noire', offers: 7, action: 'Booster' },
];