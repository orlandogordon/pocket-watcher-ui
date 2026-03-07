# 04 — Bulk Actions for Upload Preview

## Background

Backend item 3.5 added two bulk endpoints:
- `POST /uploads/preview/{id}/bulk-review-duplicate` — mixed approve/reject/undo per
  item in one request
- `POST /uploads/preview/{id}/bulk-reject-item` — move multiple ready-to-import items
  back to pending

Currently the frontend loops over individual API calls for bulk actions (see
`PendingReviewTable.tsx` lines 418-420 and `ReadyToImportTable.tsx` line 59).

## Current Code

### `src/pages/... PendingReviewTable.tsx` (lines 418-420)

```ts
function handleBulkApprove() { for (const id of selectedPending) onReview(id, 'approve'); ... }
function handleBulkReject() { for (const id of selectedPending) onReview(id, 'reject'); ... }
function handleBulkRestore() { for (const id of selectedRejected) onReview(id, 'undo_reject'); ... }
```

### `src/components/uploads/ReadyToImportTable.tsx` (lines 58-61)

```ts
function handleBulkMoveToReview() {
  for (const tempId of selected) onMoveToReview(tempId);
  setSelected(new Set());
}
```

### `src/hooks/useStatementUpload.ts`

Only has single-item hooks: `useReviewDuplicate` and `useRejectUniqueItem`.

## Changes Required

### 1. Add types in `src/types/uploads.ts`

```ts
export interface BulkDuplicateReviewItem {
  temp_id: string;
  action: DuplicateAction;
}

export interface BulkDuplicateReviewRequest {
  items: BulkDuplicateReviewItem[];
}

export interface BulkRejectItemRequest {
  temp_ids: string[];
}

export interface BulkActionResponse extends PreviewResponse {
  processed: number;
  errors: Array<{ temp_id: string; error: string }>;
}
```

### 2. Add bulk hooks in `src/hooks/useStatementUpload.ts`

```ts
export function useBulkReviewDuplicate(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkDuplicateReviewItem[]) =>
      apiFetch<BulkActionResponse>(
        `/uploads/preview/${sessionId}/bulk-review-duplicate`,
        { method: 'POST', body: JSON.stringify({ items }) },
      ),
    onSuccess: (data) => {
      qc.setQueryData(uploadKeys.preview(sessionId), data);
    },
  });
}

export function useBulkRejectItem(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tempIds: string[]) =>
      apiFetch<BulkActionResponse>(
        `/uploads/preview/${sessionId}/bulk-reject-item`,
        { method: 'POST', body: JSON.stringify({ temp_ids: tempIds }) },
      ),
    onSuccess: (data) => {
      qc.setQueryData(uploadKeys.preview(sessionId), data);
    },
  });
}
```

### 3. Update `PendingReviewTable.tsx`

The component currently receives `onReview` as a prop from `PreviewSession`. To use
the bulk endpoint, we have two options:

**Option A (simpler):** Pass bulk callbacks as additional props from `PreviewSession`:
- Add `onBulkReview: (items: { temp_id: string; action: DuplicateAction }[]) => void`
- Replace `handleBulkApprove`, `handleBulkReject`, `handleBulkRestore` to build
  an items array and call `onBulkReview` once

**Option B:** Have `PendingReviewTable` accept the session ID and call the bulk hook
directly.

Recommend Option A for consistency with the existing prop-passing pattern.

Update the three bulk handlers:
```ts
function handleBulkApprove() {
  onBulkReview([...selectedPending].map((id) => ({ temp_id: id, action: 'approve' as const })));
  setSelectedPending(new Set());
}
function handleBulkReject() {
  onBulkReview([...selectedPending].map((id) => ({ temp_id: id, action: 'reject' as const })));
  setSelectedPending(new Set());
}
function handleBulkRestore() {
  onBulkReview([...selectedRejected].map((id) => ({ temp_id: id, action: 'undo_reject' as const })));
  setSelectedRejected(new Set());
}
```

### 4. Update `ReadyToImportTable.tsx`

Add `onBulkMoveToReview: (tempIds: string[]) => void` prop. Replace the loop:
```ts
function handleBulkMoveToReview() {
  onBulkMoveToReview([...selected]);
  setSelected(new Set());
}
```

### 5. Update `PreviewSession.tsx`

Wire up the new bulk hooks and pass callbacks to the table components. The
`PreviewSession` orchestrator component needs to:
- Instantiate `useBulkReviewDuplicate(sessionId)` and `useBulkRejectItem(sessionId)`
- Pass `onBulkReview` to `PendingReviewTable`
- Pass `onBulkMoveToReview` to `ReadyToImportTable`

### 6. Handle partial failures

The bulk response includes an `errors` array. Consider showing a toast or inline
message when `errors.length > 0` (e.g. "3 processed, 1 failed: ...").

## Verify

- Select multiple pending items -> "Move to Ready" -> single network request
- Select multiple pending items -> "Reject Selected" -> single request
- Select multiple rejected items -> "Restore Selected" -> single request
- Select multiple ready-to-import items -> "Move to Review" -> single request
- Individual row actions still work (unchanged)
- Partial failures display error feedback

## Files Changed

- `src/types/uploads.ts` — new types
- `src/hooks/useStatementUpload.ts` — 2 new hooks
- `src/components/uploads/PendingReviewTable.tsx` — bulk handlers + new prop
- `src/components/uploads/ReadyToImportTable.tsx` — bulk handler + new prop
- `src/components/uploads/PreviewSession.tsx` — wire bulk hooks

## Estimated Scope

~40 lines new code, ~15 lines changed across 5 files.
