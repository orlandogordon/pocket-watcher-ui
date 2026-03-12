# 10 — Add Budget Totals to Month Stats Endpoint

## Background

`GET /budgets/months/{year}/{month}/stats` currently returns operational metrics
(daily burn rate, projected spend, category counts, days remaining) but does not
include the most basic summary fields: total allocated, total spent, and total
remaining for the month.

The frontend currently works around this by computing totals from the performance
endpoint (`GET /budgets/months/{year}/{month}/performance`), summing only
parent-level items to avoid double-counting subcategories. This works but is
redundant — the backend already has this data.

## Current Response

```json
{
  "id": "...",
  "year": 2026,
  "month": 3,
  "template_name": "Standard Monthly",
  "period_days": 31,
  "days_remaining": 20,
  "categories_count": 5,
  "categories_over_budget": 0,
  "categories_on_track": 0,
  "categories_under_budget": 5,
  "daily_burn_rate": "17.8325",
  "projected_total_spend": "552.8075"
}
```

## Changes Required

Add three fields to the stats response:

- `total_allocated` — sum of all parent-level category allocations from the assigned template
- `total_spent` — sum of actual spending across those categories for the month
- `total_remaining` — `total_allocated - total_spent`

These should only sum parent-level allocations (not subcategories) to avoid
double-counting in the envelope model.

## Expected Response (after change)

```json
{
  "id": "...",
  "year": 2026,
  "month": 3,
  "template_name": "Standard Monthly",
  "total_allocated": "2500.00",
  "total_spent": "553.25",
  "total_remaining": "1946.75",
  "period_days": 31,
  "days_remaining": 20,
  "categories_count": 5,
  "categories_over_budget": 0,
  "categories_on_track": 0,
  "categories_under_budget": 5,
  "daily_burn_rate": "17.8325",
  "projected_total_spend": "552.8075"
}
```

## Estimated Scope

Small — add three computed fields to the existing stats schema and query.
