# 08 — Dismiss Snapshot Review

## Background

Backend item 4.3 added `POST /accounts/{uuid}/snapshots/dismiss-review` which
accepts `{ "snapshot_uuids": [...], "reason?": "..." }` and clears `needs_review`
on the specified snapshots.

The admin page's "Needs Review" section currently only has a "Recalculate Range"
button. There's no way to dismiss/acknowledge snapshots that are correct but flagged.

## Current Code

### `src/pages/AdminPage.tsx` — `NeedsReviewAccount` (lines 227-301)

Shows a table of flagged snapshots per account with columns: Date, Balance, Source.
Has a "Recalculate Range" button but no dismiss action.

### `src/hooks/useAdmin.ts` — `NeedsReviewSnapshot` type (lines 37-48)

Missing `snapshot_uuid` field. The backend now includes `snapshot_uuid` in the needs
review response (from item 2.6).

## Changes Required

### 1. Update `NeedsReviewSnapshot` type in `src/hooks/useAdmin.ts`

Add the UUID field:
```ts
export interface NeedsReviewSnapshot {
  snapshot_uuid: string;       // NEW — needed for dismiss
  account_uuid: string;
  value_date: string;
  balance: string;
  // ... rest unchanged
}
```

### 2. Add dismiss hook in `src/hooks/useAdmin.ts`

```ts
export function useDismissSnapshotReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountUuid,
      snapshotUuids,
      reason,
    }: {
      accountUuid: string;
      snapshotUuids: string[];
      reason?: string;
    }) =>
      apiFetch<{ dismissed_count: number }>(
        `/accounts/${accountUuid}/snapshots/dismiss-review`,
        {
          method: 'POST',
          body: JSON.stringify({
            snapshot_uuids: snapshotUuids,
            reason: reason ?? 'Dismissed by user',
          }),
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminKeys.needsReview(variables.accountUuid),
      });
    },
  });
}
```

### 3. Update `NeedsReviewAccount` in `src/pages/AdminPage.tsx`

Add two dismiss actions:

**a) Per-row dismiss button** — add a column to the table:
```tsx
<TableHead className="w-20" /> {/* Dismiss column */}
```
```tsx
<TableCell>
  <Button
    size="sm"
    variant="ghost"
    className="h-7 text-xs"
    onClick={() => dismiss.mutate({
      accountUuid: account.uuid,
      snapshotUuids: [s.snapshot_uuid],
    })}
    disabled={dismiss.isPending}
  >
    Dismiss
  </Button>
</TableCell>
```

**b) Bulk "Dismiss All" button** — next to "Recalculate Range":
```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => dismiss.mutate({
    accountUuid: account.uuid,
    snapshotUuids: snapshots.map((s) => s.snapshot_uuid),
  })}
  disabled={dismiss.isPending}
>
  <CheckCircle className="mr-1 h-3 w-3" />
  Dismiss All
</Button>
```

## Verify

- Snapshots flagged `needs_review` appear in the admin page
- Click "Dismiss" on a row -> row disappears from the list
- Click "Dismiss All" -> all rows for that account disappear
- Recalculate still works alongside dismiss

## Files Changed

- `src/hooks/useAdmin.ts` — update type + add `useDismissSnapshotReview` hook
- `src/pages/AdminPage.tsx` — add dismiss buttons to `NeedsReviewAccount`

## Estimated Scope

~30 lines new across 2 files.
