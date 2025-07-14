import { RowDataPacket } from 'mysql2/promise';

export interface Balance extends RowDataPacket {
  id: number;
  user_id: number;
  currency_symbol: 'BTC' | 'ETH';
  balance: string;
  timestamp?: string;
}
