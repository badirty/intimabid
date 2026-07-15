export type Tab = 'home' | 'favorites' | 'notifications' | 'profile' | 'wallet' | 'orders';

export type OrderStatus = 'pending_address' | 'awaiting_shipment' | 'shipped' | 'delivered' | 'cancelled';

export type HomeTab = 'live' | 'favorites' | 'selling' | 'ended' | 'mybids' | 'mywins' | 'mylost';

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
  buy_now_price_cents: number | null;
  winner_id: string | null;
  created_at: string;
  seller_name?: string;
  seller_avatar_url?: string | null;
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

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  bio_public?: boolean;
  created_at?: string;
}

export interface SellerSearchResult {
  id: string;
  display_name: string;
  live_count: number;
  total_sales: number;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface Order {
  id: string;
  auction_id: string;
  buyer_id: string;
  seller_id: string;
  amount_cents: number;
  status: OrderStatus;
  shipping_full_name: string | null;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  auction_title?: string;
  auction_image_url?: string | null;
  counterparty_name?: string;
}

export interface UserAddress {
  user_id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string;
  country: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount_cents: number;
  description: string | null;
  created_at: string;
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