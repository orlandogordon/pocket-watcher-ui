# 17 — Enable Amortization for All Transaction Types

## Background

Backend todo 07 removed the expense-only restriction on amortization. Income transactions
(DEPOSIT, CREDIT) can now be amortized — e.g., spreading an annual bonus across 12 months.

Backend todo 05 also confirmed that amortization no longer stores its own category — it
inherits from the parent transaction. The frontend already removed category fields from
the amortization dialog (noted in the backend todo), so no changes needed there.

## Current State

The frontend hides the "Amortize" button for non-expense transactions via an `isExpense`
check (or similar gate) in the transaction actions area. This gate should be removed now
that the backend accepts all types.

## Changes Required

### 1. Remove transaction type gate on the Amortize button

In the transactions page/table, find the condition that hides the amortize action for
non-expense types and remove it. The button should appear for all transaction types.

Example of what to remove:
```tsx
// REMOVE this guard:
{isExpenseType(tx.transaction_type) && (
  <Button onClick={() => setAmortizeTarget(tx)}>Amortize</Button>
)}

// REPLACE with:
<Button onClick={() => setAmortizeTarget(tx)}>Amortize</Button>
```

### 2. Update mutual exclusion hint (from backend todo 05)

The frontend already hides the Amortize button for transactions that have splits.
The backend todo noted that hiding the Split button for amortized transactions was
deferred. If the transaction response now includes enough info to detect an active
amortization schedule (e.g., `has_amortization` flag or `amortization_schedule` field),
also hide the Split button for amortized transactions.

If no such field exists in the response, skip this — the backend enforces mutual
exclusion with a 400 error, which is sufficient.

## Verify

- DEPOSIT, CREDIT, INTEREST transactions show the Amortize button
- Amortizing an income transaction works end-to-end
- Expense transactions still show Amortize (no regression)
- Split transactions still hide Amortize (mutual exclusion preserved)

## Files Changed

- Transactions page/table component — remove type check on amortize action

## Estimated Scope

Small — ~5 lines changed (removing a condition).
