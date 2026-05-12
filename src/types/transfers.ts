// Types for /transfers endpoints (backend #39).
// See Frontend Todo 35 for full shape and confidence/copy guidance.

export interface TransferTxnRef {
  id: string;
  is_investment: boolean;
  transaction_date: string;
  amount: string;
  description: string | null;
  account_id: string | null;
  account_name: string | null;
  transaction_type: string;
}

export type PairConfidence = 'HIGH' | 'MEDIUM';

export interface PairSuggestion {
  out_side: TransferTxnRef;
  in_side: TransferTxnRef;
  confidence: PairConfidence;
  date_offset_days: number;
}

export interface ConfirmSuggestionRequest {
  from_transaction_uuid: string;
  to_transaction_uuid: string;
  reclassify_from?: boolean;
  reclassify_to?: boolean;
}

export interface ConfirmSuggestionResponse {
  relationship_id: string;
}

export interface DismissSuggestionRequest {
  from_transaction_uuid: string;
  to_transaction_uuid: string;
}

export interface DismissSuggestionResponse {
  dismissed: boolean;
}

// Emitted by /uploads/statement/preview on items whose description token
// matched another user-owned account. The parsed_data.transaction_type is
// already mutated to TRANSFER_OUT when this field is present.
export interface TierASuggestion {
  proposed_transaction_type: 'TRANSFER_OUT';
  suggested_partner_account_uuid: string | null;
  suggested_partner_account_name: string | null;
  matched_token: string | null;
}
