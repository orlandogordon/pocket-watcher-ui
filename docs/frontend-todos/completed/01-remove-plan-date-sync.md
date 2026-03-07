# 01 — Remove Frontend Plan Date Sync

## Background

Backend item 3.1 added `_sync_plan_dates()` on the server side. The backend now
automatically recomputes `start_date` / `end_date` from all months belonging to a
plan whenever a month is created or deleted. The frontend's manual sync is now
redundant and causes an unnecessary extra PUT request.

## Current Frontend Code

### `src/hooks/useFinancialPlans.ts` (lines 21-40)

```ts
export async function syncPlanDates(planUuid: string, months: FinancialPlanMonthResponse[]) {
  if (months.length === 0) return;
  const sorted = [...months].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startDate = `${first.year}-${String(first.month).padStart(2, '0')}-01`;
  const lastDay = new Date(last.year, last.month, 0).getDate();
  const endDate = `${last.year}-${String(last.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  await apiFetch(`/financial_plans/${planUuid}`, {
    method: 'PUT',
    body: JSON.stringify({ start_date: startDate, end_date: endDate }),
  });
}
```

### `src/pages/PlanDetailPage.tsx` (lines 24, 125-134)

Import:
```ts
import { ..., syncPlanDates } from '@/hooks/useFinancialPlans';
```

useEffect that fires `syncPlanDates` when the month count changes:
```ts
const prevMonthCountRef = useRef<number | null>(null);
useEffect(() => {
  if (!plan || !uuid) return;
  const count = plan.monthly_periods.length;
  if (prevMonthCountRef.current !== null && prevMonthCountRef.current !== count) {
    syncPlanDates(uuid, plan.monthly_periods);
  }
  prevMonthCountRef.current = count;
}, [plan, uuid]);
```

## Changes Required

### 1. `src/hooks/useFinancialPlans.ts`

- **Delete** the entire `syncPlanDates` function (lines 21-40) and its JSDoc comment.
- No other code in this file references it.

### 2. `src/pages/PlanDetailPage.tsx`

- **Remove** `syncPlanDates` from the import on line 24.
- **Delete** the `prevMonthCountRef` ref and the `useEffect` block (lines 126-134).
- **Remove** `useRef` from the React import on line 1 (only if no other refs remain
  in the file — check first). Currently `useRef` is not used elsewhere in this
  component, so it can be removed.
- The `useEffect` import should stay (check if used elsewhere — it is not used
  elsewhere in this file, so remove it too).

### 3. Verify

After the changes:
- Create a month on a plan -> plan's date range updates in the response without
  a separate PUT.
- Delete a month -> same behavior.
- Bulk create months -> same behavior.
- No extra network request to `PUT /financial_plans/{uuid}` after month mutations.

## Estimated Scope

~10 lines deleted across 2 files. No new code needed.
