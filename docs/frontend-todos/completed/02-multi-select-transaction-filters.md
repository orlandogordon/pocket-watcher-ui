# 02 — Multi-Select Transaction Filters (Categories, Subcategories, Tags)

## Background

Backend items 3.2 and 3.3 changed `category_uuid`, `subcategory_uuid`, and `tag_uuid`
query params from single values to arrays on both `GET /transactions/` and
`GET /transactions/stats`. The API is backward compatible (single values still work),
but the frontend should now support selecting multiple values.

Tags use **OR** logic — a transaction matches if it has *any* of the selected tags.
Categories/subcategories also use `IN()` on the backend.

## Current State

### `src/types/transactions.ts` — `TransactionFilters`

All three fields are `string | undefined` (single value):

```ts
export interface TransactionFilters {
  category_uuid?: string;
  subcategory_uuid?: string;
  tag_uuid?: string;
  // ... other fields
}
```

### `src/hooks/useTransactions.ts` — `buildQuery()`

Uses `URLSearchParams.set()` which only supports single values per key:

```ts
function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  // ...
}
```

### `src/pages/TransactionsPage.tsx` — Filter UI

- **Category**: Single `<Select>` dropdown with parent categories.
- **Subcategory**: Single `<Select>` dropdown, disabled unless a single category is
  selected. Options filtered to children of `filters.category_uuid`.
- **Tag**: Single `<Select>` dropdown with all tags.
- All use `setFilter(key, value)` which sets a single string.

## Changes Required

### 1. Update `TransactionFilters` type

**File:** `src/types/transactions.ts`

```ts
export interface TransactionFilters {
  account_uuid?: string;
  category_uuid?: string[];    // was string
  subcategory_uuid?: string[]; // was string
  tag_uuid?: string[];         // was string
  transaction_type?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
  description_search?: string;
  order_by?: string;
  order_desc?: boolean;
  skip?: number;
  limit?: number;
}
```

### 2. Update `buildQuery()` to handle arrays

**File:** `src/hooks/useTransactions.ts`

`URLSearchParams.set()` overwrites; for arrays we need `append()` to produce
`?category_uuid=a&category_uuid=b`. Update `buildQuery`:

```ts
function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
```

### 3. Create a `MultiSelect` component

**File:** `src/components/ui/multi-select.tsx` (new)

No `Command` (cmdk) component exists in the project. Build a simpler multi-select
using the existing `Popover`, `Checkbox`, and `Badge` components. The component
should:

- Accept `options: { value: string; label: string; color?: string }[]`
- Accept `value: string[]` and `onChange: (value: string[]) => void`
- Accept `placeholder: string` (e.g. "All categories")
- Render a trigger button showing:
  - Placeholder text when nothing selected
  - Badge count when items selected (e.g. "3 categories")
  - Or up to 2 labels + "+N more" for small selections
- Render a popover with checkboxes for each option
- Include a "Clear all" action when items are selected

### 4. Update `TransactionsPage.tsx` filter bar

**File:** `src/pages/TransactionsPage.tsx`

#### a) Update `EMPTY_FILTERS`

```ts
const EMPTY_FILTERS: TransactionFilters = {
  account_uuid: undefined,
  category_uuid: undefined,     // still undefined when empty (not [])
  subcategory_uuid: undefined,
  tag_uuid: undefined,
  transaction_type: undefined,
  date_from: undefined,
  date_to: undefined,
  description_search: undefined,
};
```

No change needed — `undefined` works for both old and new types.

#### b) Replace category `<Select>` with `<MultiSelect>`

```tsx
<MultiSelect
  placeholder="All categories"
  options={parentCategories.map((c) => ({ value: c.id, label: c.name }))}
  value={filters.category_uuid ?? []}
  onChange={(selected) => {
    // When categories change, remove subcategories whose parent is no longer selected
    const removedCategories = (filters.category_uuid ?? []).filter(
      (id) => !selected.includes(id)
    );
    const filteredSubs = (filters.subcategory_uuid ?? []).filter(
      (subId) => {
        const sub = allCategories.find((c) => c.id === subId);
        return sub && !removedCategories.includes(sub.parent_category_uuid!);
      }
    );
    setFilters((prev) => ({
      ...prev,
      category_uuid: selected.length ? selected : undefined,
      subcategory_uuid: filteredSubs.length ? filteredSubs : undefined,
    }));
  }}
/>
```

#### c) Replace subcategory `<Select>` with `<MultiSelect>`

Subcategory options should now include children of **all** selected categories
(not just one):

```tsx
const subcategoryOptions = allCategories.filter(
  (c) => c.parent_category_uuid && filters.category_uuid?.includes(c.parent_category_uuid)
);
```

```tsx
<MultiSelect
  placeholder="All subcategories"
  options={subcategoryOptions.map((c) => ({ value: c.id, label: c.name }))}
  value={filters.subcategory_uuid ?? []}
  onChange={(selected) =>
    setFilters((prev) => ({
      ...prev,
      subcategory_uuid: selected.length ? selected : undefined,
    }))
  }
  disabled={!filters.category_uuid?.length || subcategoryOptions.length === 0}
/>
```

#### d) Replace tag `<Select>` with `<MultiSelect>`

```tsx
<MultiSelect
  placeholder="All tags"
  options={(tags ?? []).map((t) => ({
    value: t.id,
    label: t.tag_name,
    color: t.color,
  }))}
  value={filters.tag_uuid ?? []}
  onChange={(selected) =>
    setFilters((prev) => ({
      ...prev,
      tag_uuid: selected.length ? selected : undefined,
    }))
  }
/>
```

The `color` prop on options would render a small colored dot next to each tag name
in the dropdown (matching the current single-select behavior).

#### e) Update `setFilter` helper

The generic `setFilter` helper works with single string values. For the three
array fields, the `<MultiSelect>` `onChange` handlers above set filters directly
via `setFilters`, so `setFilter` does not need to change. The remaining single-value
filters (account, type, dates, search) continue to use `setFilter` as-is.

### 5. Verify

- Select multiple categories -> query string has repeated `category_uuid` params
- Select multiple tags -> transactions matching *any* selected tag appear
- Deselect a category -> its subcategories are automatically removed from the filter
- Stats cards update to reflect the multi-filter
- Clear button resets all multi-selects to empty
- Single selections still work (backward compatible)
- Pagination resets to page 0 on filter change (existing `useEffect` handles this)

## New Files

- `src/components/ui/multi-select.tsx`

## Modified Files

- `src/types/transactions.ts` — change 3 fields from `string` to `string[]`
- `src/hooks/useTransactions.ts` — update `buildQuery` to handle arrays
- `src/pages/TransactionsPage.tsx` — swap 3 `<Select>` for `<MultiSelect>`, update
  subcategory options logic, update cascading clear behavior

## Dependencies

May need to install `cmdk` if we want a searchable combobox-style dropdown instead
of a simple checkbox list. For the initial implementation, a Popover + Checkbox list
is sufficient and avoids a new dependency.

## Estimated Scope

- ~80 lines for `MultiSelect` component
- ~30 lines changed in `TransactionsPage.tsx`
- ~10 lines changed in `useTransactions.ts` + types
