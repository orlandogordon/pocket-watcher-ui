export type AttentionKind =
  | 'needs_review'
  | 'transfer_pair'
  | 'transfer_orphan'
  | 'snapshot_review';

export type AttentionSeverity = 'action_required' | 'suggested' | 'informational';

export type AttentionConfidence = 'HIGH' | 'MEDIUM';

export type AttentionSubjectType =
  | 'transaction'
  | 'investment_transaction'
  | 'snapshot'
  | 'transfer_pair';

export interface AttentionSubject {
  type: AttentionSubjectType;
  primary_uuid: string;
  partner_uuid?: string | null;
}

export interface AttentionAction {
  label: string;
  method: 'POST' | 'DELETE';
  href: string;
  body?: Record<string, unknown> | null;
}

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: AttentionSeverity;
  subject: AttentionSubject;
  summary: string;
  details: Record<string, unknown>;
  confidence?: AttentionConfidence | null;
  created_at: string;
  actions: AttentionAction[];
}

export interface DataHealthCountResponse {
  total: number;
  by_kind: Record<string, number>;
}

export const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  action_required: 0,
  suggested: 1,
  informational: 2,
};
