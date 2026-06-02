import type { TierASuggestion } from './transfers';

export type { TierASuggestion };

export const INSTITUTIONS = [
  'amex',
  'tdbank',
  'amzn-synchrony',
  'schwab',
  'tdameritrade',
  'ameriprise',
  'venmo',
  'cashapp',
] as const;
export type Institution = typeof INSTITUTIONS[number];

export const INSTITUTION_LABELS: Record<Institution, string> = {
  amex: 'American Express',
  tdbank: 'TD Bank',
  'amzn-synchrony': 'Amazon Synchrony',
  schwab: 'Charles Schwab',
  tdameritrade: 'TD Ameritrade',
  ameriprise: 'Ameriprise',
  venmo: 'Venmo',
  cashapp: 'Cash App',
};

export interface ParsedData {
  transaction_date: string;
  amount: string;
  description: string;
  transaction_type: string;
  merchant_name?: string | null;
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

export type DuplicateType = 'database' | 'within_statement' | 'both' | 'unmapped_type';

export interface DuplicateInfo {
  duplicate_type: DuplicateType;
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
  reason?: string;
}

export type LLMStatus = 'empty' | 'llm' | 'raw_fallthrough';

export type MerchantSource = 'regex' | 'llm' | null;

export interface LLMSuggestion {
  merchant_name: string | null;
  category_uuid: string | null;
  subcategory_uuid: string | null;
  confidence: number;
}

export interface PreviewItem {
  temp_id: string;
  parsed_data: ParsedData;
  edited_data: Record<string, unknown>; // cast to EditedData at render
  review_status: 'ready' | 'rejected';
  is_duplicate: boolean;
  duplicate_type?: DuplicateType;
  duplicate_info?: DuplicateInfo;
  transaction_kind?: 'regular' | 'investment';
  llm_status: LLMStatus;
  llm_model: string | null;
  llm_processed_at: string | null;
  llm_suggestion: LLMSuggestion | null;
  merchant_source: MerchantSource;
  tier_a_suggestion?: TierASuggestion | null;
}

export interface PreviewSummary {
  total_parsed: number;
  rejected: number;
  ready_to_import: number;
}

export interface LLMSummary {
  source_counts: {
    empty: number;
    llm: number;
    raw_fallthrough: number;
  };
  merchant_source_counts: {
    regex: number;
    llm: number;
    null: number;
  };
  degraded: boolean;
  suggestions_made: number;
  total: number;
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
  ready_to_import: {
    transactions: PreviewItem[];
    investment_transactions: PreviewItem[];
  } | null;
  rejected: {
    transactions: PreviewItem[];
    investment_transactions: PreviewItem[];
  } | null;
  llm_summary?: LLMSummary | null;
  // Canonical top-level flag (backend #60); mirrors llm_summary.degraded.
  llm_degraded?: boolean;
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
  upload_job_id: string;
  suggestion_accepted?: number;
  suggestion_overridden?: number;
  processing_time_ms?: number;
  llm_degraded?: boolean;
}

export type UploadJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface UploadJob {
  // The list endpoint (GET /uploads/jobs) returns raw ORM objects, so the
  // public identifier here is `uuid` (the single-job endpoint exposes it as
  // `id`). See frontend todo #43 / backend #58.
  uuid: string;
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
  llm_degraded?: boolean;
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

// ── Bulk upload (frontend todo #42 / backend #59) ──────────────────────────

/** POST /uploads/files → 201 */
export interface FileUploadResponse {
  document_uuid: string;
  filename: string;
  size: number;
}

/** POST /uploads/bulk → 202 */
export interface BulkKickoffResponse {
  batch_uuid: string;
  total_files: number;
}

export type BatchStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export const BATCH_TERMINAL: BatchStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

export type PerFileStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export interface PerFileResult {
  document_uuid: string;
  filename: string;
  status: PerFileStatus;
  transactions_created: number;
  transactions_skipped: number;
  investment_transactions_created: number;
  investment_transactions_skipped: number;
  error_message: string | null;
  // True if this file imported with the LLM offline → rows un-enriched (#60).
  llm_degraded: boolean;
}

/** GET /uploads/bulk/{batch_uuid} → 200 */
export interface BulkBatchStatus {
  batch_uuid: string;
  status: BatchStatus;
  total: number;
  processed: number;
  current_filename: string | null;
  created: number;
  skipped: number;
  needs_review: number;
  per_file: PerFileResult[];
  created_at: string;
  completed_at: string | null;
  // True if any file in the batch degraded (LLM unreachable) (#60).
  llm_degraded: boolean;
}

/** GET /uploads/bulk?skip&limit → batches[] */
export interface BatchListItem {
  batch_uuid: string;
  status: BatchStatus;
  total: number;
  processed: number;
  created_at: string;
  completed_at: string | null;
}

/** DELETE /uploads/bulk/{batch_uuid} → 200 */
export interface CancelBatchResponse {
  batch_uuid: string;
  status: BatchStatus;
}

// ── Document browser ───────────────────────────────────────────────────────

export type DocumentStatus =
  | 'UPLOADED'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

/** GET /uploads/documents[/{uuid}] */
export interface DocumentResponse {
  document_uuid: string;
  filename: string;
  institution: string;
  status: DocumentStatus;
  account_uuid: string;
  transactions_created: number;
  transactions_skipped: number;
  investment_transactions_created: number;
  investment_transactions_skipped: number;
  file_size: number;
  content_type: string;
  created_at: string;
  // True if this document imported with the LLM offline (#60).
  llm_degraded: boolean;
}

// ── LLM health (frontend todo #44 / backend #60) ───────────────────────────

/** GET /health/llm → 200 (always 200; "offline" is a normal answer). */
export interface LlmHealth {
  online: boolean;
  model: string | null;
  checked_at: string;
}
