# Backend Improvement Notes

## Recommended Execution Order

Items are grouped into tiers. Work top-to-bottom within each tier before moving
to the next. Within a tier, items are listed in suggested order.

| Tier | Focus | Rationale |
|------|-------|-----------|
| **1 — Data Integrity** | Fixes that affect stored data | The longer these wait, the more bad data accumulates |
| **2 — Core API Gaps** | Missing features the frontend is blocked on | Unblocks active frontend work |
| **3 — Usability** | Enhancements for advanced UI features | Nice-to-have, improves UX |
| **4 — Polish / Architectural** | Correctness tweaks and large refactors | Low urgency or high scope |

---

## Tier 1 — Data Integrity

### ~~1.1 Amount sign convention~~ — DONE (approach changed)
- **Original plan:** Negate amounts for expense types so `amount < 0` = expense.
- **What was implemented instead:** Amounts are always stored as **positive**. The
  `transaction_type` field is the sole source of truth for direction (PURCHASE = expense,
  DEPOSIT = income, etc.). All creation and update paths now call `abs()` on the amount
  before persisting.
- **Why the change:** Since every parser already produces positive amounts and
  `transaction_type` encodes direction, storing signed amounts is redundant and caused
  bugs (e.g. credit card balances going negative). Using `abs()` + type is simpler and
  avoids an error-prone normalization layer.
- **Negative amount handling:** If a negative amount is received (e.g. from a manual
  entry or unexpected parser output), the amount is stored as `abs()`. No `needs_review`
  flag is set on the transaction — review happens during the preview flow before commit.
- **Credit card balance fix:** `update_account_balance_from_transaction()` now has a
  dedicated credit card branch where the sign logic is inverted (PURCHASE increases
  balance = debt owed). All balance-modifying paths (`create`, `update`, `delete`, `bulk`)
  use `abs(amount)` internally so the result is correct regardless of stored sign.
- **Frontend note:** The frontend should **not** rely on amount sign for expense/income
  coloring — use `transaction_type` instead.
- **No data migration needed** — existing positive amounts are already correct.

### ~~1.2 Investment transaction parser — add defensive guards for non-share-based types~~ — DONE
- **Implemented:** Post-parse guard in `crud_investment.py`
  (`bulk_create_investment_transactions_from_parsed_data`) and in `routers/uploads.py`
  (preview confirm path). For `NON_SHARE_TYPES` (INTEREST, FEE, TRANSFER), `quantity`,
  `price_per_share`, `symbol`, and `api_symbol` are forced to `None`.
- **`"UNKNOWN"` fallback removed:** `symbol` is now `None` when the parser cannot
  determine a ticker. `InvestmentTransactionDB.symbol` changed to `nullable=True` in
  `db/core.py`. `InvestmentHoldingDB.symbol` remains NOT NULL (holdings are always
  share-based).
- **Migration note:** Schema change (nullable symbol) was folded into the consolidated
  initial migration. No separate migration needed.
- No frontend changes needed — the table already displays "—" for null values.

### ~~1.3 `PUT /debt/payments/{uuid}/` — no recalculation or balance adjustment on update~~ — DONE
- **`update_debt_payment()` rewritten** in `crud_debt.py` to:
  1. Reverse the original payment's effect on the loan account balance
     (LOAN: `+= principal_amount`, CREDIT_CARD: `+= payment_amount`).
  2. Recalculate `principal_amount` / `interest_amount` if not explicitly provided
     (reuses the same interest-rate logic from `create_debt_payment`).
  3. Recompute `remaining_balance_after_payment` from the reversed balance.
  4. Apply the new remaining balance to the account and update `balance_last_updated`.
- **`delete_debt_payment()` rewritten** to reverse the balance effect before deleting
  the record (same LOAN vs CREDIT_CARD awareness).
- No frontend changes needed.

---

## Tier 2 — Core API Gaps (blocks frontend features)

### ~~2.1 `GET /transactions/` and `GET /transactions/{uuid}` — tags not embedded in response~~ — DONE
- **Implemented:** Added `tags: List[TagResponse]` field to `TransactionResponse` in
  `models/transaction.py`. Added `joinedload(TransactionDB.tags)` to both
  `read_db_transactions` and `read_db_transaction_by_uuid` in `crud_transaction.py`.
- Tags are now included in all transaction list and detail responses.

### ~~2.2 `PUT /transactions/{uuid}` — `null` values for `category_uuid`/`subcategory_uuid` are ignored~~ — DONE
- **Implemented:** Updated the UUID→ID resolution logic in the transaction update endpoint
  to explicitly check for `None` values. When `category_uuid` or `subcategory_uuid` is
  sent as `null`, the corresponding `category_id` / `subcategory_id` is now set to `None`.

### ~~2.3 `GET /transactions/{uuid}/relationships` — missing GET endpoint~~ — DONE
- **Implemented:** Added `GET /transactions/{uuid}/relationships` endpoint in
  `routers/transactions.py` returning all relationships where the transaction is either the
  `from` or `to` side. Added `read_transaction_relationships_by_uuid` CRUD function.

### ~~2.4 `GET /budgets/` — per-category `spent_amount` is `null` on the **list** endpoint~~ — DONE
- **Implemented:** Updated `read_db_budgets` to call `calculate_category_spending()` for
  each budget's categories when `include_spending=True`, matching the behavior of the
  detail endpoint.

### ~~2.5 `AccountSnapshotResponse` — missing investment and review fields~~ — DONE
- **Implemented:** Added `securities_value: Optional[Decimal]`, `cash_balance: Optional[Decimal]`,
  and `needs_review: bool` to `AccountSnapshotResponse` in `models/account_history.py`.
- All three fields are now included in `GET /account-history/accounts/{uuid}` responses.
- For non-investment accounts, `securities_value` and `cash_balance` are `null`;
  `needs_review` defaults to `false`.

### ~~2.6 `AccountSnapshotResponse` — missing `snapshot_id` and `review_reason` fields~~ — DONE
- **Implemented:** Added `snapshot_uuid: UUID` (external identifier) and
  `review_reason: Optional[str]` to `AccountSnapshotResponse`.
- **Design change:** Instead of exposing the integer `snapshot_id` primary key, a `uuid` column
  was added to `AccountValueHistoryDB` (`src/db/core.py`) for consistency with the rest of the
  API's UUID-based external identification pattern. The `resolve_uuids` model validator maps
  `db.uuid` → `snapshot_uuid` in the response.
- Both snapshot creation sites in `src/services/account_snapshot.py` now set `uuid=uuid4()`.
- The initial migration was updated with the new `uuid` column and unique constraint.
- **Bug fix (incidental):** Removed invalid `needs_review` keyword argument from `TransactionDB`
  constructor calls in `crud_transaction.py` and `routers/uploads.py`. The `needs_review` column
  only exists on `AccountValueHistoryDB` (for snapshot review), not on `TransactionDB`. Transactions
  are reviewed during the preview flow before being committed to the database, so a per-transaction
  `needs_review` flag is unnecessary.

---

## Tier 3 — Usability Improvements

### ~~3.1 Financial plans — auto-sync `start_date`/`end_date` from months~~ — DONE
- **Implemented:** Added `_sync_plan_dates()` helper in `crud_financial_plan.py` that
  recomputes `start_date` (1st of earliest month) and `end_date` (last day of latest month)
  from all months belonging to the plan. Called automatically from both
  `create_financial_plan_month` and `delete_financial_plan_month`. If no months remain after
  a delete, dates are left unchanged.
- Also called once after the bulk month insert (3.7) rather than per-month.
- **Frontend note:** Remove the `syncPlanDates()` call from the frontend
  (`useFinancialPlans.ts` and `PlanDetailPage.tsx`).

### ~~3.2 `GET /transactions/` — multi-category and multi-subcategory filtering~~ — DONE
### ~~3.3 `GET /transactions/` — multi-tag filtering~~ — DONE
- **Implemented together** since both required the same set of changes:
  - `TransactionFilter` fields renamed: `category_id` → `category_ids: Optional[List[int]]`,
    `subcategory_id` → `subcategory_ids: Optional[List[int]]`, `tag_id` → `tag_ids: Optional[List[int]]`.
  - CRUD: Extracted `_apply_transaction_filters()` helper in `crud_transaction.py` to centralize
    the duplicated filter block from `read_db_transactions`, `get_transaction_stats`, and
    `get_transactions_count`. Category/subcategory use `in_()`. Tags use an `EXISTS` subquery
    (avoids duplicate rows from JOIN that break pagination/count). OR logic for tags — a
    transaction matches if it has *any* of the specified tags.
  - Added batch UUID helpers: `read_db_categories_by_uuids()` in `crud_category.py`,
    `read_db_tags_by_uuids()` in `crud_tag.py`.
  - Router: `category_uuid`, `subcategory_uuid`, `tag_uuid` query params changed from
    `Optional[str]` to `Optional[List[str]]` on both `GET /transactions/` and
    `GET /transactions/stats`. Backward compatible — single values still work.
  - **Bug fix:** `get_transactions_count()` was missing the `tag_id` filter entirely. Now
    uses the shared helper and has full filter parity.
- **Frontend reminder:** Replace single-select category/subcategory dropdowns with multi-select
  inputs in `TransactionsPage.tsx`. Add a multi-select tag filter (chip input). Keep the
  behaviour where deselecting a category also removes its subcategories from active filters.

### ~~3.4 `PUT /transactions/{uuid}` — `account_uuid` is ignored on update~~ — DONE
- **Implemented:** Added `account_uuid: Optional[UUID]` to `TransactionUpdate` in
  `models/transaction.py`. The router resolves the UUID to an internal ID using the same
  "not sent" vs "sent as null" pattern as `category_uuid`.
- **Balance adjustments:** `update_db_transaction()` in `crud_transaction.py` now captures
  old state (`old_account_id`, `old_account`, `old_txn_type`, `old_amount`) before applying
  changes. A unified balance block fires when either amount or account changed:
  - Reverses the old effect on the old account (if any)
  - Applies the new effect on the new account (if any)
  - Handles all combinations: same-account amount change, account move, both, clear, and set.
- `update_db_transaction_by_uuid()` passes through the new `account_id` / `clear_account`
  keyword args.
- **Frontend reminder:** Remove the `disabled={isEdit}` prop and the helper text from the
  Account field in `TransactionFormDialog.tsx`.

### ~~3.5 Bulk state-transition endpoints for preview items~~ — DONE
- **Implemented:** Added two bulk endpoints in `src/routers/uploads.py`:
  - `POST /uploads/preview/{id}/bulk-review-duplicate` — accepts `{ "items": [{ "temp_id", "action" }] }`
    with mixed approve/reject/undo_reject actions per item. Returns full preview state plus
    `processed` count and per-item `errors` array. Partial failures don't block other items.
  - `POST /uploads/preview/{id}/bulk-reject-item` — accepts `{ "temp_ids": ["..."] }` to move
    multiple ready_to_import items back to pending_review. Returns `processed` count and
    `not_found` array.
- Both endpoints recompute summary and save session exactly once (not per-item).
- New Pydantic models in `src/models/preview.py`: `BulkDuplicateReviewRequest`,
  `BulkRejectItemRequest`.
- **Frontend note:** Update `useStatementUpload.ts` with bulk mutation hooks and call them
  from `PendingReviewTable` and `ReadyToImportTable` bulk action footers instead of looping
  over individual calls.

### ~~3.6 `GET /uploads/preview/sessions` — list active preview sessions for the current user~~ — DONE
- **Implemented:** Added `GET /uploads/preview/sessions` in `src/routers/uploads.py` (placed
  before `GET /preview/{session_id}` to avoid FastAPI path conflict). Returns
  `List[PreviewSessionInfo]` with `preview_session_id`, `institution`, `filename`, `created_at`,
  `expires_at`, and `summary` for each active session.
- Added `list_user_sessions()` in `src/services/preview_session.py` using `scan_iter`
  (cursor-based, non-blocking) with user ownership filtering. Handles both bytes and str
  Redis keys.
- New Pydantic model in `src/models/preview.py`: `PreviewSessionInfo`.
- **Frontend note:** The uploads page can display a "Resume session" list above the upload
  form, fetching this endpoint on mount. Each entry links directly into the preview step.

### ~~3.7 `POST /financial_plans/{uuid}/months/bulk` — bulk month creation~~ — DONE
- **Implemented:** Added `POST /financial_plans/{uuid}/months/bulk` endpoint with
  `FinancialPlanMonthBulkCreate` request model. All months and their expenses are created in a
  single DB transaction — rolls back entirely on any failure. Category UUIDs are batch-resolved
  in a single query. Returns 409 for duplicate year/month, 404 for missing categories.
- `_sync_plan_dates()` (3.1) fires once after the bulk commit, not per month.
- **Frontend note:** Update `BulkMonthDialog.tsx` to call the bulk endpoint in a single
  request instead of looping. Update `useFinancialPlans.ts` with a `useBulkCreateMonths` hook.

---

## Tier 4 — Polish / Architectural

### ~~4.1 HTTP status codes — many endpoints return 200 for all operations~~ — DONE
- **Implemented:** Audited all routers and applied REST conventions:
  - `POST /transactions/` → 201, `POST /transactions/bulk-upload/` → 201
  - `DELETE /transactions/{uuid}` → 204 (no body)
  - `DELETE /tags/{uuid}` → 204 (no body)
  - `DELETE /investments/transactions/{uuid}` → 204 (no body)
  - `POST /uploads/statement/preview` → 201, `POST /uploads/statement/confirm` → 201
  - `DELETE /uploads/preview/{session_id}` → 204 (no body)
- All DELETE endpoints now return `None` with no response body.
- E2E tests updated to expect the new status codes.
- The frontend's `apiFetch` only checks `res.ok` (2xx range) so no frontend changes needed.

### ~~4.2 Snapshot source field — simplify and standardize~~ — DONE
- **Implemented:** Simplified `snapshot_source` to three clear values:
  - `MANUAL` — user-initiated via `/snapshots/all` or `create_account_snapshot()` default
  - `SCHEDULED` — created by the end-of-day cron job (`eod_snapshot_job.py`)
  - `BACKFILL` — created by `/snapshots/recalculate` or backfill jobs
- **Renamed:** `EOD_JOB` → `SCHEDULED` in `create_all_account_snapshots()` default param and
  `eod_snapshot_job.py`. `SYSTEM` → `MANUAL` in `create_account_snapshot()` default param and
  `AccountValueHistoryDB` column default.
- **Dropped:** `SYSTEM` (ambiguous), `STATEMENT_IMPORT` and `TRANSACTION_REPLAY` (both collapse
  into `BACKFILL` since the trigger, not the data derivation method, is what matters).
- No migration needed — `snapshot_source` is a free-form `String(50)`, not an enum column.
  Existing rows with old values remain as historical data.
- **Also fixed:** `_trigger_backfill_if_needed()` in `routers/uploads.py` now fires for all
  account types (checking, savings, credit card, loan), not just investment accounts. The
  recalculation logic already supported non-investment accounts (4.5); only the trigger was
  missing.

### ~~4.3 Needs-review snapshots — add dismiss/acknowledge endpoint~~ — DONE
- **Implemented:** Added `POST /accounts/{uuid}/snapshots/dismiss-review` in
  `routers/account_history.py`. Takes a `DismissReviewRequest` with a list of snapshot UUIDs
  and optional dismissal reason (defaults to "Dismissed by user").
- Sets `needs_review = False` on specified snapshots and appends the reason to `review_reason`
  (preserving the original reason). Returns count of dismissed snapshots.
- Service implementation in `account_snapshot.py` (`dismiss_snapshot_reviews()`).
- **Frontend note:** Add a "Dismiss" button per row or a bulk "Dismiss All" button in the
  Admin page Needs Review section.

### ~~4.4 Holdings derived from transactions~~ — DONE
- **Implemented:** Holdings are now a materialized cache rebuilt from transactions.
  `rebuild_holdings_from_transactions()` in `crud_investment.py` replays all investment
  transactions in chronological order to reconstruct holdings (BUY/REINVESTMENT create or
  update holdings with weighted avg cost basis, SELL reduces quantity, SPLIT applies ratio).
- **Removed endpoints:** `POST /investments/holdings/`, `PUT /investments/holdings/{uuid}`,
  `DELETE /investments/holdings/{uuid}`. Removed `InvestmentHoldingCreate` and
  `InvestmentHoldingUpdate` Pydantic models. Removed 6 holding mutation CRUD functions and
  `update_holding_from_transaction()`.
- **Added endpoint:** `POST /investments/accounts/{uuid}/holdings/rebuild` for manual
  rebuild (admin/debugging).
- **Transaction CRUD updated:** All transaction create/update/delete paths now call
  `rebuild_holdings_from_transactions()` after commit. Bulk paths call rebuild once (not
  per-transaction). The `_create_investment_transaction_no_rebuild()` helper avoids N rebuilds
  in bulk operations.
- **Preview confirm updated:** `routers/uploads.py` removed inline holding find-or-create
  logic, calls rebuild once after commit.
- **Account deletion guard:** Changed from checking `investment_holdings` to
  `investment_transactions`.
- **Seed script:** Creates BUY transactions instead of direct holdings, then calls rebuild.
- **Price cache preserved:** Rebuild caches `current_price` and `last_price_update` (from
  Yahoo Finance) before deleting holdings, restores them onto rebuilt holdings.
- **Option fields derived:** `underlying_symbol`, `option_type`, `strike_price`,
  `expiration_date` are derived from `api_symbol` via `is_option_symbol()`/`parse_option_symbol()`.
- **Frontend note:** Remove `useCreateHolding` and `useUpdateHolding` from `useInvestments.ts`,
  remove `HoldingFormDialog.tsx`, and remove the "Add Holding" / "Edit" UI from
  `InvestmentDetailPage.tsx`. Users add holdings by creating BUY transactions instead.

### ~~4.5 Account history — transaction replay for non-investment accounts~~ — DONE
- **Implemented:** Added `get_non_investment_balance_on_date()` in `account_snapshot.py` that
  derives historical balances by starting from the current account balance and reversing
  transactions backwards from today to the target date.
- `recalculate_account_snapshots()` now dispatches to `recalculate_non_investment_snapshots()`
  for non-investment accounts instead of rejecting them. The `POST /accounts/{uuid}/snapshots/recalculate`
  endpoint now works for all account types.
- LOAN accounts get additional `principal_paid_ytd` and `interest_paid_ytd` calculations via
  `calculate_loan_account_snapshot()`.
- Snapshots for dates before the earliest transaction are flagged `needs_review=True` (uncertain data).
- Snapshots created with `snapshot_source="BACKFILL"`.

---

## Recommendations / Discussion (not actionable yet)

### ~~`institution_name` on `TransactionResponse` — likely redundant~~ — DONE
- Removed `institution_name` column from `TransactionDB`, the initial migration, and all
  constructor sites. The value is now derived from the linked account when needed (e.g. in
  `duplicate_analyzer.py` via `txn.account.institution_name`). Hash generation unchanged —
  it already took `institution_name` as a parameter from the account/import context.

### ~~`subcategory_uuid` vs `category_uuid` — two-level hierarchy already on `Category`~~ — KEEPING BOTH
- Decided to keep both fields. Having an explicit `subcategory_id` on the transaction makes
  queries and filtering simpler without requiring a category tree traversal. The frontend
  uses both for direct display.

### ~~`GET /transactions/stats` should accept same filter params as `GET /transactions/`~~ — VERIFIED
- Both endpoints now share the same `_build_filters` helper and the same
  `_apply_transaction_filters()` CRUD helper. Filter parity is guaranteed by construction.

### ~~`GET /accounts/summary` response shape~~ — FIXED (doc typo)
- The frontend guide documented field as `name` but the actual response uses `account_name`.
  Fixed the typo in `FRONTEND_GUIDE.md`. No code changes needed.

---

## Tier 5 — Relationship-Aware Financial Calculations

### ~~5.1 Refund attribution — adjust budgets/stats for REFUNDS/OFFSETS/REVERSES relationships~~ — DONE
- **Implemented:** When a REFUNDS/OFFSETS/REVERSES relationship has `amount_allocated`,
  the original transaction's contribution to budgets and stats is reduced by that amount.
  The refund/credit transaction is excluded entirely (absorbed).
- **New helpers in `crud_transaction.py`:**
  - `ABSORBING_RELATIONSHIP_TYPES` — constant set `{REFUNDS, OFFSETS, REVERSES}`
  - `get_refund_adjustments()` — batch query returning per-transaction adjustments and
    absorbed IDs. Single query per call site, not N+1.
  - `validate_refund_allocation()` — rejects relationship create/update if total
    allocations would exceed the original transaction's amount (returns 400).
- **Updated functions:** `calculate_category_spending()` (budget.py),
  `get_transaction_stats()`, `get_transactions_by_category()` (transaction.py).
  Budget performance/variance/stats inherit the fix automatically.
- **Validation added:** Relationship create and update endpoints now reject
  `amount_allocated` values that would push total refund allocations above the original
  transaction amount. Effective amounts are also floored at zero as a defensive safeguard.
- **No schema changes needed** — uses existing `amount_allocated` on
  `TransactionRelationshipDB`.
- **Frontend note:** Budget spending, stats, and category breakdowns now automatically
  reflect refund adjustments — no frontend changes needed for correct numbers. The
  frontend should ensure that when creating a REFUNDS/OFFSETS/REVERSES relationship, the
  direction is `from=credit/refund, to=original purchase`. The `amount_allocated` field
  is the amount being refunded/offset (not the full credit amount, in case of partial
  refunds). The API will reject allocations that exceed the original transaction's amount.
  The optional `refund_adjustment` field on `TransactionResponse` (Step 6 in the plan) is
  deferred — the frontend can compute effective amounts client-side from the relationships
  endpoint (`GET /transactions/{uuid}/relationships`) if needed for display.

### ~~5.2 Split category allocation — distribute a single transaction across multiple categories~~ — DONE
- **Implemented:** New `transaction_split_allocations` table (allocation_id, id/UUID,
  transaction_id, category_id, subcategory_id, amount, notes, timestamps). Unique
  constraint on (transaction_id, category_id). Added to initial migration.
- **New endpoints:**
  - `PUT /transactions/{uuid}/splits` — replace all allocations. Request body:
    `{ "allocations": [{ "category_uuid", "subcategory_uuid?", "amount", "notes?" }, ...] }`.
    Validates: min 2 allocations, no duplicate category pairs, all amounts positive,
    sum must equal transaction amount. Sets `category_id = NULL` on the transaction.
    Returns full `TransactionResponse` with `split_allocations` array.
  - `GET /transactions/{uuid}/splits` — returns `List[SplitAllocationResponse]` with
    `id`, `category_uuid`, `category_name`, `subcategory_uuid`, `subcategory_name`,
    `amount`, `notes`.
  - `DELETE /transactions/{uuid}/splits` — removes all allocations (204). Transaction
    becomes uncategorized.
- **`TransactionResponse` updated:** New `split_allocations: List[SplitAllocationResponse]`
  field included on all transaction list and detail responses (eager loaded).
- **Budget/stats impact:** `calculate_category_spending()` includes split allocation
  amounts. `get_transactions_by_category()` distributes split amounts across categories.
  `get_transaction_stats()` with a category filter uses allocation amounts (not full
  amount) for split transactions. Unfiltered stats use the full amount once (no
  double-counting).
- **Category filtering:** `GET /transactions/?category_uuid=X` returns split transactions
  that have an allocation for category X (via EXISTS subquery).
- **Interaction with 5.1:** Refund adjustments on split transactions are distributed
  proportionally across allocations (`effective = alloc.amount * (1 - adj / txn.amount)`).
- **Amount update guard:** If a transaction's amount changes and existing splits no longer
  sum correctly, splits are cleared automatically (transaction becomes uncategorized).
- **Frontend note:**
  - In the transaction list, check `split_allocations.length > 0` and display "Split (N)"
    in the category column instead of a single category name. The `category` field will be
    `null` for split transactions.
  - Add a "Split Category" action (button/menu item) on the transaction detail or edit
    view. Open a dialog where the user can add 2+ allocation rows, each with a category
    dropdown and amount input. Validate that amounts sum to the transaction total before
    submitting.
  - Call `PUT /transactions/{uuid}/splits` to save, `DELETE /transactions/{uuid}/splits`
    to remove splits. The response includes the updated `split_allocations` array — no
    need for a separate GET.
  - Budget views and stats already reflect split allocations automatically — no frontend
    budget changes needed.

### ~~5.3 Budget amortization — spread a single charge across multiple months for budgeting~~ — DONE
- **Implemented:** Allows a single large charge (e.g., $120 annual subscription) to be
  spread across multiple months for budget calculations only. Transaction stats, account
  balances, and the transaction list are not affected — amortization is purely a budgeting
  lens.
- **New table:** `transaction_amortization_schedules` (transaction_id, category_id,
  subcategory_id, month_date, amount). Allocations must sum to the transaction amount.
  Only expense types (PURCHASE, WITHDRAWAL, FEE) can be amortized.
- **New endpoints:**
  - `PUT /transactions/{uuid}/amortization` — create or replace a schedule. Accepts either
    explicit allocations (`{ "allocations": [{ "month": "2026-01", "amount": "10.00" }] }`)
    or an equal-split shorthand (`{ "start_month": "2026-01", "months": 12 }`). Optional
    `category_uuid` / `subcategory_uuid` override (defaults to transaction's category).
  - `GET /transactions/{uuid}/amortization` — read the schedule (404 if none exists).
  - `DELETE /transactions/{uuid}/amortization` — remove the schedule (204). Transaction
    reverts to normal single-month budget treatment.
- **Budget impact:** `calculate_category_spending()` excludes amortized transactions from
  the normal sum and includes only the schedule entries that fall within the budget period.
  Out-of-period transactions still contribute their monthly allocations (e.g., a January
  purchase amortized across 12 months contributes $10 to February's budget). Refund
  adjustments are distributed proportionally across schedule months.
- **Interaction with 5.2 (category splits):** Deferred — an amortized transaction with
  category splits is a niche edge case to handle once both features are stable.
- **Frontend note:**
  - Add an "Amortize" action on the transaction detail or context menu (only for PURCHASE,
    WITHDRAWAL, FEE types). Open a dialog with two modes:
    1. **Equal split:** User picks a start month and number of months. The API auto-divides.
    2. **Custom allocations:** User specifies per-month amounts (validated to sum to total).
  - Call `PUT /transactions/{uuid}/amortization` to save. The response
    (`AmortizationScheduleResponse`) includes `transaction_uuid`, `total_amount`,
    `num_months`, and an `allocations` array with `id`, `month`, `amount`, `category_uuid`,
    `category_name`, `subcategory_uuid`, `subcategory_name` per entry.
  - Call `GET /transactions/{uuid}/amortization` to display the current schedule on the
    transaction detail view. Show a visual timeline or table of monthly amounts.
  - Call `DELETE /transactions/{uuid}/amortization` to remove it.
  - Budget views (spending, variance, performance) automatically reflect amortization —
    no budget-side frontend changes needed. The only visible difference is that amortized
    transactions show their monthly portion instead of the full amount in budget category
    spending.
  - Consider showing an "Amortized" badge on transactions in the transaction list that
    have an active schedule (check via GET or add a flag to `TransactionResponse` later).
  - Transaction stats (`GET /transactions/stats`) are NOT affected — they show real cash
    flow. Only budget views change.

---

## No Longer Needed

### ~~`POST /uploads/preview/{id}/reject-item` — reject a unique (non-duplicate) ready-to-import item~~
- **Status: ALREADY IMPLEMENTED.** `POST /preview/{session_id}/reject-item` exists in
  `src/routers/uploads.py` and correctly handles items from `ready_to_import`, including
  unique (non-duplicate) items. It moves the item from `ready_to_import` into `pending_review`
  with `review_status: "pending"`. No work needed.
