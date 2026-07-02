export type Tab = 'home' | 'favorites' | 'notifications' | 'profile';

/** Mode d'interface actif — l'utilisateur peut basculer à tout moment */
export type AppMode = 'buyer' | 'seller';

/** Préférence d'accueil à l'onboarding */
export type PreferredMode = 'buyer' | 'seller' | 'both';

export interface ActiveSale {
  id: number;
  title: string;
  offers: number;
  action: 'Suivre' | 'Booster';
}

export interface LiveAuction {
  id: number;
  title: string;
  price: number;
  timeLeft: string;
  imageColor: string;
  live: boolean;
  seller?: string;
}