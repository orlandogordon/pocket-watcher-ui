import { formatTypeLabel } from '@/lib/format';
import type { AttentionItem } from '@/types/data-health';
import type { TransactionType } from '@/types/transactions';

// Per-kind helpers that pull display values out of the `details` blob.
// Backend keeps `details` loosely-typed for forward-compat; we narrow here.
// Shared between the flat inbox list (InboxPage) and the grouped bulk-review
// workspace (NeedsReviewWorkspace + groupTransactions).

export function getDate(item: AttentionItem): string | null {
  const d = item.details as Record<string, unknown>;
  return (
    (d.transaction_date as string | undefined) ??
    (d.value_date as string | undefined) ??
    (d.out_date as string | undefined) ??
    null
  );
}

export function getDescription(item: AttentionItem): string {
  const d = item.details as Record<string, unknown>;
  if (item.kind === 'snapshot_review') {
    const acct = (d.account_name as string | undefined) ?? '—';
    const reason = (d.review_reason as string | undefined) ?? '';
    return reason ? `${acct} — ${reason}` : acct;
  }
  if (item.kind === 'transfer_pair') {
    const outDesc = (d.out_description as string | undefined) ?? '—';
    const inDesc = (d.in_description as string | undefined) ?? '—';
    const outAcct = (d.out_account_name as string | undefined) ?? '—';
    const inAcct = (d.in_account_name as string | undefined) ?? '—';
    return `${outAcct}: ${outDesc} → ${inAcct}: ${inDesc}`;
  }
  return (d.description as string | undefined) ?? '—';
}

export function getMerchant(item: AttentionItem): string | null {
  const d = item.details as Record<string, unknown>;
  return (d.merchant_name as string | undefined) ?? null;
}

export function getAccountName(item: AttentionItem): string | null {
  const d = item.details as Record<string, unknown>;
  return (d.account_name as string | undefined) ?? null;
}

export function getAmount(item: AttentionItem): string | null {
  const d = item.details as Record<string, unknown>;
  if (item.kind === 'snapshot_review') {
    return (d.balance as string | undefined) ?? null;
  }
  return (d.amount as string | undefined) ?? null;
}

export function getTypeLabel(item: AttentionItem): string | null {
  const d = item.details as Record<string, unknown>;
  const t = d.transaction_type as TransactionType | undefined;
  if (t) return formatTypeLabel(t);
  if (item.kind === 'transfer_pair') return 'TRANSFER';
  if (item.kind === 'snapshot_review') return 'Snapshot';
  return null;
}

export function getCategory(item: AttentionItem): string | null {
  const d = item.details as Record<string, unknown>;
  const parent = (d.category_name as string | undefined) ?? null;
  const sub = (d.subcategory_name as string | undefined) ?? null;
  if (parent && sub) return `${parent} / ${sub}`;
  return parent ?? null;
}

export function getComments(item: AttentionItem): string | null {
  const d = item.details as Record<string, unknown>;
  return (d.comments as string | undefined) ?? null;
}
