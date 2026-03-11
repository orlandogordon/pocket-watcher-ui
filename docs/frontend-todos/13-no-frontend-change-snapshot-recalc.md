# 13 — Snapshot Recalculation on Delete (No Frontend Change)

**Status:** No frontend work required

## Backend Change (Todo 03)

Extracted `trigger_backfill_if_needed` into a shared helper in `services/account_snapshot.py`.
Deleting a regular or investment transaction now automatically recalculates historical
snapshots from the transaction date forward — matching the existing behavior for transaction
creation/upload.

## Why No Frontend Change

This is a backend data integrity improvement. The frontend already displays account history
charts and net worth graphs from snapshot data. Those views will now stay accurate after
deletions without any client-side changes.
