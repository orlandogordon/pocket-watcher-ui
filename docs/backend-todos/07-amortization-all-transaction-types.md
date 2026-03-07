# 07 — Allow Amortization for All Transaction Types

## Background

Amortization is currently restricted to expense types (PURCHASE, WITHDRAWAL, FEE)
in `crud_transaction.py`. There's no technical reason income transactions
(DEPOSIT, CREDIT) can't be amortized — spreading an annual bonus or large
one-time payment across months is a valid use case.

## Changes Required

1. **Remove the type check** in `create_or_replace_amortization_schedule()`
   (`crud_transaction.py` ~line 1425-1426) that raises a ValueError for
   non-expense types.
2. **Remove or update `EXPENSE_TYPES`** constant if it's only used for this check.
3. **Update any tests** that assert the expense-only restriction.

## Frontend

The frontend currently hides the Amortize option for non-expense transactions.
Once this backend change lands, the frontend gate (`isExpense` check in
`TransactionsPage.tsx`) should also be removed.
