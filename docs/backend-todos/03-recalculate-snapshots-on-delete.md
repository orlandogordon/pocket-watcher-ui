# 03 — Recalculate Snapshots on Transaction Delete

## Goal

Keep historical snapshots accurate when transactions are deleted, matching the
behavior already in place for transaction creation (upload confirm flow).

## Problem

When a transaction is deleted (`delete_db_transaction` in `crud_transaction.py`),
the account balance is reversed correctly, but no snapshot recalculation is
triggered. The historical snapshots for that account still reflect the deleted
transaction's effect, silently becoming stale.

By contrast, the upload confirm flow (`_trigger_backfill_if_needed` in
`routers/uploads.py`) triggers a backfill job from the earliest uploaded
transaction date through today whenever new transactions are created.

## Current Behavior

`delete_db_transaction()` (crud_transaction.py ~line 626):
1. Deletes the transaction row
2. Reverses the balance on the account via `_reverse_balance_effect`
3. Does **not** touch snapshots

Same gap exists for:
- `delete_db_transaction_by_uuid()` — delegates to `delete_db_transaction()`
- `delete_db_investment_transaction()` / `delete_db_investment_transaction_by_uuid()` — rebuilds holdings but no snapshot recalculate

## Changes Required

### 1. Regular transactions — `crud_transaction.py`

In `delete_db_transaction()`, after reversing the balance, trigger a snapshot
backfill job from the deleted transaction's date through today:

```python
# After balance reversal
if account:
    _trigger_backfill_if_needed(db, user_id, account.id, transaction_date)
```

This can reuse the same `_trigger_backfill_if_needed` helper from the upload
flow (may need to extract it to a shared location like `services/`).

### 2. Investment transactions — `crud_investment.py`

In `delete_db_investment_transaction()`, after the holdings rebuild, trigger a
snapshot recalculation from the deleted transaction's date through today.

### 3. Extract backfill trigger helper

`_trigger_backfill_if_needed` currently lives in `routers/uploads.py`. Move it
to `services/account_snapshot.py` so both the upload confirm flow and delete
flows can use it.

## Estimated Scope

- Extract helper to shared location (~move, no new logic)
- ~5 lines added to each delete function
- Investment delete may need the same date-range approach
