import { useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  usePreviewSession,
  useReviewDuplicate,
  useRejectUniqueItem,
  useBulkReviewDuplicate,
  useBulkRejectItem,
  useEditPreviewTransaction,
  useConfirmUpload,
  useExtendSession,
} from '@/hooks/useStatementUpload';
import { PendingReviewTable } from './PendingReviewTable';
import { ReadyToImportTable } from './ReadyToImportTable';
import type { ConfirmResponse, DuplicateAction, BulkDuplicateReviewItem } from '@/types/uploads';
import type { RowEdits } from './PendingReviewTable';

interface PreviewSessionProps {
  sessionId: string;
  onCancel: () => void;
  onConfirmed: (result: ConfirmResponse) => void;
}

function buildEditedData(edits: RowEdits): Record<string, unknown> {
  const edited_data: Record<string, unknown> = {};
  if (edits.description) edited_data.description = edits.description;
  if (edits.amount) {
    if (edits.transaction_kind === 'investment') {
      edited_data.total_amount = edits.amount;
    } else {
      edited_data.amount = edits.amount;
    }
  }
  if (edits.transaction_type) edited_data.transaction_type = edits.transaction_type;
  if (edits.transaction_date) edited_data.transaction_date = edits.transaction_date;
  if (edits.merchant_name) edited_data.merchant_name = edits.merchant_name;
  if (edits.category_uuid) edited_data.category_uuid = edits.category_uuid;
  if (edits.subcategory_uuid) edited_data.subcategory_uuid = edits.subcategory_uuid;
  if (edits.tag_uuids.length > 0) edited_data.tag_uuids = edits.tag_uuids;
  if (edits.comments) edited_data.comments = edits.comments;
  if (edits.symbol) edited_data.symbol = edits.symbol;
  if (edits.security_type) edited_data.security_type = edits.security_type;
  if (edits.quantity) edited_data.quantity = edits.quantity;
  if (edits.price_per_share) edited_data.price_per_share = edits.price_per_share;
  return edited_data;
}

export function PreviewSession({ sessionId, onCancel, onConfirmed }: PreviewSessionProps) {
  const [pendingTempId, setPendingTempId] = useState<string | null>(null);

  const { data: preview, isLoading, error } = usePreviewSession(sessionId);
  const reviewDuplicate = useReviewDuplicate(sessionId);
  const rejectUniqueItem = useRejectUniqueItem(sessionId);
  const bulkReviewDuplicate = useBulkReviewDuplicate(sessionId);
  const bulkRejectItem = useBulkRejectItem(sessionId);
  const editTransaction = useEditPreviewTransaction(sessionId);
  const confirmUpload = useConfirmUpload();
  const extendSession = useExtendSession();

  // Debounced edit saves — coalesce rapid field changes per row into one API call
  const pendingEdits = useRef<Map<string, { edits: RowEdits; timer: ReturnType<typeof setTimeout> }>>(new Map());

  const flushEdit = useCallback((tempId: string): Promise<unknown> | undefined => {
    const entry = pendingEdits.current.get(tempId);
    if (!entry) return;
    clearTimeout(entry.timer);
    pendingEdits.current.delete(tempId);
    const edited_data = buildEditedData(entry.edits);
    if (Object.keys(edited_data).length > 0) {
      return editTransaction.mutateAsync({ temp_id: tempId, edited_data });
    }
  }, [editTransaction]);

  const flushAllEdits = useCallback(() => {
    const promises: Promise<unknown>[] = [];
    for (const tempId of [...pendingEdits.current.keys()]) {
      const p = flushEdit(tempId);
      if (p) promises.push(p);
    }
    return Promise.all(promises);
  }, [flushEdit]);

  const handleEditSave = useCallback((tempId: string, edits: RowEdits) => {
    const existing = pendingEdits.current.get(tempId);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => flushEdit(tempId), 2000);
    pendingEdits.current.set(tempId, { edits, timer });
  }, [flushEdit]);

  async function handleReview(tempId: string, action: DuplicateAction, edits?: RowEdits) {
    // Flush any debounced edit for this row immediately
    const pending = pendingEdits.current.get(tempId);
    if (pending) {
      clearTimeout(pending.timer);
      pendingEdits.current.delete(tempId);
      // Use the latest edits from the action call (they include the most recent state)
    }

    setPendingTempId(tempId);
    try {
      if (edits) {
        const edited_data = buildEditedData(edits);
        if (Object.keys(edited_data).length > 0) {
          await editTransaction.mutateAsync({ temp_id: tempId, edited_data });
        }
      }
      await reviewDuplicate.mutateAsync({ tempId, action });
    } finally {
      setPendingTempId(null);
    }
  }

  function handleBulkReview(items: BulkDuplicateReviewItem[]) {
    bulkReviewDuplicate.mutate(items);
  }

  function handleBulkMoveToReview(tempIds: string[]) {
    bulkRejectItem.mutate(tempIds);
  }

  function handleMoveToReview(tempId: string) {
    // /reject-item works for any ready_to_import item (unique or approved_duplicate)
    // — it moves the item to the rejected bucket in pending_review
    setPendingTempId(tempId);
    rejectUniqueItem.mutate(tempId, { onSettled: () => setPendingTempId(null) });
  }

  function handleBack() {
    onCancel();
  }

  async function handleConfirm() {
    await flushAllEdits();
    confirmUpload.mutate(sessionId, {
      onSuccess: (result) => onConfirmed(result),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Loading preview...
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-destructive">{error?.message ?? 'Failed to load preview session.'}</p>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  const summary = preview.summary ?? { total_parsed: 0, pending_review: 0, rejected: 0, ready_to_import: 0, can_confirm: false };
  const hoursLeft = (new Date(preview.expires_at).getTime() - Date.now()) / 3_600_000;
  const showTtlWarning = hoursLeft < 1;

  const allPending = [
    ...(preview.pending_review?.transactions ?? []),
    ...(preview.pending_review?.investment_transactions ?? []),
  ];
  const allReady = [
    ...(preview.ready_to_import?.transactions ?? []),
    ...(preview.ready_to_import?.investment_transactions ?? []),
  ];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handleBack}>
          ← Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!summary.can_confirm || confirmUpload.isPending}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {confirmUpload.isPending ? 'Importing...' : 'Confirm Import'}
        </Button>
      </div>

      {/* Suggested account banner */}
      {preview.account_info?.suggested_account_name && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Suggested account: <span className="font-medium">{preview.account_info.suggested_account_name}</span>
        </div>
      )}

      {/* TTL warning banner */}
      {showTtlWarning && (
        <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Session expires in less than 1 hour.
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-700 hover:bg-amber-100"
            onClick={() => extendSession.mutate(sessionId)}
            disabled={extendSession.isPending}
          >
            {extendSession.isPending ? 'Extending...' : 'Extend (+12h)'}
          </Button>
        </div>
      )}

      {/* Error banners */}
      {confirmUpload.error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {confirmUpload.error.message}
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Parsed</p>
            <p className="text-2xl font-semibold">{summary.total_parsed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Need Review</p>
            <p className="text-2xl font-semibold text-amber-600">{summary.pending_review}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Ready to Import</p>
            <p className="text-2xl font-semibold text-green-600">{summary.ready_to_import}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-2xl font-semibold text-muted-foreground">{summary.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Review section — always shown so rejected items remain visible */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">
          Needs Review ({allPending.length})
        </h2>
        <PendingReviewTable
          items={allPending}
          onReview={handleReview}
          onBulkReview={handleBulkReview}
          onEditSave={handleEditSave}
          isPending={reviewDuplicate.isPending || bulkReviewDuplicate.isPending}
          pendingTempId={pendingTempId}
        />
      </div>

      {/* Ready to Import section */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">
          Ready to Import ({allReady.length})
        </h2>
        <ReadyToImportTable
          items={allReady}
          onMoveToReview={handleMoveToReview}
          onBulkMoveToReview={handleBulkMoveToReview}
          onEditSave={handleEditSave}
          isPending={reviewDuplicate.isPending || rejectUniqueItem.isPending || bulkRejectItem.isPending}
          pendingTempId={pendingTempId}
        />
      </div>
    </div>
  );
}
