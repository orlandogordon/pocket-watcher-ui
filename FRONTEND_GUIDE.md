# Pocket Watcher — Frontend Development Guide

This guide is the primary reference for building the Pocket Watcher frontend against the existing REST API.
Copy this file to the root of your frontend repo.

**API Base URL (dev):** `http://localhost:8000`
**API Docs (live):** `http://localhost:8000/docs`
**Auth:** No real auth yet — all requests are treated as `user_id=1`. No tokens needed.

---

## Recommended Stack

| Concern | Library |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Data fetching | TanStack Query v5 |
| UI components | shadcn |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Charts | Recharts |
| Date handling | date-fns |

---

## Project Setup Quickstart

```bash
# Scaffold into the current directory (already in git repo)
npm create vite@latest . -- --template react-ts
npm install

# Tailwind v4 — use the Vite plugin, NOT postcss/autoprefixer
npm install -D @tailwindcss/vite
```

Update `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Add path alias to both `tsconfig.json` and `tsconfig.app.json` under `compilerOptions`:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

Replace `src/index.css` with just:
```css
@import "tailwindcss";
```

Then init shadcn (it will populate `src/index.css` with CSS variables automatically):
```bash
# shadcn (replaces deprecated shadcn-ui package)
npx shadcn@latest init

# TanStack Query
npm install @tanstack/react-query
# React Router
npm install react-router-dom
# Forms
npm install react-hook-form zod @hookform/resolvers
# Charts
npm install recharts
# Date utils
npm install date-fns
```

shadcn also installs these as dependencies automatically:
`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`

Create `src/lib/api.ts` as your typed fetch wrapper:

```ts
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? 'Request failed');
  }
  return res.json();
}
```

---

## Suggested Page Structure

```
/                          → Dashboard (net worth, recent transactions, budget snapshot)
/accounts                  → Account list
/accounts/:uuid            → Account detail (transactions, history chart)
/transactions              → Transaction list with filters
/categories                → Category management
/tags                      → Tag management
/budgets                   → Budget list
/budgets/:uuid             → Budget detail (performance, category breakdown)
/investments               → Portfolio overview (all holdings)
/investments/:accountUuid  → Account holdings + transaction history
/debt                      → Debt plans overview
/debt/:planUuid            → Plan detail (schedule, payment history)
/plans                     → Financial plans list
/plans/:uuid               → Plan detail (monthly breakdown)
/uploads                   → Statement upload (preview flow)
/uploads/history           → Upload job history
/net-worth                 → Net worth chart + account history
```

---

## Data Model Overview

Key relationships:

```
User
 ├── Accounts (CHECKING, SAVINGS, CREDIT_CARD, LOAN, INVESTMENT, OTHER)
 │    ├── Transactions
 │    ├── InvestmentHoldings  (INVESTMENT accounts only)
 │    ├── InvestmentTransactions
 │    ├── DebtPayments         (LOAN/CREDIT_CARD accounts only)
 │    ├── DebtRepaymentSchedules
 │    └── AccountValueHistory (snapshots)
 │
 ├── Categories (hierarchical: parent → children)
 │    └── used by: Transactions, BudgetCategories, FinancialPlanExpenses
 │
 ├── Tags (many-to-many with Transactions)
 │
 ├── Budgets
 │    └── BudgetCategories (budget ↔ category with allocated_amount)
 │
 ├── DebtRepaymentPlans
 │    └── links to Accounts (many-to-many)
 │
 └── FinancialPlans
      └── FinancialPlanMonths
           └── FinancialPlanExpenses
```

All resource IDs exposed in the API are UUIDs. Never use integer database IDs.

---

## Feature 1: Accounts

Accounts are the foundation. Every transaction, holding, payment, and snapshot belongs to an account.

### Account Types
| Value | Description |
|---|---|
| `CHECKING` | Standard bank checking |
| `SAVINGS` | Savings account |
| `CREDIT_CARD` | Credit card (balance is negative when owed) |
| `LOAN` | Loan account (auto, mortgage, personal) |
| `INVESTMENT` | Brokerage / retirement account |
| `OTHER` | Catch-all |

### Key Endpoints

```
GET    /accounts/                        → List all accounts
GET    /accounts/summary                 → Lightweight list (uuid, name, type, balance)
GET    /accounts/stats                   → Aggregate stats (total assets, liabilities, net worth)
POST   /accounts/                        → Create account
GET    /accounts/{uuid}                  → Get account detail
PUT    /accounts/{uuid}                  → Update account
DELETE /accounts/{uuid}                  → Delete account (409 if has transactions)
```

### AccountResponse Shape
```ts
interface AccountResponse {
  uuid: string;
  account_name: string;
  account_type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'LOAN' | 'INVESTMENT' | 'OTHER';
  institution_name: string;
  account_number_last4?: string;
  balance: string;           // Decimal as string — parse with parseFloat or a decimal lib
  interest_rate?: string;    // LOAN only
  interest_rate_type?: 'FIXED' | 'VARIABLE';  // LOAN only
  minimum_payment?: string;  // LOAN only
  original_principal?: string; // LOAN only
  comments?: string;
  created_at: string;        // ISO datetime
  updated_at: string;
}
```

### AccountStats Shape
```ts
interface AccountStats {
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
  accounts_by_type: Record<string, { count: number; total_balance: string }>;
}
```

### Create/Update Request
```ts
interface AccountCreate {
  account_name: string;
  account_type: string;
  institution_name: string;
  account_number_last4?: string;
  balance?: string;          // defaults to 0.00
  interest_rate?: string;
  interest_rate_type?: string;
  minimum_payment?: string;
  original_principal?: string;
  comments?: string;
}
```

### Investment Account — Snapshot Endpoints
```
GET  /accounts/{uuid}/snapshot-jobs                    → List backfill jobs
GET  /accounts/{uuid}/snapshot-jobs/{job_id}           → Job status
POST /accounts/{uuid}/snapshots/recalculate            → Trigger manual recalculation
     ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
GET  /accounts/{uuid}/snapshots/needs-review           → Snapshots with missing price data
```

### UI Notes
- Show balance with color coding: green for positive, red for negative (credit cards, loans)
- Loan accounts: show progress bar for `current_balance / original_principal`
- Investment accounts: link to holdings/portfolio view
- Use `/accounts/stats` for a dashboard net worth card
- Delete shows 409 if the account has transactions — show a warning modal

---

## Feature 2: Transactions

The core data of the app. Supports filtering, bulk operations, tagging, and category assignment.

### Transaction Types
| Value | Income/Expense |
|---|---|
| `PURCHASE` | Expense |
| `WITHDRAWAL` | Expense |
| `FEE` | Expense |
| `DEPOSIT` | Income |
| `CREDIT` | Income |
| `INTEREST` | Income |
| `TRANSFER` | Neutral |

### Key Endpoints

```
GET    /transactions/                   → List + filter transactions
GET    /transactions/stats              → Aggregate stats (same filters)
POST   /transactions/                   → Create single transaction
POST   /transactions/bulk-upload/       → Bulk create (array)
PATCH  /transactions/bulk-update        → Bulk update (category, merchant, etc.)
GET    /transactions/{uuid}             → Get transaction
PUT    /transactions/{uuid}             → Update transaction
DELETE /transactions/{uuid}             → Delete transaction
```

### TransactionResponse Shape
```ts
interface TransactionResponse {
  id: string;                // UUID
  account_uuid: string;
  transaction_date: string;  // YYYY-MM-DD
  amount: string;            // Decimal — negative = expense, positive = income
  transaction_type: string;
  description: string;
  merchant_name?: string;
  category_uuid?: string;
  subcategory_uuid?: string;
  source_type: 'CSV' | 'PDF' | 'MANUAL' | 'API';
  institution_name?: string;
  comments?: string;
  created_at: string;
  tags: TagResponse[];       // Embedded tags array
}
```

### List Filters (all optional query params)
```
account_uuid       filter by account
category_uuid      filter by category
subcategory_uuid   filter by subcategory
tag_uuid           filter by tag
transaction_type   e.g. PURCHASE
merchant_name      exact match
date_from          YYYY-MM-DD
date_to            YYYY-MM-DD
amount_min         e.g. 10.00
amount_max         e.g. 500.00
description_search partial match
order_by           transaction_date | amount | description (default: transaction_date)
order_desc         true | false (default: true)
skip               pagination offset (default: 0)
limit              page size (default: 100)
```

### TransactionStats Shape
```ts
interface TransactionStats {
  total_count: number;
  total_income: string;
  total_expenses: string;
  net: string;
}
```

### Bulk Update Request
```ts
interface TransactionBulkUpdate {
  transaction_uuids: string[];
  category_uuid?: string;
  subcategory_uuid?: string;
  merchant_name?: string;
  transaction_type?: string;
  comments?: string;
}
```

### Transaction Relationships
Transactions can be linked to each other (e.g. a refund linked to the original purchase).

```
POST   /transactions/{uuid}/relationships          → Create relationship
PUT    /transactions/relationships/{uuid}          → Update relationship
DELETE /transactions/relationships/{uuid}          → Delete relationship
```

Relationship types: `REFUNDS`, `OFFSETS`, `SPLITS`, `FEES_FOR`, `REVERSES`

```ts
interface TransactionRelationshipCreate {
  to_transaction_uuid: string;
  relationship_type: string;
  amount_allocated?: string;
  notes?: string;
}
```

### UI Notes
- Transaction list is the most-used view — make filtering fast (sidebar or filter bar)
- Amount display: show expenses in red, income in green
- Inline category assignment is very useful (click category cell → dropdown)
- Bulk select + bulk update for categorizing uncategorized transactions
- `source_type` badge (CSV/PDF/MANUAL) helps users understand where data came from
- `tags` are embedded in the response — no extra fetch needed

---

## Feature 3: Categories

Hierarchical. Parent categories have children. Used for budgets, transactions, and financial plan expenses.

### Key Endpoints
```
POST   /categories/           → Create category
GET    /categories/           → List all categories (flat list with parent_category_uuid)
GET    /categories/{uuid}     → Get category
PUT    /categories/{uuid}     → Update category
DELETE /categories/{uuid}     → Delete category
       ?force=true            → Force delete (removes from budgets, nulls transactions)
```

### CategoryResponse Shape
```ts
interface CategoryResponse {
  id: string;                    // UUID
  name: string;
  parent_category_uuid?: string;
  children?: CategoryResponse[]; // nested on some endpoints
}
```

### Create Request
```ts
interface CategoryCreate {
  name: string;
  parent_category_uuid?: string;  // omit for top-level
}
```

### UI Notes
- Build a tree from the flat list: group by `parent_category_uuid`
- Show parent > child hierarchy in dropdowns (e.g. "Food & Dining > Groceries")
- Delete returns detailed 409 if category is in use — show what's using it and offer `force=true`
- Categories are global (admin-managed in the future) — no per-user filtering

---

## Feature 4: Tags

User-defined labels for transactions. Many-to-many relationship.

### Key Endpoints
```
POST   /tags/                                          → Create tag
GET    /tags/                                          → List user's tags
GET    /tags/search/?search_term=abc                   → Search tags
GET    /tags/stats                                     → Usage stats for all tags
GET    /tags/{uuid}                                    → Get tag
PUT    /tags/{uuid}                                    → Update tag
DELETE /tags/{uuid}                                    → Delete tag
GET    /tags/{uuid}/stats                              → Stats for single tag
GET    /tags/{uuid}/transactions                       → Transactions with this tag
POST   /tags/transactions/                             → Add tag to transaction
       ?transaction_uuid=...&tag_uuid=...
DELETE /tags/transactions/{txn_uuid}/tags/{tag_uuid}   → Remove tag from transaction
POST   /tags/transactions/bulk-tag                     → Tag multiple transactions
```

### TagResponse Shape
```ts
interface TagResponse {
  id: string;    // UUID
  tag_id: number; // internal, ignore in UI
  tag_name: string;
  color: string; // hex color e.g. "#4CAF50"
}
```

### Bulk Tag Request
```ts
interface BulkTagRequest {
  transaction_uuids: string[];
  tag_uuid: string;
}
```

### TagStats Shape
```ts
interface TagStats {
  tag_uuid: string;
  tag_name: string;
  color: string;
  transaction_count: number;
  total_amount: string;
}
```

### UI Notes
- Render tags as colored pills/chips using the `color` field
- Allow tag creation inline from the transaction row (type + create)
- Tag filter on transaction list is useful — pass `tag_uuid` as query param
- `/tags/stats` is good for a tag analytics view

---

## Feature 5: Budgets

Date-range budgets with category allocations. Supports performance tracking and copying.

### Key Endpoints
```
POST   /budgets/                           → Create budget (with categories inline)
GET    /budgets/                           → List budgets
       ?active_only=true                   → Only budgets covering today
       ?include_spending=true              → Include spent amounts (default true)
GET    /budgets/{uuid}                     → Get budget detail
PUT    /budgets/{uuid}                     → Update budget
DELETE /budgets/{uuid}                     → Delete budget
POST   /budgets/{uuid}/categories/         → Add category allocation
PUT    /budgets/categories/{uuid}          → Update category allocation
DELETE /budgets/categories/{uuid}          → Remove category allocation
GET    /budgets/{uuid}/stats               → Budget statistics
GET    /budgets/{uuid}/performance         → Per-category performance
POST   /budgets/{uuid}/copy                → Copy to new date range
       ?new_budget_name=...&new_start_date=...&new_end_date=...
```

### BudgetResponse Shape
```ts
interface BudgetResponse {
  id: string;                    // UUID
  budget_name: string;
  start_date: string;            // YYYY-MM-DD
  end_date: string;
  budget_categories: BudgetCategoryResponse[];
  created_at: string;
}

interface BudgetCategoryResponse {
  id: string;                    // UUID
  category_uuid: string;
  category_name: string;
  allocated_amount: string;
  spent_amount: string;          // computed from transactions in date range
}
```

### Create Request
```ts
interface BudgetCreate {
  budget_name: string;
  start_date: string;
  end_date: string;
  categories: Array<{
    category_uuid: string;
    allocated_amount: string;
  }>;
}
```

### BudgetPerformance Shape
```ts
// GET /budgets/{uuid}/performance
interface BudgetPerformance {
  category_uuid: string;
  category_name: string;
  allocated_amount: string;
  spent_amount: string;
  remaining_amount: string;
  percentage_used: number;
  over_budget: boolean;
  transactions: TransactionResponse[];
}
```

### UI Notes
- Progress bars per category: `spent_amount / allocated_amount`
- Highlight over-budget categories in red
- "Copy Budget" is a key recurring-monthly workflow — make it prominent
- Budget list filtered by `active_only=true` is useful for dashboard

---

## Feature 6: Investments

Holdings (current positions) and investment transactions. Investment accounts get automatic balance snapshots.

### Key Endpoints — Holdings
```
POST   /investments/holdings/                          → Create holding manually
GET    /investments/accounts/{account_uuid}/holdings/  → List holdings for account
GET    /investments/holdings/{uuid}                    → Get holding
PUT    /investments/holdings/{uuid}                    → Update holding
DELETE /investments/holdings/{uuid}                    → Delete holding
```

### Key Endpoints — Investment Transactions
```
POST   /investments/transactions/                           → Create single transaction
POST   /investments/transactions/bulk-upload               → Bulk upload
PATCH  /investments/transactions/bulk-update               → Bulk update
GET    /investments/accounts/{account_uuid}/transactions/   → List for account
GET    /investments/transactions/{uuid}                     → Get transaction
PUT    /investments/transactions/{uuid}                     → Update transaction
DELETE /investments/transactions/{uuid}                     → Delete transaction
```

### InvestmentHoldingResponse Shape
```ts
interface InvestmentHoldingResponse {
  id: string;                  // UUID
  account_uuid: string;
  symbol: string;              // ticker only e.g. "AAPL"
  quantity: string;
  average_cost_basis: string;
  current_price?: string;      // from last snapshot
  api_symbol?: string;         // OCC format for options e.g. "SPY240517P00500000"
  security_type?: 'STOCK' | 'OPTION';
  created_at: string;
}
```

### InvestmentTransactionResponse Shape
```ts
interface InvestmentTransactionResponse {
  id: string;                  // UUID
  account_uuid: string;
  transaction_type: 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST' | 'FEE' | 'TRANSFER' | 'REINVESTMENT' | 'OTHER';
  symbol?: string;
  quantity?: string;
  price_per_share?: string;
  total_amount: string;
  transaction_date: string;
  description?: string;
  api_symbol?: string;
  holding_id?: string;         // UUID of associated holding
  security_type?: 'STOCK' | 'OPTION';
  created_at: string;
}
```

### Create Request
```ts
interface InvestmentTransactionCreate {
  account_uuid: string;
  transaction_type: string;
  symbol?: string;
  quantity?: string;
  price_per_share?: string;
  total_amount: string;        // negative for buys, positive for sells/dividends
  transaction_date: string;
  description?: string;
  api_symbol?: string;
}
```

### UI Notes
- Holdings table: symbol, quantity, avg cost, current price, unrealized P&L (calculate client-side)
- P&L = (current_price - average_cost_basis) × quantity
- Investment transactions are usually uploaded via statement — the manual create form is secondary
- `api_symbol` is used internally for price fetching — not needed in the UI typically
- Options will have a formatted symbol like `SPY240517P00500000` — you can display the `symbol` (just "SPY") for readability

---

## Feature 7: Debt Management

Tracks loan repayment with strategies, payment schedules, and individual payments.

### Key Endpoints — Plans
```
POST   /debt/plans/                                    → Create plan
GET    /debt/plans/                                    → List plans
GET    /debt/plans/{uuid}                              → Get plan
PUT    /debt/plans/{uuid}                              → Update plan
DELETE /debt/plans/{uuid}                              → Delete plan
POST   /debt/plans/accounts/                           → Add account to plan
DELETE /debt/plans/{uuid}/accounts/{account_uuid}      → Remove account from plan
```

### Key Endpoints — Payments
```
POST   /debt/payments/                                 → Create payment
POST   /debt/payments/bulk-upload                      → Bulk create payments
GET    /debt/accounts/{account_uuid}/payments/         → List payments for account
GET    /debt/payments/{uuid}/                          → Get payment
PUT    /debt/payments/{uuid}/                          → Update payment
DELETE /debt/payments/{uuid}/                          → Delete payment
```

### Key Endpoints — Schedules
```
POST   /debt/schedules/                                → Create/replace schedule for account
GET    /debt/schedules/{account_uuid}                  → Get schedule
```

### DebtRepaymentPlanResponse Shape
```ts
interface DebtRepaymentPlanResponse {
  id: string;                  // UUID
  plan_name: string;
  strategy: 'AVALANCHE' | 'SNOWBALL' | 'CUSTOM';
  target_payoff_date?: string;
  accounts: AccountResponse[]; // linked loan/credit accounts
  created_at: string;
}
```

### DebtPaymentResponse Shape
```ts
interface DebtPaymentResponse {
  id: string;                  // UUID
  loan_account_uuid: string;
  payment_source_account_uuid?: string;  // checking account payment came from
  payment_amount: string;
  principal_amount?: string;
  interest_amount?: string;
  remaining_balance_after_payment?: string;
  payment_date: string;
  description?: string;
}
```

### Schedule Create Request
```ts
interface DebtRepaymentScheduleBulkCreate {
  account_uuid: string;
  schedules: Array<{
    payment_month: string;       // YYYY-MM-DD (first of month)
    scheduled_payment_amount: string;
  }>;
}
```

### UI Notes
- Debt plan shows all linked loan accounts with their current balance and payoff progress
- AVALANCHE = highest interest rate first, SNOWBALL = smallest balance first
- Payment history chart: remaining balance over time
- Schedule vs actual: compare `scheduled_payment_amount` vs actual payment made

---

## Feature 8: Financial Plans

Multi-month budget planning with income projections and categorized expenses.

### Key Endpoints
```
POST   /financial_plans/                               → Create plan
GET    /financial_plans/                               → List plans
GET    /financial_plans/{uuid}                         → Get plan (with months)
PUT    /financial_plans/{uuid}                         → Update plan
DELETE /financial_plans/{uuid}                         → Delete plan
GET    /financial_plans/{uuid}/summary                 → Aggregated plan summary

POST   /financial_plans/{uuid}/months                  → Create month (with expenses inline)
GET    /financial_plans/{uuid}/months                  → List months
PUT    /financial_plans/months/{uuid}                  → Update month
DELETE /financial_plans/months/{uuid}                  → Delete month

POST   /financial_plans/months/{uuid}/expenses         → Create single expense
POST   /financial_plans/months/{uuid}/expenses/bulk    → Bulk create expenses
GET    /financial_plans/months/{uuid}/expenses         → List expenses
PUT    /financial_plans/expenses/{uuid}                → Update expense
DELETE /financial_plans/expenses/{uuid}                → Delete expense
```

### FinancialPlan Shape
```ts
interface FinancialPlan {
  id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  months: FinancialPlanMonth[];
  created_at: string;
}

interface FinancialPlanMonth {
  id: string;
  year: number;
  month: number;               // 1-12
  planned_income: string;
  expenses: FinancialPlanExpense[];
}

interface FinancialPlanExpense {
  id: string;
  category_uuid?: string;
  description: string;
  amount: string;
  expense_type: 'recurring' | 'one_time';
}
```

### MonthCreate Request
```ts
interface FinancialPlanMonthCreate {
  year: number;
  month: number;
  planned_income: string;
  expenses?: Array<{
    category_uuid?: string;
    description: string;
    amount: string;
    expense_type: 'recurring' | 'one_time';
  }>;
}
```

### FinancialPlanSummary Shape
```ts
// GET /financial_plans/{uuid}/summary
interface FinancialPlanSummary {
  plan_id: string;
  plan_name: string;
  total_planned_income: string;
  total_planned_expenses: string;
  projected_savings: string;
  months: MonthlyPlanSummary[];
}

interface MonthlyPlanSummary {
  month_id: string;
  year: number;
  month: number;
  planned_income: string;
  total_expenses: string;
  projected_savings: string;
  recurring_expenses: string;
  one_time_expenses: string;
}
```

### UI Notes
- Tabbed by month within a plan
- Color code expense types: recurring (blue), one-time (orange)
- Compare planned income vs total expenses — projected savings bar
- `/summary` gives the rollup without fetching all nested data

---

## Feature 9: Statement Uploads — Preview Flow

The primary way users import data. Two-phase flow: parse → review → confirm.

### Overview

```
Phase 1: POST /uploads/statement/preview
         ↓ Redis session created (12h TTL)
         ↓ Returns parsed transactions split into:
         ↓   pending_review (duplicates needing decision)
         ↓   ready_to_import (unique transactions)

Phase 2: User reviews duplicates, edits transactions

Phase 3: POST /uploads/statement/confirm
         ↓ All transactions written to database
         ↓ Redis session deleted
         ↓ Returns created counts
```

### Upload Endpoint
```
POST /uploads/statement/preview
Content-Type: multipart/form-data

Fields:
  file         (File)    — PDF or CSV
  institution  (string)  — see institutions table below
  account_uuid (string)  — optional, UUID of account to link
```

### Supported Institutions
| Value | Type | Formats |
|---|---|---|
| `tdbank` | Regular transactions | CSV, PDF |
| `amex` | Regular transactions | CSV, PDF |
| `amzn-synchrony` | Regular transactions | CSV, PDF |
| `schwab` | Investment transactions | CSV, PDF |
| `tdameritrade` | Investment transactions | PDF |
| `ameriprise` | Investment transactions | CSV, PDF |

### Preview Response Shape
```ts
interface PreviewResponse {
  preview_session_id: string;
  expires_at: string;          // ISO datetime (12h from now)
  institution: string;
  account_info?: {
    suggested_account_id?: string;    // UUID auto-matched from account_number_last4
    suggested_account_name?: string;
  };
  summary: {
    total_parsed: number;
    pending_review: number;          // duplicates awaiting decision
    rejected: number;
    ready_to_import: number;
    can_confirm: boolean;            // true when pending_review === 0
  };
  pending_review: {
    transactions: PreviewItem[];
    investment_transactions: PreviewItem[];
  };
  ready_to_import: {
    transactions: PreviewItem[];
    investment_transactions: PreviewItem[];
  };
}

interface PreviewItem {
  temp_id: string;               // e.g. "txn_0000", "inv_0042"
  parsed_data: {
    transaction_date: string;
    amount: string;
    description: string;
    transaction_type: string;
    symbol?: string;             // investment transactions
    quantity?: string;           // investment transactions
  };
  edited_data: Record<string, unknown>;  // empty initially, populated by edit calls
  review_status: 'pending' | 'approved' | 'rejected';
  source: 'unique' | 'approved_duplicate';
  duplicate_type?: 'database' | 'within_statement' | 'both';
  existing_transaction?: TransactionResponse;         // the DB match if database duplicate
  existing_investment_transaction?: InvestmentTransactionResponse;
}
```

### Preview Management Endpoints
```
GET    /uploads/preview/{session_id}                    → Get current preview state

POST   /uploads/preview/{session_id}/review-duplicate
Body: { temp_id: string, action: "approve" | "reject" | "undo_reject" }
→ approve: moves to ready_to_import
→ reject: marks rejected (stays in pending_review, grayed out)
→ undo_reject: resets back to pending

POST   /uploads/preview/{session_id}/edit-transaction
Body: { temp_id: string, edited_data: Record<string, unknown> }
→ edited_data merges over parsed_data at confirm time

POST   /uploads/preview/{session_id}/bulk-edit
Body: { temp_ids: string[], edited_data: Record<string, unknown> }

GET    /uploads/preview/{session_id}/extend             → Extend TTL (+12h, max 48h)
DELETE /uploads/preview/{session_id}                    → Cancel (discard session)
```

### Confirm Endpoint
```
POST /uploads/statement/confirm
Body: { preview_session_id: string }

Response:
{
  transactions_created: number;
  investment_transactions_created: number;
  upload_job_id: number;
}
```
Note: All `pending_review` items must be reviewed (none in `pending` status) before `can_confirm` becomes true. Rejected items are discarded. Approved items import with a unique hash.

### Upload Job History (Legacy Flow)
The traditional async upload still exists and creates job records:
```
GET /uploads/jobs                         → List upload jobs
GET /uploads/jobs/{job_id}                → Job status (PENDING|PROCESSING|COMPLETED|FAILED)
GET /uploads/jobs/{job_id}/skipped        → Transactions skipped as duplicates
```

### UI Notes

**Two-table layout (per the design):**
- **Top table:** `pending_review` — each row shows parsed data + existing DB match side by side, with Approve/Reject buttons
- **Bottom table:** `ready_to_import` — transactions that will be imported, editable

**Behaviors:**
- Confirm button disabled until `can_confirm === true`
- Rejected items shown grayed out with "Undo" button
- After confirm, show success message with counts
- If `account_info.suggested_account_id` is returned, show a banner: "Matched to account [name] — is this correct?"
- Auto-poll `can_confirm` after review actions or re-fetch full session state

**Editable fields in preview:**
- `description`, `merchant_name`, `category_uuid`, `subcategory_uuid`, `transaction_type`, `comments`

---

## Feature 10: Account History & Net Worth

Daily snapshots of account values. Investment accounts are calculated from live prices; others from current balance.

### Key Endpoints
```
POST /account-history/snapshots/all                    → Snapshot all accounts (run daily)
     ?snapshot_date=YYYY-MM-DD                         → Optional, defaults to today
POST /account-history/snapshots/account/{uuid}         → Snapshot single account
GET  /account-history/net-worth                        → Net worth over time
     ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
GET  /account-history/accounts/{uuid}                  → Value history for one account
     ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

### NetWorthHistoryResponse Shape
```ts
interface NetWorthHistoryResponse {
  data_points: NetWorthDataPoint[];
  start_date: string;
  end_date: string;
}

interface NetWorthDataPoint {
  value_date: string;
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
}
```

### AccountValueHistoryResponse Shape
```ts
interface AccountValueHistoryResponse {
  account_uuid: string;
  account_name: string;
  data_points: Array<{
    value_date: string;
    balance: string;
    securities_value?: string;   // investment accounts
    cash_balance?: string;       // investment accounts
    needs_review: boolean;       // true if snapshot has missing price data
  }>;
}
```

### UI Notes
- Net worth line chart is a great dashboard centerpiece (use Recharts `LineChart`)
- Show separate lines for assets vs liabilities vs net worth
- Snapshots with `needs_review=true` indicate missing price data — show a tooltip warning
- Investment account: stacked area chart of `securities_value` + `cash_balance`
- Date range picker for history window (30d, 90d, 1y, all time)

---

## Common Patterns

### Handling Decimal Values
All financial amounts come back as strings (e.g. `"1234.56"`). Parse consistently:
```ts
const formatCurrency = (val: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(val));
```

### UUID Validation
Invalid UUID paths return `400`. Valid-format UUIDs with no match return `404`.

### Pagination
Most list endpoints support `skip` + `limit`. TanStack Query's `keepPreviousData` is useful for smooth paging.

### Error Handling
```ts
// Errors come back as: { detail: string }
// 400 — validation / bad request
// 404 — resource not found
// 409 — conflict (e.g. delete an account with transactions)
// 415 — unsupported file type (uploads)
// 503 — Redis unavailable (preview endpoints)
```

### Multipart Form Uploads
For preview and statement uploads, use `FormData` not JSON:
```ts
const form = new FormData();
form.append('file', file);
form.append('institution', institution);
if (accountUuid) form.append('account_uuid', accountUuid);

await fetch(`${BASE}/uploads/statement/preview`, { method: 'POST', body: form });
// Do NOT set Content-Type header — browser sets it automatically with boundary
```

---

## Recommended Build Order

1. **API client + TanStack Query setup** — typed `apiFetch`, query client, dev tools
2. **Accounts list + create/edit** — establishes the data foundation, simplest CRUD
3. **Transaction list** — filtering, pagination, category/tag assignment
4. **Dashboard** — net worth card (accounts/stats), recent transactions, active budget
5. **Categories** — needed before budgets and transaction editing
6. **Tags** — colored pills, bulk tag on transaction list
7. **Budgets** — create, performance view, copy
8. **Statement upload (preview flow)** — the two-table review UI
9. **Investments** — holdings table, transaction history
10. **Debt** — plan + payment history
11. **Financial plans** — monthly planning grid
12. **Net worth / history charts** — polish after core flows work
