export type ItemStatus = 'active' | 'stopped' | 'error';

export interface User {
  id: string;
  phone_e164: string;
  created_at: Date;
}

export interface TrackedItem {
  id: string;
  user_id: string;
  url: string;
  retailer: string;
  target_price_gbp_pennies: number;
  last_price_gbp_pennies: number | null;
  last_checked_at: Date | null;
  alert_sent_at: Date | null;
  status: ItemStatus;
  error_message: string | null;
  title: string | null;
  created_at: Date;
}

export interface PriceResult {
  pricePennies: number;
  currency: string;
  title?: string;
}

export interface RetailerAdapter {
  /** Returns true if this adapter handles the given URL */
  canHandle(url: string): boolean;
  /** Fetches current price for the URL */
  fetchPrice(url: string): Promise<PriceResult>;
}
