# 20 — Monthly Average Analytics Page

## Background

Backend todo 09 added `GET /transactions/stats/monthly-averages` which returns yearly
aggregated income/expense/net data with category breakdowns and per-month detail. All
computation happens server-side.

## What Was Done

### Types (`src/types/analytics.ts`)
- Created `MonthlyAverageTotals`, `MonthlyAverageSubcategoryBreakdown`,
  `MonthlyAverageCategoryBreakdown`, `MonthlyAverageMonthBreakdown`,
  `MonthlyAverageResponse` interfaces matching the API response shape.

### Hook (`src/hooks/useMonthlyAverages.ts`)
- `useMonthlyAverages(year, accountUuids?, month?)` — TanStack Query hook that calls
  `GET /transactions/stats/monthly-averages` with year, optional month, and optional
  multi-account UUID filtering.

### Analytics Page (`src/pages/AnalyticsPage.tsx`)
- New `/analytics` route with full page including:
  - **Controls bar:** Year selector (dropdown, last 5 years) + account multi-select filter
    using the existing `MultiSelect` popover-with-checkboxes component. Empty selection =
    all accounts.
  - **Summary cards (3):** Avg monthly income (green), avg monthly expenses (red), avg
    monthly net (green/red based on sign). "Based on N months of data" subtitle on income card.
  - **Monthly trend line chart:** Recharts `LineChart` with 12 months on x-axis. Three
    series: income (green), expenses (red), net (gray dashed). Months are clickable to
    filter the category table below.
  - **Category breakdown table:** Expandable rows with subcategory drill-down. Columns:
    category name, total, monthly avg, % of expenses. Sorted by total descending (API order).
    When a month is selected on the chart, the table filters to that month's data via a
    second API call with the `month` param. A dismissible badge shows the active month filter.

### Backend Enhancement
- Added optional `month` query param (1-12) to
  `GET /transactions/stats/monthly-averages`. When provided, `by_category` and totals
  are scoped to that single month. This was a small change (~5 lines) to the router and
  CRUD function in the backend.

### Navigation
- Added "Analytics" link with `BarChart3` icon to the primary sidebar nav.

### Route
- Added `/analytics` route in `App.tsx` pointing to `AnalyticsPage`.

### Design Decisions (may revisit)
- Recharts as charting library (consistent with existing dashboard)
- Line chart over bar chart for monthly trend
- Expandable table only for category breakdown (no horizontal bar chart)
- No pie/donut chart (removed after initial review)
- Popover with checkboxes for account filter (existing MultiSelect component)

## Files Created

- `src/types/analytics.ts`
- `src/hooks/useMonthlyAverages.ts`
- `src/pages/AnalyticsPage.tsx`

## Files Changed

- `src/App.tsx` — added `/analytics` route
- `src/components/layout/AppLayout.tsx` — added Analytics nav link + BarChart3 import
