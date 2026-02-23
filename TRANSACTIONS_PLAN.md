# Transactions Feature — Implementation Plan

## Goal
Build the transactions list page: filterable table, stats bar, create/edit/delete dialogs.
Categories are fetched (read-only) to support filtering and form dropdowns — full
category CRUD comes later.

## API Endpoints Used
```
GET  /transactions/        → list + filter (query params below)
GET  /transactions/stats   → aggregate stats (same filters)
POST /transactions/        → create
PUT  /transactions/{uuid}  → update
DEL  /transactions/{uuid}  → delete
GET  /categories/          → flat list (for filter dropdown + form select)
GET  /accounts/summary     → lightweight account list (for filter dropdown)
```

## Filter Query Params (all optional)
account_uuid, category_uuid, transaction_type, date_from, date_to,
amount_min, amount_max, description_search, order_by, order_desc, skip, limit

Default: order_by=transaction_date, order_desc=true, limit=50

## Files to Create

### 1. `src/types/transactions.ts`
```ts
export interface TagResponse {
  id: string;
  tag_id: number;
  tag_name: string;
  color: string; // hex e.g. "#4CAF50"
}

export interface TransactionResponse {
  id: string;
  account_uuid: string;
  transaction_date: string;       // YYYY-MM-DD
  amount: string;                 // negative = expense, positive = income
  transaction_type: string;
  description: string;
  merchant_name?: string;
  category_uuid?: string;
  subcategory_uuid?: string;
  source_type: 'CSV' | 'PDF' | 'MANUAL' | 'API';
  institution_name?: string;
  comments?: string;
  created_at: string;
  tags: TagResponse[];
}

export interface TransactionStats {
  total_count: number;
  total_income: string;
  total_expenses: string;
  net: string;
}

export interface TransactionCreate {
  account_uuid: string;
  transaction_date: string;
  amount: string;
  transaction_type: string;
  description: string;
  merchant_name?: string;
  category_uuid?: string;
  comments?: string;
}

export interface TransactionFilters {
  account_uuid?: string;
  category_uuid?: string;
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

### 2. `src/types/categories.ts`
```ts
export interface CategoryResponse {
  id: string;
  name: string;
  parent_category_uuid?: string;
  children?: CategoryResponse[];
}
```

### 3. `src/hooks/useTransactions.ts`
- `useTransactions(filters: TransactionFilters)` — queryKey: ['transactions', filters]
- `useTransactionStats(filters: TransactionFilters)` — queryKey: ['transactions', 'stats', filters]
- `useCreateTransaction()` — POST /transactions/, invalidates ['transactions']
- `useUpdateTransaction()` — PUT /transactions/{uuid}, invalidates ['transactions']
- `useDeleteTransaction()` — DELETE /transactions/{uuid}, invalidates ['transactions']

Build query string from filters object, omitting undefined/empty values.

### 4. `src/hooks/useCategories.ts`
- `useCategories()` — GET /categories/, queryKey: ['categories']
  Returns flat list. Build a map: uuid → name for display.
  Also build a helper to get "Parent > Child" display label.

### 5. `src/pages/TransactionsPage.tsx`
Layout:
```
[Stats bar: Income | Expenses | Net | Count]
[Filter bar: Account | Type | Category | Date range | Search | Clear]
[Table]
[Pagination: Showing X–Y of Z  |  Prev  Next]
```

Stats bar cards (same style as AccountsPage):
- Total Income (green)
- Total Expenses (red, show as positive number)
- Net (green/red based on sign)
- Transaction count

Filter bar (horizontal row of inputs above table):
- Account dropdown (from useAccounts)
- Transaction type dropdown (PURCHASE, WITHDRAWAL, FEE, DEPOSIT, CREDIT, INTEREST, TRANSFER)
- Category dropdown (from useCategories, flat list)
- Date From / Date To inputs (type="date")
- Description search input
- Clear Filters button

Table columns:
| Date | Description | Merchant | Account | Category | Tags | Amount | Type | Source | Actions |

- Date: formatted as MMM D, YYYY (use date-fns `format`)
- Amount: right-aligned, red if negative, green if positive
- Type: Badge (secondary variant)
- Source: small Badge (outline variant) — CSV/PDF/MANUAL/API
- Tags: colored pill chips using tag.color as background
- Category: look up name from categories map, show "—" if none
- Account: look up name from accounts, show "—" if none
- Actions: pencil + trash icons (same as AccountsPage)

Pagination:
- Local state: page number (0-indexed)
- limit = 50 per page
- skip = page * limit
- Derive total pages from total_count in stats
- Prev/Next buttons, show "Page X of Y" or "Showing X–Y of Z"
- Reset to page 0 when filters change

### 6. `src/components/transactions/TransactionFormDialog.tsx`
Fields:
- account_uuid (Select — from useAccounts) [required]
- transaction_date (Input type="date") [required]
- amount (Input — positive or negative string) [required]
- transaction_type (Select — enum values) [required]
- description (Input) [required]
- merchant_name (Input) [optional]
- category_uuid (Select — from useCategories, flat) [optional]
- comments (Textarea) [optional]

Zod schema notes (apply lessons from accounts):
- account_uuid: z.string().min(1)
- transaction_date: z.string().min(1)
- amount: z.string().min(1)
- transaction_type: z.union([z.enum([...TYPES]), z.literal('')]) — same Select '' issue
- category_uuid: z.string().optional().or(z.literal('')) — Select '' issue
- description: z.string().min(1)
- merchant_name: z.string().optional()
- comments: z.string().optional()

In form reset for edit:
- All optional string fields: ?? ''
- category_uuid: ?? '' (not ?? undefined, since Select needs '')

In onSubmit payload:
- category_uuid: values.category_uuid || undefined
- transaction_type: values.transaction_type || undefined
- merchant_name: values.merchant_name || undefined
- comments: values.comments || undefined

### 7. `src/components/transactions/DeleteTransactionDialog.tsx`
Same pattern as DeleteAccountDialog. No 409 special case needed for transactions.

## Files to Modify

### `src/App.tsx`
Add: `<Route path="transactions" element={<TransactionsPage />} />`

## Zod / Form Reminders (learned from accounts)
- API returns `null` for unset optional fields — use `?? ''` or `?? undefined` in form reset
- shadcn Select stores `''` when nothing selected — use z.union([z.enum([...]), z.literal('')]).optional() for optional enum fields
- Use `|| undefined` in payload construction to strip empty strings before sending to API

## Transaction Types Reference
```
PURCHASE   → expense
WITHDRAWAL → expense
FEE        → expense
DEPOSIT    → income
CREDIT     → income
INTEREST   → income
TRANSFER   → neutral
```

Income types (positive display): DEPOSIT, CREDIT, INTEREST
Expense types (negative display): PURCHASE, WITHDRAWAL, FEE
Neutral: TRANSFER

## shadcn Components Needed
Already installed: Button, Badge, Card, Dialog, Form, Input, Select, Table, Textarea
May need to add: `npx shadcn@latest add popover calendar` for date pickers (or just use Input type="date")
Recommendation: use Input type="date" to keep it simple.
