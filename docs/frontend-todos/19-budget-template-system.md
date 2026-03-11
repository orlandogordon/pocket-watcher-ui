# 19 — Budget Template System

## Background

Backend todo 08 completely redesigned the budget system. The old arbitrary-date-range budgets
are replaced by reusable templates assigned to calendar months. This is a major frontend
change — the existing budget UI needs to be rebuilt.

### New Backend Endpoints

**Template management (`/budgets/templates/`):**
- `POST /budgets/templates/` — Create template (with optional inline categories)
- `GET /budgets/templates/` — List all templates
- `GET /budgets/templates/{uuid}` — Get template with categories
- `PUT /budgets/templates/{uuid}` — Update name / default status
- `DELETE /budgets/templates/{uuid}` — Delete (unassigns from all months)
- `POST /budgets/templates/{uuid}/categories/` — Add category allocation
- `PUT /budgets/templates/categories/{uuid}` — Update allocation amount
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

## Current State

The frontend budget UI is built around the old budget model with date ranges. It needs
to be replaced with the template-based system.

## Changes Required

### 1. Add types

```ts
// Templates
export interface BudgetTemplateCreate {
  template_name: string;
  is_default?: boolean;
  categories?: BudgetTemplateCategoryCreate[];
}

export interface BudgetTemplateUpdate {
  template_name?: string;
  is_default?: boolean;
}

export interface BudgetTemplateCategoryCreate {
  category_uuid: string;
  subcategory_uuid?: string | null;
  allocated_amount: string;
}

export interface BudgetTemplateCategoryUpdate {
  allocated_amount: string;
}

export interface BudgetTemplateCategoryResponse {
  id: string;
  category_uuid: string;
  category_name: string;
  subcategory_uuid: string | null;
  subcategory_name: string | null;
  allocated_amount: string;
}

export interface BudgetTemplateResponse {
  id: string;
  template_name: string;
  is_default: boolean;
  categories: BudgetTemplateCategoryResponse[];
  created_at: string;
  updated_at: string;
}

// Months
export interface BudgetMonthAssign {
  template_uuid: string | null;
}

export interface BudgetMonthResponse {
  id: string;
  year: number;
  month: number;
  template: BudgetTemplateResponse | null;
  created_at: string;
}
```

### 2. Add hooks

Hooks for template CRUD (create, list, get, update, delete), template category CRUD
(add, update, delete), and month operations (get month, assign template, list months,
stats, performance).

### 3. Template Management Page

A dedicated page or section for managing budget templates:

- **Template list** — shows all templates with name, default badge, category count
- **Create template** — name input, optional default checkbox, can add categories inline
- **Edit template** — rename, toggle default, manage category allocations
- **Delete template** — confirmation dialog noting it will unassign from all months
- **Category allocation editor:**
  - Add parent category allocation (category dropdown + amount)
  - Add subcategory allocation under a parent (subcategory dropdown + amount)
  - Inline editing of amounts
  - Delete allocations
  - Visual indication of subcategory envelope usage:
    - Parent row: total ceiling amount
    - Subcategory rows: individual portions
    - "Unallocated" row: parent amount - sum of subcategories
  - Frontend validation: subcategory sums cannot exceed parent (backend also validates)

### 4. Monthly Budget View

The primary budget interaction page, scoped to a single month:

- **Month navigation** — month/year picker, limited to current month and earlier
- **Auto-creation** — navigating to a month calls `GET /budgets/months/{year}/{month}`,
  which auto-creates with the default template if it doesn't exist yet
- **Template assignment** — dropdown to change which template is assigned to this month,
  or "unassign" to clear the budget
- **Budget vs. actual display** — for each category allocation in the assigned template:
  - Allocated amount (from template)
  - Actual spending (from stats/performance endpoint)
  - Remaining = allocated - spent
  - Progress bar or percentage
  - Color coding: green (under budget), yellow (>80%), red (over budget)
- **Subcategory breakdowns** — when a parent has subcategory allocations:
  - Expandable parent row showing envelope total
  - Nested subcategory rows with individual allocated vs. spent
  - Unallocated remainder shown as a separate line
- **Month stats** — call `GET /budgets/months/{year}/{month}/stats` for summary metrics
  (total allocated, total spent, overall remaining)

### 5. Remove old budget UI

Delete or replace the existing budget components that use the old date-range model:
- Old budget list/create/edit pages
- Old budget hooks and types
- Old budget allocation components

### 6. Integration with transaction page

When viewing transactions for a specific month, optionally show a budget sidebar or
widget that displays the current month's budget status (allocated vs spent per category).
This provides context while categorizing transactions.

## Verify

- Create a template with parent and subcategory allocations
- Set template as default
- Navigate to current month — auto-creates with default template
- Budget vs actual shows correct spending data
- Change template assignment — allocations update immediately (live references)
- Unassign template — month shows zero allocations
- Subcategory envelope validation works (cannot exceed parent)
- Delete a template — all assigned months become unassigned
- Month navigation does not allow future months
- Old budget endpoints are no longer called

## Files Created

- Budget template management page/component
- Budget month view page/component
- Budget category allocation editor component
- Budget types file (or update existing)
- Budget hooks file (or update existing)

## Files Changed

- App router — new routes for budget template management and month view
- Navigation — update budget menu links
- Remove old budget components, hooks, and types

## Estimated Scope

Large — this is a full rebuild of the budget UI. ~500-800 lines across multiple files.
