# 10 — Amortization UI

## Background

Backend item 5.3 allows spreading a single charge across multiple months for
**budgeting purposes only**. Transaction stats and account balances are unaffected.

New endpoints:
- `PUT /transactions/{uuid}/amortization` — create/replace schedule
- `GET /transactions/{uuid}/amortization` — read schedule (404 if none)
- `DELETE /transactions/{uuid}/amortization` — remove schedule (204)

Two input modes:
1. **Equal split:** `{ "start_month": "2026-01", "months": 12 }` — API auto-divides
2. **Custom:** `{ "allocations": [{ "month": "2026-01", "amount": "10.00" }, ...] }`

Optional `category_uuid` / `subcategory_uuid` override.

Only expense types (`PURCHASE`, `WITHDRAWAL`, `FEE`) can be amortized.

## Changes Required

### 1. Add types in `src/types/transactions.ts`

```ts
export interface AmortizationAllocation {
  id: string;
  month: string;              // "2026-01"
  amount: string;
  category_uuid: string | null;
  category_name: string | null;
  subcategory_uuid: string | null;
  subcategory_name: string | null;
}

export interface AmortizationScheduleResponse {
  transaction_uuid: string;
  total_amount: string;
  num_months: number;
  allocations: AmortizationAllocation[];
}

// For creating — equal split mode
export interface AmortizationEqualSplit {
  start_month: string;
  months: number;
  category_uuid?: string;
  subcategory_uuid?: string;
}

// For creating — custom mode
export interface AmortizationCustom {
  allocations: Array<{ month: string; amount: string }>;
  category_uuid?: string;
  subcategory_uuid?: string;
}
```

### 2. Add hooks in `src/hooks/useTransactions.ts`

```ts
export function useAmortization(uuid: string | null) {
  return useQuery({
    queryKey: ['transactions', uuid, 'amortization'],
    queryFn: () => apiFetch<AmortizationScheduleResponse>(
      `/transactions/${uuid}/amortization`
    ),
    enabled: !!uuid,
    retry: false, // 404 = no schedule, not an error
  });
}

export function useCreateAmortization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: {
      uuid: string;
      data: AmortizationEqualSplit | AmortizationCustom;
    }) =>
      apiFetch<AmortizationScheduleResponse>(
        `/transactions/${uuid}/amortization`,
        { method: 'PUT', body: JSON.stringify(data) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteAmortization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      apiFetch<void>(`/transactions/${uuid}/amortization`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
```

### 3. Create `AmortizationDialog` component

**File:** `src/components/transactions/AmortizationDialog.tsx` (new)

Dialog with two tabs/modes:

**Equal Split tab:**
- Start month input (month picker or `<input type="month">`)
- Number of months input
- Preview: shows computed per-month amount
- Optional category/subcategory override

**Custom Allocations tab:**
- Dynamic rows: month input + amount input per row
- "Add Month" button
- Running total vs transaction amount with validation
- Optional category/subcategory override

**Common:**
- Header showing transaction description and total amount
- "Remove Amortization" button (only when editing existing schedule)
- Submit disabled unless allocations sum to transaction total (custom mode)
- Pre-populate form when editing existing schedule (fetched via `useAmortization`)

### 4. Add "Amortize" action to transaction rows

Only show for expense types (`PURCHASE`, `WITHDRAWAL`, `FEE`).

In `TransactionsPage.tsx`:
```tsx
{['PURCHASE', 'WITHDRAWAL', 'FEE'].includes(tx.transaction_type) && (
  <Button
    size="icon"
    variant="ghost"
    className="h-7 w-7"
    title="Amortize"
    onClick={() => setAmortizeTarget(tx)}
  >
    <CalendarRange className="h-3.5 w-3.5" />
  </Button>
)}
```

Add state and dialog render similar to the split pattern.

### 5. Optional: "Amortized" badge in transaction list

If the backend adds a flag to `TransactionResponse` later, show a small badge.
For now, this could be deferred since detecting amortization requires an extra
query per transaction.

## Verify

- Create equal-split amortization -> schedule saved
- Create custom amortization -> amounts must sum to total
- Edit existing schedule -> form pre-populated
- Delete schedule -> transaction reverts to normal
- Only expense types show the "Amortize" button
- Budget views reflect amortized amounts (backend handles this)
- Transaction stats are NOT affected (backend guarantees this)

## Files Created

- `src/components/transactions/AmortizationDialog.tsx`

## Files Changed

- `src/types/transactions.ts` — amortization types
- `src/hooks/useTransactions.ts` — 3 amortization hooks
- `src/pages/TransactionsPage.tsx` — amortize action button + dialog

## Estimated Scope

~180 lines for `AmortizationDialog`, ~30 lines across other files. This is the
largest item alongside split categories.
