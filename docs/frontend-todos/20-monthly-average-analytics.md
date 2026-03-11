# 20 — Monthly Average Analytics Page

## Background

Backend todo 09 added `GET /transactions/stats/monthly-averages` which returns yearly
aggregated income/expense/net data with category breakdowns and per-month detail. All
computation happens server-side.

### Backend Endpoint

```
GET /transactions/stats/monthly-averages?year=2026
GET /transactions/stats/monthly-averages?year=2026&account_uuid=<uuid1>&account_uuid=<uuid2>
```

### Response Shape

```json
{
  "year": 2026,
  "months_with_data": 9,
  "totals": {
    "avg_monthly_income": "5200.00",
    "avg_monthly_expenses": "3800.00",
    "avg_monthly_net": "1400.00",
    "total_income": "46800.00",
    "total_expenses": "34200.00",
    "total_net": "12600.00"
  },
  "by_category": [
    {
      "category_uuid": "...",
      "category_name": "Food & Dining",
      "total": "6000.00",
      "monthly_average": "666.67",
      "subcategories": [
        {
          "subcategory_uuid": "...",
          "subcategory_name": "Groceries",
          "total": "4500.00",
          "monthly_average": "500.00"
        }
      ]
    }
  ],
  "by_month": [
    { "month": "2026-01", "income": "5000.00", "expenses": "3500.00", "net": "1500.00" },
    ...
  ]
}
```

Key details:
- `by_month` always returns 12 entries (zeroed for months without data)
- `by_category` is expenses-only, sorted by total descending, with nested subcategories
- All values are decimal strings — parse to number for display/charting
- Refund attribution is handled server-side (no client math needed)

## Current State

No analytics or reporting page exists in the frontend.

## Changes Required

### 1. Add types

```ts
export interface MonthlyAverageTotals {
  avg_monthly_income: string;
  avg_monthly_expenses: string;
  avg_monthly_net: string;
  total_income: string;
  total_expenses: string;
  total_net: string;
}

export interface MonthlyAverageSubcategoryBreakdown {
  subcategory_uuid: string;
  subcategory_name: string;
  total: string;
  monthly_average: string;
}

export interface MonthlyAverageCategoryBreakdown {
  category_uuid: string;
  category_name: string;
  total: string;
  monthly_average: string;
  subcategories: MonthlyAverageSubcategoryBreakdown[];
}

export interface MonthlyAverageMonthBreakdown {
  month: string;
  income: string;
  expenses: string;
  net: string;
}

export interface MonthlyAverageResponse {
  year: number;
  months_with_data: number;
  totals: MonthlyAverageTotals;
  by_category: MonthlyAverageCategoryBreakdown[];
  by_month: MonthlyAverageMonthBreakdown[];
}
```

### 2. Add hook

```ts
export function useMonthlyAverages(year: number, accountUuids?: string[]) {
  const params = new URLSearchParams({ year: String(year) });
  accountUuids?.forEach(uuid => params.append('account_uuid', uuid));

  return useQuery({
    queryKey: ['transactions', 'monthly-averages', year, accountUuids],
    queryFn: () => apiFetch<MonthlyAverageResponse>(
      `/transactions/stats/monthly-averages?${params}`
    ),
  });
}
```

### 3. Analytics page layout

Create a new page (e.g., `/analytics` or `/reports`) with the following sections:

**Controls bar:**
- Year selector — dropdown or input (default: current year)
- Account filter — multi-select of accounts (optional, filters to selected accounts)

**Summary cards:**
- Average monthly income
- Average monthly expenses
- Average monthly net (income - expenses)
- Context line: "Based on N months of data"

**Monthly trend chart:**
- Bar chart or line chart using `by_month` data (always 12 entries)
- X-axis: month labels (Jan–Dec)
- Y-axis: dollar amounts
- Series: income (green), expenses (red), net (blue/gray)
- Months with zero data show as zero-height bars

**Category breakdown:**
- Table or horizontal bar chart using `by_category`
- Columns: category name, total, monthly average, percentage of total expenses
- Expandable rows for subcategory drill-down
- Sorted by total (descending) — API returns this order

**Optional: Pie/donut chart**
- Visual breakdown of spending by top-level category
- Useful complement to the table view

### 4. Charting library

Choose a charting approach:
- **Recharts** — popular React charting library, good bar/line chart support
- **Chart.js via react-chartjs-2** — widely used, good for pie charts too
- **Lightweight option** — CSS-based progress bars for the category breakdown if a
  full charting library feels heavy

### 5. Navigation

Add an "Analytics" or "Reports" link to the main navigation/sidebar.

## Verify

- Year selector changes data (fetch for different years)
- Account filter works with multiple accounts
- Summary cards show correct averages
- Monthly chart renders 12 bars/points, zeroed months show correctly
- Category table matches API order (by total, descending)
- Subcategory drill-down expands and shows correct data
- Empty year (no transactions) shows "0 months of data" with zeroed values
- Decimal string values parse and display correctly (no floating-point artifacts)

## Files Created

- Analytics/reports page component
- Monthly trend chart component
- Category breakdown component
- Analytics types (or add to transaction types)
- Analytics hook (or add to transaction hooks)

## Files Changed

- App router — add `/analytics` route
- Navigation component — add Analytics link

## Estimated Scope

Medium-Large — ~300-500 lines depending on charting library choice. The data fetching
is simple (one endpoint); most of the work is in the chart/visualization components.
