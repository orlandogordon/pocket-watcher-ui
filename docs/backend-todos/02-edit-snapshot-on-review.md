# 02 — Edit Snapshots Flagged for Review

## Goal

Allow users to correct snapshot values directly from the admin "Needs Review" UI
before dismissing them. Currently the only options are recalculate (re-run the
automated logic) or dismiss (accept as-is). There is no way to manually fix an
inaccurate balance.

## Problem

When a snapshot is flagged `needs_review` (e.g. missing price data for an
investment holding, or date before earliest transaction), the balance may be
wrong. The user can see it's wrong but has no way to provide the correct value —
they can only dismiss the flag or trigger a recalculation that may produce the
same result.

## Changes Required

### 1. New endpoint — `PUT /account-history/accounts/{account_uuid}/snapshots/{snapshot_uuid}`

Update mutable fields on a single snapshot:

```python
class SnapshotUpdateRequest(BaseModel):
    balance: Optional[Decimal] = None
    securities_value: Optional[Decimal] = None
    cash_balance: Optional[Decimal] = None
    total_cost_basis: Optional[Decimal] = None
    unrealized_gain_loss: Optional[Decimal] = None
    realized_gain_loss: Optional[Decimal] = None
    dismiss_review: Optional[bool] = None  # optionally clear the flag in same call
```

Behavior:
- Only update fields that are provided (partial update)
- Set `snapshot_source` to `"manual_edit"` (or append to existing)
- If `dismiss_review` is true, clear `needs_review` and append to `review_reason`
- Return the updated `AccountSnapshotResponse`

### 2. Service layer — `update_snapshot()` in `services/account_snapshot.py`

- Lookup snapshot by UUID + account_id
- Apply provided fields
- Update `snapshot_source` to indicate manual edit
- Commit and return

### 3. Response model

No changes needed — `AccountSnapshotResponse` already includes all fields.

## Frontend Usage

Once available, the admin "Needs Review" table rows will get an "Edit" button
that opens a dialog to correct the balance/values before dismissing.

## Estimated Scope

- 1 new endpoint (~20 lines)
- 1 new service function (~20 lines)
- 1 new Pydantic request model (~10 lines)
