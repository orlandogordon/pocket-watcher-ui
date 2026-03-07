# 09 — Split Category UI

## Background

Backend item 5.2 allows distributing a single transaction across multiple categories.
New endpoints:
- `PUT /transactions/{uuid}/splits` — replace all allocations
- `GET /transactions/{uuid}/splits` — read allocations
- `DELETE /transactions/{uuid}/splits` — remove all (204)

`TransactionResponse` now includes `split_allocations: SplitAllocationResponse[]`.
For split transactions, `category` is `null` and `split_allocations` has 2+ entries.

## Current State

The frontend has no split category awareness. Split transactions would show "—" in the
category column since `category` is `null`.

## Changes Required

### 1. Update types in `src/types/transactions.ts`

```ts
export interface SplitAllocationResponse {
  id: string;
  category_uuid: string;
  category_name: string;
  subcategory_uuid: string | null;
  subcategory_name: string | null;
  amount: string;
  notes: string | null;
}

export interface TransactionResponse {
  // ... existing fields
  split_allocations: SplitAllocationResponse[];  // NEW
}

export interface SplitAllocationCreate {
  category_uuid: string;
  subcategory_uuid?: string | null;
  amount: string;
  notes?: string;
}
```

### 2. Add hooks in `src/hooks/useTransactions.ts`

```ts
export function useUpdateSplits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, allocations }: {
      uuid: string;
      allocations: SplitAllocationCreate[];
    }) =>
      apiFetch<TransactionResponse>(`/transactions/${uuid}/splits`, {
        method: 'PUT',
        body: JSON.stringify({ allocations }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteSplits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/transactions/${uuid}/splits`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
```

### 3. Update `TransactionsPage.tsx` — category column

In the table, check for splits:
```tsx
<TableCell className="text-sm">
  {tx.split_allocations?.length > 0 ? (
    <Badge variant="secondary" className="text-xs">
      Split ({tx.split_allocations.length})
    </Badge>
  ) : (
    tx.category?.name ?? '—'
  )}
</TableCell>
```

For the subcategory column, show "—" when split:
```tsx
<TableCell className="text-sm">
  {tx.split_allocations?.length > 0 ? '—' : tx.subcategory?.name ?? '—'}
</TableCell>
```

### 4. Create `SplitCategoryDialog` component

**File:** `src/components/transactions/SplitCategoryDialog.tsx` (new)

A dialog with:
- Header showing transaction description and total amount
- Dynamic list of allocation rows (min 2), each with:
  - Category dropdown (required)
  - Subcategory dropdown (optional, filtered by selected category)
  - Amount input
  - Notes input (optional)
  - Remove button (disabled if only 2 rows)
- "Add Allocation" button
- Running total vs transaction amount with validation:
  - Show remaining: `$X.XX remaining` or `$0.00 - Balanced`
  - Disable submit unless sum equals transaction amount
- Submit calls `PUT /transactions/{uuid}/splits`
- "Remove Splits" button (calls `DELETE`, only shown when editing existing splits)

### 5. Add "Split" action to transaction rows

In `TransactionsPage.tsx`, add a split button to the actions column:
```tsx
<Button
  size="icon"
  variant="ghost"
  className="h-7 w-7"
  title="Split categories"
  onClick={() => setSplitTarget(tx)}
>
  <Scissors className="h-3.5 w-3.5" />  {/* or Split icon */}
</Button>
```

Add state: `const [splitTarget, setSplitTarget] = useState<TransactionResponse | null>(null);`

Render the dialog:
```tsx
<SplitCategoryDialog
  open={!!splitTarget}
  onOpenChange={(open) => { if (!open) setSplitTarget(null); }}
  transaction={splitTarget}
/>
```

### 6. Pre-populate dialog for editing existing splits

When opening the split dialog on a transaction that already has `split_allocations`,
pre-populate the form rows from those allocations.

## Verify

- Transaction with no splits -> category shows normally
- Create a split -> category column shows "Split (N)"
- Edit existing splits -> form pre-populated
- Remove splits -> category reverts to "—" (uncategorized)
- Amounts must sum to transaction total (validation)
- Budget views reflect split allocations (backend handles this)

## Files Created

- `src/components/transactions/SplitCategoryDialog.tsx`

## Files Changed

- `src/types/transactions.ts` — `SplitAllocationResponse`, `SplitAllocationCreate`,
  update `TransactionResponse`
- `src/hooks/useTransactions.ts` — `useUpdateSplits`, `useDeleteSplits`
- `src/pages/TransactionsPage.tsx` — category column display + split action button

## Estimated Scope

~150 lines for `SplitCategoryDialog`, ~20 lines across other files. This is one of
the larger items.
