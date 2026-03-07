# 06 — Bulk Month Creation for Financial Plans

## Background

Backend item 3.7 added `POST /financial_plans/{uuid}/months/bulk` which creates
all months and their expenses in a single atomic transaction. Currently
`BulkMonthDialog.tsx` loops individual `createMonth.mutateAsync()` calls.

## Current Code

### `src/components/financial-plans/BulkMonthDialog.tsx` (lines 117-163)

```ts
async function onSubmit(values: FormValues) {
  // ...
  for (let i = 0; i < count; i++) {
    await createMonth.mutateAsync({
      planUuid,
      data: { year: y, month: m, planned_income, expenses },
    });
    // progress bar updates per iteration
    m++; if (m > 12) { m = 1; y++; }
  }
}
```

Uses `useCreatePlanMonth()` in a loop with a progress bar.

## Changes Required

### 1. Add bulk create hook in `src/hooks/useFinancialPlans.ts`

```ts
export function useBulkCreateMonths() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planUuid, data }: {
      planUuid: string;
      data: FinancialPlanMonthCreate[];
    }) =>
      apiFetch<FinancialPlanMonthResponse[]>(
        `/financial_plans/${planUuid}/months/bulk`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    onSuccess: (_data, { planUuid }) => {
      qc.invalidateQueries({ queryKey: planKeys.detail(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.summary(planUuid) });
      qc.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}
```

Ensure `FinancialPlanMonthCreate` in `src/types/financial-plans.ts` includes an
optional `expenses` field for nested expense creation:
```ts
export interface FinancialPlanMonthCreate {
  year: number;
  month: number;
  planned_income: string;
  expenses?: FinancialPlanExpenseCreate[];
}
```

### 2. Update `BulkMonthDialog.tsx`

Replace the loop with a single bulk call:

```ts
const bulkCreate = useBulkCreateMonths();

async function onSubmit(values: FormValues) {
  setSubmitError(null);
  const startYear = parseInt(values.start_year);
  const startMonth = parseInt(values.start_month);
  const count = parseInt(values.count);

  const months: FinancialPlanMonthCreate[] = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < count; i++) {
    months.push({
      year: y,
      month: m,
      planned_income: values.planned_income,
      expenses: values.expenses.length > 0 ? values.expenses : undefined,
    });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  bulkCreate.mutate(
    { planUuid, data: months },
    {
      onSuccess: () => onOpenChange(false),
      onError: (err) => setSubmitError(err.message),
    },
  );
}
```

- Remove `useCreatePlanMonth` import and usage
- Remove the `progress` state and progress bar UI (no longer needed since it's a
  single request — just show "Creating..." on the button)
- Replace `isPending` logic: `const isPending = bulkCreate.isPending`
- Error handling: 409 = duplicate month (show error message), 404 = missing category

### 3. Simplify the dialog

- Remove `progress` state (`useState<{ current; total } | null>(null)`)
- Remove progress bar JSX (lines 372-384)
- The dialog close guard (`isPending ? undefined : onOpenChange`) still works

## Verify

- Create 6 months with expenses -> single network request -> all months appear
- Duplicate month -> 409 error displayed
- Missing category UUID -> 404 error displayed
- Dialog closes on success
- Plan summary and detail refresh automatically

## Files Changed

- `src/hooks/useFinancialPlans.ts` — `useBulkCreateMonths` hook
- `src/types/financial-plans.ts` — verify `expenses` field on `FinancialPlanMonthCreate`
- `src/components/financial-plans/BulkMonthDialog.tsx` — replace loop with bulk call

## Estimated Scope

~20 lines new, ~30 lines removed/simplified across 3 files.
