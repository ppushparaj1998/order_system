export interface Order {
  id?: number;
  userId: number;
  order_type: 'buy' | 'sell';
  currency_symbol: 'BTC' | 'ETH';
  price: number;
  quantity: number;
  timestamp?: string | Date;
  status?: 'pending' | 'matched';
}