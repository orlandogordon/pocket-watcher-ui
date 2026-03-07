# 04 — Split Allocation Cleanup

## 1. Remove `notes` column from `transaction_split_allocations`

The `notes` field on `SplitAllocationCreate`/`SplitAllocationResponse` and the `notes`
column on `TransactionSplitAllocationDB` are unused. Users can use the transaction-level
`comments` field instead.

- Drop the `notes` column from the `transaction_split_allocations` table
- Remove `notes` from `SplitAllocationCreate` and `SplitAllocationResponse` schemas
- Generate an alembic migration

## 2. Confirm split deletion behavior

Verify that `DELETE /transactions/{uuid}/splits` fully removes the allocation rows from
the database (hard delete), rather than soft-deleting or leaving orphaned records. When a
user removes splits, the transaction should revert to an uncategorized state with no
leftover allocation rows in the table.
