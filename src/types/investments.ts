export type InvestmentTransactionType =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'FEE'
  | 'TRANSFER'
  | 'SPLIT'
  | 'MERGER'
  | 'SPINOFF'
  | 'REINVESTMENT'
  | 'OTHER';

export interface InvestmentHoldingResponse {
  id: string;
  account_uuid: string;
  symbol: string;
  quantity: string;
  average_cost_basis: string;
  current_price: string | null;
  api_symbol: string | null;
  security_type: string | null;
  created_at: string;
}

export interface InvestmentTransactionResponse {
  id: string;
  account_uuid: string;
  transaction_type: InvestmentTransactionType;
  symbol: string | null;
  quantity: string | null;
  price_per_share: string | null;
  total_amount: string;
  transaction_date: string;
  description: string | null;
  holding_id: string | null;
  security_type: string | null;
  created_at: string;
}

export interface InvestmentTransactionCreate {
  account_uuid: string;
  transaction_type: InvestmentTransactionType;
  symbol?: string;
  quantity?: string;
  price_per_share?: string;
  total_amount: string;
  transaction_date: string;
  description?: string;
}
