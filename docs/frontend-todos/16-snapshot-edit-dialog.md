# 16 — Snapshot Edit Dialog

## Background

Backend todo 02 added `PUT /account-history/accounts/{account_uuid}/snapshots/{snapshot_uuid}`
for editing flagged snapshots. Frontend todo 08 (completed) added a dismiss button for
reviewed snapshots, but there's no way to *edit* incorrect snapshot values before dismissing.

### Backend Endpoint

```
PUT /account-history/accounts/{account_uuid}/snapshots/{snapshot_uuid}
```

Request body (all fields optional, at least one required):
```json
{
  "balance": "12345.67",
  "securities_value": "8000.00",
  "cash_balance": "4345.67",
  "total_cost_basis": "7500.00",
  "unrealized_gain_loss": "500.00",
  "realized_gain_loss": "150.00",
  "dismiss_review": true
}
```

- Returns 400 if no update fields provided
- Returns 404 if snapshot or account not found
- Sets `snapshot_source` to `MANUAL_EDIT` automatically
- Response is the full updated `AccountSnapshotResponse`

## Current State

The "Needs Review" snapshots list shows a dismiss button but no edit capability.
Users who find incorrect snapshot values must dismiss them without correction, leaving
inaccurate historical data.

## Changes Required

### 1. Add edit dialog component

Create a dialog/modal opened from an "Edit" button on each snapshot row in the
needs-review list. The dialog should:

- Pre-fill all editable fields with the snapshot's current values
- Allow the user to modify any combination of fields
- Include a "Dismiss review" checkbox (checked by default)
- Submit only changed fields + `dismiss_review` to the PUT endpoint
- Show the snapshot date and account name in the dialog header for context

### 2. Add mutation hook

```ts
export function useUpdateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountUuid, snapshotUuid, data }: {
      accountUuid: string;
      snapshotUuid: string;
      data: SnapshotUpdateRequest;
    }) =>
      apiFetch<AccountSnapshotResponse>(
        `/account-history/accounts/${accountUuid}/snapshots/${snapshotUuid}`,
        { method: 'PUT', body: JSON.stringify(data) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-history'] });
    },
  });
}
```

### 3. Add types

```ts
export interface SnapshotUpdateRequest {
  balance?: string;
  securities_value?: string;
  cash_balance?: string;
  total_cost_basis?: string;
  unrealized_gain_loss?: string;
  realized_gain_loss?: string;
  dismiss_review?: boolean;
}
```

### 4. Wire into the needs-review UI

Add an "Edit" button alongside the existing "Dismiss" button on each flagged snapshot row.
The edit dialog provides a superset of dismiss functionality (since it can include
`dismiss_review: true`), so users can edit-and-dismiss in one action.

## Verify

- Edit button opens dialog pre-filled with current values
- Changing one field and submitting sends only that field + dismiss_review
- Submitting with no changes shows validation error (API returns 400)
- Dismiss checkbox works — review flag clears when checked
- Snapshot values update in the UI after save
- Investment account snapshots show all 6 fields; checking/savings accounts may only show balance

## Files Created

- Snapshot edit dialog component

## Files Changed

- Account history types — add `SnapshotUpdateRequest`
- Account history hooks — add `useUpdateSnapshot` mutation
- Needs-review list/page — add Edit button and dialog wiring

## Estimated Scope

Medium — ~120 lines for dialog, ~30 lines across types/hooks/wiring.
