# 11 — Amount Sign Coloring Audit

## Background

Backend item 1.1 changed amounts to always be stored as **positive**. The
`transaction_type` field is the sole source of truth for direction. The frontend
should not rely on `amount < 0` for expense/income coloring.

## Current Code

### `src/pages/TransactionsPage.tsx` (lines 341-342, 378-380)

```tsx
const isNegative = amount < 0;
// ...
isNegative ? 'text-red-500' : 'text-green-600'
```

This colors based on amount sign. Since amounts are now always positive, this will
always show green.

### `src/pages/AccountsPage.tsx` (lines 119, 132)

```tsx
const isNegative = balance < 0 || (isLiability && balance > 0);
// ...
isNegative ? 'text-red-500' : 'text-green-600'
```

This is for account balances (not transactions) and includes liability logic. This
is likely correct as-is since account balances can legitimately be negative.

## Changes Required

### 1. `src/pages/TransactionsPage.tsx`

Replace amount-sign-based coloring with transaction-type-based coloring:

```tsx
const EXPENSE_TYPES = new Set(['PURCHASE', 'WITHDRAWAL', 'FEE']);

// In the table row:
const isExpense = EXPENSE_TYPES.has(tx.transaction_type);
// ...
<TableCell className={`text-right font-medium tabular-nums ${
  isExpense ? 'text-red-500' : 'text-green-600'
}`}>
  {isExpense ? `-${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
</TableCell>
```

This shows expenses with a minus sign and red color, income types as green.

### 2. Audit other files

Check if any other components use `amount < 0` for coloring transactions:
- `DashboardPage.tsx` — recent transactions section (check if it colors by amount)
- Upload preview tables — check if they color amounts by sign

Fix any occurrences to use `transaction_type` instead.

## Verify

- Transaction table: PURCHASE/WITHDRAWAL/FEE show red with minus sign
- Transaction table: DEPOSIT/CREDIT/INTEREST show green
- Dashboard recent transactions: same behavior
- Account balances: unchanged (they use balance-specific logic)

## Files Changed

- `src/pages/TransactionsPage.tsx` — amount coloring logic

## Estimated Scope

~5 lines changed in 1-2 files.
