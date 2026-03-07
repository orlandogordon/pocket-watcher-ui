# 07 — Remove Holding CRUD UI

## Background

Backend item 4.4 made holdings a derived/materialized cache rebuilt from transactions.
The holding create, update, and delete endpoints were removed from the backend.
The frontend still has CRUD UI and hooks for holdings that now target non-existent
endpoints.

## Current Code

### `src/hooks/useInvestments.ts`

- `useCreateHolding()` (lines 21-33) — `POST /investments/holdings/` (removed)
- `useUpdateHolding()` (lines 35-47) — `PUT /investments/holdings/{uuid}` (removed)
- `useDeleteHolding()` (lines 49-58) — `DELETE /investments/holdings/{uuid}` (removed)

### `src/pages/InvestmentDetailPage.tsx`

- `HoldingFormDialog` import (line 31) and usage (lines 516-521)
- `DeleteHoldingDialog` import (line 32) and usage (lines 522-526)
- "Add Holding" button (lines 142-151)
- Edit (pencil) button per holding row (lines 223-230)
- Delete (trash) button per holding row (lines 231-239)
- State: `holdingFormOpen`, `editHolding`, `deleteHolding` (lines 56-58)

### Files to delete

- `src/components/investments/HoldingFormDialog.tsx`
- `src/components/investments/DeleteHoldingDialog.tsx`

### `src/types/investments.ts`

- `InvestmentHoldingCreate` type — no longer needed

## Changes Required

### 1. `src/hooks/useInvestments.ts`

Delete:
- `useCreateHolding` function
- `useUpdateHolding` function
- `useDeleteHolding` function
- Remove `InvestmentHoldingCreate` from the import

### 2. `src/types/investments.ts`

Delete:
- `InvestmentHoldingCreate` interface

### 3. `src/pages/InvestmentDetailPage.tsx`

- Remove imports: `HoldingFormDialog`, `DeleteHoldingDialog`
- Remove state: `holdingFormOpen`, `editHolding`, `deleteHolding`
- Remove "Add Holding" button from the holdings section header
- Remove Edit and Delete buttons from each holding row (remove the entire actions
  `<TableHead>` and `<TableCell>` column)
- Remove `<HoldingFormDialog>` and `<DeleteHoldingDialog>` from the dialogs section
- Holdings table is now read-only (display only)
- Optionally add a small note: "Holdings are derived from transactions" as helper text

### 4. Delete files

- `src/components/investments/HoldingFormDialog.tsx`
- `src/components/investments/DeleteHoldingDialog.tsx`

## Verify

- Investment detail page loads and shows holdings (read-only)
- No "Add Holding" button
- No edit/delete buttons on holding rows
- Adding a BUY transaction -> holdings refresh (existing invalidation in
  `useCreateInvestmentTransaction` already handles this)
- No TypeScript errors from removed exports

## Estimated Scope

~20 lines removed from `InvestmentDetailPage.tsx`, 3 functions removed from
`useInvestments.ts`, 2 files deleted.
