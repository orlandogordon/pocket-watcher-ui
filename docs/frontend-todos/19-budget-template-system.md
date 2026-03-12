# 19 — Budget Template System (COMPLETED)

## Background

Backend todo 08 completely redesigned the budget system. The old arbitrary-date-range budgets
are replaced by reusable templates assigned to calendar months. This is a major frontend
change — the existing budget UI was rebuilt from scratch.

### New Backend Endpoints

**Template management (`/budgets/templates/`):**
- `POST /budgets/templates/` — Create template (with optional inline categories)
- `GET /budgets/templates/` — List all templates
- `GET /budgets/templates/{uuid}` — Get template with categories
- `PUT /budgets/templates/{uuid}` — Update name / default status
- `DELETE /budgets/templates/{uuid}` — Delete (unassigns from all months)
- `POST /budgets/templates/{uuid}/categories/` — Add category allocation
- `PUT /budgets/templates/categories/{uuid}` — Update allocation amount (only)
- `DELETE /budgets/templates/categories/{uuid}` — Delete allocation

**Month management (`/budgets/months/`):**
- `GET /budgets/months/{year}/{month}` — Get budget for month (auto-creates with default template)
- `PUT /budgets/months/{year}/{month}` — Assign/unassign template
- `GET /budgets/months/` — List existing month entries
- `GET /budgets/months/{year}/{month}/stats` — Month statistics
- `GET /budgets/months/{year}/{month}/performance` — Per-category performance

### Key Concepts

- **Templates are reusable** — one template can be assigned to many months
- **Lazy month creation** — `GET /budgets/months/{year}/{month}` auto-creates with default template
- **Live references** — month allocations always reflect current template state (not frozen copies)
- **Subcategory envelopes** — parent = ceiling, subcategory allocations must sum <= parent
- **Default template** — one per user, auto-assigned to new months

## Design Decisions

- **Routing:** `/budgets` → monthly budget view (primary landing), `/budgets/templates` → template management. Link/button on monthly view to jump to templates.
- **Month navigation:** Prev/next arrows for quick navigation + clickable month label that opens a month/year picker for jumping to a specific month. Limited to current month and earlier (no future months).
- **Template editor UX:** Dialog with inline `useFieldArray` for category allocations (consistent with existing form patterns). Subcategory envelope display inline within the same editor.
- **No transaction page integration:** Budget information lives on the budget page only. No sidebar/widget on the transactions page.
- **Fresh build:** Delete all old budget code (components, hooks, types, pages) and build from scratch.

## Implementation Notes

### API response shape differs from original spec

The todo spec assumed flat fields (`category_uuid`, `category_name`) on template category
responses, but the API returns nested objects:

```json
{
  "id": "...",
  "category": { "id": "...", "name": "Food & Dining", "parent_category_uuid": null },
  "subcategory": { "id": "...", "name": "Groceries", "parent_category_uuid": "..." } | null,
  "allocated_amount": "600.00"
}
```

Types were updated to match. Performance endpoint uses flat fields as expected.

### Stats endpoint does not include totals

`GET /budgets/months/{year}/{month}/stats` returns operational metrics (daily burn rate,
projected spend, category counts) but not `total_allocated`, `total_spent`, `total_remaining`.
Stats cards are computed client-side from the performance endpoint (summing parent-level items
only to avoid double-counting subcategories). Backend todo 10 tracks adding these fields.

### Category reassignment on edit requires delete + re-create

`PUT /budgets/templates/categories/{uuid}` only accepts `allocated_amount`. Changing a
category or subcategory on an existing allocation is handled by deleting the old row and
creating a new one. This is transparent to the user.

### Performance uses `status` string, not `over_budget` boolean

The performance endpoint returns `status: "over_budget" | "under_budget" | "on_track"`
instead of a boolean `over_budget` field. Color coding checks `status === 'over_budget'`.

### Uncovered spending (additional scope)

The monthly budget view shows a summary line for spending that falls outside budgeted
categories. This is computed by comparing `total_expenses` from `GET /transactions/stats`
(filtered by `date_from`/`date_to` for the month) against the sum of `spent_amount` from
parent-level performance items. No backend changes needed — uses existing transaction
stats endpoint with date filters.

## What Was Done

### Deleted
- `src/components/budgets/BudgetFormDialog.tsx`
- `src/components/budgets/DeleteBudgetDialog.tsx`
- `src/components/budgets/CopyBudgetDialog.tsx`
- `src/pages/BudgetDetailPage.tsx`

### Created
- `src/types/budgets.ts` — New types matching actual API response shapes
- `src/hooks/useBudgets.ts` — Hooks for template CRUD, template category CRUD, month queries, template assignment
- `src/pages/BudgetsPage.tsx` — Monthly budget view with nav, template assignment, stats, category breakdown, uncovered spending
- `src/pages/BudgetTemplatesPage.tsx` — Template list with card grid, default badge, category preview
- `src/components/budgets/TemplateFormDialog.tsx` — Create/edit dialog with useFieldArray, subcategory support, envelope validation
- `src/components/budgets/DeleteTemplateDialog.tsx` — Confirmation dialog with unassignment warning

### Changed
- `src/App.tsx` — Routes: `/budgets/:uuid` replaced with `/budgets/templates`
- `src/pages/DashboardPage.tsx` — Uses `useBudgetMonth` + `useBudgetMonthPerformance` for current month instead of old `useActiveBudgets`

### Backend Todos Created
- `docs/backend-todos/10-budget-stats-totals.md` — Add `total_allocated`, `total_spent`, `total_remaining` to month stats endpoint
