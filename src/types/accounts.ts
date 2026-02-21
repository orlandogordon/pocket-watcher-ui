export type AccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'LOAN'
  | 'INVESTMENT'
  | 'OTHER';

export interface AccountResponse {
  uuid: string;
  account_name: string;
  account_type: AccountType;
  institution_name: string;
  account_number_last4?: string;
  balance: string;
  interest_rate?: string;
  interest_rate_type?: 'FIXED' | 'VARIABLE';
  minimum_payment?: string;
  original_principal?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountStats {
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
  accounts_by_type: Record<string, { count: number; total_balance: string }>;
}

export interface AccountCreate {
  account_name: string;
  account_type: string;
  institution_name: string;
  account_number_last4?: string;
  balance?: string;
  interest_rate?: string;
  interest_rate_type?: string;
  minimum_payment?: string;
  original_principal?: string;
  comments?: string;
}
