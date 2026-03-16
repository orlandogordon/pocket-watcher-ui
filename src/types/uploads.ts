import type { TransactionResponse } from './transactions';

export const INSTITUTIONS = ['tdbank', 'amex', 'amzn-synchrony', 'schwab', 'tdameritrade', 'ameriprise'] as const;
export type Institution = typeof INSTITUTIONS[number];

export const INSTITUTION_LABELS: Record<Institution, string> = {
  tdbank: 'TD Bank',
  amex: 'American Express',
  'amzn-synchrony': 'Amazon Synchrony',
  schwab: 'Charles Schwab',
  tdameritrade: 'TD Ameritrade',
  ameriprise: 'Ameriprise',
};

export interface ParsedData {
  transaction_date: string;
  amount: string;
  description: string;
  transaction_type: string;
  symbol?: string;
  quantity?: string;
  // Investment-specific fields
  total_amount?: string;
  price_per_share?: string;
  api_symbol?: string;
  security_type?: string;
  transaction_kind?: 'regular' | 'investment';
}

export interface EditedData {
  description?: string;
  amount?: string;
  transaction_type?: string;
  transaction_date?: string;
  merchant_name?: string;
  category_uuid?: string;
  subcategory_uuid?: string;
  tag_uuids?: string[];
  comments?: string;
  // Investment-specific fields
  total_amount?: string;
  symbol?: string;
  security_type?: string;
  quantity?: string;
  price_per_share?: string;
}

// Stub for existing_investment_transaction on PreviewItem
export interface InvestmentTransactionResponse {
  id: string;
  transaction_date: string;
  total_amount: string;
  description: string;
  symbol?: string;
  quantity?: string;
  price_per_share?: string;
  security_type?: string;
}

export interface DuplicateInfo {
  duplicate_type: 'database' | 'within_statement' | 'both';
  existing_transaction?: {
    id: string;
    transaction_date: string;
    transaction_type: string;
    symbol?: string | null;
    quantity?: string | null;
    price_per_share?: string | null;
    total_amount?: string;
    amount?: string;
    description: string;
  };
  existing_transaction_id?: string;
}

export interface PreviewItem {
  temp_id: string;
  parsed_data: ParsedData;
  edited_data: Record<string, unknown>; // cast to EditedData at render
  review_status: 'pending' | 'approved' | 'rejected';
  source?: 'unique' | 'approved_duplicate';
  duplicate_type?: 'database' | 'within_statement' | 'both';
  duplicate_info?: DuplicateInfo;
  transaction_kind?: 'regular' | 'investment';
}

export interface PreviewSummary {
  total_parsed: number;
  pending_review: number;
  rejected: number;
  ready_to_import: number;
  can_confirm: boolean;
}

export interface PreviewResponse {
  preview_session_id: string;
  expires_at: string;
  institution: string;
  account_info?: {
    suggested_account_id?: string;
    suggested_account_name?: string;
  };
  summary: PreviewSummary | null;
  pending_review: {
    transactions: PreviewItem[];
    investment_transactions: PreviewItem[];
  } | null;
  ready_to_import: {
    transactions: PreviewItem[];
    investment_transactions: PreviewItem[];
  } | null;
}

export type DuplicateAction = 'approve' | 'reject' | 'undo_reject';

export interface BulkDuplicateReviewItem {
  temp_id: string;
  action: DuplicateAction;
}

export interface BulkActionResponse extends PreviewResponse {
  processed: number;
  errors: Array<{ temp_id: string; error: string }>;
}

export interface PreviewSessionInfo {
  preview_session_id: string;
  institution: string;
  filename: string;
  created_at: string;
  expires_at: string;
  summary: PreviewSummary | null;
}

export interface ConfirmResponse {
  transactions_created: number;
  investment_transactions_created: number;
  upload_job_id: number;
}

export type UploadJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface UploadJob {
  id: number;
  status: UploadJobStatus;
  institution: string;
  created_at: string;
  completed_at?: string;
  transactions_created?: number;
  transactions_skipped?: number;
  investment_transactions_created?: number;
  investment_transactions_skipped?: number;
  file_path?: string;
  error_message?: string;
}

export interface SkippedItem {
  id: number;
  transaction_type: string;
  reason: string;
  skipped_transaction: {
    date: string;
    amount: string;
    description: string;
    transaction_type: string;
    symbol?: string;
    quantity?: string;
  };
}
