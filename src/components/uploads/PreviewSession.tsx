import { useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePreviewSession,
  useRejectItem,
  useBulkRejectItem,
  useRestoreItem,
  useBulkRestoreItem,
  useEditPreviewTransaction,
  useConfirmUpload,
  useExtendSession,
} from '@/hooks/useStatementUpload';
import { ReadyToImportTable } from './ReadyToImportTable';
import { RejectedTable } from './RejectedTable';
import type { ConfirmResponse } from '@/types/uploads';
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
  const rejectItem = useRejectItem(sessionId);
  const bulkRejectItem = useBulkRejectItem(sessionId);
  const restoreItem = useRestoreItem(sessionId);
  const bulkRestoreItem = useBulkRestoreItem(sessionId);
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

  function handleReject(tempId: string) {
    setPendingTempId(tempId);
    rejectItem.mutate(tempId, { onSettled: () => setPendingTempId(null) });
  }

  function handleBulkReject(tempIds: string[]) {
    bulkRejectItem.mutate(tempIds);
  }

  function handleRestore(tempId: string) {
    setPendingTempId(tempId);
    restoreItem.mutate(tempId, { onSettled: () => setPendingTempId(null) });
  }

  function handleBulkRestore(tempIds: string[]) {
    bulkRestoreItem.mutate(tempIds);
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

  const summary = preview.summary ?? { total_parsed: 0, rejected: 0, ready_to_import: 0 };
  const hoursLeft = (new Date(preview.expires_at).getTime() - Date.now()) / 3_600_000;
  const showTtlWarning = hoursLeft < 1;

  const allReady = [
    ...(preview.ready_to_import?.transactions ?? []),
    ...(preview.ready_to_import?.investment_transactions ?? []),
  ];
  const allRejected = [
    ...(preview.rejected?.transactions ?? []),
    ...(preview.rejected?.investment_transactions ?? []),
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
          disabled={confirmUpload.isPending || allReady.length === 0}
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
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Parsed</p>
            <p className="text-2xl font-semibold">{summary.total_parsed}</p>
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

      {/* Tabbed sections */}
      <Tabs defaultValue="ready">
        <TabsList>
          <TabsTrigger value="ready">
            Ready to Import ({allReady.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({allRejected.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ready" className="mt-4">
          <ReadyToImportTable
            items={allReady}
            onReject={handleReject}
            onBulkReject={handleBulkReject}
            onEditSave={handleEditSave}
            isPending={rejectItem.isPending || bulkRejectItem.isPending}
            pendingTempId={pendingTempId}
          />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <RejectedTable
            items={allRejected}
            onRestore={handleRestore}
            onBulkRestore={handleBulkRestore}
            isPending={restoreItem.isPending || bulkRestoreItem.isPending}
            pendingTempId={pendingTempId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
