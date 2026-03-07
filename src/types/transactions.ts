export interface TagResponse {
  id: string;
  tag_id: number;
  tag_name: string;
  color: string;
}

export interface EmbeddedCategory {
  id: string;
  name: string;
  parent_category_uuid: string | null;
}

export type TransactionType = 'PURCHASE' | 'WITHDRAWAL' | 'FEE' | 'DEPOSIT' | 'CREDIT' | 'INTEREST' | 'TRANSFER';

export interface SplitAllocationResponse {
  id: string;
  category_uuid: string;
  category_name: string;
  subcategory_uuid: string | null;
  subcategory_name: string | null;
  amount: string;
  notes: string | null;
}

export interface SplitAllocationCreate {
  category_uuid: string;
  subcategory_uuid?: string | null;
  amount: string;
  notes?: string;
}

export interface TransactionResponse {
  id: string;
  account_uuid: string;
  transaction_date: string;
  amount: string;
  transaction_type: TransactionType;
  description: string;
  merchant_name?: string;
  category: EmbeddedCategory | null;
  subcategory: EmbeddedCategory | null;
  split_allocations: SplitAllocationResponse[];
  source_type: 'CSV' | 'PDF' | 'MANUAL' | 'API';
  institution_name?: string;
  comments?: string;
  created_at: string;
  tags: TagResponse[];
}

export interface TransactionStats {
  total_count: number;
  total_income: string;
  total_expenses: string;
  net: string;
}

export interface TransactionCreate {
  account_uuid: string;
  transaction_date: string;
  amount: string;
  transaction_type: string;
  description: string;
  merchant_name?: string;
  category_uuid?: string | null;
  subcategory_uuid?: string | null;
  comments?: string;
}

export interface AmortizationAllocation {
  id: string;
  month: string;
  amount: string;
  category_uuid: string | null;
  category_name: string | null;
  subcategory_uuid: string | null;
  subcategory_name: string | null;
}

export interface AmortizationScheduleResponse {
  transaction_uuid: string;
  total_amount: string;
  num_months: number;
  allocations: AmortizationAllocation[];
}

export interface AmortizationEqualSplit {
  start_month: string;
  months: number;
}

export interface AmortizationCustom {
  allocations: Array<{ month: string; amount: string }>;
}

export interface TransactionFilters {
  account_uuid?: string;
  category_uuid?: string[];
  subcategory_uuid?: string[];
  tag_uuid?: string[];
  transaction_type?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
  description_search?: string;
  order_by?: string;
  order_desc?: boolean;
  skip?: number;
  limit?: number;
}
