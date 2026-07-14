export type Tab = 'home' | 'favorites' | 'notifications' | 'profile' | 'wallet';

export type AppMode = 'buyer' | 'seller';
export type PreferredMode = 'buyer' | 'seller' | 'both';
export type AuctionStatus = 'live' | 'ended' | 'sold' | 'cancelled';

export interface Auction {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  start_price_cents: number;
  current_price_cents: number;
  bid_increment_cents: number;
  status: AuctionStatus;
  ends_at: string;
  image_color: string;
  image_url: string | null;
  winner_id: string | null;
  created_at: string;
  seller_name?: string;
  bid_count?: number;
  is_favorite?: boolean;
}

export interface Wallet {
  user_id: string;
  balance_cents: number;
  pending_cents: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  auction_id: string | null;
  created_at: string;
}

export interface UserStats {
  bids_count: number;
  sales_count: number;
  balance_cents: number;
}

/** @deprecated use Auction */
export type LiveAuction = {
  id: string | number;
  title: string;
  price: number;
  timeLeft: string;
  imageColor: string;
  live: boolean;
  seller?: string;
  status?: AuctionStatus;
};

export interface ActiveSale {
  id: string;
  title: string;
  offers: number;
  status: AuctionStatus;
  current_price_cents: number;
}