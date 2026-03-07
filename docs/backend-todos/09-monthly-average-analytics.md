# 09 — Monthly Average Analytics Endpoint

## Background

Users want to see how their average monthly spending and income breaks down
over a longer period (e.g., a full year). This is a pure analytics view — not
tied to budgets or templates. The aggregation should happen server-side to
avoid fetching all transactions to the frontend.

## Proposed Endpoint

```
GET /transactions/stats/monthly-averages?year=2025
```

Optional params:
- `year` (required) — the calendar year to aggregate
- `account_uuid` — filter to a specific account

## Response Shape

```json
{
  "year": 2025,
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
      "category_name": "Groceries",
      "total": "6000.00",
      "monthly_average": "666.67"
    }
  ],
  "by_month": [
    {
      "month": "2025-01",
      "income": "5000.00",
      "expenses": "3500.00",
      "net": "1500.00"
    }
  ]
}
```

## Notes

- `months_with_data` is the number of months that actually have transactions,
  used as the divisor for averages (avoids skewing if the year is incomplete).
- `by_month` array gives the raw monthly breakdown so the frontend can render
  a chart showing trends alongside the averages.
- `by_category` shows where money goes on average — useful for identifying
  spending patterns.
