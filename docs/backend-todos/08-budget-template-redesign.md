# 08 — Budget Template Redesign

## Vision

Rethink budgets as **reusable monthly templates** rather than one-off entities
with arbitrary date ranges. A template defines categories and their allocated
amounts, always scoped to a single calendar month. Users can create multiple
templates and assign them to specific months.

## Core Concepts

### Budget Templates
- A template is a named collection of category allocations (category + amount).
- Templates are not tied to any specific month — they represent a reusable plan.
- Users can have multiple templates (e.g., "Standard", "Summer Travel",
  "Post-Raise").

### Month Assignment & History
- Each calendar month is assigned a template. This assignment is persisted so
  historical months retain which template was active.
- A month can use the "default/active" template, or be overridden with a
  different template (e.g., a one-off vacation month).
- When viewing past months, the user sees actual spending vs that month's
  assigned template — not the currently active one.

### Amortization

Amortization stays at the transaction level (global), as it is today. Scoping
amortization to a template was considered but doesn't work in practice — if the
template isn't assigned consistently for the full amortization period, the
spread amounts for unassigned months are lost, producing misleading numbers.

For a "smoothed" view of spending over time, the monthly averages analytics
endpoint (see todo 09) serves that purpose without the complexity.

## Use Cases

1. **Month-to-month consistency** — Most months use the same template. No need
   to copy budgets manually each month.
2. **Life changes** — When income changes or expenses grow, create a new
   template and assign it going forward. Historical months keep their original
   template.
3. **One-off months** — Vacation or large purchase month gets a unique template
   applied just to that month.

## Open Questions

- **Migration path:** How do existing budgets map to templates? Each current
  budget could become a template, with its date range determining which months
  it's assigned to.
- **Active template:** Is there a single "default" template that auto-applies
  to new months, or does the user explicitly assign each month?
- **Template comparison:** Should the UI support side-by-side comparison of the
  same month under different templates?

## Scope

This is a significant backend redesign affecting:
- Budget models (templates, month assignments)
- Budget CRUD operations
- Budget performance/stats endpoints
- Frontend budget pages (template management, month navigation, template
  assignment)

Should be planned and implemented incrementally.
